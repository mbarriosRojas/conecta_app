#!/bin/bash

# Script automatizado para generar APK de la aplicación Ionic/Capacitor
# Autor: Sistema de Build Automatizado
# Fecha: $(date)

set -e  # Salir si cualquier comando falla

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes con colores
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
if [ ! -f "package.json" ] || [ ! -f "capacitor.config.ts" ]; then
    print_error "Este script debe ejecutarse desde el directorio raíz de la aplicación Ionic"
    exit 1
fi

print_status "🚀 Iniciando proceso de build del APK..."
print_status "📱 Aplicación: Infinity Providers App"
print_status "📅 Fecha: $(date)"

# Paso 1: Limpiar instalaciones previas
print_status "🧹 Limpiando instalaciones previas..."
rm -rf node_modules
rm -rf www
rm -rf android/app/build
rm -rf android/build

# Paso 2: Instalar dependencias
print_status "📦 Instalando dependencias de Node.js..."
npm install

if [ $? -ne 0 ]; then
    print_error "Error al instalar dependencias de Node.js"
    exit 1
fi

# Paso 3: Build de la aplicación Angular/Ionic
print_status "🔨 Construyendo aplicación Angular/Ionic..."
ionic build --prod

if [ $? -ne 0 ]; then
    print_error "Error al construir la aplicación Angular/Ionic"
    exit 1
fi

# Paso 4: Sincronizar con Capacitor
print_status "🔄 Sincronizando con Capacitor..."
npx cap sync android

if [ $? -ne 0 ]; then
    print_error "Error al sincronizar con Capacitor"
    exit 1
fi

# Paso 5: Verificar que Android Studio está disponible
print_status "🔍 Verificando configuración de Android..."
if ! command -v adb &> /dev/null; then
    print_warning "ADB no encontrado. Asegúrate de tener Android SDK instalado"
fi

# Paso 6: Generar APK de debug
print_status "📱 Generando APK de debug..."
cd android
./gradlew assembleDebug

if [ $? -ne 0 ]; then
    print_error "Error al generar APK de debug"
    cd ..
    exit 1
fi

cd ..

# Paso 7: Buscar el APK generado
APK_PATH=$(find android/app/build/outputs/apk/debug -name "*.apk" 2>/dev/null | head -n 1)

if [ -z "$APK_PATH" ]; then
    print_error "No se encontró el APK generado"
    exit 1
fi

# Paso 8: Crear directorio de releases si no existe
mkdir -p releases

# Paso 9: Copiar APK al directorio de releases con timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
APK_NAME="infinity-providers-app_${TIMESTAMP}.apk"
FINAL_APK_PATH="releases/${APK_NAME}"

cp "$APK_PATH" "$FINAL_APK_PATH"

# Paso 10: Mostrar información del APK generado
print_success "✅ APK generado exitosamente!"
print_status "📁 Ubicación: $(pwd)/$FINAL_APK_PATH"
print_status "📏 Tamaño: $(du -h "$FINAL_APK_PATH" | cut -f1)"
print_status "📅 Fecha: $(date)"

# Paso 11: Opciones adicionales
echo ""
print_status "🎯 Opciones disponibles:"
echo "  1. Instalar APK en dispositivo conectado: adb install \"$FINAL_APK_PATH\""
echo "  2. Abrir carpeta de releases: open releases/"
echo "  3. Generar APK firmado (release): ./build-release-apk.sh"

# Paso 12: Intentar instalar automáticamente si hay dispositivo conectado
if command -v adb &> /dev/null; then
    DEVICE_COUNT=$(adb devices | grep -c "device$")
    if [ "$DEVICE_COUNT" -gt 0 ]; then
        print_status "📱 Dispositivo Android detectado. ¿Instalar automáticamente? (y/n)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            print_status "📲 Instalando APK en dispositivo..."
            adb install "$FINAL_APK_PATH"
            if [ $? -eq 0 ]; then
                print_success "✅ APK instalado exitosamente en el dispositivo!"
            else
                print_error "❌ Error al instalar APK en el dispositivo"
            fi
        fi
    else
        print_warning "📱 No hay dispositivos Android conectados"
    fi
fi

print_success "🎉 Proceso de build completado!"