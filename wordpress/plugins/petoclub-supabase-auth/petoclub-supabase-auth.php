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
        // Incluir el nuevo endpoint de sincronización de carrito
        require_once plugin_dir_path(__FILE__) . 'includes/cart-sync-endpoint.php';
        // Incluir el NUEVO endpoint robusto
        require_once plugin_dir_path(__FILE__) . 'includes/petoclub-cart-sync.php';
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

// --- CORS definitivo para REST API (robusto, fuerza headers en cualquier caso) ---
add_action('init', function() {
    // Solo para REST API
    if (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/wp-json/') === 0) {
        header('Access-Control-Allow-Origin: http://localhost:8081');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Authorization, Content-Type');
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            status_header(200);
            exit;
        }
    }
}, 0);

// --- Habilitar CORS para desarrollo local (localhost:8081) ---
add_action('rest_api_init', function () {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function ($value) {
        header('Access-Control-Allow-Origin: http://localhost:8081');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Authorization, Content-Type');
        return $value;
    });
});

// --- Habilitar CORS para desarrollo local (localhost:8081) también en send_headers global ---
add_action('send_headers', function() {
    if (isset($_SERVER['HTTP_ORIGIN']) && $_SERVER['HTTP_ORIGIN'] === 'http://localhost:8081') {
        header('Access-Control-Allow-Origin: http://localhost:8081');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Authorization, Content-Type');
    }
});

// Inicializar el plugin
PetoClubSupabaseAuth::get_instance();