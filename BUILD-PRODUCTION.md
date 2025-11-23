# 🚀 Guía: Compilar APK de Producción

## ✅ Comandos Correctos

### **1. Build de Desarrollo (Debug)**

```bash
# Compilar web
ionic build

# Sincronizar con Android
npx cap sync android

# Compilar APK debug
cd android
./gradlew assembleDebug

# APK ubicado en:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### **2. Build de Producción (Release)**

```bash
# Compilar web en modo producción
ionic build --prod

# Sincronizar con Android
npx cap sync android

# Compilar APK release
cd android
./gradlew assembleRelease

# APK ubicado en:
# android/app/build/outputs/apk/release/app-release-unsigned.apk
```

---

## 🔑 **Firmar APK para Play Store**

### **Paso 1: Crear Keystore (Solo primera vez)**

```bash
cd android/app

# Crear keystore
keytool -genkey -v -keystore aki-release-key.keystore \
  -alias aki-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Te pedirá:
# - Contraseña del keystore (anótala bien)
# - Nombre, organización, ciudad, país
# - Contraseña de la key (puede ser la misma)
```

**⚠️ IMPORTANTE**: Guarda `aki-release-key.keystore` en un lugar seguro. Si lo pierdes, no podrás actualizar la app en Play Store.

### **Paso 2: Configurar Gradle**

Crear archivo `android/key.properties`:

```properties
storePassword=TU_PASSWORD_DEL_KEYSTORE
keyPassword=TU_PASSWORD_DE_LA_KEY
keyAlias=aki-key-alias
storeFile=app/aki-release-key.keystore
```

**⚠️ NO SUBIR `key.properties` A GIT**

Agregar a `.gitignore`:
```
android/key.properties
android/app/*.keystore
```

### **Paso 3: Actualizar `build.gradle`**

Editar `android/app/build.gradle`:

```gradle
// Después de "apply plugin: 'com.android.application'"
def keystorePropertiesFile = rootProject.file("key.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    ...
    
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### **Paso 4: Compilar APK Firmado**

```bash
cd android
./gradlew assembleRelease

# APK firmado en:
# android/app/build/outputs/apk/release/app-release.apk
```

### **Paso 5: Generar App Bundle (Recomendado para Play Store)**

```bash
cd android
./gradlew bundleRelease

# AAB ubicado en:
# android/app/build/outputs/bundle/release/app-release.aab
```

**📦 App Bundle vs APK:**
- **AAB (recomendado)**: Google Play optimiza el tamaño para cada dispositivo
- **APK**: Archivo único, más grande, para distribución directa

---

## 🔄 **Flujo Completo: Desarrollo → Producción**

### **Para Desarrollo Diario:**

```bash
# Terminal 1: Desarrollo web con live reload
ionic serve

# Cuando quieras probar en Android:
ionic build
npx cap sync android
npx cap open android
# Compilar desde Android Studio (más rápido)
```

### **Para Compilar APK de Prueba:**

```bash
ionic build
npx cap sync android
cd android && ./gradlew assembleDebug
```

### **Para Subir a Play Store:**

```bash
# 1. Asegúrate de haber firmado el APK (pasos anteriores)

# 2. Build de producción
ionic build --prod

# 3. Sincronizar
npx cap sync android

# 4. Compilar AAB firmado
cd android
./gradlew bundleRelease

# 5. Subir app-release.aab a Google Play Console
```

---

## 📊 **Verificar Configuración Actual**

### **Package Name**
```bash
# Verificar en build.gradle
grep "applicationId" android/app/build.gradle

# Debe mostrar:
# applicationId "aki_app.app"
```

### **Versión de la App**
```bash
# Editar en android/app/build.gradle
# versionCode 1        → Incrementar cada build (1, 2, 3...)
# versionName "1.0"    → Versión visible (1.0, 1.1, 2.0...)
```

### **Firebase**
```bash
# Verificar que google-services.json tenga el package correcto
grep "package_name" android/app/google-services.json

# Debe mostrar:
# "package_name": "aki_app.app"
```

---

## 🎯 **Checklist Antes de Subir a Play Store**

- [ ] `ionic build --prod` compila sin errores
- [ ] Package name correcto: `aki_app.app`
- [ ] `versionCode` incrementado
- [ ] `versionName` actualizado
- [ ] Keystore creado y configurado
- [ ] `key.properties` configurado (NO en git)
- [ ] APK/AAB firmado correctamente
- [ ] Firebase `google-services.json` correcto
- [ ] Íconos de la app correctos
- [ ] Splash screen correcto
- [ ] Permisos en `AndroidManifest.xml` necesarios
- [ ] Pruebas en dispositivo real

---

## ⚠️ **Errores Comunes**

### **Error: "INSTALL_FAILED_UPDATE_INCOMPATIBLE"**
```bash
# Desinstalar app anterior
adb uninstall aki_app.app

# O desde el dispositivo: mantén presionado el ícono → Desinstalar
```

### **Error: "No matching client found for package name"**
```bash
# Verificar que google-services.json tenga el package correcto
# Debe coincidir con applicationId en build.gradle
```

### **Error: "Keystore not found"**
```bash
# Verificar ruta en key.properties
# Debe ser relativa a android/ o absoluta
```

---

## 📚 **Comandos de Referencia Rápida**

```bash
# Development
ionic serve                          # Live reload en navegador
ionic build                          # Build desarrollo
npx cap sync android                 # Sincronizar con Android
npx cap open android                 # Abrir Android Studio

# Production
ionic build --prod                   # Build producción
cd android && ./gradlew assembleRelease  # APK release
cd android && ./gradlew bundleRelease    # AAB release (Play Store)

# Debug
cd android && ./gradlew clean        # Limpiar build
adb devices                          # Ver dispositivos conectados
adb install app-debug.apk           # Instalar APK manualmente
adb uninstall aki_app.app           # Desinstalar app

# Verificación
grep "applicationId" android/app/build.gradle    # Ver package name
grep "versionCode" android/app/build.gradle      # Ver versión
```

---

## 🎉 **Resumen**

**Desarrollo:**
```bash
ionic build && npx cap sync android && npx cap open android
```

**Producción (APK):**
```bash
ionic build --prod && npx cap sync android && cd android && ./gradlew assembleRelease
```

**Producción (Play Store):**
```bash
ionic build --prod && npx cap sync android && cd android && ./gradlew bundleRelease
```

---

**Fecha**: 2024-10-26  
**Package Name**: `aki_app.app`  
**Firebase Project**: `aki-app-2d2d8`

