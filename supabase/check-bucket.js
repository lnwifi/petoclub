// Script para verificar y corregir la configuración del bucket de Supabase
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase (obtener de lib/supabase.ts)
const supabaseUrl = 'https://cbrxgjksefmgtoatkbbs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNicnhnamtzZWZtZ3RvYXRrYmJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MjgzNDgsImV4cCI6MjA1OTEwNDM0OH0.Y4yPbBgtkFNekGyaJ9njdMecgdwEznECoivKz12F2Hc';

// Crear cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAndFixBucket() {
  console.log('Verificando configuración del bucket pet-images...');
  
  try {
    // Verificar si el usuario está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Error: Debes iniciar sesión para verificar el bucket');
      console.error('Por favor, inicia sesión en la aplicación primero');
      return;
    }
    
    console.log('Usuario autenticado:', user.email);
    
    // Verificar si el bucket existe
    console.log('Verificando si el bucket pet-images existe...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error al verificar buckets:', bucketsError.message);
      return;
    }
    
    const petImagesBucket = buckets.find(b => b.name === 'pet-images');
    
    if (!petImagesBucket) {
      console.log('El bucket pet-images no existe. Intentando crearlo...');
      
      // Crear el bucket
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('pet-images', {
        public: true
      });
      
      if (createError) {
        console.error('Error al crear el bucket:', createError.message);
        return;
      }
      
      console.log('Bucket pet-images creado correctamente');
    } else {
      console.log('Bucket pet-images ya existe');
      
      // Asegurarse de que el bucket sea público
      const { error: updateError } = await supabase.storage.updateBucket('pet-images', {
        public: true
      });
      
      if (updateError) {
        console.error('Error al actualizar el bucket:', updateError.message);
      } else {
        console.log('Bucket pet-images configurado como público');
      }
    }
    
    // Probar carga de imagen
    console.log('\nRealizando prueba de carga de imagen...');
    
    // Crear un pequeño blob de prueba (1x1 pixel transparente en formato PNG)
    const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFdwI2QIlHDQAAAABJRU5ErkJggg==';
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    
    // Intentar subir el blob al bucket
    const testPath = `pets/test_${Date.now()}.png`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pet-images')
      .upload(testPath, blob, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (uploadError) {
      console.error('Error al subir imagen de prueba:', uploadError.message);
      console.log('\nVerificando políticas de almacenamiento...');
      
      // Aquí podríamos intentar verificar o corregir las políticas,
      // pero requeriría permisos de administrador que probablemente no tenemos
      console.log('NOTA: Para corregir las políticas de almacenamiento, debes ejecutar el script init.sql en el panel de Supabase SQL Editor');
    } else {
      console.log('Imagen de prueba subida correctamente');
      
      // Obtener URL pública
      const { data } = supabase.storage.from('pet-images').getPublicUrl(testPath);
      console.log('URL pública de la imagen de prueba:', data.publicUrl);
      
      // Eliminar la imagen de prueba
      const { error: deleteError } = await supabase.storage
        .from('pet-images')
        .remove([testPath]);
      
      if (deleteError) {
        console.error('Error al eliminar imagen de prueba:', deleteError.message);
      } else {
        console.log('Imagen de prueba eliminada correctamente');
      }
    }
    
    console.log('\nResumen de la verificación:');
    console.log('- Bucket pet-images:', petImagesBucket ? 'Existe' : 'Creado');
    console.log('- Prueba de carga:', uploadError ? 'Fallida' : 'Exitosa');
    
    if (uploadError) {
      console.log('\nRecomendaciones:');
      console.log('1. Verifica que las políticas de almacenamiento estén configuradas correctamente');
      console.log('2. Ejecuta el script init.sql en el panel de Supabase SQL Editor');
      console.log('3. Asegúrate de que la ruta de las imágenes comience con "pets/"');
    }
    
  } catch (error) {
    console.error('Error inesperado:', error.message);
  }
}

// Ejecutar la función principal
checkAndFixBucket().catch(error => {
  console.error('Error inesperado:', error);
});
