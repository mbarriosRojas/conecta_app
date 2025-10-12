#!/bin/bash

echo "🔧 Corrigiendo todos los problemas de AKI..."

# Configurar Java 21
export JAVA_HOME=/opt/homebrew/Cellar/openjdk@21/21.0.8/libexec/openjdk.jdk/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH

echo "✅ Java configurado: $(java -version 2>&1 | head -n 1)"

# Navegar al proyecto
cd /Users/mauriciobarrios/Desarrollo/personales/conecta-personal/infinity-providers-app

echo ""
echo "🗑️ Limpiando recursos anteriores..."
rm -rf android/app/src/main/res/mipmap-* android/app/src/main/res/drawable-*

echo ""
echo "🎨 Regenerando recursos desde SVG..."

# Regenerar icono desde SVG
node -e "
const sharp = require('sharp');
const fs = require('fs');

const svgContent = fs.readFileSync('src/assets/icon/aki-logo.svg', 'utf8');
sharp(Buffer.from(svgContent))
  .resize(1024, 1024)
  .png()
  .toFile('resources/icon.png')
  .then(() => console.log('✅ Icono PNG regenerado: 1024x1024'))
  .catch(err => console.error('❌ Error:', err));
"

# Regenerar splash desde SVG
node -e "
const sharp = require('sharp');
const fs = require('fs');

const svgContent = fs.readFileSync('src/assets/icon/aki-splash.svg', 'utf8');
sharp(Buffer.from(svgContent))
  .resize(2048, 2048)
  .png()
  .toFile('resources/splash.png')
  .then(() => console.log('✅ Splash PNG regenerado: 2048x2048'))
  .catch(err => console.error('❌ Error:', err));
"

echo ""
echo "🔧 Generando recursos Android con cordova-res..."
cordova-res android --skip-config --copy

echo ""
echo "🔄 Limpiando build anterior..."
cd android && ./gradlew clean && cd ..

echo ""
echo "🔄 Sincronizando con Capacitor..."
npx cap sync android

echo ""
echo "✅ ¡Problemas corregidos!"
echo ""
echo "📱 Para probar:"
echo "1. ionic serve (para web)"
echo "2. ./run-aki-auto.sh (para Android)"
echo ""
echo "🎯 Verifica:"
echo "   ✅ Login en /login con botón Google"
echo "   ✅ Icono AKI en dispositivo"
echo "   ✅ Splash AKI al abrir"
