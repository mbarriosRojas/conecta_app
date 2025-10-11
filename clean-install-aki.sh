#!/bin/bash

echo "🧹 Limpieza e instalación limpia de AKI..."

# Configurar Java 21
export JAVA_HOME=/opt/homebrew/Cellar/openjdk@21/21.0.8/libexec/openjdk.jdk/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH

echo "✅ Java configurado: $(java -version 2>&1 | head -n 1)"

# Navegar al proyecto
cd /Users/mauriciobarrios/Desarrollo/personales/conecta-personal/infinity-providers-app

echo ""
echo "🗑️ Desinstalando app anterior (si existe)..."

# Intentar desinstalar la app anterior
adb uninstall aki_app.app 2>/dev/null || echo "ℹ️ App anterior no encontrada"
adb uninstall com.aki.conectapersonal 2>/dev/null || echo "ℹ️ App nueva no encontrada"

echo ""
echo "🧹 Limpiando proyecto..."

# Limpiar completamente
cd android && ./gradlew clean && cd ..
rm -rf android/app/build

echo ""
echo "🔄 Sincronizando..."

# Sincronizar
npx cap sync android

echo ""
echo "🚀 Instalando AKI..."

# Instalar
echo "Pixel_9a" | npx cap run android

echo ""
echo "✅ ¡AKI instalado! Verifica en tu dispositivo:"
echo "   - Nombre: AKI"
echo "   - Icono: Círculo azul-púrpura"
echo "   - Splash: Gradiente con logo AKI"
