#!/bin/bash

echo "🔧 SCRIPT DE PRUEBA - AUTENTICACIÓN HÍBRIDA"
echo "============================================="
echo ""
echo "Este script te ayudará a probar el sistema de autenticación híbrida:"
echo "1. Login con Google"
echo "2. Registro con Google"
echo "3. Intento de login con email/password en cuenta Google"
echo "4. Agregar contraseña a cuenta Google"
echo ""
echo "📋 INSTRUCCIONES:"
echo "1. Asegúrate de que el backend esté corriendo en http://localhost:8080"
echo "2. Asegúrate de que el frontend esté corriendo en http://localhost:8101"
echo "3. Ten las credenciales de Firebase Admin configuradas"
echo ""

# Verificar que el backend esté corriendo
echo "🔍 Verificando backend..."
if curl -s http://localhost:8080/api/category > /dev/null; then
    echo "✅ Backend está corriendo en http://localhost:8080"
else
    echo "❌ Backend no está corriendo. Inicia el backend primero:"
    echo "   cd infinity_backend && npm run dev"
    exit 1
fi

echo ""
echo "🔍 Verificando frontend..."
if curl -s http://localhost:8101 > /dev/null; then
    echo "✅ Frontend está corriendo en http://localhost:8101"
else
    echo "❌ Frontend no está corriendo. Inicia el frontend primero:"
    echo "   cd infinity-providers-app && ionic serve --port=8101"
    exit 1
fi

echo ""
echo "🧪 ESCENARIOS DE PRUEBA:"
echo ""
echo "1️⃣ REGISTRO CON GOOGLE:"
echo "   - Ve a http://localhost:8101/tabs/tab3"
echo "   - Haz clic en 'Continuar con Google'"
echo "   - Completa el flujo de Google"
echo "   - Verifica que se registre en MongoDB"
echo ""
echo "2️⃣ LOGIN CON GOOGLE (usuario existente):"
echo "   - Ve a http://localhost:8101/tabs/tab3"
echo "   - Haz clic en 'Continuar con Google'"
echo "   - Verifica que haga login (no registro)"
echo ""
echo "3️⃣ INTENTO DE LOGIN CON EMAIL/PASSWORD:"
echo "   - Ve a http://localhost:8101/tabs/tab3"
echo "   - Intenta hacer login con el email de Google y cualquier contraseña"
echo "   - Debería mostrar: 'Esta cuenta está vinculada a Google'"
echo ""
echo "4️⃣ AGREGAR CONTRASEÑA A CUENTA GOOGLE:"
echo "   - Usa la API directamente para probar:"
echo ""

# Mostrar comando curl para probar agregar contraseña
echo "📝 COMANDO PARA PROBAR AGREGAR CONTRASEÑA:"
echo "curl -X POST http://localhost:8080/api/v1/auth/add-password \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"email\": \"tu-email-google@gmail.com\","
echo "    \"password\": \"nueva123\","
echo "    \"confirmPassword\": \"nueva123\""
echo "  }'"
echo ""

echo "5️⃣ LOGIN HÍBRIDO:"
echo "   - Después de agregar contraseña, prueba login con email/password"
echo "   - También prueba login con Google"
echo "   - Ambos deberían funcionar"
echo ""

echo "🔍 VERIFICAR EN MONGODB:"
echo "   - Conecta a tu base de datos MongoDB"
echo "   - Verifica que el usuario tenga:"
echo "     - authProviders: ['google', 'password']"
echo "     - password: hash de la contraseña"
echo "     - firebaseUid: ID de Firebase"
echo ""

echo "✅ ¡Prueba todos los escenarios y verifica que funcionen correctamente!"
echo ""
echo "📞 Si encuentras errores, revisa:"
echo "   1. Logs del backend (terminal donde corre npm run dev)"
echo "   2. Console del navegador (F12)"
echo "   3. Credenciales de Firebase Admin en firebase-admin.config.ts"
echo ""
