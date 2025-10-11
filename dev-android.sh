#!/bin/bash

echo "🚀 Configurando entorno para desarrollo Android..."

# Configurar Java 21
export JAVA_HOME=/opt/homebrew/Cellar/openjdk@21/21.0.8/libexec/openjdk.jdk/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH

echo "✅ Java configurado: $(java -version 2>&1 | head -n 1)"

# Navegar al proyecto
cd /Users/mauriciobarrios/Desarrollo/personales/conecta-personal/infinity-providers-app

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json. Verifica la ruta del proyecto."
    exit 1
fi

echo "📱 Iniciando desarrollo Android para AKI..."

# Función para mostrar ayuda
show_help() {
    echo ""
    echo "🎯 Comandos disponibles:"
    echo "  ./dev-android.sh serve     - Solo servidor de desarrollo"
    echo "  ./dev-android.sh run       - Ejecutar en dispositivo"
    echo "  ./dev-android.sh sync      - Sincronizar y ejecutar"
    echo "  ./dev-android.sh clean     - Limpiar y ejecutar"
    echo "  ./dev-android.sh build     - Solo construir APK"
    echo "  ./dev-android.sh help      - Mostrar esta ayuda"
    echo ""
}

# Función para ejecutar en dispositivo
run_device() {
    echo "📱 Ejecutando en dispositivo Android..."
    npx cap run android
}

# Función para sincronizar
sync_and_run() {
    echo "🔄 Sincronizando cambios..."
    npx cap sync android
    echo "📱 Ejecutando en dispositivo..."
    npx cap run android
}

# Función para limpiar
clean_and_run() {
    echo "🧹 Limpiando proyecto..."
    cd android && ./gradlew clean && cd ..
    echo "🔄 Sincronizando..."
    npx cap sync android
    echo "📱 Ejecutando en dispositivo..."
    npx cap run android
}

# Función para construir
build_apk() {
    echo "🔨 Construyendo APK..."
    npx cap build android
    echo "✅ APK construido en android/app/build/outputs/apk/debug/"
}

# Función para servidor
start_server() {
    echo "🌐 Iniciando servidor de desarrollo..."
    ionic serve
}

# Procesar argumentos
case "${1:-run}" in
    "serve")
        start_server
        ;;
    "run")
        run_device
        ;;
    "sync")
        sync_and_run
        ;;
    "clean")
        clean_and_run
        ;;
    "build")
        build_apk
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo "❌ Comando no reconocido: $1"
        show_help
        ;;
esac
