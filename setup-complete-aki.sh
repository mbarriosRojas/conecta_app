#!/bin/bash

echo "🚀 Configuración completa de AKI..."

# Configurar Java 21
export JAVA_HOME=/opt/homebrew/Cellar/openjdk@21/21.0.8/libexec/openjdk.jdk/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH

echo "✅ Java configurado: $(java -version 2>&1 | head -n 1)"

# Navegar al proyecto
cd /Users/mauriciobarrios/Desarrollo/personales/conecta-personal/infinity-providers-app

echo ""
echo "🎨 Generando recursos con Cordova Resources..."

# Generar iconos y splash screens
echo "📱 Generando iconos PNG..."
node -e "
const sharp = require('sharp');
const fs = require('fs');

const svgContent = fs.readFileSync('src/assets/icon/aki-logo.svg', 'utf8');
sharp(Buffer.from(svgContent))
  .resize(1024, 1024)
  .png()
  .toFile('resources/icon.png')
  .then(() => console.log('✅ Icono PNG creado: 1024x1024'))
  .catch(err => console.error('❌ Error:', err));
"

echo "🖼️ Generando splash screen PNG..."
node -e "
const sharp = require('sharp');
const fs = require('fs');

const svgContent = fs.readFileSync('src/assets/icon/aki-splash.svg', 'utf8');
sharp(Buffer.from(svgContent))
  .resize(2048, 2048)
  .png()
  .toFile('resources/splash.png')
  .then(() => console.log('✅ Splash PNG creado: 2048x2048'))
  .catch(err => console.error('❌ Error:', err));
"

# Usar cordova-res para generar todos los recursos
echo "🔧 Generando recursos para Android..."
cordova-res android --skip-config --copy

echo ""
echo "🔄 Sincronizando con Capacitor..."
npx cap sync android

echo ""
echo "✅ ¡AKI completamente configurado!"
echo ""
echo "📱 Para compilar en Android Studio:"
echo "1. Abre Android Studio"
echo "2. Abre el proyecto: infinity-providers-app/android"
echo "3. Build → Build Bundle(s) / APK(s) → Build APK(s)"
echo ""
echo "🎯 Verifica que tengas:"
echo "   ✅ Nombre: AKI"
echo "   ✅ Icono: Círculo azul-púrpura con 'AKI'"
echo "   ✅ Splash: Gradiente con logo AKI"
echo "   ✅ Headers: Sin sobreposición con status bar"
echo "   ✅ Login: Diseño moderno con Google Auth"
