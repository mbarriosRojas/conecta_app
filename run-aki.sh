#!/bin/bash

echo "🚀 Configurando entorno para AKI..."

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

echo "📱 Iniciando AKI en dispositivo Android..."

# Ejecutar en dispositivo
npx cap run android
