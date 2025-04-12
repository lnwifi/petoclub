// Script de diagnóstico para problemas de almacenamiento en Supabase
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase (obtener de lib/supabase.ts)
const supabaseUrl = 'https://cbrxgjksefmgtoatkbbs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNicnhnamtzZWZtZ3RvYXRrYmJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MjgzNDgsImV4cCI6MjA1OTEwNDM0OH0.Y4yPbBgtkFNekGyaJ9njdMecgdwEznECoivKz12F2Hc';

// Crear cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Función para crear una imagen de prueba en base64
function createTestImage() {
  // Imagen PNG 1x1 transparente en base64
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFdwI2QIlHDQAAAABJRU5ErkJggg==';
}

// Función para convertir base64 a blob
function base64ToBlob(base64, contentType = 'image/png') {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
}

// Función para probar la autenticación
async function testAuth() {
  console.log('=== Prueba de autenticación ===');
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error de autenticación:', error.message);
      return { success: false, user: null, error };
    }
    
    if (!user) {
      console.log('No hay usuario autenticado');
      return { success: false, user: null, error: new Error('No hay usuario autenticado') };
    }
    
    console.log('Usuario autenticado:', user.email);
    console.log('ID de usuario:', user.id);
    return { success: true, user, error: null };
  } catch (error) {
    console.error('Error inesperado en autenticación:', error.message);
    return { success: false, user: null, error };
  }
}

// Función para probar los buckets de almacenamiento
async function testBuckets() {
  console.log('\n=== Prueba de buckets de almacenamiento ===');
  
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error al listar buckets:', error.message);
      return { success: false, buckets: null, error };
    }
    
    console.log('Buckets disponibles:');
    buckets.forEach(bucket => {
      console.log(`- ${bucket.name} (público: ${bucket.public ? 'Sí' : 'No'})`);
    });
    
    const petImagesBucket = buckets.find(b => b.name === 'pet-images');
    
    if (!petImagesBucket) {
      console.log('El bucket pet-images no existe');
      return { success: false, buckets, error: new Error('El bucket pet-images no existe') };
    }
    
    return { success: true, buckets, petImagesBucket, error: null };
  } catch (error) {
    console.error('Error inesperado al listar buckets:', error.message);
    return { success: false, buckets: null, error };
  }
}

// Función para probar la carga de imágenes
async function testImageUpload(user) {
  console.log('\n=== Prueba de carga de imágenes ===');
  
  if (!user) {
    console.log('No se puede probar la carga de imágenes sin un usuario autenticado');
    return { success: false, error: new Error('Usuario no autenticado') };
  }
  
  try {
    // Crear una imagen de prueba
    const base64Image = createTestImage();
    const blob = base64ToBlob(base64Image);
    
    // Intentar diferentes rutas para la carga
    const testPaths = [
      `pets/test_${Date.now()}.png`,
      `pets/user_${user.id}/test_${Date.now()}.png`,
      `pets/uploads/test_${Date.now()}.png`
    ];
    
    let successfulPath = null;
    let successfulData = null;
    let lastError = null;
    
    console.log('Intentando cargar imagen en diferentes rutas...');
    
    for (const path of testPaths) {
      console.log(`Intentando ruta: ${path}`);
      
      const { data, error } = await supabase.storage
        .from('pet-images')
        .upload(path, blob, {
          contentType: 'image/png',
          upsert: true
        });
      
      if (!error) {
        console.log(`✅ Carga exitosa en ruta: ${path}`);
        successfulPath = path;
        successfulData = data;
        break;
      } else {
        console.error(`❌ Error en ruta ${path}:`, error.message);
        lastError = error;
      }
    }
    
    if (successfulPath) {
      // Obtener URL pública
      const { data: urlData } = supabase.storage.from('pet-images').getPublicUrl(successfulPath);
      console.log('URL pública:', urlData.publicUrl);
      
      return { 
        success: true, 
        path: successfulPath, 
        data: successfulData, 
        publicUrl: urlData.publicUrl,
        error: null 
      };
    } else {
      console.error('No se pudo cargar la imagen en ninguna ruta');
      return { success: false, error: lastError };
    }
  } catch (error) {
    console.error('Error inesperado al cargar imagen:', error.message);
    return { success: false, error };
  }
}

