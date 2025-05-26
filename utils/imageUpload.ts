import { supabase } from '@/lib/supabase';

/**
 * Sube una imagen a Supabase Storage y devuelve la URL pública
 * @param uri URI de la imagen (puede ser local o base64)
 * @param setUploadProgress Función opcional para actualizar el progreso de la carga
 * @returns URL pública de la imagen subida
 */
export async function uploadImage(uri: string, setUploadProgress?: (progress: number) => void): Promise<string> {
  try {
    // Actualizar progreso si se proporciona la función
    const updateProgress = (progress: number) => {
      if (setUploadProgress) setUploadProgress(progress);
    };
    
    updateProgress(10);
    
    // 1. Verificar autenticación
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('[ERROR] Error de sesión:', sessionError);
      throw new Error('No has iniciado sesión. Por favor, inicia sesión para agregar mascotas.');
    }
    
    console.log('[DEBUG] Usuario autenticado:', session.user.email);
    updateProgress(20);

    // 2. Preparar metadatos del archivo
    let fileExt = 'jpg';
    let blob: Blob;
    
    // Detectar si es una URI de data:image (base64)
    if (uri.startsWith('data:image/')) {
      // Extraer el tipo MIME y la extensión
      const mimeMatch = uri.match(/^data:image\/([a-zA-Z0-9]+);base64,/);
      if (mimeMatch && mimeMatch[1]) {
        fileExt = mimeMatch[1].toLowerCase();
        if (fileExt === 'jpeg') fileExt = 'jpg';
      }
      
      // Convertir base64 a blob
      const base64Data = uri.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteArrays = [];
      
      for (let i = 0; i < byteCharacters.length; i += 512) {
        const slice = byteCharacters.slice(i, i + 512);
        const byteNumbers = new Array(slice.length);
        
        for (let j = 0; j < slice.length; j++) {
          byteNumbers[j] = slice.charCodeAt(j);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      blob = new Blob(byteArrays, { type: `image/${fileExt}` });
      console.log('[DEBUG] Imagen base64 convertida a blob, tipo:', fileExt);
    } else {
      // URI normal (archivo)
      fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      
      // Obtener datos de la imagen
      const response = await fetch(uri);
      if (!response.ok) throw new Error(`Error al obtener datos de la imagen: ${response.status}`);
      blob = await response.blob();
      console.log('[DEBUG] Imagen URI convertida a blob, tipo:', fileExt);
    }
    
    // Validar formato
    if (!['jpg', 'jpeg', 'png', 'gif'].includes(fileExt)) {
      console.error('[ERROR] Formato no soportado:', fileExt);
      throw new Error('Formato de imagen no soportado. Use JPG, PNG o GIF.');
    }
    
    // Validar tamaño
    if (blob.size > 5 * 1024 * 1024) {
      throw new Error('La imagen es demasiado grande (máximo 5MB)');
    }
    
    console.log('[DEBUG] Tamaño del blob:', blob.size, 'bytes');
    updateProgress(40);

    // 3. Crear nombre de archivo único
    const timestamp = Date.now();
    const fileName = `pet_${timestamp}.${fileExt}`;
    const filePath = `pets/${session.user.id}/${fileName}`;
    
    console.log('[DEBUG] Ruta del archivo:', filePath);
    updateProgress(50);

    // 4. Subir a Supabase Storage
    console.log('[DEBUG] Subiendo a Supabase...');
    const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
    console.log('[DEBUG] Content-Type:', contentType);
    
    let uploadResult;
    try {
      console.log('[DEBUG] Iniciando upload a bucket pet-images...');
      uploadResult = await supabase.storage
        .from('pet-images')
        .upload(filePath, blob, {
          contentType: contentType,
          upsert: true,
          cacheControl: '3600'
        });
      
      console.log('[DEBUG] Resultado upload:', JSON.stringify(uploadResult));
    } catch (uploadException: any) {
      console.error('[ERROR] Excepción durante upload:', uploadException);
      throw new Error(`Error de conexión con Supabase: ${uploadException.message || 'Error desconocido'}`);
    }
    
    const { data, error: uploadError } = uploadResult;

    if (uploadError) {
      console.error('[ERROR] Error de Supabase al subir:', JSON.stringify(uploadError));
      
      // Mensajes específicos según el tipo de error
      const errorMessage = uploadError.message || 'Error desconocido';
      
      if (errorMessage.includes('permission') || errorMessage.includes('not authorized')) {
        throw new Error('No tienes permisos para subir imágenes. Verifica la configuración de Supabase.');
      } else if (errorMessage.includes('bucket') || errorMessage.includes('not found')) {
        throw new Error('El bucket "pet-images" no existe. Verifica la configuración de Supabase.');
      } else if (errorMessage.includes('size') || errorMessage.includes('too large')) {
        throw new Error('La imagen es demasiado grande para el servidor.');
      } else {
        throw new Error(`Error al subir imagen: ${errorMessage}`);
      }
    }
    
    if (!data) {
      console.error('[ERROR] No hay datos en la respuesta de upload');
      throw new Error('Error al subir la imagen: no se recibió confirmación del servidor');
    }
    
    console.log('[DEBUG] Upload completado exitosamente');
    updateProgress(80);

    // 5. Obtener URL pública
    const { data: publicURL } = supabase.storage
      .from('pet-images')
      .getPublicUrl(filePath);
    
    if (!publicURL || !publicURL.publicUrl) {
      throw new Error('No se pudo obtener la URL pública de la imagen');
    }
    
    console.log('[DEBUG] URL pública:', publicURL.publicUrl);
    updateProgress(100);
    
    return publicURL.publicUrl;
  } catch (error: any) {
    console.error('[ERROR] Error en uploadImage:', error);
    throw error;
  }
}

/**
 * Elimina una imagen del bucket de Supabase Storage
 * @param publicUrl URL pública de la imagen
 * @returns void
 */
export async function deleteImageByPublicUrl(publicUrl: string): Promise<void> {
  try {
    // Extraer la ruta relativa del archivo desde la URL pública
    // Ejemplo: https://xxxx.supabase.co/storage/v1/object/public/pet-images/pets/USERID/pet_123456.jpg
    const match = publicUrl.match(/\/pet-images\/(.*)$/);
    if (!match || !match[1]) {
      throw new Error('No se pudo extraer la ruta del archivo del publicUrl');
    }
    const filePath = match[1];
    // Eliminar el archivo del bucket
    const { error } = await supabase.storage.from('pet-images').remove([filePath]);
    if (error) {
      throw new Error('Error al eliminar la imagen del bucket: ' + error.message);
    }
  } catch (err) {
    console.error('[ERROR] No se pudo eliminar la imagen del bucket:', err);
    throw err;
  }
}
