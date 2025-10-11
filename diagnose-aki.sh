#!/bin/bash

echo "🔍 Diagnóstico de AKI..."

# Configurar Java 21
export JAVA_HOME=/opt/homebrew/Cellar/openjdk@21/21.0.8/libexec/openjdk.jdk/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH

echo "✅ Java configurado: $(java -version 2>&1 | head -n 1)"

# Navegar al proyecto
cd /Users/mauriciobarrios/Desarrollo/personales/conecta-personal/infinity-providers-app

echo ""
echo "📱 Verificando configuración de AKI..."

# Verificar capacitor.config.ts
echo "📋 Capacitor Config:"
grep -A 5 -B 5 "appName\|appId" capacitor.config.ts

echo ""
echo "📋 Android Strings:"
grep -A 3 -B 3 "app_name" android/app/src/main/res/values/strings.xml

echo ""
echo "📋 Android Build Config:"
grep -A 3 -B 3 "applicationId" android/app/build.gradle

echo ""
echo "📋 MainActivity:"
cat android/app/src/main/java/com/aki/conectapersonal/MainActivity.java

echo ""
echo "📋 Iconos disponibles:"
ls -la android/app/src/main/res/mipmap-*/ic_launcher.png

echo ""
echo "📋 Splash screens disponibles:"
ls -la android/app/src/main/res/drawable-port-*/splash.png | head -3

echo ""
echo "🚀 Para probar la app, ejecuta:"
echo "   ./run-aki-auto.sh"
