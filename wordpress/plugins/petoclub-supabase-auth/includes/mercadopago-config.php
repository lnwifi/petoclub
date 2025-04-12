<?php
/**
 * Configuración y validación de MercadoPago
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Obtiene y valida las credenciales de MercadoPago
 * 
 * @return array Credenciales validadas o array con error
 */
function petoclub_get_mercadopago_credentials() {
    // Obtener configuración de MercadoPago
    $mp_settings = get_option('woocommerce_mercadopago_settings');
    
    if (!is_array($mp_settings)) {
        error_log('MercadoPago: No se encontró la configuración del plugin');
        return array(
            'success' => false,
            'error' => 'Plugin de MercadoPago no configurado correctamente',
            'error_code' => 'MP_NO_CONFIG'
        );
    }
    
    // Validar access token
    $mp_access_token = isset($mp_settings['access_token']) ? trim($mp_settings['access_token']) : '';
    error_log('MercadoPago: Validando access token - ' . substr($mp_access_token, 0, 10) . '...');
    if (empty($mp_access_token)) {
        error_log('MercadoPago: Access token no configurado');
        return array(
            'success' => false,
            'error' => 'Access token de MercadoPago no configurado',
            'error_code' => 'MP_NO_ACCESS_TOKEN'
        );
    }

    // Validar public key
    $mp_public_key = isset($mp_settings['public_key']) ? trim($mp_settings['public_key']) : '';
    error_log('MercadoPago: Validando public key - ' . substr($mp_public_key, 0, 10) . '...');
    if (empty($mp_public_key)) {
        error_log('MercadoPago: Public key no configurada');
        return array(
            'success' => false,
            'error' => 'Public key de MercadoPago no configurada',
            'error_code' => 'MP_NO_PUBLIC_KEY'
        );
    }

    // Validar formato del access token (debe comenzar con TEST- o APP_USR-)
    if (!preg_match('/^(TEST-|APP_USR-)/', $mp_access_token)) {
        error_log('MercadoPago: Formato de access token inválido');
        return array(
            'success' => false,
            'error' => 'Formato de access token de MercadoPago inválido',
            'error_code' => 'MP_INVALID_ACCESS_TOKEN'
        );
    }

    // Validar formato de la public key (debe comenzar con TEST- o APP_USR-)
    if (!preg_match('/^(TEST-|APP_USR-)/', $mp_public_key)) {
        error_log('MercadoPago: Formato de public key inválido');
        return array(
            'success' => false,
            'error' => 'Formato de public key de MercadoPago inválido',
            'error_code' => 'MP_INVALID_PUBLIC_KEY'
        );
    }

    // Validar que ambas credenciales sean del mismo modo (test o producción)
    $is_test_token = strpos($mp_access_token, 'TEST-') === 0;
    $is_test_key = strpos($mp_public_key, 'TEST-') === 0;
    
    if ($is_test_token !== $is_test_key) {
        error_log('MercadoPago: Las credenciales no coinciden en modo test/producción');
        return array(
            'success' => false,
            'error' => 'Las credenciales de MercadoPago deben ser ambas de test o ambas de producción',
            'error_code' => 'MP_MIXED_CREDENTIALS'
        );
    }

    // Registrar el modo de operación
    error_log('MercadoPago: Operando en modo ' . ($is_test_token ? 'TEST' : 'PRODUCCIÓN'));

    // Si todo está correcto, devolver las credenciales
    return array(
        'success' => true,
        'access_token' => $mp_access_token,
        'public_key' => $mp_public_key,
        'mode' => $is_test_token ? 'test' : 'production'
    );

}

/**
 * Valida los datos de una preferencia de pago
 * 
 * @param array $preference_data Datos de la preferencia
 * @return array Resultado de la validación
 */
function petoclub_validate_preference_data($preference_data) {
    if (empty($preference_data['items'])) {
        return array(
            'success' => false,
            'error' => 'La preferencia no contiene items',
            'error_code' => 'MP_NO_ITEMS'
        );
    }

    foreach ($preference_data['items'] as $item) {
        if (!isset($item['unit_price']) || $item['unit_price'] <= 0) {
            return array(
                'success' => false,
                'error' => 'Precio unitario inválido para item: ' . (isset($item['title']) ? $item['title'] : 'desconocido'),
                'error_code' => 'MP_INVALID_PRICE'
            );
        }
    }

    return array('success' => true);
}