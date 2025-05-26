import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform, SafeAreaView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCart } from '../../lib/cart-context';
import { useMembership } from '../../hooks/useMembership';
import { createOrder, OrderData } from '../../lib/woocommerce';
import { createMercadoPagoOrder, initMercadoPago } from '../../lib/mercadopago';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Definir tipos para el formulario
interface CheckoutForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  province: string;
  paymentMethod: 'mercadoPago' | '';
  notes: string;
}

// Definir tipos para errores del formulario
type FormErrors = {
  [key in keyof CheckoutForm]?: string;
};

// Definir tipo para items del carrito
interface CartItem {
  id: number;
  name: string;
  price: string;
  qty: number;
  image?: string;
}

// Definir tipo para la respuesta de MercadoPago
interface MercadoPagoResponse {
  id: string;  // ID de la preferencia
  status?: string;
  init_point: string;  // URL de pago en producción
  sandbox_init_point: string;  // URL de pago en sandbox
  external_reference: string;
  payer: {
    email: string;
    name: string;
    surname: string;
    phone: {
      area_code: string;
      number: string;
    };
    address: {
      zip_code: string;
      street_name: string;
      street_number: number | null;
    };
    identification: {
      number: string;
      type: string;
    };
    date_created: string | null;
    last_purchase: string | null;
  };
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    unit_price: number;
    currency_id: string;
  }>;
  metadata: {
    order_id: number;
    tipo: string;
  };
  additional_info?: string;
  auto_return?: string;
  back_urls?: {
    failure: string;
    pending: string;
    success: string;
  };
  binary_mode?: boolean;
  client_id?: string;
  collector_id?: number;
  coupon_code?: string;
  coupon_labels?: string[];
  date_created?: string;
  date_of_expiration?: string;
  expiration_date_from?: string;
  expiration_date_to?: string;
  expires?: boolean;
  internal_metadata?: any;
  marketplace?: string;
  marketplace_fee?: number;
  notification_url?: string;
  operation_type?: string;
  processing_modes?: any;
  product_id?: string;
  redirect_urls?: {
    failure: string;
    pending: string;
    success: string;
  };
  site_id?: string;
  shipments?: {
    default_shipping_method?: string;
    receiver_address?: {
      zip_code?: string;
      street_name?: string;
      street_number?: number | null;
      floor?: string;
      apartment?: string;
      city_name?: string;
      state_name?: string;
      country_name?: string;
    };
  };
  total_amount?: number;
  last_updated?: string;
  financing_group?: string;
  payment_methods?: {
    default_card_id?: string | null;
    default_payment_method_id?: string | null;
    excluded_payment_methods?: Array<{ id: string }>;
    excluded_payment_types?: Array<{ id: string }>;
    installments?: number | null;
    default_installments?: number | null;
  };
}

