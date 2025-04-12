<?php
/**
 * Plugin Name: PetoClub Supabase Auth
 * Description: Integración de Supabase Auth con WordPress y WooCommerce
 * Version: 1.0.0
 * Author: PetoClub
 * Text Domain: petoclub-supabase-auth
 */

if (!defined('ABSPATH')) {
    exit;
}

// Definir constantes
define('PETOCLUB_SUPABASE_URL', 'https://cbrxgjksefmgtoatkbbs.supabase.co');
define('PETOCLUB_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNicnhnamtzZWZtZ3RvYXRrYmJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MjgzNDgsImV4cCI6MjA1OTEwNDM0OH0.Y4yPbBgtkFNekGyaJ9njdMecgdwEznECoivKz12F2Hc');

class PetoClubSupabaseAuth {
    private static $instance = null;

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('init', array($this, 'init'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_filter('authenticate', array($this, 'authenticate_user'), 10, 3);
    }

    public function init() {
        // Inicializar el plugin
        $this->include_files();
    }

    private function include_files() {
        // Incluir archivos necesarios
        require_once plugin_dir_path(__FILE__) . 'includes/supabase-api.php';
        require_once plugin_dir_path(__FILE__) . 'includes/auth-functions.php';
        require_once plugin_dir_path(__FILE__) . 'includes/mercadopago-sdk.php';
        require_once plugin_dir_path(__FILE__) . 'includes/mercadopago-webhook.php';
        require_once plugin_dir_path(__FILE__) . 'includes/woocommerce-integration.php';
        require_once plugin_dir_path(__FILE__) . 'includes/rest-api.php';
    }

    public function enqueue_scripts() {
        wp_enqueue_script(
            'supabase-js',
            'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
            array(),
            '2.0.0',
            true
        );

        wp_enqueue_script(
            'petoclub-auth',
            plugin_dir_url(__FILE__) . 'assets/js/auth.js',
            array('supabase-js'),
            '1.0.0',
            true
        );

        wp_localize_script('petoclub-auth', 'petoClubAuth', array(
            'supabaseUrl' => PETOCLUB_SUPABASE_URL,
            'supabaseAnonKey' => PETOCLUB_SUPABASE_ANON_KEY,
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('petoclub-auth-nonce')
        ));
    }

    public function authenticate_user($user, $username, $password) {
        // Si ya hay un usuario autenticado, no interferir
        if ($user instanceof WP_User) {
            return $user;
        }

        // Intentar autenticar con Supabase
        $supabase_user = $this->authenticate_with_supabase($username, $password);
        if ($supabase_user) {
            // Buscar o crear usuario en WordPress
            return $this->get_or_create_wp_user($supabase_user);
        }

        return null;
    }

    private function authenticate_with_supabase($email, $password) {
        // Esta función será implementada en supabase-api.php
        return SupabaseAPI::authenticate($email, $password);
    }

    private function get_or_create_wp_user($supabase_user) {
        $user = get_user_by('email', $supabase_user['email']);

        if (!$user) {
            // Crear nuevo usuario en WordPress
            $userdata = array(
                'user_login' => $supabase_user['email'],
                'user_email' => $supabase_user['email'],
                'user_pass' => wp_generate_password(),
                'show_admin_bar_front' => false
            );

            $user_id = wp_insert_user($userdata);
            if (is_wp_error($user_id)) {
                return null;
            }

            $user = get_user_by('id', $user_id);
        }

        return $user;
    }
}

// Inicializar el plugin
PetoClubSupabaseAuth::get_instance();