// Función para probar las políticas de almacenamiento
async function testStoragePolicies() {
  console.log('\n=== Prueba de políticas de almacenamiento ===');
  
  try {
    // Intentar obtener las políticas (esto solo funciona con permisos de administrador)
    console.log('Nota: Esta prueba solo mostrará resultados completos si tienes permisos de administrador');
    
    // Verificar si podemos acceder a las políticas (probablemente fallará sin permisos de admin)
    try {
      const { data, error } = await supabase.rpc('get_policies', { table_name: 'objects', schema_name: 'storage' });
      
      if (error) {
        console.log('No se pudieron obtener las políticas (esperado sin permisos de admin)');
      } else if (data) {
        console.log('Políticas de almacenamiento:');
        data.forEach(policy => {
          console.log(`- ${policy.policyname}: ${policy.permissive ? 'PERMISSIVE' : 'RESTRICTIVE'} (${policy.cmd})`);
          console.log(`  Expresión: ${policy.qual}`);
        });
      }
    } catch (policyError) {
      console.log('No se pudieron obtener las políticas (esperado sin permisos de admin)');
    }
    
    // Verificar permisos de lectura
    console.log('\nVerificando permisos de lectura...');
    const { data: objects, error: listError } = await supabase.storage
      .from('pet-images')
      .list('pets');
    
    if (listError) {
      console.error('Error al listar objetos:', listError.message);
    } else {
      console.log(`Se encontraron ${objects.length} objetos en la carpeta 'pets':`);
      objects.forEach(obj => {
        console.log(`- ${obj.name} (tamaño: ${obj.metadata.size} bytes)`);
      });
    }
    
    return { success: !listError, error: listError };
  } catch (error) {
    console.error('Error inesperado al probar políticas:', error.message);
    return { success: false, error };
  }
}

// Función principal
async function diagnoseStorage() {
  console.log('Iniciando diagnóstico de almacenamiento en Supabase...');
  console.log('URL de Supabase:', supabaseUrl);
  
  // Probar autenticación
  const authResult = await testAuth();
  
  // Probar buckets
  const bucketsResult = await testBuckets();
  
  // Probar carga de imágenes
  const uploadResult = authResult.success 
    ? await testImageUpload(authResult.user)
    : { success: false, error: new Error('No se pudo probar la carga sin autenticación') };
  
  // Probar políticas
  const policiesResult = await testStoragePolicies();
  
  // Resumen
  console.log('\n=== RESUMEN DEL DIAGNÓSTICO ===');
  console.log(`Autenticación: ${authResult.success ? '✅ OK' : '❌ FALLO'}`);
  console.log(`Bucket pet-images: ${bucketsResult.success ? '✅ OK' : '❌ FALLO'}`);
  console.log(`Carga de imágenes: ${uploadResult.success ? '✅ OK' : '❌ FALLO'}`);
  console.log(`Políticas de almacenamiento: ${policiesResult.success ? '✅ OK' : '❌ FALLO'}`);
  
  if (!authResult.success) {
    console.log('\n⚠️ PROBLEMA PRINCIPAL: Autenticación');
    console.log('Solución: Inicia sesión en la aplicación antes de intentar subir imágenes');
  } else if (!bucketsResult.success) {
    console.log('\n⚠️ PROBLEMA PRINCIPAL: Bucket de almacenamiento');
    console.log('Solución: Verifica que el bucket pet-images exista en tu proyecto de Supabase');
  } else if (!uploadResult.success) {
    console.log('\n⚠️ PROBLEMA PRINCIPAL: Carga de imágenes');
    console.log('Posibles soluciones:');
    console.log('1. Verifica que la política de almacenamiento permita subir archivos en la carpeta "pets"');
    console.log('2. Ejecuta el script init.sql en el panel de SQL de Supabase para configurar las políticas correctamente');
    console.log('3. Asegúrate de que el usuario tenga permisos para subir archivos');
  }
  
  if (uploadResult.success) {
    console.log('\n✅ BUENAS NOTICIAS: La carga de prueba funcionó correctamente');
    console.log('Ruta que funcionó:', uploadResult.path);
    console.log('URL pública:', uploadResult.publicUrl);
    console.log('\nRecomendación: Usa exactamente este formato de ruta en tu código:');
    console.log(`const filePath = \`${uploadResult.path.replace(/test_\d+\.png$/, 'imagen_${Date.now()}.jpg')}\`;`);
  }
}

// Ejecutar diagnóstico
diagnoseStorage().catch(error => {
  console.error('Error inesperado durante el diagnóstico:', error);
});
