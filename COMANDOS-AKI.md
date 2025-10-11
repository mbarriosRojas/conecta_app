# 🚀 Comandos para AKI - Resumen Completo

## ✅ Problemas Solucionados

### 1. **Error de MainActivity**
- ✅ Corregido el paquete de `aki_app.app` a `com.aki.conectapersonal`
- ✅ MainActivity movido a la estructura correcta de directorios

### 2. **Error de Java**
- ✅ Configurado Java 21 para Capacitor
- ✅ Agregado `gradle.properties` con la ruta de Java 21

### 3. **Error de Crash de App**
- ✅ Simplificado `PushNotificationService` para evitar crashes
- ✅ Manejo robusto de errores en `AppComponent`

## 📱 Comandos para Levantar la App

### **Opción 1: Script Automatizado (Recomendado)**
```bash
# Ejecutar el script que configura todo automáticamente
./run-aki.sh
```

### **Opción 2: Comandos Manuales**
```bash
# 1. Configurar Java 21
export JAVA_HOME=/opt/homebrew/Cellar/openjdk@21/21.0.8/libexec/openjdk.jdk/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH

# 2. Navegar al proyecto
cd /Users/mauriciobarrios/Desarrollo/personales/conecta-personal/infinity-providers-app

# 3. Limpiar (solo si hay problemas)
cd android && ./gradlew clean && cd ..

# 4. Sincronizar cambios
npx cap sync android

# 5. Ejecutar en dispositivo
npx cap run android
```

### **Opción 3: Desde Android Studio**
1. Abrir Android Studio
2. Abrir el proyecto: `infinity-providers-app/android`
3. Seleccionar dispositivo (Pixel 9a)
4. Hacer clic en el botón "Run" (▶️)

## 🔄 Desarrollo Diario

### **Para Cambios de Código (No requieren rebuild)**
- ✅ HTML templates
- ✅ CSS/SCSS
- ✅ TypeScript/JavaScript
- ✅ Lógica de componentes

### **Para Cambios que Requieren Rebuild**
- ❌ Iconos y splash screens → `npx cap sync android`
- ❌ Configuración de Capacitor → `npx cap sync android`
- ❌ Permisos de Android → `npx cap sync android`
- ❌ Plugins nativos → `npx cap sync android`

## 🎯 Resultado Esperado

Cuando ejecutes cualquiera de los comandos anteriores, deberías ver:

1. ✅ **Splash Screen**: Gradiente azul-púrpura con logo AKI
2. ✅ **Icono**: Círculo azul-púrpura con "AKI"
3. ✅ **Nombre**: "AKI" en lugar de "Infinity Providers"
4. ✅ **ID**: com.aki.conectapersonal
5. ✅ **App Funcional**: Sin crashes después del splash

## 🛠️ Troubleshooting

### **Si Java no está configurado:**
```bash
# Instalar Java 21
brew install openjdk@21

# Configurar variables de entorno
export JAVA_HOME=/opt/homebrew/Cellar/openjdk@21/21.0.8/libexec/openjdk.jdk/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH
```

### **Si hay errores de build:**
```bash
# Limpiar proyecto
cd android && ./gradlew clean && cd ..

# Sincronizar
npx cap sync android
```

### **Si la app crashea:**
- Verificar logs en la consola de Android Studio
- El `PushNotificationService` ahora es más robusto y no debería crashear

## 📂 Archivos Importantes

- `run-aki.sh` - Script para ejecutar la app
- `android/gradle.properties` - Configuración de Java 21
- `capacitor.config.ts` - Configuración de la app
- `android/app/build.gradle` - Configuración de Android

---

**🎉 ¡AKI está listo para usar!**
