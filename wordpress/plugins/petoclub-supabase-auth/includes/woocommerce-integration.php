<?php
/**
 * Integración con WooCommerce para mantener la sesión de Supabase
 * y manejar pagos con MercadoPago en la app móvil
 */

if (!defined('ABSPATH')) {
    exit;
}

// Incluir la clase de MercadoPago
require_once plugin_dir_path(__FILE__) . 'mercadopago-sdk.php';

// Iniciar sesión de PHP si no está iniciada
if (!session_id()) {
    session_start();
}

// Agregar hooks para WooCommerce
add_action('template_redirect', 'petoclub_check_checkout_auth');
add_action('woocommerce_before_checkout_form', 'petoclub_verify_supabase_session');
add_action('woocommerce_checkout_order_processed', 'petoclub_handle_order_processed', 10, 3);

/**
 * Verifica si el usuario está intentando acceder al checkout y guarda la URL
 */
function petoclub_check_checkout_auth() {
    if (!is_checkout()) {
        return;
    }

    if (!is_user_logged_in()) {
        // Guardar la URL del checkout en la sesión
        $_SESSION['checkout_redirect'] = wc_get_checkout_url();
        
        // Redirigir al login con parámetro de redirección
        wp_redirect(add_query_arg('checkout_redirect', urlencode(wc_get_checkout_url()), wp_login_url()));
        exit;
    }
}

/**
 * Verifica la sesión de Supabase antes de mostrar el formulario de checkout
 */
function petoclub_verify_supabase_session() {
    // Verificar si hay un token de Supabase en la solicitud
    $supabase_token = isset($_COOKIE['supabase.auth.token']) ? $_COOKIE['supabase.auth.token'] : null;

    if (!$supabase_token) {
        // Si no hay token, redirigir al login
        wp_redirect(wp_login_url());
        exit;
    }

    // Aquí podrías agregar una verificación adicional del token con la API de Supabase si lo deseas
}

/**
 * Maneja la redirección después de procesar el pedido
 */
function petoclub_handle_order_processed($order_id, $posted_data, $order) {
    if (!$order_id || !$order) {
        return;
    }

    // Verificar si la solicitud viene de la app móvil
    $is_mobile_app = isset($_SERVER['HTTP_USER_AGENT']) && strpos($_SERVER['HTTP_USER_AGENT'], 'PetoClub-App') !== false;

    // Obtener el método de pago
    $payment_method = $order->get_payment_method();
    
    if ($payment_method === 'mercadopago') {
        // Para pagos con MercadoPago
        if ($is_mobile_app) {
            // Obtener las credenciales de MercadoPago
            $mp_settings = get_option('woocommerce_mercadopago_settings');
            $mp_access_token = isset($mp_settings['access_token']) ? $mp_settings['access_token'] : '';
            $mp_public_key = isset($mp_settings['public_key']) ? $mp_settings['public_key'] : '';
            
            if (empty($mp_access_token) || empty($mp_public_key)) {
                wp_send_json(array(
                    'success' => false,
                    'error' => 'Configuración de MercadoPago incompleta'
                ));
                exit;
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
                $unit_price = $item->get_total() / $item->get_quantity();
                $preference_data['items'][] = array(
                    'id' => (string)$item->get_product_id(),
                    'title' => $item->get_name(),
                    'description' => substr($item->get_name(), 0, 255),
                    'quantity' => (int)$item->get_quantity(),
                    'currency_id' => $order->get_currency(),
                    'unit_price' => (float)$unit_price
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
            $preference = $mp->create_preference($preference_data);

            if ($preference) {
                // Guardar ID de preferencia en el pedido
                $order->update_meta_data('_mercadopago_preference_id', $preference['id']);
                $order->update_meta_data('_mercadopago_source', 'mobile_app');
                $order->save();

                // Devolver datos para la app
                wp_send_json(array(
                    'success' => true,
                    'preference_id' => $preference['id'],
                    'public_key' => $mp_public_key,
                    'order_id' => $order_id,
                    'status' => $order->get_status(),
                    'init_point' => isset($preference['init_point']) ? $preference['init_point'] : null,
                    'sandbox_init_point' => isset($preference['sandbox_init_point']) ? $preference['sandbox_init_point'] : null
                ));
                exit;
            } else {
                // Si falla la creación de la preferencia
                wp_send_json(array(
                    'success' => false,
                    'error' => 'No se pudo crear la preferencia de pago'
                ));
                exit;
            }
        } else {
            // Para navegador web, usar el checkout normal de MercadoPago
            $payment_url = $order->get_checkout_payment_url(true);
            wp_redirect($payment_url);
            exit;
        }
    } else {
        // Para otros métodos de pago
        $payment_url = $order->get_checkout_payment_url(true);
        
        if ($is_mobile_app) {
            wp_send_json(array(
                'success' => true,
                'payment_url' => $payment_url,
                'order_id' => $order_id,
                'status' => $order->get_status()
            ));
            exit;
        } else {
            wp_redirect($payment_url);
            exit;
        }
    }

    // Si algo falla, devolver error
    if ($is_mobile_app) {
        wp_send_json(array(
            'success' => false,
            'error' => 'No se pudo procesar el pago'
        ));
        exit;
    } else {
        wp_redirect($order->get_view_order_url());
        exit;
    }
}