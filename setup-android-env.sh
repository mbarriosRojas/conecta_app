#!/bin/bash

# Script para configurar el entorno de Android para desarrollo
# Autor: Infinity Team

echo "🔧 Configurando entorno de Android para Infinity Providers..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Detectar el sistema operativo
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
    ANDROID_SDK_DEFAULT="$HOME/Library/Android/sdk"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="Linux"
    ANDROID_SDK_DEFAULT="$HOME/Android/Sdk"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    OS="Windows"
    ANDROID_SDK_DEFAULT="$LOCALAPPDATA/Android/Sdk"
else
    OS="Unknown"
    ANDROID_SDK_DEFAULT="$HOME/Android/Sdk"
fi

print_status "Sistema operativo detectado: $OS"

# Verificar si Android Studio está instalado
if [[ "$OS" == "macOS" ]]; then
    if [ -d "/Applications/Android Studio.app" ]; then
        print_success "Android Studio encontrado en /Applications/Android Studio.app"
    else
        print_warning "Android Studio no encontrado. Por favor instálalo desde: https://developer.android.com/studio"
    fi
elif [[ "$OS" == "Linux" ]]; then
    if command -v android-studio &> /dev/null || [ -d "/opt/android-studio" ]; then
        print_success "Android Studio encontrado"
    else
        print_warning "Android Studio no encontrado. Por favor instálalo desde: https://developer.android.com/studio"
    fi
fi

# Configurar variables de entorno
print_status "Configurando variables de entorno..."

# Verificar si ANDROID_HOME ya está configurado
if [ -n "$ANDROID_HOME" ]; then
    print_success "ANDROID_HOME ya está configurado: $ANDROID_HOME"
else
    print_status "Configurando ANDROID_HOME..."
    
    # Buscar Android SDK en ubicaciones comunes
    POSSIBLE_PATHS=(
        "$ANDROID_SDK_DEFAULT"
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
            print_success "Android SDK encontrado en: $path"
            ANDROID_SDK_FOUND=true
            break
        fi
    done
    
    if [ "$ANDROID_SDK_FOUND" = false ]; then
        print_error "Android SDK no encontrado. Por favor:"
        echo "1. Instala Android Studio"
        echo "2. Abre Android Studio y ve a SDK Manager"
        echo "3. Instala Android SDK Platform Tools"
        echo "4. Ejecuta este script nuevamente"
        exit 1
    fi
fi

# Agregar Android SDK al PATH
export PATH="$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools"

# Verificar que las herramientas estén disponibles
print_status "Verificando herramientas de Android..."

if command -v adb &> /dev/null; then
    ADB_VERSION=$(adb version | head -n1)
    print_success "ADB disponible: $ADB_VERSION"
else
    print_warning "ADB no encontrado en PATH"
fi

# Verificar que Java esté instalado
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | head -n1)
    print_success "Java disponible: $JAVA_VERSION"
else
    print_warning "Java no encontrado. Por favor instala Java JDK 11 o superior"
fi

# Crear archivo de configuración para el shell
SHELL_CONFIG=""
if [ -n "$ZSH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.bashrc"
fi

if [ -n "$SHELL_CONFIG" ]; then
    print_status "Agregando configuración a $SHELL_CONFIG..."
    
    # Verificar si la configuración ya existe
    if ! grep -q "ANDROID_HOME" "$SHELL_CONFIG"; then
        echo "" >> "$SHELL_CONFIG"
        echo "# Android SDK Configuration" >> "$SHELL_CONFIG"
        echo "export ANDROID_HOME=\"$ANDROID_HOME\"" >> "$SHELL_CONFIG"
        echo "export ANDROID_SDK_ROOT=\"$ANDROID_SDK_ROOT\"" >> "$SHELL_CONFIG"
        echo "export PATH=\"\$PATH:\$ANDROID_HOME/tools:\$ANDROID_HOME/platform-tools\"" >> "$SHELL_CONFIG"
        print_success "Configuración agregada a $SHELL_CONFIG"
        print_warning "Por favor ejecuta 'source $SHELL_CONFIG' o reinicia tu terminal"
    else
        print_success "Configuración de Android ya existe en $SHELL_CONFIG"
    fi
fi

# Verificar que Capacitor esté configurado
print_status "Verificando configuración de Capacitor..."

if [ -f "capacitor.config.ts" ]; then
    print_success "Capacitor configurado correctamente"
else
    print_warning "capacitor.config.ts no encontrado"
fi

# Verificar que la plataforma Android esté agregada
if [ -d "android" ]; then
    print_success "Plataforma Android agregada"
else
    print_warning "Plataforma Android no encontrada. Ejecuta: ionic capacitor add android"
fi

echo ""
print_success "¡Configuración completada!"
echo ""
echo "📋 Resumen de configuración:"
echo "   • ANDROID_HOME: $ANDROID_HOME"
echo "   • ANDROID_SDK_ROOT: $ANDROID_SDK_ROOT"
echo "   • PATH actualizado con herramientas de Android"
echo ""
echo "🚀 Próximos pasos:"
echo "   1. Reinicia tu terminal o ejecuta: source $SHELL_CONFIG"
echo "   2. Ejecuta: ./build-apk.sh"
echo "   3. O ejecuta: ionic capacitor run android"
echo ""
