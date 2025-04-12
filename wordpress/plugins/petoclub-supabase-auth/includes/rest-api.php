<?php
/**
 * Funciones para la API REST personalizada
 */

if (!defined('ABSPATH')) {
    exit;
}

// Incluir la clase de MercadoPago si no está incluida
if (!class_exists('MP')) {
    require_once plugin_dir_path(__FILE__) . 'mercadopago-sdk.php';
}

// Registrar rutas de la API REST
add_action('rest_api_init', 'petoclub_register_rest_routes');

/**
 * Registra las rutas de la API REST
 */
function petoclub_register_rest_routes() {
    // Ruta para obtener la preferencia de MercadoPago para una orden
    register_rest_route('petoclub/v1', '/mercadopago-preference', array(
        'methods' => 'GET',
        'callback' => 'petoclub_get_mercadopago_preference',
        'permission_callback' => '__return_true'
    ));
    
    // La ruta para el webhook de MercadoPago ya está registrada en mercadopago-webhook.php
    // No registramos aquí para evitar duplicación
}

/**
 * Obtiene o crea una preferencia de MercadoPago para una orden
 * 
 * @param WP_REST_Request $request Datos de la solicitud
 * @return WP_REST_Response Respuesta con los datos de la preferencia
 */
function petoclub_get_mercadopago_preference($request) {
    // Obtener el ID de la orden
    $order_id = $request->get_param('order_id');
    
    if (!$order_id) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Se requiere el ID de la orden'
        ), 200); // Cambiado a 200 para que la app pueda manejar el error
    }
    
    // Obtener la orden
    $order = wc_get_order($order_id);
    
    if (!$order) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Orden no encontrada',
            'order_id' => $order_id
        ), 200); // Cambiado a 200 para que la app pueda manejar el error
    }
    
    // Verificar si ya existe una preferencia de MercadoPago
    $preference_id = $order->get_meta('_mercadopago_preference_id');
    
    if ($preference_id) {
        // Si ya existe una preferencia, devolverla
        return new WP_REST_Response(array(
            'success' => true,
            'preference_id' => $preference_id,
            'order_id' => $order_id,
            'status' => $order->get_status()
        ));
    }
    
    // Si no existe, crear una nueva preferencia
    // Obtener las credenciales de MercadoPago
    $mp_settings = get_option('woocommerce_mercadopago_settings');
    $mp_access_token = isset($mp_settings['access_token']) ? $mp_settings['access_token'] : '';
    $mp_public_key = isset($mp_settings['public_key']) ? $mp_settings['public_key'] : '';
    
    if (empty($mp_access_token) || empty($mp_public_key)) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Configuración de MercadoPago incompleta',
            'order_id' => $order_id
        ), 200); // Devolver código 200 en lugar de 500 para que la app pueda manejar el error
    }
    
    // Crear preferencia de pago para la app
    $preference_data = array(
        'items' => array(),
        'external_reference' => (string)$order_id,
        'notification_url' => rest_url('petoclub/v1/mercadopago-webhook'),
        'auto_return' => 'approved',
        'payment_methods' => array(
            'excluded_payment_types' => array(
                array('id' => 'ticket')
            ),
            'installments' => 12
        ),
        'statement_descriptor' => 'PETOCLUB',
        'metadata' => array(
            'order_id' => $order_id,
            'source' => 'mobile_app'
        )
    );

    // Agregar items del carrito
    foreach ($order->get_items() as $item) {
        // Evitar división por cero
        $quantity = max(1, (int)$item->get_quantity());
        $unit_price = (float)($item->get_total() / $quantity);
        
        // Asegurar que el precio unitario sea mayor que cero
        if ($unit_price <= 0) {
            error_log('Precio unitario inválido para producto ' . $item->get_name() . ' en orden #' . $order_id);
            $unit_price = 0.01; // Establecer un valor mínimo para evitar errores
        }
        
        $preference_data['items'][] = array(
            'id' => (string)$item->get_product_id(),
            'title' => $item->get_name(),
            'description' => substr($item->get_name(), 0, 255),
            'quantity' => $quantity,
            'currency_id' => $order->get_currency(),
            'unit_price' => $unit_price
        );
    }

    // Agregar información del comprador
    $preference_data['payer'] = array(
        'name' => $order->get_billing_first_name(),
        'surname' => $order->get_billing_last_name(),
        'email' => $order->get_billing_email(),
        'phone' => array(
            'area_code' => '',
            'number' => $order->get_billing_phone()
        ),
        'address' => array(
            'zip_code' => $order->get_billing_postcode(),
            'street_name' => $order->get_billing_address_1(),
            'street_number' => ''
        )
    );

    // Crear preferencia en MercadoPago
    $mp = new MP($mp_access_token);
    
    // Agregar log para depuración
    error_log('Intentando crear preferencia de MercadoPago para orden #' . $order_id);
    error_log('Datos de preferencia: ' . json_encode($preference_data));
    
    try {
        // Agregar más información de depuración
        error_log('Intentando crear preferencia con access_token (primeros 4 caracteres): ' . substr($mp_access_token, 0, 4) . '...');
        
        // Verificar que los datos de preferencia sean válidos
        if (empty($preference_data['items'])) {
            throw new Exception('No hay productos en la orden');
        }
        
        // Verificar precios unitarios
        foreach ($preference_data['items'] as $item) {
            if (!isset($item['unit_price']) || $item['unit_price'] <= 0) {
                throw new Exception('Precio unitario inválido para item: ' . (isset($item['title']) ? $item['title'] : 'desconocido'));
            }
        }
        
        $preference = $mp->create_preference($preference_data);
    } catch (Exception $e) {
        $error_message = 'Error al crear preferencia: ' . $e->getMessage();
        error_log('Excepción al crear preferencia para orden #' . $order_id . ': ' . $error_message);
        
        // Crear un ID de preferencia genérico para que la app pueda continuar
        $generic_preference_id = 'order_' . $order_id;
        
        // Guardar ID de preferencia genérico y el error en el pedido
        $order->update_meta_data('_mercadopago_preference_id', $generic_preference_id);
        $order->update_meta_data('_mercadopago_source', 'mobile_app');
        $order->update_meta_data('_mercadopago_error', $error_message);
        $order->save();
        
        // Devolver respuesta con ID genérico y detalles del error
        return new WP_REST_Response(array(
            'success' => false,
            'preference_id' => $generic_preference_id,
            'public_key' => $mp_public_key,
            'order_id' => $order_id,
            'status' => $order->get_status(),
            'fallback' => true,
            'error_details' => $error_message
        ), 200); // Devolver código 200 en lugar de 500 para que la app pueda manejar el error
    }

    if ($preference) {
        // Guardar ID de preferencia en el pedido
        $order->update_meta_data('_mercadopago_preference_id', $preference['id']);
        $order->update_meta_data('_mercadopago_source', 'mobile_app');
        $order->save();

        // Devolver datos para la app
        return new WP_REST_Response(array(
            'success' => true,
            'preference_id' => $preference['id'],
            'public_key' => $mp_public_key,
            'order_id' => $order_id,
            'status' => $order->get_status(),
            'init_point' => isset($preference['init_point']) ? $preference['init_point'] : null,
            'sandbox_init_point' => isset($preference['sandbox_init_point']) ? $preference['sandbox_init_point'] : null
        ));
    } else {
        // Si falla la creación de la preferencia
        // Obtener información de error de los logs
        $error_message = 'No se pudo crear la preferencia de pago';
        
        // Verificar si hay items en la orden
        if (empty($preference_data['items'])) {
            $error_message .= ': No hay productos en la orden';  
        }
        
        // Verificar si hay problemas con el precio unitario
        foreach ($preference_data['items'] as $item) {
            if ($item['unit_price'] <= 0) {
                $error_message .= ': Precio unitario inválido (' . $item['unit_price'] . ') para ' . $item['title'];
                break;
            }
        }
        
        // Registrar el error completo
        error_log('Error al crear preferencia para orden #' . $order_id . ': ' . $error_message);
        
        // Crear un ID de preferencia genérico para que la app pueda continuar
        $generic_preference_id = 'order_' . $order_id;
        
        // Guardar ID de preferencia genérico en el pedido
        $order->update_meta_data('_mercadopago_preference_id', $generic_preference_id);
        $order->update_meta_data('_mercadopago_source', 'mobile_app');
        $order->update_meta_data('_mercadopago_error', $error_message);
        $order->save();
        
        // Devolver respuesta con ID genérico para que la app pueda continuar
        // Cambiamos success a false para indicar que hubo un error, pero mantenemos código 200
        // para que la app pueda procesar la respuesta sin error HTTP
        return new WP_REST_Response(array(
            'success' => false,
            'preference_id' => $generic_preference_id,
            'public_key' => $mp_public_key,
            'order_id' => $order_id,
            'status' => $order->get_status(),
            'fallback' => true,
            'error_details' => $error_message
        ), 200); // Código 200 en lugar de error 500 para que la app pueda manejar el error
    }
}

/**
 * Esta función ha sido movida a mercadopago-webhook.php para evitar duplicación
 * Usar la función petoclub_handle_mercadopago_webhook() definida en ese archivo
 */