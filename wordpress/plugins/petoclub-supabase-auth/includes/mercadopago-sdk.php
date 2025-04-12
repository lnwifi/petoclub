<?php
/**
 * Clase para manejar la integración con MercadoPago
 */

if (!defined('ABSPATH')) {
    exit;
}

class MP {
    private $access_token;
    
    /**
     * Constructor de la clase
     * 
     * @param string $access_token Token de acceso de MercadoPago
     */
    public function __construct($access_token) {
        $this->access_token = $access_token;
    }
    
    /**
     * Crea una preferencia de pago en MercadoPago
     * 
     * @param array $preference_data Datos de la preferencia
     * @return array|false Datos de la preferencia creada o false en caso de error
     */
    public function create_preference($preference_data) {
        $url = 'https://api.mercadopago.com/checkout/preferences';
        
        // Registrar intento de creación de preferencia
        error_log('Intentando crear preferencia en MercadoPago con URL: ' . $url);
        error_log('Access token (primeros 4 caracteres): ' . substr($this->access_token, 0, 4) . '...');
        
        // Validar datos de preferencia antes de enviar
        if (empty($preference_data['items'])) {
            error_log('Error: No hay items en la preferencia');
            throw new Exception('No hay items en la preferencia');
        }
        
        // Validar precios unitarios
        foreach ($preference_data['items'] as $item) {
            if (!isset($item['unit_price']) || $item['unit_price'] <= 0) {
                $error_msg = 'Precio unitario inválido para item ' . (isset($item['title']) ? $item['title'] : 'desconocido');
                error_log('Error: ' . $error_msg);
                throw new Exception($error_msg);
            }
        }
        
        // Codificar datos como JSON
        $json_data = json_encode($preference_data);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $error_msg = 'Error al codificar datos como JSON: ' . json_last_error_msg();
            error_log($error_msg);
            throw new Exception($error_msg);
        }
        
        $response = wp_remote_post($url, array(
            'headers' => array(
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer ' . $this->access_token
            ),
            'body' => $json_data,
            'timeout' => 30,
            'sslverify' => true
        ));
        
        if (is_wp_error($response)) {
            $error_message = $response->get_error_message();
            error_log('Error WP al crear preferencia en MercadoPago: ' . $error_message);
            return false;
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        $body_raw = wp_remote_retrieve_body($response);
        $body = json_decode($body_raw, true);
        
        // Registrar respuesta completa para depuración
        error_log('Respuesta de MercadoPago - Código: ' . $status_code);
        error_log('Respuesta de MercadoPago - Cuerpo: ' . $body_raw);
        
        if ($status_code >= 200 && $status_code < 300 && isset($body['id'])) {
            error_log('Preferencia creada exitosamente con ID: ' . $body['id']);
            return $body;
        }
        
        // Analizar el error específico
        $error_message = 'Error desconocido';
        if (isset($body['message'])) {
            $error_message = $body['message'];
        } elseif (isset($body['error'])) {
            $error_message = $body['error'];
        }
        
        error_log('Error al crear preferencia en MercadoPago. Código: ' . $status_code . ', Error: ' . $error_message);
        return false;
    }
    
    /**
     * Obtiene información de un pago
     * 
     * @param string $payment_id ID del pago
     * @return array|false Datos del pago o false en caso de error
     */
    public function get_payment($payment_id) {
        $url = 'https://api.mercadopago.com/v1/payments/' . $payment_id;
        
        $response = wp_remote_get($url, array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $this->access_token
            ),
            'timeout' => 30
        ));
        
        if (is_wp_error($response)) {
            error_log('Error al obtener pago de MercadoPago: ' . $response->get_error_message());
            return false;
        }
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        if (isset($body['id'])) {
            return $body;
        }
        
        error_log('Error al obtener pago de MercadoPago: ' . json_encode($body));
        return false;
    }
}