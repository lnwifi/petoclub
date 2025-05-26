<?php
/**
 * Endpoint para login automático vía token temporal (nonce) desde la app
 * Uso: /wp-json/petoclub/v1/auto-login?petoclub_token=XXX
 */
add_action('rest_api_init', function () {
    register_rest_route('petoclub/v1', '/auto-login', [
        'methods' => 'GET',
        'callback' => 'petoclub_auto_login_from_token',
        'permission_callback' => '__return_true',
    ]);
});

function petoclub_auto_login_from_token($request) {
    $token = isset($_GET['petoclub_token']) ? sanitize_text_field($_GET['petoclub_token']) : null;
    if (!$token) {
        return new WP_Error('no_token', 'No token provided', ['status' => 400]);
    }
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
    if (!$user_id) {
        return new WP_Error('no_user_id', 'No user_id provided', ['status' => 400]);
    }
    // Validar nonce
    if (!wp_verify_nonce($token, 'petoclub_auto_login_' . $user_id)) {
        return new WP_Error('invalid_token', 'Token inválido', ['status' => 401]);
    }
    $user = get_user_by('id', $user_id);
    if (!$user) {
        return new WP_Error('no_user', 'Usuario no encontrado', ['status' => 404]);
    }
    // Loguear usuario
    wp_set_current_user($user->ID);
    wp_set_auth_cookie($user->ID, true);
    // Redirigir al checkout usando HTML+JS para forzar seteo de cookie
    $redirect_url = isset($_GET['redirect_to']) ? esc_url_raw($_GET['redirect_to']) : wc_get_checkout_url();
    echo '<html><body><script>window.location.href="' . esc_url($redirect_url) . '";</script></body></html>';
    exit;
}
