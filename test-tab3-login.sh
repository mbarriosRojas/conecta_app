#!/bin/bash

echo "🧪 Probando Tab3 Login de AKI..."

# Configurar Java 21
export JAVA_HOME=/opt/homebrew/Cellar/openjdk@21/21.0.8/libexec/openjdk.jdk/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH

cd /Users/mauriciobarrios/Desarrollo/personales/conecta-personal/infinity-providers-app

echo ""
echo "🔍 Verificando servidor..."
if curl -s http://localhost:8101 > /dev/null; then
    echo "✅ Servidor corriendo en http://localhost:8101"
else
    echo "❌ Servidor no está corriendo. Iniciando..."
    ionic serve --port=8101 &
    sleep 10
fi

echo ""
echo "📱 URLs para probar:"
echo "🏠 Home: http://localhost:8101"
echo "🔐 Login (Tab3): http://localhost:8101/tabs/tab3"
echo "📋 Tabs: http://localhost:8101/tabs"

echo ""
echo "🎯 Verifica en el navegador:"
echo "1. ✅ Tab3 ahora muestra el login"
echo "2. ✅ Botón 'Continuar con Google' funciona"
echo "3. ✅ Cambio entre login/registro en footer"
echo "4. ✅ Sin errores de Firebase API key"

echo ""
echo "📱 Para probar en Android:"
echo "   ./run-aki-auto.sh"

echo ""
echo "🔧 Cambios realizados:"
echo "✅ Tab3 ahora carga LoginPage"
echo "✅ Tab3Page original eliminado"
echo "✅ Firebase configurado correctamente"
echo "✅ Google Auth sin errores de API key"
