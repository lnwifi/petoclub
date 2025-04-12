<?php
/**
 * Funciones de autenticación para la integración de Supabase con WordPress
 */

if (!defined('ABSPATH')) {
    exit;
}

// Agregar hooks para el manejo de autenticación
add_action('wp_ajax_nopriv_petoclub_supabase_login', 'petoclub_handle_supabase_login');
add_action('wp_ajax_nopriv_petoclub_supabase_register', 'petoclub_handle_supabase_register');
add_action('wp_login', 'petoclub_sync_login_with_supabase', 10, 2);
add_action('user_register', 'petoclub_sync_register_with_supabase');

/**
 * Maneja el inicio de sesión a través de Supabase
 */
function petoclub_handle_supabase_login() {
    check_ajax_referer('petoclub-auth-nonce', 'nonce');

    $email = sanitize_email($_POST['email']);
    $password = $_POST['password'];

    if (empty($email) || empty($password)) {
        wp_send_json_error('Credenciales incompletas');
    }

    $supabase_user = SupabaseAPI::authenticate($email, $password);

    if ($supabase_user) {
        $user = get_user_by('email', $email);
        
        if ($user) {
            // Actualizar datos de Supabase en WordPress
            SupabaseAPI::sync_user_data($user->ID, $supabase_user);
            
            // Iniciar sesión en WordPress
            wp_set_auth_cookie($user->ID);

            // Obtener URL de redirección por defecto
            $redirect_url = home_url();
            
            // Si hay una URL de checkout pendiente en la sesión, usarla
            if (isset($_SESSION['checkout_redirect'])) {
                $redirect_url = $_SESSION['checkout_redirect'];
                unset($_SESSION['checkout_redirect']);
            }

            wp_send_json_success(array(
                'redirect_url' => $redirect_url,
                'defaultRedirectUrl' => home_url()
            ));
        }
    }

    wp_send_json_error('Credenciales inválidas');
}

/**
 * Maneja el registro de usuarios a través de Supabase
 */
function petoclub_handle_supabase_register() {
    check_ajax_referer('petoclub-auth-nonce', 'nonce');

    $email = sanitize_email($_POST['email']);
    $password = $_POST['password'];
    $full_name = sanitize_text_field($_POST['full_name']);

    if (empty($email) || empty($password) || empty($full_name)) {
        wp_send_json_error('Datos incompletos');
    }

    // Crear usuario en Supabase
    $supabase_user = SupabaseAPI::create_user($email, $password, array(
        'full_name' => $full_name
    ));

    if ($supabase_user) {
        // Crear usuario en WordPress
        $userdata = array(
            'user_login' => $email,
            'user_email' => $email,
            'user_pass' => $password,
            'display_name' => $full_name,
            'show_admin_bar_front' => false
        );

        $user_id = wp_insert_user($userdata);

        if (!is_wp_error($user_id)) {
            // Sincronizar datos
            SupabaseAPI::sync_user_data($user_id, $supabase_user);
            
            // Iniciar sesión automáticamente
            wp_set_auth_cookie($user_id);

            // Obtener URL de redirección por defecto
            $redirect_url = home_url();
            
            // Si hay una URL de checkout pendiente en la sesión, usarla
            if (isset($_SESSION['checkout_redirect'])) {
                $redirect_url = $_SESSION['checkout_redirect'];
                unset($_SESSION['checkout_redirect']);
            }

            wp_send_json_success(array(
                'redirect_url' => $redirect_url,
                'defaultRedirectUrl' => home_url()
            ));
        }
    }

    wp_send_json_error('Error al crear el usuario');
}

/**
 * Sincroniza el inicio de sesión de WordPress con Supabase
 */
function petoclub_sync_login_with_supabase($user_login, $user) {
    $supabase_uid = get_user_meta($user->ID, 'supabase_uid', true);
    
    if (!$supabase_uid) {
        // Si el usuario no tiene ID de Supabase, intentar sincronizar
        $supabase_user = SupabaseAPI::authenticate($user->user_email, '');
        if ($supabase_user) {
            SupabaseAPI::sync_user_data($user->ID, $supabase_user);
        }
    }
}

/**
 * Sincroniza el registro de WordPress con Supabase
 */
function petoclub_sync_register_with_supabase($user_id) {
    $user = get_user_by('id', $user_id);
    if ($user) {
        // Generar contraseña temporal para Supabase si es necesario
        $temp_password = wp_generate_password();
        
        $supabase_user = SupabaseAPI::create_user(
            $user->user_email,
            $temp_password,
            array('full_name' => $user->display_name)
        );

        if ($supabase_user) {
            SupabaseAPI::sync_user_data($user_id, $supabase_user);
        }
    }
}