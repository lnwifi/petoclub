// Script para verificar la configuración de Supabase
const { createClient } = require('@supabase/supabase-js');

async function checkSupabase() {
  // Usar las mismas credenciales que están en lib/supabase.ts
  const supabaseUrl = 'https://cbrxgjksefmgtoatkbbs.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNicnhnamtzZWZtZ3RvYXRrYmJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MjgzNDgsImV4cCI6MjA1OTEwNDM0OH0.Y4yPbBgtkFNekGyaJ9njdMecgdwEznECoivKz12F2Hc';
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  console.log('Verificando la configuración de Supabase...');
  
  try {
    // 1. Verificar la tabla pets
    console.log('\n1. Verificando la tabla pets:');
    const { data: petsTable, error: petsError } = await supabase.from('pets').select('*').limit(1);
    
    if (petsError) {
      console.log('❌ Error al acceder a la tabla pets:', petsError.message);
    } else {
      console.log('✅ La tabla pets existe y es accesible');
      console.log('Estructura de la tabla pets (basada en los datos):');
      if (petsTable.length > 0) {
        console.log(Object.keys(petsTable[0]).join(', '));
      } else {
        console.log('La tabla está vacía, pero existe');
      }
    }
    
    // 2. Verificar el bucket de almacenamiento pet-images
    console.log('\n2. Verificando el bucket de almacenamiento pet-images:');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.log('❌ Error al listar los buckets:', bucketsError.message);
    } else {
      const petImagesBucket = buckets.find(b => b.name === 'pet-images');
      if (petImagesBucket) {
        console.log('✅ El bucket pet-images existe');
        console.log('Detalles del bucket:', JSON.stringify(petImagesBucket, null, 2));
      } else {
        console.log('❌ El bucket pet-images no existe');
        console.log('Buckets disponibles:', buckets.map(b => b.name).join(', '));
      }
    }
    
    // 3. Verificar las políticas de seguridad (RLS)
    console.log('\n3. Verificando las políticas de seguridad (RLS):');
    console.log('Las políticas de seguridad no se pueden verificar directamente con la API de Supabase.');
    console.log('Según el archivo init.sql, deberían estar configuradas las siguientes políticas:');
    console.log('- Los usuarios solo pueden ver sus propias mascotas');
    console.log('- Los usuarios solo pueden insertar mascotas donde ellos sean los propietarios');
    console.log('- Los usuarios solo pueden actualizar sus propias mascotas');
    console.log('- Los usuarios solo pueden eliminar sus propias mascotas');
    console.log('- Los usuarios autenticados pueden subir imágenes al bucket pet-images');
    console.log('- Cualquier usuario puede ver las imágenes en el bucket pet-images');
    
  } catch (error) {
    console.error('Error general:', error.message);
  }
}

checkSupabase();