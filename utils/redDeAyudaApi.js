import { supabase } from '../app/lib/supabase';

export async function getAvisos(tipo_aviso = '') {
  // Purga automática de avisos expirados + 3 días
  await purgeExpiredAvisos();
  let query = supabase.from('red_de_ayuda').select('*').order('created_at', { ascending: false });
  if (tipo_aviso) query = query.eq('tipo_aviso', tipo_aviso);
  const { data, error } = await query;
  if (error) throw error;
  // Marca como expirado si corresponde
  const now = new Date();
  for (const aviso of data) {
    if (aviso.estado === 'activo' && aviso.expires_at && new Date(aviso.expires_at) < now) {
      await supabase.from('red_de_ayuda').update({ estado: 'expirado' }).eq('id', aviso.id);
      aviso.estado = 'expirado';
    }
  }
  return data;
}

export async function createAviso(aviso, imgFiles) {
  let imagenes_urls = [];
  if (imgFiles && imgFiles.length > 0) {
    for (let i = 0; i < imgFiles.length; i++) {
      const imgFile = imgFiles[i];
      let fileName = `${Date.now()}_${i}`;
      if (typeof imgFile === 'string') {
        imagenes_urls.push(imgFile);
        continue;
      }
      fileName += `_${imgFile.name || 'image.jpg'}`;
      let { data: storageData, error: storageError } = await supabase.storage
        .from('anuncios-images')
        .upload(fileName, imgFile);
      if (storageError) throw storageError;
      const publicUrl = supabase.storage.from('anuncios-images').getPublicUrl(fileName).data.publicUrl;
      imagenes_urls.push(publicUrl);
    }
  }
  const { data: { user } } = await supabase.auth.getUser();
  const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  // Validación de campos obligatorios
  if (!aviso.tipo_aviso || !aviso.especie || !aviso.nombre || !aviso.descripcion || !aviso.ubicacion || !aviso.fecha || !aviso.contacto) {
    throw new Error('Faltan campos obligatorios para crear el aviso.');
  }
  if (!user?.id) {
    throw new Error('No se pudo obtener el usuario actual.');
  }
  const { error } = await supabase.from('red_de_ayuda').insert([
    {
      ...aviso,
      imagenes_urls,
      user_id: user.id,
      expires_at,
      estado: 'activo',
    }
  ]);
  if (error) throw error;
}

export async function updateAviso(avisoId, newData, imgFiles) {
  let imagenes_urls = [];
  if (imgFiles && imgFiles.length > 0) {
    for (let i = 0; i < imgFiles.length; i++) {
      const imgFile = imgFiles[i];
      let fileName = `${Date.now()}_${i}`;
      if (typeof imgFile === 'string') {
        imagenes_urls.push(imgFile);
        continue;
      }
      fileName += `_${imgFile.name || 'image.jpg'}`;
      let { data: storageData, error: storageError } = await supabase.storage
        .from('anuncios-images')
        .upload(fileName, imgFile);
      if (storageError) throw storageError;
      const publicUrl = supabase.storage.from('anuncios-images').getPublicUrl(fileName).data.publicUrl;
      imagenes_urls.push(publicUrl);
    }
  }
  const { error } = await supabase.from('red_de_ayuda').update({
    ...newData,
    imagenes_urls: imagenes_urls.length ? imagenes_urls : newData.imagenes_urls
  }).eq('id', avisoId);
  if (error) throw error;
}

export async function deleteAviso(avisoId, imagenes_urls = []) {
  console.log('deleteAviso called with:', avisoId, imagenes_urls);
  // Borra imágenes del bucket
  for (const url of imagenes_urls) {
    try {
      const path = url.split('/anuncios-images/')[1];
      if (path) {
        await supabase.storage.from('anuncios-images').remove([path]);
      }
    } catch (e) {console.error('Error borrando imagen:', e);}
  }
  const { error } = await supabase.from('red_de_ayuda').delete().eq('id', avisoId);
  if (error) {
    console.error('Supabase error borrando aviso:', error);
    throw error;
  }
}

export async function changeAvisoStatus(avisoId, newStatus) {
  let update = { estado: newStatus };
  if (newStatus === 'activo') {
    update.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }
  const { error } = await supabase.from('red_de_ayuda').update(update).eq('id', avisoId);
  if (error) throw error;
}

export async function renewAviso(avisoId) {
  const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from('red_de_ayuda').update({ estado: 'activo', expires_at }).eq('id', avisoId);
  if (error) throw error;
}

export async function purgeExpiredAvisos() {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('red_de_ayuda')
    .update({ estado: 'expirado' })
    .lte('expires_at', now)
    .neq('estado', 'expirado');
  if (error) throw error;
  return data;
}

export async function getAvisoById(avisoId) {
  const { data, error } = await supabase
    .from('red_de_ayuda')
    .select('*')
    .eq('id', avisoId)
    .single();
  
  if (error) throw error;
  return data;
}
