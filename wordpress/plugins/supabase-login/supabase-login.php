<?php
/*
Plugin Name: Supabase Login for WordPress
Description: Permite a los usuarios iniciar sesión y registrarse en WordPress usando Supabase Auth (email/password, magic link o social login). Sincroniza usuarios y sesiones para compras en WooCommerce desde web o app.
Version: 1.0
Author: Cascade AI
*/

if (!defined('ABSPATH')) exit;

define('SUPABASE_LOGIN_PLUGIN_PATH', plugin_dir_path(__FILE__));

define('SUPABASE_URL', defined('PETOCLUB_SUPABASE_URL') ? PETOCLUB_SUPABASE_URL : '');
define('SUPABASE_ANON_KEY', defined('PETOCLUB_SUPABASE_ANON_KEY') ? PETOCLUB_SUPABASE_ANON_KEY : '');

// 1. Mostrar botón de login con Supabase en la página de login de WP
add_action('login_form', function() {
    echo '<div style="margin-bottom:16px;text-align:center;">';
    echo '<button id="supabase-login-btn" type="button">Iniciar sesión con Supabase</button>';
    echo '<div id="supabase-login-modal" style="display:none;"></div>';
    echo '</div>';
    echo '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>';
    echo '<script>';
    echo 'const supabase = window.supabase = supabase.createClient("' . SUPABASE_URL . '", "' . SUPABASE_ANON_KEY . '");';
    echo 'document.getElementById("supabase-login-btn").onclick = async function() {';
    echo '  const email = prompt("Ingresa tu email de Supabase:");';
    echo '  const pass = prompt("Ingresa tu contraseña de Supabase:");';
    echo '  if (!email || !pass) return alert("Debes ingresar ambos datos");';
    echo '  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });';
    echo '  if (error) return alert("Error: " + error.message);';
    echo '  // Enviar el token al backend para login en WP';
    echo '  fetch("' . site_url('/wp-json/supabase-login/v1/auth') . '", {';
    echo '    method: "POST",';
    echo '    headers: { "Content-Type": "application/json" },';
    echo '    body: JSON.stringify({ supabase_token: data.session.access_token })';
    echo '  }).then(r => r.json()).then(resp => {';
    echo '    if (resp.success) { window.location = "' . admin_url() . '"; }';
    echo '    else alert("No se pudo iniciar sesión en WordPress");';
    echo '  });';
    echo '};';
    echo '</script>';
});

// 2. Endpoint para autenticar token de Supabase y loguear usuario en WP
add_action('rest_api_init', function() {
    register_rest_route('supabase-login/v1', '/auth', [
        'methods' => 'POST',
        'callback' => 'supabase_login_auth_callback',
        'permission_callback' => '__return_true',
    ]);
});

function supabase_login_auth_callback($request) {
    $params = $request->get_json_params();
    $supabase_token = isset($params['supabase_token']) ? sanitize_text_field($params['supabase_token']) : null;
    if (!$supabase_token) return [ 'success' => false, 'error' => 'No token' ];
    $supabase_url = SUPABASE_URL;
    $supabase_anon_key = SUPABASE_ANON_KEY;
    if (!$supabase_url || !$supabase_anon_key) return [ 'success' => false, 'error' => 'No Supabase credentials' ];
    $response = wp_remote_get($supabase_url . '/auth/v1/user', [
        'headers' => [
            'apikey' => $supabase_anon_key,
            'Authorization' => 'Bearer ' . $supabase_token,
        ]
    ]);
    if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) return [ 'success' => false, 'error' => 'Invalid token' ];
    $user_data = json_decode(wp_remote_retrieve_body($response), true);
    $email = $user_data['email'] ?? null;
    if (!$email) return [ 'success' => false, 'error' => 'No email' ];
    $user = get_user_by('email', $email);
    if (!$user) {
        $user_id = wp_create_user($email, wp_generate_password(), $email);
        $user = get_user_by('id', $user_id);
    }
    wp_set_current_user($user->ID);
    wp_set_auth_cookie($user->ID, true);
    return [ 'success' => true ];
}
