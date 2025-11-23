# 🚀 Guía Completa: Publicar en Google Play Store

## 📋 **Índice Rápido**
1. [Crear Keystore (Primera vez)](#1-crear-keystore-primera-vez)
2. [Configurar Firma Automática](#2-configurar-firma-automática)
3. [Versionado](#3-versionado)
4. [Compilar para Play Store](#4-compilar-para-play-store)
5. [Subir a Play Store](#5-subir-a-play-store)
6. [Actualizaciones](#6-actualizaciones)

---

## 1️⃣ **Crear Keystore (Primera Vez)**

### **⚠️ IMPORTANTE: Solo se hace UNA VEZ**

```bash
cd /Users/mauriciobarrios/Desarrollo/personales/conecta-personal/infinity-providers-app/android/app

# Crear el keystore
keytool -genkey -v -keystore aki-release-key.keystore \
  -alias aki-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

### **Te pedirá información:**

```
Enter keystore password: TU_PASSWORD_AQUI (ejemplo: AKI2024SecureKey!)
Re-enter new password: TU_PASSWORD_AQUI

What is your first and last name?
  [Unknown]: Mauricio Barrios (o tu nombre)

What is the name of your organizational unit?
  [Unknown]: AKI Development (o tu empresa)

What is the name of your organization?
  [Unknown]: AKI (o tu empresa)

What is the name of your City or Locality?
  [Unknown]: Tu Ciudad

What is the name of your State or Province?
  [Unknown]: Tu Estado/Provincia

What is the two-letter country code for this unit?
  [Unknown]: MX (o tu país)

Is CN=Mauricio Barrios, OU=AKI Development... correct?
  [no]: yes

Enter key password for <aki-key-alias>
  (RETURN if same as keystore password): [PRESIONA ENTER]
```

### **📝 Anota INMEDIATAMENTE:**

```
==============================================
🔐 INFORMACIÓN DEL KEYSTORE - GUARDAR BIEN
==============================================
Archivo: aki-release-key.keystore
Ubicación: android/app/aki-release-key.keystore

Password del Keystore: _______________________
Alias: aki-key-alias
Password del Alias: _________ (mismo que keystore)

Fecha de creación: __________
==============================================
```

### **💾 Guardar el Keystore en 3 Lugares:**

1. **Local**: `android/app/aki-release-key.keystore` (ya está aquí)
2. **Nube segura**: Google Drive, Dropbox, iCloud (privado)
3. **USB/Disco externo**: Copia física de respaldo

### **⚠️ QUÉ PASA SI PIERDES EL KEYSTORE:**

- ❌ **NO podrás actualizar la app en Play Store**
- ❌ Tendrás que crear una **nueva app** con nuevo package name
- ❌ Perderás todas las descargas, reseñas y usuarios
- ❌ **NO hay forma de recuperarlo** (Google no puede ayudarte)

---

## 2️⃣ **Configurar Firma Automática**

### **Paso 2.1: Crear archivo de configuración**

Crear archivo: `android/key.properties`

```properties
storePassword=TU_PASSWORD_AQUI
keyPassword=TU_PASSWORD_AQUI
keyAlias=aki-key-alias
storeFile=aki-release-key.keystore
```

**⚠️ Reemplaza `TU_PASSWORD_AQUI` con el password real que usaste**

### **Paso 2.2: Proteger el archivo (NO subirlo a Git)**

Editar: `android/.gitignore`

Agregar estas líneas:
```
key.properties
*.keystore
*.jks
```

### **Paso 2.3: Configurar Gradle**

Editar: `android/app/build.gradle`

**ANTES del bloque `android {`**, agregar:

```gradle
// ==========================================
// 🔐 CONFIGURACIÓN DE FIRMA PARA RELEASE
// ==========================================
def keystorePropertiesFile = rootProject.file("key.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

**DENTRO del bloque `android {`**, agregar:

```gradle
android {
    namespace "aki_app.app"
    compileSdk rootProject.ext.compileSdkVersion
    
    defaultConfig {
        applicationId "aki_app.app"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1          // 👈 Incrementar en cada release
        versionName "1.0.0"    // 👈 Versión visible para usuarios
        // ... resto de la configuración
    }
    
    // 🔐 Configuración de firma
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release  // 👈 Usar firma en release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## 3️⃣ **Versionado**

### **¿Qué son versionCode y versionName?**

En `android/app/build.gradle`:

```gradle
versionCode 1        // 👈 Número interno (DEBE incrementar SIEMPRE)
versionName "1.0.0"  // 👈 Versión visible para usuarios
```

### **Reglas:**

| Release | versionCode | versionName | Cuándo usar |
|---------|-------------|-------------|-------------|
| Primera publicación | 1 | "1.0.0" | Primera vez en Play Store |
| Corrección de bugs | 2 | "1.0.1" | Arreglar errores pequeños |
| Nueva funcionalidad | 3 | "1.1.0" | Agregar features nuevas |
| Cambio mayor | 4 | "2.0.0" | Rediseño completo |

### **⚠️ IMPORTANTE:**

- **versionCode**: SIEMPRE debe ser mayor al anterior (1, 2, 3, 4...)
- **versionName**: Puede ser lo que quieras ("1.0.0", "2.5.3", "beta-1")
- **Play Store rechazará** si subes con mismo o menor versionCode

### **Ejemplo de incremento:**

```gradle
// Primera publicación
versionCode 1
versionName "1.0.0"

// Primera actualización (fix de bugs)
versionCode 2
versionName "1.0.1"

// Segunda actualización (nueva feature)
versionCode 3
versionName "1.1.0"

// Gran actualización
versionCode 4
versionName "2.0.0"
```

---

## 4️⃣ **Compilar para Play Store**

### **Opción A: App Bundle (AAB) - RECOMENDADO**

```bash
# 1. Build de producción
cd /Users/mauriciobarrios/Desarrollo/personales/conecta-personal/infinity-providers-app
ionic build --prod

# 2. Sincronizar
npx cap sync android

# 3. Limpiar builds anteriores (recomendado)
cd android
./gradlew clean

# 4. Compilar AAB firmado
./gradlew bundleRelease

# 5. El archivo estará en:
# android/app/build/outputs/bundle/release/app-release.aab
```

### **Opción B: APK Firmado**

```bash
# Pasos 1-3 iguales que arriba

# 4. Compilar APK firmado
./gradlew assembleRelease

# 5. El archivo estará en:
# android/app/build/outputs/apk/release/app-release.apk
```

### **AAB vs APK - ¿Cuál usar?**

| Formato | Tamaño | Uso | Recomendado |
|---------|--------|-----|-------------|
| **AAB** | Más pequeño | Solo Play Store | ✅ SÍ |
| **APK** | Más grande | Instalación directa | Solo si necesitas distribución fuera de Play Store |

**🎯 Usa AAB para Play Store siempre que puedas**

---

## 5️⃣ **Subir a Play Store**

### **Paso 5.1: Preparar Play Console**

1. Ir a: https://play.google.com/console
2. Crear cuenta de desarrollador ($25 USD una sola vez)
3. Click en **"Crear app"**
4. Llenar información:
   - **Nombre**: AKI
   - **Idioma predeterminado**: Español
   - **Tipo**: App o juego
   - **Categoría**: Estilo de vida / Negocios

### **Paso 5.2: Configurar la App**

**Información principal:**
- **Título**: AKI - Encuentra Negocios Cerca
- **Descripción corta**: (80 caracteres)
- **Descripción completa**: (4000 caracteres)
- **Capturas de pantalla**: Mínimo 2 (hasta 8)
  - Tamaño: 1080x1920px
- **Ícono**: 512x512px

**Clasificación de contenido:**
- Responder cuestionario
- Seleccionar edad apropiada

**Contacto:**
- Email de contacto
- Política de privacidad (URL)

### **Paso 5.3: Subir el AAB**

1. En Play Console → **Producción** (o **Testing interno/cerrado/abierto**)
2. **Crear nueva versión**
3. **Subir** el archivo `app-release.aab`
4. **Notas de la versión** (qué cambios tiene):
   ```
   Primera versión de AKI
   - Buscar negocios cercanos
   - Ver productos y promociones
   - Notificaciones push de ofertas
   ```
5. **Guardar** → **Revisar versión** → **Iniciar lanzamiento**

### **Paso 5.4: Esperar Revisión**

- ⏱️ Primera vez: 2-7 días
- 🔍 Google revisa la app
- 📧 Recibirás email cuando esté aprobada
- ✅ Una vez aprobada, estará en Play Store

---

## 6️⃣ **Actualizaciones (Segunda versión en adelante)**

### **Paso 6.1: Incrementar versión**

Editar `android/app/build.gradle`:

```gradle
versionCode 2          // 👈 Incrementar (era 1, ahora 2)
versionName "1.0.1"    // 👈 Nueva versión visible
```

### **Paso 6.2: Compilar nueva versión**

```bash
# 1. Hacer cambios en tu código

# 2. Build de producción
ionic build --prod

# 3. Sincronizar
npx cap sync android

# 4. Compilar AAB firmado
cd android
./gradlew clean
./gradlew bundleRelease
```

### **Paso 6.3: Subir a Play Store**

1. Play Console → **Producción**
2. **Crear nueva versión**
3. Subir nuevo `app-release.aab`
4. **Notas de la versión**:
   ```
   Versión 1.0.1
   - Corrección de errores
   - Mejoras de rendimiento
   - Nueva funcionalidad X
   ```
5. **Iniciar lanzamiento**

---

## 📊 **Checklist Completo Antes de Publicar**

### **Primera Publicación:**

- [ ] ✅ Keystore creado y guardado en 3 lugares
- [ ] ✅ `key.properties` configurado
- [ ] ✅ `build.gradle` con firma configurada
- [ ] ✅ `versionCode = 1`
- [ ] ✅ `versionName = "1.0.0"`
- [ ] ✅ Package name: `aki_app.app`
- [ ] ✅ Firebase `google-services.json` correcto
- [ ] ✅ Íconos y splash screen configurados
- [ ] ✅ Permisos necesarios en AndroidManifest
- [ ] ✅ Probado en dispositivo real
- [ ] ✅ AAB compilado sin errores
- [ ] ✅ Play Console configurada
- [ ] ✅ Capturas de pantalla listas
- [ ] ✅ Descripción de la app escrita
- [ ] ✅ Política de privacidad publicada

### **Actualizaciones:**

- [ ] ✅ `versionCode` incrementado
- [ ] ✅ `versionName` actualizado
- [ ] ✅ Cambios probados
- [ ] ✅ Notas de la versión escritas
- [ ] ✅ AAB compilado
- [ ] ✅ Listo para subir

---

## 🆘 **Solución a Problemas Comunes**

### **Error: "Upload failed: Version code X has already been used"**

**Causa**: Ya subiste una versión con ese `versionCode`

**Solución**:
```gradle
// En build.gradle, incrementar:
versionCode 2  // (o el siguiente número disponible)
```

### **Error: "You need to use a different package name"**

**Causa**: El package name ya está en uso por otra app

**Solución**: Cambiar `applicationId` en `build.gradle` (solo si es necesario)

### **Error: "APK is not signed"**

**Causa**: No configuraste la firma correctamente

**Solución**: Verificar que:
1. `key.properties` existe y tiene datos correctos
2. `build.gradle` tiene la configuración de firma
3. Estás compilando con `./gradlew bundleRelease` (no debug)

### **Olvidé mi password del keystore**

**Respuesta**: 😱 **NO hay solución**

Si perdiste el password:
- ❌ NO puedes actualizar la app
- 🆕 Debes crear nueva app con nuevo package name
- 💔 Pierdes usuarios y reseñas

**Prevención**: Anota el password en 3 lugares diferentes

---

## 📝 **Plantilla: Información del Keystore**

```
===============================================
🔐 KEYSTORE DE AKI - INFORMACIÓN CONFIDENCIAL
===============================================

📁 Archivo: aki-release-key.keystore
📍 Ubicación: android/app/aki-release-key.keystore

🔑 Password del Keystore: ____________________
🏷️ Alias: aki-key-alias
🔐 Password del Alias: ____________________

📅 Fecha de creación: ____________________
👤 Creado por: ____________________

💾 COPIAS DE SEGURIDAD:
✅ Local: android/app/aki-release-key.keystore
✅ Nube: ____________________
✅ USB/Disco: ____________________

⚠️ NUNCA compartir esta información
⚠️ NUNCA subir a repositorio público
⚠️ MANTENER en lugar seguro

===============================================
```

---

## 🚀 **Comandos Rápidos de Referencia**

### **Primera Publicación:**
```bash
# 1. Crear keystore (solo primera vez)
cd android/app
keytool -genkey -v -keystore aki-release-key.keystore -alias aki-key-alias -keyalg RSA -keysize 2048 -validity 10000

# 2. Configurar key.properties (manual)

# 3. Compilar
cd ../..
ionic build --prod
npx cap sync android
cd android
./gradlew clean
./gradlew bundleRelease
```

### **Actualizaciones:**
```bash
# 1. Incrementar versionCode en build.gradle (manual)

# 2. Compilar
ionic build --prod
npx cap sync android
cd android
./gradlew clean
./gradlew bundleRelease
```

### **Verificación:**
```bash
# Ver package name
grep "applicationId" android/app/build.gradle

# Ver versión
grep "versionCode" android/app/build.gradle
grep "versionName" android/app/build.gradle

# Verificar que keystore existe
ls -la android/app/*.keystore
```

---

## 🎓 **Resumen Visual**

```
DESARROLLO (Testing en tu teléfono)
├── ionic build --prod
├── npx cap sync android
└── cd android && ./gradlew assembleRelease
    └── 📦 app-release-unsigned.apk (sin firma)

PRODUCCIÓN (Play Store)
├── 1️⃣ Crear keystore (solo una vez)
├── 2️⃣ Configurar firma automática
├── 3️⃣ Incrementar versionCode
├── ionic build --prod
├── npx cap sync android
└── cd android && ./gradlew bundleRelease
    └── 📦 app-release.aab (firmado y listo)
```

---

**Fecha de creación**: 2024-10-26  
**Package Name**: `aki_app.app`  
**Firebase Project**: `aki-app-2d2d8`

---

## 📞 **¿Necesitas Ayuda?**

- 📚 [Documentación oficial de Google Play](https://support.google.com/googleplay/android-developer)
- 🎓 [Capacitor Publishing Guide](https://capacitorjs.com/docs/guides/deploying-updates)
- 💬 [Stack Overflow - Android Publishing](https://stackoverflow.com/questions/tagged/google-play)

