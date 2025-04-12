import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform, SafeAreaView } from 'react-native';
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
  paymentMethod: 'creditCard' | 'transfer' | 'mercadoPago' | '';
}

// Definir tipos para errores del formulario
type FormErrors = {
  [key in keyof CheckoutForm]?: string;
};

export default function Checkout() {
  const { items, getCartTotal, clearCart } = useCart();
  const { hasStoreDiscount } = useMembership();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStep, setFormStep] = useState<'shipping' | 'payment' | 'review'>('shipping');
  
  // Estado del formulario
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
  });
  
  // Estado para errores de validación
  const [errors, setErrors] = useState<FormErrors>({});
  
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
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

  // Generar un token único para la sesión de checkout
  const [sessionToken] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // Procesar el pago
  const handleSubmitOrder = async () => {
    if (isProcessingOrder) {
      Alert.alert('Procesando', 'Tu pedido está siendo procesado, por favor espera...');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Error', 'Tu carrito está vacío');
      return;
    }
    
    // Prevenir múltiples envíos si ya está en proceso
    if (isSubmitting) {
      Alert.alert('Procesando', 'Tu pedido está siendo procesado. Por favor, espera.');
      return;
    }

    setIsProcessingOrder(true);
    setIsSubmitting(true);

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
        items: items.map(item => `${item.product.id}-${item.quantity}`).join(',')
      }));
      
      setIsSubmitting(true);
      
      // Preparar los datos para la orden de WooCommerce
      const orderData: OrderData = {
        payment_method: form.paymentMethod === 'creditCard' ? 'bacs' : 
                        form.paymentMethod === 'transfer' ? 'bacs' : 'mercadopago',
        payment_method_title: form.paymentMethod === 'creditCard' ? 'Tarjeta de crédito/débito' : 
                              form.paymentMethod === 'transfer' ? 'Transferencia bancaria' : 'MercadoPago',
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
          product_id: item.product.id,
          quantity: item.quantity
        })),
        shipping_lines: [
          {
            method_id: 'flat_rate',
            method_title: 'Envío estándar',
            total: '0.00' // Envío gratuito
          }
        ],
        // Añadir metadatos para prevenir duplicados
        meta_data: [
          {
            key: 'session_token',
            value: sessionToken
          },
          {
            key: 'order_timestamp',
            value: Date.now().toString()
          },
          {
            key: 'device_info',
            value: Platform.OS + '_' + Platform.Version
          }
        ]
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
              const sameItems = order.items === items.map(item => `${item.product.id}-${item.quantity}`).join(',');
              
              if (isRecent && sameEmail && sameItems) {
                console.warn('Se detectó un intento de crear un pedido duplicado');
                throw new Error('Ya se ha creado un pedido idéntico recientemente. Por favor, verifica en tus pedidos.');
              }
            }
          }
          return false; // No se encontraron duplicados
        } catch (error) {
          if (error.message.includes('Ya se ha creado un pedido idéntico')) {
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
        items: items.map(item => `${item.product.id}-${item.quantity}`).join(','),
        timestamp: Date.now(),
        sessionToken: sessionToken
      }));

      // Limpiar el estado de procesamiento
      await AsyncStorage.removeItem('processing_order');
      
      // Si el método de pago es MercadoPago, procesar el pago directamente en la app
      if (form.paymentMethod === 'mercadoPago') {
        try {
          // Usar la nueva función para crear una orden con MercadoPago
          const mpResponse = await createMercadoPagoOrder(orderData);
          
          // Verificar si hay un error específico en la configuración
          if ('success' in mpResponse && mpResponse.success === false && 'error' in mpResponse) {
            console.warn('Error en la configuración de MercadoPago:', mpResponse.error);
            throw new Error('Error en la configuración de MercadoPago');
          }
          
          if (!('preferenceId' in mpResponse) || typeof mpResponse.preferenceId !== 'string') {
            throw new Error('No se pudieron obtener los datos para el pago');
          }
          
          // Guardar información del pedido
          const orderInfo = {
            id: ('orderId' in mpResponse) ? mpResponse.orderId : undefined,
            preferenceId: mpResponse.preferenceId,
            status: ('status' in mpResponse) ? mpResponse.status : undefined,
            date: new Date().toISOString(),
          };
          
          if (orderInfo.id) {
            await AsyncStorage.setItem(`order_${orderInfo.id}`, JSON.stringify(orderInfo));
          }
          
          // Limpiar carrito
          clearCart();
          
          // Mostrar opciones al usuario
          Alert.alert(
            'Pedido creado',
            'Tu pedido ha sido creado. Ahora puedes completar el pago con MercadoPago.',
            [
              { 
                text: 'Pagar ahora', 
                onPress: () => {
                  const checkoutUrl = ('initPoint' in mpResponse ? mpResponse.initPoint : null) || 
                                    ('sandboxInitPoint' in mpResponse ? mpResponse.sandboxInitPoint : null);
                  
                  if (checkoutUrl) {
                    setTimeout(() => {
                      router.push({
                        pathname: '/webview',
                        params: { url: encodeURIComponent(checkoutUrl) } as any
                      } as any);
                    }, 500);
                  } else {
                    throw new Error('No se pudo obtener la URL de pago');
                  }
                }
              },
              {
                text: 'Ver mis pedidos',
                onPress: () => router.push('/profile/orders'),
                style: 'cancel'
              }
            ]
          );
        } catch (mpError) {
          console.error('Error al procesar con MercadoPago:', mpError);
          throw mpError;
        }
      } else {
        // Para otros métodos de pago
        Alert.alert(
          'Pedido creado',
          form.paymentMethod === 'transfer' 
            ? 'Tu pedido ha sido creado. Por favor, realiza la transferencia bancaria según las instrucciones enviadas a tu correo.'
            : 'Tu pedido ha sido creado exitosamente.',
          [
            { 
              text: 'Ver mis pedidos', 
              onPress: () => router.push('/profile/orders')
            }
          ]
        );
        
        clearCart();
      }
    } catch (error) {
      console.error('Error al procesar la orden:', error);
      
      // Determinar si es un error de duplicado
      const isDuplicateError = 
        error.message?.includes('pedido duplicado') || 
        error.message?.includes('solicitud de pedido idéntica') ||
        error.message?.includes('solicitud de pedido similar');
      
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
  
  // Renderizar el resumen del carrito
  const renderCartSummary = () => (
    <View style={styles.cartSummary}>
      <Text style={styles.summaryTitle}>Resumen de compra</Text>
      
      {items.map((item) => (
        <View key={item.product.id} style={styles.summaryItem}>
          <View style={styles.summaryItemInfo}>
            <Text style={styles.summaryItemName} numberOfLines={1}>
              {item.product.name}
            </Text>
            <Text style={styles.summaryItemQuantity}>x{item.quantity}</Text>
          </View>
          <Text style={styles.summaryItemPrice}>
            ${(parseFloat(item.product.price) * item.quantity).toFixed(2)}
          </Text>
        </View>
      ))}
      
      <View style={styles.divider} />
      
      {hasStoreDiscount() && (
        <View style={styles.summaryRow}>
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
  
  // Renderizar el paso de envío
  const renderShippingStep = () => (
    <View style={styles.formContainer}>
      <Text style={styles.stepTitle}>Información de envío</Text>
      
      <View style={styles.formRow}>
        {renderField('Nombre', 'firstName', 'Ingresa tu nombre')}
        {renderField('Apellido', 'lastName', 'Ingresa tu apellido')}
      </View>
      
      <View style={styles.formRow}>
        {renderField('Email', 'email', 'ejemplo@email.com', 'email-address')}
        {renderField('Teléfono', 'phone', 'Ingresa tu teléfono', 'phone-pad')}
      </View>
      
      {renderField('Dirección', 'address', 'Calle y número')}
      
      <View style={styles.formRow}>
        {renderField('Ciudad', 'city', 'Ingresa tu ciudad')}
        {renderField('Código Postal', 'postalCode', 'Ingresa tu CP', 'numeric')}
      </View>
      
      {renderField('Provincia', 'province', 'Ingresa tu provincia')}
      
      <TouchableOpacity 
        style={styles.nextButton}
        onPress={handleNextStep}
      >
        <Text style={styles.buttonText}>Continuar al pago</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
  
  // Renderizar el paso de pago
  const renderPaymentStep = () => (
    <View style={styles.formContainer}>
      <Text style={styles.stepTitle}>Método de pago</Text>
      
      <TouchableOpacity
        style={[
          styles.paymentOption,
          form.paymentMethod === 'creditCard' && styles.selectedPayment
        ]}
        onPress={() => handleChange('paymentMethod', 'creditCard')}
      >
        <Ionicons 
          name="card" 
          size={24} 
          color={form.paymentMethod === 'creditCard' ? '#ffbc4c' : '#666'} 
        />
        <Text style={styles.paymentOptionText}>Tarjeta de crédito/débito</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.paymentOption,
          form.paymentMethod === 'transfer' && styles.selectedPayment
        ]}
        onPress={() => handleChange('paymentMethod', 'transfer')}
      >
        <Ionicons 
          name="cash" 
          size={24} 
          color={form.paymentMethod === 'transfer' ? '#ffbc4c' : '#666'} 
        />
        <Text style={styles.paymentOptionText}>Transferencia bancaria</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.paymentOption,
          form.paymentMethod === 'mercadoPago' && styles.selectedPayment
        ]}
        onPress={() => handleChange('paymentMethod', 'mercadoPago')}
      >
        <Ionicons 
          name="wallet" 
          size={24} 
          color={form.paymentMethod === 'mercadoPago' ? '#ffbc4c' : '#666'} 
        />
        <Text style={styles.paymentOptionText}>MercadoPago</Text>
      </TouchableOpacity>
      
      {errors.paymentMethod && (
        <Text style={styles.errorText}>{errors.paymentMethod}</Text>
      )}
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handlePrevStep}
        >
          <Ionicons name="arrow-back" size={20} color="#666" />
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.nextButton}
          onPress={handleNextStep}
        >
          <Text style={styles.buttonText}>Revisar orden</Text>
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
          <Text style={styles.reviewSectionTitle}>Información de envío</Text>
          <TouchableOpacity onPress={() => setFormStep('shipping')}>
            <Text style={styles.editText}>Editar</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.reviewText}>
          {form.firstName} {form.lastName}
        </Text>
        <Text style={styles.reviewText}>{form.email}</Text>
        <Text style={styles.reviewText}>{form.phone}</Text>
        <Text style={styles.reviewText}>{form.address}</Text>
        <Text style={styles.reviewText}>
          {form.city}, {form.province}, CP: {form.postalCode}
        </Text>
      </View>
      
      <View style={styles.reviewSection}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewSectionTitle}>Método de pago</Text>
          <TouchableOpacity onPress={() => setFormStep('payment')}>
            <Text style={styles.editText}>Editar</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.reviewText}>
          {form.paymentMethod === 'creditCard' && 'Tarjeta de crédito/débito'}
          {form.paymentMethod === 'transfer' && 'Transferencia bancaria'}
          {form.paymentMethod === 'mercadoPago' && 'MercadoPago'}
        </Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handlePrevStep}
        >
          <Ionicons name="arrow-back" size={20} color="#666" />
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.confirmButton, isSubmitting && styles.disabledButton]}
          onPress={handleSubmitOrder}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>Confirmar compra</Text>
              <Ionicons name="checkmark" size={20} color="#fff" />
            </>
          )}
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
