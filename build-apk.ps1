# Script para generar APK de pruebas con environment de producción (Windows PowerShell)
# Autor: Infinity Team
# Fecha: $(Get-Date)

param(
    [switch]$Clean = $false
)

# Configurar colores para output
$ErrorActionPreference = "Stop"

function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

Write-Host "🚀 Iniciando proceso de generación de APK de pruebas..." -ForegroundColor Cyan
Write-Host "📱 Aplicación: Infinity Providers" -ForegroundColor Cyan
Write-Host "🌐 Environment: Production" -ForegroundColor Cyan
Write-Host "⏰ Fecha: $(Get-Date)" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Error "No se encontró package.json. Asegúrate de estar en el directorio raíz del proyecto."
    exit 1
}

# Verificar que Node.js esté instalado
try {
    $nodeVersion = node --version
    Write-Status "Node.js versión: $nodeVersion"
} catch {
    Write-Error "Node.js no está instalado. Por favor instala Node.js primero."
    exit 1
}

# Verificar que npm esté instalado
try {
    $npmVersion = npm --version
    Write-Status "npm versión: $npmVersion"
} catch {
    Write-Error "npm no está instalado. Por favor instala npm primero."
    exit 1
}

# Verificar que Ionic CLI esté instalado
try {
    $ionicVersion = ionic --version
    Write-Status "Ionic CLI versión: $ionicVersion"
} catch {
    Write-Warning "Ionic CLI no está instalado. Instalando..."
    npm install -g @ionic/cli
}

# Verificar que Capacitor CLI esté instalado
try {
    $capVersion = cap --version
    Write-Status "Capacitor CLI versión: $capVersion"
} catch {
    Write-Warning "Capacitor CLI no está instalado. Instalando..."
    npm install -g @capacitor/cli
}

Write-Status "Verificando dependencias..."

# Instalar dependencias si no existen
if (-not (Test-Path "node_modules")) {
    Write-Status "Instalando dependencias de npm..."
    npm install
} else {
    Write-Status "Dependencias ya instaladas."
}

# Limpiar builds anteriores si se solicita
if ($Clean) {
    Write-Status "Limpiando builds anteriores..."
    if (Test-Path "www") { Remove-Item -Recurse -Force "www" }
    if (Test-Path "android\app\build") { Remove-Item -Recurse -Force "android\app\build" }
    if (Test-Path "android\build") { Remove-Item -Recurse -Force "android\build" }
}

# Build de producción
Write-Status "Compilando aplicación con environment de producción..."
ionic build --configuration production

if ($LASTEXITCODE -ne 0) {
    Write-Error "Error en la compilación. Revisa los errores arriba."
    exit 1
}

Write-Success "Compilación completada exitosamente."

# Sincronizar con Capacitor
Write-Status "Sincronizando con Capacitor..."
ionic capacitor sync android

if ($LASTEXITCODE -ne 0) {
    Write-Error "Error en la sincronización con Capacitor."
    exit 1
}

Write-Success "Sincronización completada."

# Verificar que Android SDK esté configurado
if (-not $env:ANDROID_HOME -and -not $env:ANDROID_SDK_ROOT) {
    Write-Warning "ANDROID_HOME no está configurado. Verificando ubicación por defecto..."
    
    # Ubicaciones comunes de Android SDK en Windows
    $possiblePaths = @(
        "$env:LOCALAPPDATA\Android\Sdk",
        "$env:ProgramFiles\Android\Android Studio\sdk",
        "C:\Android\Sdk",
        "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"
    )
    
    $androidSdkFound = $false
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $env:ANDROID_HOME = $path
            $env:ANDROID_SDK_ROOT = $path
            $env:PATH += ";$path\tools;$path\platform-tools"
            Write-Success "Android SDK encontrado en: $path"
            $androidSdkFound = $true
            break
        }
    }
    
    if (-not $androidSdkFound) {
        Write-Error "Android SDK no encontrado. Por favor:"
        Write-Host "1. Instala Android Studio"
        Write-Host "2. Configura la variable ANDROID_HOME"
        Write-Host "3. O ejecuta: `$env:ANDROID_HOME = 'C:\ruta\a\tu\android\sdk'"
        exit 1
    }
}

# Generar APK de debug
Write-Status "Generando APK de debug..."
Set-Location android
.\gradlew.bat assembleDebug

if ($LASTEXITCODE -ne 0) {
    Write-Error "Error generando APK. Revisa los errores arriba."
    Set-Location ..
    exit 1
}

Set-Location ..

# Verificar que el APK se generó
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    $apkSize = (Get-Item $apkPath).Length / 1MB
    $apkSizeFormatted = "{0:N2} MB" -f $apkSize
    
    Write-Success "APK generado exitosamente!"
    Write-Success "Ubicación: $apkPath"
    Write-Success "Tamaño: $apkSizeFormatted"
    
    # Crear directorio de releases si no existe
    if (-not (Test-Path "releases")) {
        New-Item -ItemType Directory -Name "releases"
    }
    
    # Copiar APK a directorio de releases con timestamp
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $releaseName = "infinity-providers-debug-$timestamp.apk"
    Copy-Item $apkPath "releases\$releaseName"
    
    Write-Success "APK copiado a: releases\$releaseName"
    
    Write-Host ""
    Write-Host "🎉 ¡Proceso completado exitosamente!" -ForegroundColor Green
    Write-Host "📱 APK de pruebas generado: releases\$releaseName" -ForegroundColor Green
    Write-Host "🌐 Environment: Production" -ForegroundColor Green
    Write-Host "🔗 API URL: https://infinity-backend-develop.imagineapps.co" -ForegroundColor Green
    Write-Host ""
    Write-Host "Para instalar en tu dispositivo:" -ForegroundColor Yellow
    Write-Host "1. Habilita 'Fuentes desconocidas' en tu Android" -ForegroundColor Yellow
    Write-Host "2. Transfiere el APK a tu dispositivo" -ForegroundColor Yellow
    Write-Host "3. Instala desde el explorador de archivos" -ForegroundColor Yellow
    Write-Host ""
    
} else {
    Write-Error "APK no se generó correctamente."
    exit 1
}
