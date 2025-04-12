# Script de PowerShell para configurar la base de datos de Pet Club App usando Supabase CLI

# Mostrar mensaje de inicio
Write-Host "Iniciando configuración de la base de datos para Pet Club App..." -ForegroundColor Cyan

# Ruta al archivo SQL de inicialización
$initSqlPath = Join-Path $PSScriptRoot "init.sql"

# Verificar si el archivo SQL existe
if (-not (Test-Path $initSqlPath)) {
    Write-Host "El archivo SQL de inicialización no existe en: $initSqlPath" -ForegroundColor Red
    exit 1
}

# Verificar si Supabase CLI está instalado
try {
    $supabaseVersion = supabase --version
    Write-Host "Supabase CLI detectado: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Supabase CLI no está instalado o no está en el PATH." -ForegroundColor Red
    Write-Host "Puedes instalarlo con: npm install -g supabase" -ForegroundColor Yellow
    Write-Host "Y luego iniciar sesión con: supabase login" -ForegroundColor Yellow
    exit 1
}

# Ejecutar el script SQL usando la CLI de Supabase
Write-Host "Ejecutando script SQL de inicialización..." -ForegroundColor Cyan
try {
    supabase db execute --file "$initSqlPath"
    
    # Si llegamos aquí, el comando se ejecutó correctamente
    Write-Host "`n✅ Configuración de la base de datos completada con éxito!" -ForegroundColor Green
    Write-Host "La tabla 'pets' y el bucket de almacenamiento 'pet-images' han sido creados." -ForegroundColor Green
    Write-Host "Las políticas de seguridad han sido configuradas correctamente." -ForegroundColor Green
} catch {
    Write-Host "`n❌ Error al configurar la base de datos." -ForegroundColor Red
    Write-Host "Mensaje de error: $_" -ForegroundColor Red
    Write-Host "Asegúrate de tener la CLI de Supabase instalada y configurada correctamente." -ForegroundColor Yellow
    Write-Host "Puedes instalarla con: npm install -g supabase" -ForegroundColor Yellow
    Write-Host "Y luego iniciar sesión con: supabase login" -ForegroundColor Yellow
    exit 1
}