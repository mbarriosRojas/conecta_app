# 🔧 Configuración de Firebase para Google Login en Móvil

## ❌ **Problema Actual**
Google login redirige a `localhost:8100` en lugar de la app móvil, causando error.

## ✅ **Solución**

### **1. Configurar URLs de Redirección en Firebase Console**

1. **Ir a Firebase Console**: https://console.firebase.google.com/
2. **Seleccionar proyecto**: `aki-app-2d2d8`
3. **Authentication** → **Sign-in method** → **Google**
4. **Agregar URLs autorizadas**:

```
https://localhost:8100
https://localhost:8101
com.aki.conectapersonal://
http://localhost:8100
http://localhost:8101
```

### **2. Configurar Dominios Autorizados**

En **Authentication** → **Settings** → **Authorized domains**:

```
localhost
aki-app-2d2d8.firebaseapp.com
aki-app-2d2d8.web.app
conecta-backend-b5yg.onrender.com
```

### **3. Configurar OAuth 2.0 en Google Cloud Console**

1. **Ir a Google Cloud Console**: https://console.cloud.google.com/
2. **Seleccionar proyecto**: `aki-app-2d2d8`
3. **APIs & Services** → **Credentials**
4. **Editar OAuth 2.0 Client ID**
5. **Agregar URIs de redirección autorizados**:

```
https://localhost:8100/__/auth/handler
http://localhost:8100/__/auth/handler
com.aki.conectapersonal://__/auth/handler
```

### **4. Configurar Capacitor (Ya hecho)**

El `capacitor.config.ts` ya está configurado con:
```typescript
server: {
  androidScheme: 'com.aki.conectapersonal'
}
```

### **5. Rebuild de la App**

Después de configurar Firebase:

```bash
# Limpiar y rebuild
npm run clean
npm install
ionic build
npx cap sync android
npx cap run android
```

---

## 🔍 **Verificación**

### **En Web (localhost):**
- ✅ Google login funciona con popup
- ✅ Redirige correctamente a la app

### **En Móvil:**
- ✅ Google login abre navegador
- ✅ Después del login, regresa a la app
- ✅ Usuario queda autenticado

---

## 📱 **Esquemas de URL Configurados**

| Plataforma | Esquema | Uso |
|------------|---------|-----|
| **Web Dev** | `https://localhost:8100` | Desarrollo web |
| **Web Prod** | `https://aki-app-2d2d8.web.app` | Producción web |
| **Android** | `com.aki.conectapersonal://` | App móvil |

---

## ⚠️ **Notas Importantes**

1. **Las URLs deben coincidir exactamente** con las configuradas en Firebase
2. **Después de cambiar URLs**, hacer rebuild completo
3. **En desarrollo**, usar `localhost:8100`
4. **En producción**, usar el dominio real

---

## 🚀 **Resultado Esperado**

Después de la configuración:
- ✅ Google login funciona en web y móvil
- ✅ Redirige correctamente a la app
- ✅ No más errores de `localhost`
- ✅ Usuario autenticado inmediatamente
