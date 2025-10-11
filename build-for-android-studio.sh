#!/bin/bash

echo "🚀 Preparando AKI para Android Studio..."

# Configurar Java 21
export JAVA_HOME=/opt/homebrew/Cellar/openjdk@21/21.0.8/libexec/openjdk.jdk/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH

echo "✅ Java configurado: $(java -version 2>&1 | head -n 1)"

# Navegar al proyecto
cd /Users/mauriciobarrios/Desarrollo/personales/conecta-personal/infinity-providers-app

echo ""
echo "🔄 Sincronizando con Capacitor..."
npx cap sync android

echo ""
echo "✅ ¡Listo para Android Studio!"
echo ""
echo "📱 Pasos siguientes:"
echo "1. Abre Android Studio"
echo "2. Abre el proyecto: infinity-providers-app/android"
echo "3. Build → Build Bundle(s) / APK(s) → Build APK(s)"
echo "4. El APK se generará en: android/app/build/outputs/apk/debug/"
echo ""
echo "🎯 Verifica que tengas:"
echo "   - Nombre: AKI"
echo "   - Icono: Círculo azul-púrpura"
echo "   - Splash: Gradiente con logo AKI"
