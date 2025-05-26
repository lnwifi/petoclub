<?php
/**
 * Endpoint personalizado para sincronizar el carrito y autenticar usuario desde la app móvil
 * Uso: /wp-json/petoclub/v1/sync-cart
 * Método: POST
 * Body: { products: [{ id: 123, qty: 2 }, ...], supabase_token: '...' }
 */

add_action('rest_api_init', function () {
    register_rest_route('petoclub/v1', '/sync-cart', [
        'methods' => 'POST',
        'callback' => 'petoclub_sync_cart_from_app',
        'permission_callback' => '__return_true',
    ]);
});

function petoclub_sync_cart_from_app($request) {
    error_log('Entrando a petoclub_sync_cart_from_app');
    $params = $request->get_json_params();
    $supabase_token = isset($params['supabase_token']) ? sanitize_text_field($params['supabase_token']) : null;
    if (!$supabase_token) {
        error_log('No se recibió token');
        return new WP_Error('no_token', 'No Supabase token', ['status' => 401]);
    }
    // Obtener credenciales de Supabase desde wp-config.php
    $supabase_url = defined('PETOCLUB_SUPABASE_URL') ? PETOCLUB_SUPABASE_URL : '';
    $supabase_anon_key = defined('PETOCLUB_SUPABASE_ANON_KEY') ? PETOCLUB_SUPABASE_ANON_KEY : '';
    if (!$supabase_url || !$supabase_anon_key) {
        error_log('Faltan credenciales de Supabase en wp-config.php');
        return new WP_Error('no_supabase_creds', 'Faltan credenciales de Supabase', ['status' => 500]);
    }
    // Validar token Supabase y obtener usuario
    $response = wp_remote_get($supabase_url . '/auth/v1/user', [
        'headers' => [
            'apikey' => $supabase_anon_key,
            'Authorization' => 'Bearer ' . $supabase_token,
        ]
    ]);
    if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
        error_log('Token Supabase inválido');
        return new WP_Error('invalid_token', 'Token inválido', ['status' => 401]);
    }
    $user_data = json_decode(wp_remote_retrieve_body($response), true);
    $email = $user_data['email'] ?? null;
    if (!$email) {
        error_log('No se pudo obtener el email del usuario Supabase');
        return new WP_Error('no_email', 'No email from Supabase', ['status' => 401]);
    }
    // Buscar o crear usuario WP
    $user = get_user_by('email', $email);
    if (!$user) {
        $user_id = wp_create_user($email, wp_generate_password(), $email);
        $user = get_user_by('id', $user_id);
        error_log('Usuario WP creado: ' . $email);
    }
    // Iniciar sesión en WP
    wp_set_current_user($user->ID);
    wp_set_auth_cookie($user->ID, true);
    error_log('Usuario WP logueado: ' . $email);
    // Inicializar WooCommerce
    if (!function_exists('WC')) {
        include_once(ABSPATH . 'wp-content/plugins/woocommerce/woocommerce.php');
    }
    if (class_exists('WooCommerce')) {
        if (!WC()->session) { WC()->initialize_session(); }
        if (!WC()->cart) { WC()->initialize_cart(); }
    }
    // Vaciar y llenar el carrito
    if (WC()->cart) {
        WC()->cart->empty_cart();
        $products = $params['products'] ?? [];
        foreach ($products as $item) {
            $product_id = intval($item['id']);
            $qty = intval($item['qty']);
            if ($product_id && $qty) {
                WC()->cart->add_to_cart($product_id, $qty);
            }
        }
        error_log('Carrito sincronizado');
    }
    // Devolver URL de checkout con token de auto-login
    $user_id = $user->ID;
    $token = wp_create_nonce('petoclub_auto_login_' . $user_id);
    $auto_login_url = site_url('/wp-json/petoclub/v1/auto-login?petoclub_token=' . $token . '&user_id=' . $user_id);
    $redirect_url = wc_get_checkout_url();
    $final_url = $auto_login_url . '&redirect_to=' . urlencode($redirect_url);
    return [
        'redirect_url' => $final_url,
        'success' => true,
        'cart_count' => WC()->cart ? WC()->cart->get_cart_contents_count() : 0,
    ];
}
