#!/bin/bash

echo "🔍 Diagnóstico completo de AKI..."

# Configurar Java 21
export JAVA_HOME=/opt/homebrew/Cellar/openjdk@21/21.0.8/libexec/openjdk.jdk/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH

echo "✅ Java configurado: $(java -version 2>&1 | head -n 1)"

# Navegar al proyecto
cd /Users/mauriciobarrios/Desarrollo/personales/conecta-personal/infinity-providers-app

echo ""
echo "📋 Verificando estructura de archivos..."

# Verificar archivos SVG
echo "🎨 Archivos SVG:"
ls -la src/assets/icon/*.svg

# Verificar recursos generados
echo ""
echo "📱 Recursos generados:"
ls -la resources/

# Verificar iconos Android
echo ""
echo "🤖 Iconos Android:"
ls -la android/app/src/main/res/mipmap-*/ic_launcher.png | head -3

# Verificar splash screens
echo ""
echo "🖼️ Splash screens:"
ls -la android/app/src/main/res/drawable-port-*/splash.png | head -3

# Verificar configuración
echo ""
echo "⚙️ Configuración:"
echo "App ID: $(grep 'appId' capacitor.config.ts)"
echo "App Name: $(grep 'appName' capacitor.config.ts)"
echo "Package: $(grep 'applicationId' android/app/build.gradle)"

# Verificar routing
echo ""
echo "🛣️ Routing:"
grep -A 3 -B 3 "login" src/app/app-routing.module.ts

# Verificar módulos
echo ""
echo "📦 Módulos:"
ls -la src/app/pages/login/*.module.ts 2>/dev/null || echo "❌ Módulo login no encontrado"

echo ""
echo "🔧 Para corregir problemas:"
echo "1. ./fix-all-issues.sh"
echo "2. ionic serve --port=8100"
echo "3. Navegar a http://localhost:8100/login"
