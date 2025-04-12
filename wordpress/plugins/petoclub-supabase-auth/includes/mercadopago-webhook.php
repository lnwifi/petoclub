<?php
/**
 * Manejo de webhooks de MercadoPago
 * Procesa notificaciones de pagos realizados tanto desde la web como desde la app móvil
 */

if (!defined('ABSPATH')) {
    exit;
}

// Incluir la clase de MercadoPago si no está incluida
if (!class_exists('MP')) {
    require_once plugin_dir_path(__FILE__) . 'mercadopago-sdk.php';
}

// Registrar el endpoint para webhooks de MercadoPago
add_action('rest_api_init', function () {
    register_rest_route('petoclub/v1', '/mercadopago-webhook', array(
        'methods' => 'POST',
        'callback' => 'petoclub_handle_mercadopago_webhook',
        'permission_callback' => '__return_true'
    ));
});

/**
 * Maneja las notificaciones de webhook de MercadoPago
 * Soporta notificaciones tanto de la web como de la app móvil
 */
function petoclub_handle_mercadopago_webhook($request) {
    $body = $request->get_json_params();
    
    // Registrar la notificación recibida para depuración
    error_log('Webhook de MercadoPago recibido: ' . json_encode($body));
    
    // Verificar que tengamos los datos necesarios
    if (!isset($body['data']['id']) || !isset($body['type'])) {
        return new WP_Error('invalid_payload', 'Payload inválido', array('status' => 400));
    }

    // Obtener el ID del pago de MercadoPago
    $payment_id = $body['data']['id'];
    
    // Obtener información completa del pago desde MercadoPago
    $mp_settings = get_option('woocommerce_mercadopago_settings');
    $mp_access_token = isset($mp_settings['access_token']) ? $mp_settings['access_token'] : '';
    
    if (empty($mp_access_token)) {
        return new WP_Error('missing_credentials', 'Credenciales de MercadoPago no configuradas', array('status' => 500));
    }
    
    $mp = new MP($mp_access_token);
    $payment_info = $mp->get_payment($payment_id);
    
    if (!$payment_info) {
        return new WP_Error('payment_not_found', 'No se pudo obtener información del pago', array('status' => 404));
    }
    
    // Buscar el pedido por referencia externa o por ID de preferencia
    $order_id = null;
    
    // Primero intentar por referencia externa (order_id)
    if (isset($payment_info['external_reference']) && !empty($payment_info['external_reference'])) {
        $order_id = $payment_info['external_reference'];
    }
    // Si no hay referencia externa, buscar por metadata
    else if (isset($payment_info['metadata']['order_id'])) {
        $order_id = $payment_info['metadata']['order_id'];
    }
    
    if (!$order_id) {
        // Buscar el pedido por el ID de pago de MercadoPago como último recurso
        $orders = wc_get_orders(array(
            'meta_key' => '_mercadopago_payment_id',
            'meta_value' => $payment_id,
            'limit' => 1
        ));
        
        if (!empty($orders)) {
            $order = $orders[0];
            $order_id = $order->get_id();
        }
    } else {
        $order = wc_get_order($order_id);
    }

    if (!$order || !$order_id) {
        return new WP_Error('order_not_found', 'Pedido no encontrado', array('status' => 404));
    }

    // Guardar el ID de pago de MercadoPago en el pedido si no existe
    if (!$order->get_meta('_mercadopago_payment_id')) {
        $order->update_meta_data('_mercadopago_payment_id', $payment_id);
    }
    
    // Determinar si el pago viene de la app móvil o de la web
    $is_mobile_app = $order->get_meta('_mercadopago_source') === 'mobile_app';
    $source_note = $is_mobile_app ? 'desde la app móvil' : 'desde la web';
    
    // Procesar el estado del pago
    $payment_status = isset($payment_info['status']) ? $payment_info['status'] : $body['data']['status'];
    
    // Registrar información del pago para depuración
    $order->add_order_note('Notificación de pago MercadoPago recibida ' . $source_note . '. Estado: ' . $payment_status);
    
    switch ($payment_status) {
        case 'approved':
            $order->payment_complete($payment_id);
            $order->add_order_note('Pago aprobado por MercadoPago ' . $source_note);
            break;
        case 'pending':
            $order->update_status('pending', 'Pago pendiente en MercadoPago ' . $source_note);
            break;
        case 'in_process':
            $order->update_status('on-hold', 'Pago en proceso en MercadoPago ' . $source_note);
            break;
        case 'rejected':
            $order->update_status('failed', 'Pago rechazado por MercadoPago ' . $source_note);
            break;
        case 'refunded':
            $order->update_status('refunded', 'Pago reembolsado en MercadoPago ' . $source_note);
            break;
        case 'cancelled':
            $order->update_status('cancelled', 'Pago cancelado en MercadoPago ' . $source_note);
            break;
        default:
            $order->add_order_note('Estado de pago desconocido en MercadoPago: ' . $payment_status . ' ' . $source_note);
            break;
    }
    
    // Guardar cambios en el pedido
    $order->save();

    return new WP_REST_Response(array('status' => 'success'), 200);
}