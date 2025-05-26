<?php
/**
 * Puente de sincronización de carrito para WooCommerce desde app externa
 * Uso: /checkout-sync-bridge.php?products=[json]&supabase_token=xxx
 * Este archivo debe estar en la raíz de WordPress.
 */

require_once __DIR__ . '/wp-load.php';

date_default_timezone_set('America/Argentina/Buenos_Aires');

// 1. Recibir parámetros
$products_json = isset($_GET['products']) ? $_GET['products'] : null;
$supabase_token = isset($_GET['supabase_token']) ? $_GET['supabase_token'] : null;

// DEBUG: Mostrar token y productos en pantalla si hay error
if (!$products_json || !$supabase_token) {
    echo '<pre>';
    echo 'TOKEN: ' . htmlspecialchars($supabase_token) . "\n";
    echo 'PRODUCTS: ' . htmlspecialchars($products_json) . "\n";
    echo '</pre>';
    wp_die('Faltan parámetros');
}

$products = json_decode($products_json, true);
if (!is_array($products)) {
    $products = json_decode(stripslashes($products_json), true);
}
if (!is_array($products)) {
    echo '<pre>';
    echo 'TOKEN: ' . htmlspecialchars($supabase_token) . "\n";
    echo 'PRODUCTS: ' . htmlspecialchars($products_json) . "\n";
    echo '</pre>';
    wp_die('Parámetro de productos inválido');
}

// Debug temporal: guarda el valor recibido para inspección
file_put_contents(__DIR__.'/products_debug.txt', print_r($products_json, true));

// 2. Validar usuario por token Supabase (misma lógica que REST)
if (!function_exists('petoclub_get_user_by_supabase_token')) {
function petoclub_get_user_by_supabase_token($token) {
    file_put_contents(__DIR__.'/../wp-content/token_debug.txt', "ENTRA EN FUNCION\n", FILE_APPEND);
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        echo '<pre>';
        echo 'TOKEN: ' . htmlspecialchars($token) . "\n";
        echo 'PAYLOAD: N/A' . "\n";
        echo 'EMAIL: N/A' . "\n";
        echo '</pre>';
        return false;
    }
    $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
    if (!$payload || !isset($payload['email'])) {
        echo '<pre>';
        echo 'TOKEN: ' . htmlspecialchars($token) . "\n";
        echo 'PAYLOAD: ' . htmlspecialchars(json_encode($payload)) . "\n";
        echo 'EMAIL: N/A' . "\n";
        echo '</pre>';
        return false;
    }
    $email = $payload['email'];
    echo '<pre>';
    echo 'TOKEN: ' . htmlspecialchars($token) . "\n";
    echo 'PAYLOAD: ' . htmlspecialchars(json_encode($payload)) . "\n";
    echo 'EMAIL: ' . htmlspecialchars($email) . "\n";
    echo '</pre>';
    file_put_contents(__DIR__.'/../wp-content/token_debug.txt', "\nTOKEN:\n" . print_r($token, true), FILE_APPEND);
    file_put_contents(__DIR__.'/../wp-content/token_debug.txt', "\nPAYLOAD:\n" . print_r($payload, true), FILE_APPEND);
    file_put_contents(__DIR__.'/../wp-content/token_debug.txt', "\nEMAIL:\n" . print_r($email, true), FILE_APPEND);
    $user = get_user_by('email', $email);
    if ($user && isset($user->ID)) {
        return $user;
    }
    // Crear usuario automáticamente si no existe
    $user_id = wp_create_user($email, wp_generate_password(), $email);
    return get_user_by('id', $user_id);
}
}

$user = petoclub_get_user_by_supabase_token($supabase_token);
if (!$user || !isset($user->ID)) {
    echo '<pre>';
    echo 'TOKEN: ' . htmlspecialchars($supabase_token) . "\n";
    echo '</pre>';
    wp_die('Token inválido o usuario no encontrado');
}

// 3. Setear usuario global y sesión WooCommerce
wp_set_current_user($user->ID);
if (function_exists('wc_set_customer_auth_cookie')) {
    wc_set_customer_auth_cookie($user->ID);
}
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
    wp_die('No se pudo inicializar el carrito');
}

// 5. Vaciar y llenar el carrito
WC()->cart->empty_cart();
foreach ($products as $p) {
    if (!isset($p['id'])) continue;
    $product_id = intval($p['id']);
    $qty = isset($p['qty']) ? intval($p['qty']) : 1;
    WC()->cart->add_to_cart($product_id, $qty);
}

// 6. Redirigir al checkout
$checkout_url = function_exists('wc_get_checkout_url') ? wc_get_checkout_url() : site_url('/checkout/');
wp_redirect($checkout_url);
exit;