export default function Checkout() {
  // Solución: leer el carrito real directamente de localStorage
  function getCart(): CartItem[] {
    try {
      const cart = localStorage.getItem('petoclub_cart');
      return cart ? JSON.parse(cart) : [];
    } catch (e) {
      if (globalThis['petoclub_cart']) {
        return JSON.parse(globalThis['petoclub_cart']);
      }
      return [];
    }
  }
  const [items, setItems] = useState<CartItem[]>(getCart());
  const getCartTotal = () => items.reduce((sum: number, p: CartItem) => sum + (parseFloat(p.price) * p.qty), 0);
  const clearCart = () => {
    try {
      localStorage.setItem('petoclub_cart', '[]');
    } catch (e) {
      globalThis['petoclub_cart'] = '[]';
    }
  };
  const { hasStoreDiscount } = useMembership();
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mpResponse, setMpResponse] = useState<MercadoPagoResponse | null>(null);
  const [form, setForm] = useState<CheckoutForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    province: '',
    paymentMethod: '',
    notes: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [formStep, setFormStep] = useState<'shipping' | 'payment' | 'review'>('shipping');
  
  // Manejar cambios en los campos del formulario
  const handleChange = (field: keyof CheckoutForm, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpiar error cuando el usuario escribe
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };
  
  // Validar el formulario según el paso actual
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;
    
    if (formStep === 'shipping') {
      // Validar campos de envío
      if (!form.firstName.trim()) {
        newErrors.firstName = 'El nombre es requerido';
        isValid = false;
      }
      
      if (!form.lastName.trim()) {
        newErrors.lastName = 'El apellido es requerido';
        isValid = false;
      }
      
      if (!form.email.trim()) {
        newErrors.email = 'El email es requerido';
        isValid = false;
      } else if (!/\S+@\S+\.\S+/.test(form.email)) {
        newErrors.email = 'Email inválido';
        isValid = false;
      }
      
      if (!form.phone.trim()) {
        newErrors.phone = 'El teléfono es requerido';
        isValid = false;
      }
      
      if (!form.address.trim()) {
        newErrors.address = 'La dirección es requerida';
        isValid = false;
      }
      
      if (!form.city.trim()) {
        newErrors.city = 'La ciudad es requerida';
        isValid = false;
      }
      
      if (!form.postalCode.trim()) {
        newErrors.postalCode = 'El código postal es requerido';
        isValid = false;
      }
      
      if (!form.province.trim()) {
        newErrors.province = 'La provincia es requerida';
        isValid = false;
      }
    } else if (formStep === 'payment') {
      // Validar método de pago
      if (!form.paymentMethod) {
        newErrors.paymentMethod = 'Selecciona un método de pago';
        isValid = false;
      }
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  // Avanzar al siguiente paso
  const handleNextStep = () => {
    if (!validateForm()) return;
    
    if (formStep === 'shipping') {
      setFormStep('payment');
    } else if (formStep === 'payment') {
      setFormStep('review');
    }
  };
  
  // Retroceder al paso anterior
  const handlePrevStep = () => {
    if (formStep === 'payment') {
      setFormStep('shipping');
    } else if (formStep === 'review') {
      setFormStep('payment');
    }
  };
  
  // Estado para controlar múltiples envíos
  const [sessionToken] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // Procesar el pago
  const handleSubmitOrder = async () => {
    console.log('handleSubmitOrder llamado');
    Alert.alert('Debug', 'handleSubmitOrder fue llamado');
  // Obtener el token de sesión del usuario (si aplica)
  let sessionToken = '';
  try {
    const session = await AsyncStorage.getItem('user_session');
    if (session) {
      const parsed = JSON.parse(session);
      sessionToken = parsed.access_token || '';
    }
  } catch {}

    if (isProcessingOrder) {
      console.log('STOP: isProcessingOrder true');
      Alert.alert('Procesando', 'Tu pedido está siendo procesado, por favor espera...');
      return Alert.alert('Debug', 'STOP: isProcessingOrder true');
    }

    if (items.length === 0) {
      console.log('STOP: carrito vacío');
      Alert.alert('Error', 'Tu carrito está vacío');
      return Alert.alert('Debug', 'STOP: carrito vacío');
    }

    // Prevenir múltiples envíos si ya está en proceso
    if (isSubmitting) {
      console.log('STOP: isSubmitting true');
      Alert.alert('Procesando', 'Tu pedido está siendo procesado. Por favor, espera.');
      return Alert.alert('Debug', 'STOP: isSubmitting true');
    }

    setIsProcessingOrder(true);
    setIsSubmitting(true);
    console.log('PASO: después de setIsProcessingOrder/setIsSubmitting');
    Alert.alert('Debug', 'PASO: después de setIsProcessingOrder/setIsSubmitting');

    // Generar un ID único para la orden que incluye el token de sesión
    const orderKey = `order_${sessionToken}_${Date.now()}`;

      try {
      // Verificar si hay una orden en proceso
      const processingOrder = await AsyncStorage.getItem('processing_order');
      if (processingOrder) {
        const { timestamp, key, email } = JSON.parse(processingOrder);
        // Si hay una orden en proceso en los últimos 30 segundos y es del mismo usuario, evitar duplicado
        if (Date.now() - timestamp < 30000 && email === form.email) {
          Alert.alert('Procesando', 'Ya hay un pedido en proceso. Por favor, espera unos segundos.');
          return;
        }
      }
      
      // Guardar el estado de procesamiento con más información para mejor identificación
      await AsyncStorage.setItem('processing_order', JSON.stringify({
        key: orderKey,
        timestamp: Date.now(),
        email: form.email,
        sessionToken: sessionToken,
        items: items.map(item => `${item.id}-${item.qty}`).join(',')
      }));
      
      setIsSubmitting(true);
      
      // Preparar los datos para la orden de WooCommerce
      const orderData: OrderData = {
        payment_method: 'mercadopago',
        payment_method_title: 'MercadoPago',
        billing: {
          first_name: form.firstName,
          last_name: form.lastName,
          email: form.email,
          phone: form.phone,
          address_1: form.address,
          city: form.city,
          state: form.province,
          postcode: form.postalCode,
          country: 'AR' // Argentina
        },
        shipping: {
          first_name: form.firstName,
          last_name: form.lastName,
          email: form.email,
          phone: form.phone,
          address_1: form.address,
          city: form.city,
          state: form.province,
          postcode: form.postalCode,
          country: 'AR' // Argentina
        },
        line_items: items.map(item => ({
          product_id: item.id,
          quantity: item.qty
        })),
        shipping_lines: [
          {
            method_id: 'flat_rate',
            method_title: 'Envío estándar',
            total: '0.00' // Envío gratuito
          }
        ],

      };
      
      // Verificar si ya existe una orden reciente con los mismos datos para evitar duplicados
      const checkRecentOrders = async () => {
        try {
          // Buscar en AsyncStorage órdenes recientes con los mismos datos
          const keys = await AsyncStorage.getAllKeys();
          const orderKeys = keys.filter(key => key.startsWith('recent_order_'));
          
          for (const key of orderKeys) {
            const orderData = await AsyncStorage.getItem(key);
            if (orderData) {
              const order = JSON.parse(orderData);
              // Verificar si es una orden reciente (menos de 2 minutos) con los mismos datos
              const isRecent = Date.now() - order.timestamp < 120000; // 2 minutos
              const sameEmail = order.email === form.email;
              const sameItems = order.items === items.map(item => `${item.id}-${item.qty}`).join(',');
              
              if (isRecent && sameEmail && sameItems) {
                console.warn('Se detectó un intento de crear un pedido duplicado');
                throw new Error('Ya se ha creado un pedido idéntico recientemente. Por favor, verifica en tus pedidos.');
              }
            }
          }
          return false; // No se encontraron duplicados
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('Ya se ha creado un pedido idéntico')) {
            throw error; // Re-lanzar el error específico
          }
          console.error('Error al verificar pedidos recientes:', error);
          return false; // Continuar si hay un error en la verificación
        }
      };
      
      // Verificar duplicados antes de crear la orden
      await checkRecentOrders();
      
      // Enviar la orden a WooCommerce
      console.log('Enviando datos de orden a WooCommerce:', JSON.stringify(orderData));
      const response = await createOrder(orderData);
      console.log('Orden creada exitosamente:', JSON.stringify(response));
      
      // Guardar información de la orden reciente para evitar duplicados
      const recentOrderKey = `recent_order_${response.id}`;
      await AsyncStorage.setItem(recentOrderKey, JSON.stringify({
        id: response.id,
        email: form.email,
        items: items.map(item => `${item.id}-${item.qty}`).join(','),
        timestamp: Date.now(),
        sessionToken: sessionToken
      }));

      // Limpiar el estado de procesamiento
      await AsyncStorage.removeItem('processing_order');
      
      // Si el método de pago es MercadoPago, procesar el pago directamente en la app
      try {
        // Solo proceder si la orden de WooCommerce tiene ID
        if (!response || !response.id) {
          Alert.alert('Error', 'No se pudo crear la orden en WooCommerce. Intenta nuevamente.');
          return;
        }
        // Preparar payload para MercadoPago
        const mpPayload = {
          tipo: 'pedido_tienda',
          order_id: response.id.toString(),
          external_reference: response.id.toString(),
          title: `Compra en PetoClub - ${items.map(item => item.name + ' x' + item.qty).join(', ')}`,
          price: items.reduce((sum, item) => sum + (parseFloat(item.price) * item.qty), 0),
          items: items.map(item => ({
            id: item.id.toString(),
            title: item.name,
            quantity: item.qty,
            unit_price: parseFloat(item.price),
            currency_id: 'ARS',
          })),
          payer: {
            email: form.email,
            name: form.firstName,
            surname: form.lastName,
          },
          back_urls: {
            success: 'https://petoclub.com/success',
            failure: 'https://petoclub.com/failure',
            pending: 'https://petoclub.com/pending',
          },
        };
        // IMPORTANTE: pasar el objeto response (respuesta de WooCommerce) que SÍ tiene id
const mpResponse = await createMercadoPagoOrder(response);
        
        // Manejar errores con type checking
        const handleMercadoPagoError = (error: unknown) => {
          if (error instanceof Error) {
            Alert.alert('Error', error.message);
          } else {
            Alert.alert('Error', 'Ocurrió un error inesperado');
          }
        };
        
        if ('success' in mpResponse && mpResponse.success === false && 'error' in mpResponse) {
          console.warn('Error en la configuración de MercadoPago:', mpResponse.error);
          throw new Error('Error en la configuración de MercadoPago');
        }
        
        // Validar la respuesta de MercadoPago
        // Construir orderInfo de forma segura
        const orderInfo: { id?: number | string; preferenceId?: string; status?: string; date: string } = {
          id: (typeof mpResponse === 'object' && mpResponse !== null && 'metadata' in mpResponse && (mpResponse as any).metadata?.order_id) ? (mpResponse as any).metadata.order_id : undefined,
          preferenceId: (typeof mpResponse === 'object' && mpResponse !== null && 'id' in mpResponse) ? (mpResponse as any).id : undefined,
          status: (typeof mpResponse === 'object' && mpResponse !== null && 'status' in mpResponse) ? (mpResponse as any).status : undefined,
          date: new Date().toISOString(),
        };

        
        if (orderInfo.id) {
          await AsyncStorage.setItem(`order_${orderInfo.id}`, JSON.stringify(orderInfo));
        }
        
        // Limpiar carrito
        clearCart();
        
        // Redirigir automáticamente al checkout de MercadoPago si hay preferencia válida
        const paymentUrl =
          (mpResponse && typeof mpResponse === 'object' && 'init_point' in mpResponse ? (mpResponse as any).init_point : null) ||
          (mpResponse && typeof mpResponse === 'object' && 'sandbox_init_point' in mpResponse ? (mpResponse as any).sandbox_init_point : null) ||
          (mpResponse && typeof mpResponse === 'object' && 'initPoint' in mpResponse ? (mpResponse as any).initPoint : null) ||
          (mpResponse && typeof mpResponse === 'object' && 'sandboxInitPoint' in mpResponse ? (mpResponse as any).sandboxInitPoint : null) ||
          null;
        if (paymentUrl && (paymentUrl.startsWith('https://www.mercadopago') || paymentUrl.startsWith('https://sandbox.mercadopago'))) {
          setTimeout(() => {
            // Abrir la URL en el navegador externo
            Linking.openURL(paymentUrl);
          }, 500);
        } else {
          const backendMsg = typeof mpResponse === 'object' && mpResponse !== null && 'error' in mpResponse ? (mpResponse as any).error : '';
          Alert.alert('Error', backendMsg || 'No se pudo obtener la URL de pago de MercadoPago. Intenta nuevamente.');
        }
      } catch (mpError) {
        console.error('Error al procesar con MercadoPago:', mpError);
        if (mpError instanceof Error) {
          handleMercadoPagoError(mpError);
        } else if (typeof mpError === 'object' && mpError !== null && 'message' in mpError) {
          handleMercadoPagoError(new Error(String((mpError as any).message)));
        } else {
          handleMercadoPagoError(new Error('Ocurrió un error inesperado con MercadoPago.'));
        }
      }
    } catch (error) {
      let errorMsg = 'Ocurrió un error inesperado';
      let isDuplicateError = false;
      if (error instanceof Error) {
        errorMsg = error.message;
        isDuplicateError = error.message?.includes('pedido duplicado') || 
          error.message?.includes('solicitud de pedido idéntica') ||
          error.message?.includes('solicitud de pedido similar');
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMsg = String((error as any).message);
        isDuplicateError = (error as any).message?.includes('pedido duplicado') ||
          (error as any).message?.includes('solicitud de pedido idéntica') ||
          (error as any).message?.includes('solicitud de pedido similar');
      } else {
        errorMsg = String(error);
      }
      Alert.alert('Error', errorMsg);
      // Limpiar el estado de procesamiento en caso de error
      try {
        await AsyncStorage.removeItem('processing_order');
      } catch (cleanupError) {
        console.error('Error al limpiar estado de procesamiento:', cleanupError);
      }
      if (isDuplicateError) {
        // Mensaje específico para pedidos duplicados
        Alert.alert(
          'Pedido duplicado',
          'Parece que ya has realizado un pedido idéntico recientemente. Por favor, verifica en tus pedidos antes de intentar nuevamente.',
          [
            {
              text: 'Ver mis pedidos',
              onPress: () => router.push('/profile/orders')
            },
            {
              text: 'Cerrar',
              style: 'cancel',
              onPress: () => {
                setIsProcessingOrder(false);
                setIsSubmitting(false);
              }
            }
          ]
        );
      } else {
        // Mensaje genérico para otros errores
        Alert.alert(
          'Error',
          'Ocurrió un error al procesar tu pedido. Por favor, verifica tus datos e intenta nuevamente.',
          [
            {
              text: 'Reintentar',
              onPress: () => {
                setIsProcessingOrder(false);
                setIsSubmitting(false);
                // Esperar un momento antes de reintentar para evitar condiciones de carrera
                setTimeout(() => handleSubmitOrder(), 1000);
              }
            },
            {
              text: 'Cancelar',
              style: 'cancel',
              onPress: () => {
                setIsProcessingOrder(false);
                setIsSubmitting(false);
              }
            }
          ]
        );
      }
    } finally {
      setIsProcessingOrder(false);
      setIsSubmitting(false);
    }
  };
  
  // Manejar errores con type checking
  const handleMercadoPagoError = (error: unknown) => {
    if (error instanceof Error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Error', 'Ocurrió un error inesperado');
    }
  };
  
  // Renderizar campos de formulario con manejo de errores
  const renderField = (
    label: string,
    field: keyof CheckoutForm,
    placeholder: string,
    keyboardType: 'default' | 'email-address' | 'phone-pad' | 'numeric' = 'default'
  ) => (
    <View style={styles.formGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, errors[field] ? styles.inputError : null]}
        value={form[field] as string}
        onChangeText={(value) => handleChange(field, value)}
        placeholder={placeholder}
        keyboardType={keyboardType}
      />
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );
  
  // Asegurar que JSX tenga un solo elemento padre
  const renderShippingStep = () => (
    <View style={styles.formContainer}>
      <Text style={styles.stepTitle}>Información de envío</Text>
      {renderField('Nombre', 'firstName', 'Ingresa tu nombre')}
      {renderField('Apellido', 'lastName', 'Ingresa tu apellido')}
      {renderField('Email', 'email', 'Ingresa tu email', 'email-address')}
      {renderField('Teléfono', 'phone', 'Ingresa tu teléfono', 'phone-pad')}
      {renderField('Dirección', 'address', 'Ingresa tu dirección')}
      <View style={styles.formRow}>
        {renderField('Ciudad', 'city', 'Ingresa tu ciudad')}
        {renderField('Código Postal', 'postalCode', 'Ingresa tu CP', 'numeric')}
      </View>
      {renderField('Provincia', 'province', 'Ingresa tu provincia')}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/cart')}>
          <Ionicons name="arrow-back" size={20} color="#666" />
          <Text style={styles.backButtonText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, isSubmitting && styles.disabledButton]}
          onPress={handleNextStep}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>Continuar</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
  
  // Renderizar el paso de pago
  const renderPaymentStep = () => (
    <View style={styles.formContainer}>
      <Text style={styles.stepTitle}>Método de pago</Text>
      <TouchableOpacity
        style={[
          styles.paymentOption,
          form.paymentMethod === 'mercadoPago' && styles.selectedPayment,
        ]}
        onPress={() => handleChange('paymentMethod', 'mercadoPago')}
        activeOpacity={0.85}
      >
        <Ionicons name={form.paymentMethod === 'mercadoPago' ? 'radio-button-on' : 'radio-button-off'} size={22} color="#ffbc4c" />
        <Text style={styles.paymentOptionText}>MercadoPago</Text>
      </TouchableOpacity>
      {errors.paymentMethod && <Text style={styles.errorText}>{errors.paymentMethod}</Text>}
      <View style={{ marginTop: 18 }}>
        <Text style={styles.label}>Notas para el pedido (opcional)</Text>
        <TextInput
          style={[styles.input, { minHeight: 56 }]}
          placeholder="Ej: Entregar solo por la tarde, aclaraciones, etc."
          value={form.notes}
          onChangeText={text => handleChange('notes', text)}
          multiline
          numberOfLines={3}
        />
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handlePrevStep}>
          <Ionicons name="arrow-back" size={20} color="#666" />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, isSubmitting && styles.disabledButton]}
          onPress={handleNextStep}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>Revisar pedido</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
  
  // Renderizar el paso de revisión
  const renderReviewStep = () => (
    <View style={styles.formContainer}>
      <Text style={styles.stepTitle}>Revisar y confirmar</Text>
      <View style={styles.reviewSection}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewSectionTitle}>Datos de envío</Text>
          <TouchableOpacity onPress={() => setFormStep('shipping')}><Text style={styles.editText}>Editar</Text></TouchableOpacity>
        </View>
        <Text style={styles.reviewText}>{form.firstName} {form.lastName}</Text>
        <Text style={styles.reviewText}>{form.email} | {form.phone}</Text>
        <Text style={styles.reviewText}>{form.address}, {form.city}, {form.province}, {form.postalCode}</Text>
      </View>
      <View style={styles.reviewSection}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewSectionTitle}>Resumen de compra</Text>
          <TouchableOpacity onPress={() => setFormStep('payment')}><Text style={styles.editText}>Editar</Text></TouchableOpacity>
        </View>
        {items.map((item: CartItem, idx: number) => (
          <Text key={idx} style={styles.reviewText}>{item.qty} x {item.name} - ${parseFloat(item.price).toFixed(2)}</Text>
        ))}
        <Text style={[styles.reviewText, { fontWeight: 'bold', marginTop: 6 }]}>Total: ${getCartTotal().toFixed(2)}</Text>
      </View>

      {/* Botón de pago MercadoPago si existe preferencia */}
      {mpResponse && ((mpResponse.init_point && mpResponse.init_point.startsWith('https://www.mercadopago')) || (mpResponse.sandbox_init_point && mpResponse.sandbox_init_point.startsWith('https://sandbox.mercadopago')))
        ? (
          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: '#009ee3', marginTop: 18 }]}
            onPress={() => {
              const paymentUrl = mpResponse.init_point || mpResponse.sandbox_init_point;
              if (paymentUrl) {
                router.push({ pathname: '/webview', params: { url: encodeURIComponent(paymentUrl) } as any } as any);
              }
            }}
          >
            <Ionicons name="logo-usd" size={20} color="#fff" />
            <Text style={styles.buttonText}>Pagar con MercadoPago</Text>
          </TouchableOpacity>
        ) : null}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handlePrevStep}>
          <Ionicons name="arrow-back" size={20} color="#666" />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmButton, isSubmitting && styles.disabledButton]}
          onPress={handleSubmitOrder}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>Confirmar pedido</Text>
          <Ionicons name="checkmark" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
  
  // Renderizar el contenido según el paso actual
  const renderStepContent = () => {
    switch (formStep) {
      case 'shipping':
        return renderShippingStep();
      case 'payment':
        return renderPaymentStep();
      case 'review':
        return renderReviewStep();
      default:
        return null;
    }
  };
  
  // Renderizar el resumen del carrito
  const renderCartSummary = () => (
    <View style={styles.cartSummary}>
      <Text style={styles.summaryTitle}>Resumen de compra</Text>
      
      {Array.isArray(items) && items
        .filter((item: CartItem) => item && (item.name && item.price))
        .map((item: CartItem, idx: number) => {
          // Soporta tanto estructura vieja (item.product) como plana (item.name, item.price)
          const name: string = item.name || 'Sin nombre';
          const price: number = parseFloat(item.price || '0');
          const qty: number = item.qty || 1;
          return (
            <View key={item.id || idx} style={styles.summaryItem}>
              <View style={styles.summaryItemInfo}>
                <Text style={styles.summaryItemName} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={styles.summaryItemQuantity}>x{qty}</Text>
              </View>
              <Text style={styles.summaryItemPrice}>
                {(price * qty).toFixed(2)}
              </Text>
            </View>
          );
        })}
      
      <View style={styles.divider} />
      
      {hasStoreDiscount() && (
        <View>
          <Text style={styles.summaryLabel}>Descuento Premium</Text>
          <Text style={styles.discountText}>-10%</Text>
        </View>
      )}
      
      <View style={styles.summaryRow}>
        <Text style={styles.summaryTotal}>Total</Text>
        <Text style={styles.summaryTotalAmount}>${getCartTotal().toFixed(2)}</Text>
      </View>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {renderCartSummary()}
        {renderStepContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  cartSummary: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryItemInfo: {
    flex: 1,
    marginRight: 8,
  },
  summaryItemName: {
    fontSize: 14,
  },
  summaryItemQuantity: {
    fontSize: 12,
    color: '#666',
  },
  summaryItemPrice: {
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  discountText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryTotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffbc4c',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  formGroup: {
    flex: 1,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
  },
  selectedPayment: {
    borderColor: '#ffbc4c',
    backgroundColor: '#fff9f0',
  },
  paymentOptionText: {
    marginLeft: 12,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffbc4c',
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    minWidth: 160,
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  reviewSection: {
    marginBottom: 24,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  editText: {
    color: '#ffbc4c',
    fontSize: 14,
  },
  reviewText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
});
