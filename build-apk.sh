#!/bin/bash

# Script para generar APK de pruebas con environment de producción
# Autor: Infinity Team
# Fecha: $(date)

set -e  # Salir si hay algún error

echo "🚀 Iniciando proceso de generación de APK de pruebas..."
echo "📱 Aplicación: Infinity Providers"
echo "🌐 Environment: Production"
echo "⏰ Fecha: $(date)"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes con color
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    print_error "No se encontró package.json. Asegúrate de estar en el directorio raíz del proyecto."
    exit 1
fi

# Verificar que Node.js esté instalado
if ! command -v node &> /dev/null; then
    print_error "Node.js no está instalado. Por favor instala Node.js primero."
    exit 1
fi

# Verificar que npm esté instalado
if ! command -v npm &> /dev/null; then
    print_error "npm no está instalado. Por favor instala npm primero."
    exit 1
fi

# Verificar que Ionic CLI esté instalado
if ! command -v ionic &> /dev/null; then
    print_warning "Ionic CLI no está instalado. Instalando..."
    npm install -g @ionic/cli
fi

# Verificar que Capacitor CLI esté instalado
if ! command -v cap &> /dev/null; then
    print_warning "Capacitor CLI no está instalado. Instalando..."
    npm install -g @capacitor/cli
fi

print_status "Verificando dependencias..."

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    print_status "Instalando dependencias de npm..."
    npm install
else
    print_status "Dependencias ya instaladas."
fi

# Limpiar builds anteriores
print_status "Limpiando builds anteriores..."
rm -rf www/
rm -rf android/app/build/
rm -rf android/build/

# Build de producción
print_status "Compilando aplicación con environment de producción..."
ionic build --configuration production

if [ $? -ne 0 ]; then
    print_error "Error en la compilación. Revisa los errores arriba."
    exit 1
fi

print_success "Compilación completada exitosamente."

# Sincronizar con Capacitor
print_status "Sincronizando con Capacitor..."
ionic capacitor sync android

if [ $? -ne 0 ]; then
    print_error "Error en la sincronización con Capacitor."
    exit 1
fi

print_success "Sincronización completada."

# Verificar que Android SDK esté configurado
if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
    print_warning "ANDROID_HOME no está configurado. Verificando ubicación por defecto..."
    
    # Ubicaciones comunes de Android SDK
    POSSIBLE_PATHS=(
        "$HOME/Android/Sdk"
        "$HOME/Library/Android/sdk"
        "/usr/local/android-sdk"
        "/opt/android-sdk"
    )
    
    ANDROID_SDK_FOUND=false
    for path in "${POSSIBLE_PATHS[@]}"; do
        if [ -d "$path" ]; then
            export ANDROID_HOME="$path"
            export ANDROID_SDK_ROOT="$path"
            export PATH="$PATH:$path/tools:$path/platform-tools"
            print_success "Android SDK encontrado en: $path"
            ANDROID_SDK_FOUND=true
            break
        fi
    done
    
    if [ "$ANDROID_SDK_FOUND" = false ]; then
        print_error "Android SDK no encontrado. Por favor:"
        echo "1. Instala Android Studio"
        echo "2. Configura la variable ANDROID_HOME"
        echo "3. O ejecuta: export ANDROID_HOME=/ruta/a/tu/android/sdk"
        exit 1
    fi
fi

# Generar APK de debug
print_status "Generando APK de debug..."
cd android
./gradlew assembleDebug

if [ $? -ne 0 ]; then
    print_error "Error generando APK. Revisa los errores arriba."
    cd ..
    exit 1
fi

cd ..

# Verificar que el APK se generó
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    print_success "APK generado exitosamente!"
    print_success "Ubicación: $APK_PATH"
    print_success "Tamaño: $APK_SIZE"
    
    # Crear directorio de releases si no existe
    mkdir -p releases
    
    # Copiar APK a directorio de releases con timestamp
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    RELEASE_NAME="infinity-providers-debug-$TIMESTAMP.apk"
    cp "$APK_PATH" "releases/$RELEASE_NAME"
    
    print_success "APK copiado a: releases/$RELEASE_NAME"
    
    echo ""
    echo "🎉 ¡Proceso completado exitosamente!"
    echo "📱 APK de pruebas generado: releases/$RELEASE_NAME"
    echo "🌐 Environment: Production"
    echo "🔗 API URL: https://infinity-backend-develop.imagineapps.co"
    echo ""
    echo "Para instalar en tu dispositivo:"
    echo "1. Habilita 'Fuentes desconocidas' en tu Android"
    echo "2. Transfiere el APK a tu dispositivo"
    echo "3. Instala desde el explorador de archivos"
    echo ""
    
else
    print_error "APK no se generó correctamente."
    exit 1
fi
