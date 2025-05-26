<?php
/**
 * Plugin endpoint: Sincronización robusta de carrito WooCommerce desde app externa
 * Endpoint: /wp-json/petoclub/v2/sync-cart
 *
 * Recibe: productos + token Supabase
 * Valida usuario, sincroniza carrito y redirige al checkout
 * ¡No depende de archivos legacy ni lógica obsoleta!
 */

add_action('rest_api_init', function() {
    register_rest_route('petoclub/v2', '/sync-cart', [
        'methods' => 'POST',
        'callback' => 'petoclub_v2_sync_cart',
        'permission_callback' => '__return_true', // Seguridad custom interna
    ]);
});

function petoclub_v2_sync_cart($request) {
    // 1. Validar entrada
    $params = $request->get_json_params();
    $products = isset($params['products']) ? $params['products'] : [];
    $supabase_token = isset($params['supabase_token']) ? $params['supabase_token'] : null;
    if (!$supabase_token || empty($products)) {
        return new WP_REST_Response([
            'success' => false,
            'error' => 'Faltan productos o token',
        ], 400);
    }

    // 2. Validar usuario por token Supabase (reemplaza esto por tu lógica real)
    $user = petoclub_get_user_by_supabase_token($supabase_token);
    if (!$user || !isset($user->ID)) {
        return new WP_REST_Response([
            'success' => false,
            'error' => 'Token inválido o usuario no encontrado',
        ], 401);
    }

    // 3. Setear usuario global y sesión WooCommerce
    wp_set_current_user($user->ID);
    if (function_exists('wc_set_customer_auth_cookie')) {
        wc_set_customer_auth_cookie($user->ID);
    }
    // IMPORTANTE: Forzar la carga de datos del usuario en WooCommerce
    if (function_exists('WC')) {
        if (WC()->session) {
            WC()->session->set_customer_session_cookie(true);
        }
        if (WC()->customer) {
            WC()->customer = new WC_Customer($user->ID);
        } else {
            WC()->customer = new WC_Customer($user->ID);
        }
    }

    // 4. Inicializar carrito y sesión si hace falta
    if (function_exists('WC') && is_null(WC()->cart)) {
        if (class_exists('WC_Session_Handler')) {
            WC()->session = new WC_Session_Handler();
            WC()->session->init();
        }
        if (class_exists('WC_Cart')) {
            WC()->cart = new WC_Cart();
        }
    }
    if (!WC()->cart) {
        return new WP_REST_Response([
            'success' => false,
            'error' => 'No se pudo inicializar el carrito',
        ], 500);
    }

    // 5. Vaciar y llenar el carrito
    WC()->cart->empty_cart();
    foreach ($products as $p) {
        if (!isset($p['id'])) continue;
        $product_id = intval($p['id']);
        $qty = isset($p['qty']) ? intval($p['qty']) : 1;
        WC()->cart->add_to_cart($product_id, $qty);
    }

    // 6. Devolver URL de checkout
    $checkout_url = function_exists('wc_get_checkout_url') ? wc_get_checkout_url() : site_url('/checkout/');
    return new WP_REST_Response([
        'success' => true,
        'cart_count' => WC()->cart->get_cart_contents_count(),
        'redirect_url' => $checkout_url,
    ], 200);
}

// --- FUNCION REAL: Validar token Supabase y mapear usuario WP ---
if (!function_exists('petoclub_get_user_by_supabase_token')) {
function petoclub_get_user_by_supabase_token($token) {
    // 1. Decodificar el JWT (sin validación de firma, solo payload)
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
    if (!$payload || !isset($payload['email'])) return false;
    $email = $payload['email'];

    // 2. Buscar usuario de WP por email
    $user = get_user_by('email', $email);
    if ($user && isset($user->ID)) {
        return $user;
    }
    // 3. (Opcional) Crear usuario si no existe
    // $user_id = wp_create_user($email, wp_generate_password(), $email);
    // return get_user_by('id', $user_id);
    return false;
}
}
