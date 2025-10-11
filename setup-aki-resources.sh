#!/bin/bash

echo "🎨 Configurando recursos de AKI..."

# Crear directorios de recursos si no existen
mkdir -p android/app/src/main/res/mipmap-mdpi
mkdir -p android/app/src/main/res/mipmap-hdpi
mkdir -p android/app/src/main/res/mipmap-xhdpi
mkdir -p android/app/src/main/res/mipmap-xxhdpi
mkdir -p android/app/src/main/res/mipmap-xxxhdpi

# Crear directorios de splash screens
mkdir -p android/app/src/main/res/drawable-port-hdpi
mkdir -p android/app/src/main/res/drawable-port-mdpi
mkdir -p android/app/src/main/res/drawable-port-xhdpi
mkdir -p android/app/src/main/res/drawable-port-xxhdpi
mkdir -p android/app/src/main/res/drawable-port-xxxhdpi

echo "📱 Para generar los iconos y splash screens:"
echo "1. Abre generate-icons.html en tu navegador"
echo "2. Descarga todos los iconos PNG"
echo "3. Colócalos en las carpetas correspondientes:"
echo "   - ic_launcher_48.png → android/app/src/main/res/mipmap-mdpi/ic_launcher.png"
echo "   - ic_launcher_72.png → android/app/src/main/res/mipmap-hdpi/ic_launcher.png"
echo "   - ic_launcher_96.png → android/app/src/main/res/mipmap-xhdpi/ic_launcher.png"
echo "   - ic_launcher_144.png → android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png"
echo "   - ic_launcher_192.png → android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png"

echo ""
echo "🖼️ Para generar los splash screens:"
echo "1. Abre generate-splash.html en tu navegador"
echo "2. Descarga los splash screens PNG"
echo "3. Colócalos en las carpetas correspondientes:"
echo "   - splash_phone.png → android/app/src/main/res/drawable-port-xxxhdpi/splash.png"

echo ""
echo "✅ Una vez descargados los archivos, ejecuta:"
echo "   npx cap sync android"
echo "   npx cap run android"

echo ""
echo "🎯 Los archivos SVG ya están creados en src/assets/icon/"
echo "   - aki-logo.svg (icono principal)"
echo "   - aki-logo-adaptive.svg (icono adaptativo)"
echo "   - aki-splash.svg (splash screen)"
