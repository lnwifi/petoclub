// Script para configurar la base de datos de Pet Club App usando Supabase CLI
// Este script ejecuta los comandos necesarios para inicializar la base de datos

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Ruta al archivo SQL de inicialización
const initSqlPath = path.join(__dirname, 'init.sql');

// Función para ejecutar comandos y mostrar la salida
function runCommand(command) {
  console.log(`Ejecutando: ${command}`);
  try {
    const output = execSync(command, { encoding: 'utf8' });
    console.log(output);
    return true;
  } catch (error) {
    console.error(`Error al ejecutar el comando: ${command}`);
    console.error(error.message);
    return false;
  }
}

// Función principal
async function setupDatabase() {
  console.log('Iniciando configuración de la base de datos para Pet Club App...');

  // Verificar si el archivo SQL existe
  if (!fs.existsSync(initSqlPath)) {
    console.error(`El archivo SQL de inicialización no existe en: ${initSqlPath}`);
    return;
  }

  // Ejecutar el script SQL usando la CLI de Supabase
  console.log('Ejecutando script SQL de inicialización...');
  const success = runCommand(`supabase db execute --file "${initSqlPath}"`);

  if (success) {
    console.log('\n✅ Configuración de la base de datos completada con éxito!');
    console.log('La tabla "pets" y el bucket de almacenamiento "pet-images" han sido creados.');
    console.log('Las políticas de seguridad han sido configuradas correctamente.');
  } else {
    console.error('\n❌ Error al configurar la base de datos.');
    console.log('Asegúrate de tener la CLI de Supabase instalada y configurada correctamente.');
    console.log('Puedes instalarla con: npm install -g supabase');
    console.log('Y luego iniciar sesión con: supabase login');
  }
}

// Ejecutar la función principal
setupDatabase().catch(error => {
  console.error('Error inesperado:', error);
});