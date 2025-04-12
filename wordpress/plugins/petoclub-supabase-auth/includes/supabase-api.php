<?php
/**
 * Clase para manejar la integración con la API de Supabase
 */

if (!defined('ABSPATH')) {
    exit;
}

class SupabaseAPI {
    private static $supabase_url;
    private static $supabase_key;

    public static function init() {
        self::$supabase_url = PETOCLUB_SUPABASE_URL;
        self::$supabase_key = PETOCLUB_SUPABASE_ANON_KEY;
    }

    public static function authenticate($email, $password) {
        $url = self::$supabase_url . '/auth/v1/token?grant_type=password';
        
        $response = wp_remote_post($url, array(
            'headers' => array(
                'Content-Type' => 'application/json',
                'apikey' => self::$supabase_key,
            ),
            'body' => json_encode(array(
                'email' => $email,
                'password' => $password
            ))
        ));

        if (is_wp_error($response)) {
            return false;
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        if (isset($body['user'])) {
            return $body['user'];
        }

        return false;
    }

    public static function create_user($email, $password, $user_metadata = array()) {
        $url = self::$supabase_url . '/auth/v1/signup';
        
        $response = wp_remote_post($url, array(
            'headers' => array(
                'Content-Type' => 'application/json',
                'apikey' => self::$supabase_key,
            ),
            'body' => json_encode(array(
                'email' => $email,
                'password' => $password,
                'data' => $user_metadata
            ))
        ));

        if (is_wp_error($response)) {
            return false;
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        if (isset($body['user'])) {
            return $body['user'];
        }

        return false;
    }

    public static function update_user_metadata($user_id, $metadata) {
        $url = self::$supabase_url . '/auth/v1/user';
        
        $response = wp_remote_put($url, array(
            'headers' => array(
                'Content-Type' => 'application/json',
                'apikey' => self::$supabase_key,
                'Authorization' => 'Bearer ' . self::get_user_token($user_id)
            ),
            'body' => json_encode(array(
                'data' => $metadata
            ))
        ));

        return !is_wp_error($response);
    }

    private static function get_user_token($user_id) {
        return get_user_meta($user_id, 'supabase_token', true);
    }

    public static function sync_user_data($wp_user_id, $supabase_user) {
        // Sincronizar datos del usuario entre WordPress y Supabase
        update_user_meta($wp_user_id, 'supabase_uid', $supabase_user['id']);
        update_user_meta($wp_user_id, 'supabase_token', $supabase_user['access_token']);
        
        // Sincronizar roles y capacidades
        $user = new WP_User($wp_user_id);
        if (isset($supabase_user['app_metadata']['role'])) {
            switch ($supabase_user['app_metadata']['role']) {
                case 'admin':
                    $user->set_role('administrator');
                    break;
                case 'editor':
                    $user->set_role('editor');
                    break;
                default:
                    $user->set_role('subscriber');
            }
        }

        return true;
    }
}

// Inicializar la clase
SupabaseAPI::init();