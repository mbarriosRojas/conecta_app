# 🚀 Generación de APK - Infinity Providers

Este documento explica cómo generar un APK de pruebas usando el environment de producción.

## 📋 Prerrequisitos

### 1. Software Requerido
- **Node.js** (v16 o superior)
- **npm** (v8 o superior)
- **Android Studio** (con Android SDK)
- **Java JDK** (v11 o superior)

### 2. Herramientas CLI
- **Ionic CLI**: `npm install -g @ionic/cli`
- **Capacitor CLI**: `npm install -g @capacitor/cli`

## 🔧 Configuración Inicial

### 1. Configurar Android SDK (Solo la primera vez)

#### macOS/Linux:
```bash
npm run setup:android
```

#### Windows:
```powershell
# Configurar variables de entorno manualmente
$env:ANDROID_HOME = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:PATH += ";$env:ANDROID_HOME\tools;$env:ANDROID_HOME\platform-tools"
```

### 2. Verificar Configuración
```bash
ionic doctor check
```

## 🏗️ Generación de APK

### Método 1: Script Automatizado (Recomendado)

#### macOS/Linux:
```bash
# Generar APK con environment de producción
npm run apk:build

# O ejecutar directamente
chmod +x build-apk.sh
./build-apk.sh
```

#### Windows:
```powershell
# Generar APK con environment de producción
npm run apk:build:win

# O ejecutar directamente
powershell -ExecutionPolicy Bypass -File build-apk.ps1
```

### Método 2: Comandos Manuales

```bash
# 1. Compilar con environment de producción
ionic build --configuration production

# 2. Sincronizar con Capacitor
ionic capacitor sync android

# 3. Generar APK
cd android
./gradlew assembleDebug
cd ..

# 4. El APK estará en: android/app/build/outputs/apk/debug/app-debug.apk
```

### Método 3: Scripts NPM

```bash
# APK de debug rápido
npm run apk:debug

# APK de release (requiere firma)
npm run apk:release
```

## 📱 Ubicación del APK

Después de la generación exitosa, el APK estará disponible en:

- **APK original**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **APK copiado**: `releases/infinity-providers-debug-YYYYMMDD_HHMMSS.apk`

## 🌐 Environment de Producción

El APK se genera con la siguiente configuración:

```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://infinity-backend-develop.imagineapps.co',
  appName: 'Infinity Providers',
  version: '1.0.0',
  defaultRadius: 10000, // 10km
  itemsPerPage: 20,
  cacheTimeout: 300000, // 5 minutos
  maxRetries: 3,
  retryDelay: 1000
};
```

## 📲 Instalación en Dispositivo

### 1. Preparar el Dispositivo
- Habilitar **"Fuentes desconocidas"** o **"Instalar apps desconocidas"**
- Habilitar **"Depuración USB"** (opcional, para debugging)

### 2. Transferir APK
- **USB**: Conectar dispositivo y copiar APK
- **Email**: Enviar APK por correo
- **Cloud**: Subir a Google Drive/Dropbox y descargar
- **ADB**: `adb install app-debug.apk`

### 3. Instalar
- Abrir el APK desde el explorador de archivos
- Seguir las instrucciones de instalación

## 🔍 Solución de Problemas

### Error: "ANDROID_HOME not set"
```bash
# macOS/Linux
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools"

# Windows
$env:ANDROID_HOME = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\tools;$env:ANDROID_HOME\platform-tools"
```

### Error: "Java not found"
- Instalar Java JDK 11 o superior
- Configurar JAVA_HOME

### Error: "Gradle build failed"
```bash
# Limpiar proyecto
cd android
./gradlew clean
cd ..

# Reinstalar dependencias
npm install
ionic capacitor sync android
```

### Error: "Permission denied" (macOS/Linux)
```bash
chmod +x build-apk.sh
chmod +x setup-android-env.sh
```

## 📊 Información del APK

- **Tipo**: Debug APK
- **Firma**: Debug (no válida para Play Store)
- **Tamaño**: ~15-25 MB (aproximado)
- **Target SDK**: Configurado en `android/app/build.gradle`
- **Min SDK**: Configurado en `android/app/build.gradle`

## 🚀 Próximos Pasos

### Para Producción:
1. **Configurar firma**: Crear keystore para release
2. **Optimizar**: Habilitar ProGuard/R8
3. **Testing**: Probar en múltiples dispositivos
4. **Play Store**: Subir APK firmado

### Para Testing:
1. **Distribuir**: Compartir APK con testers
2. **Feedback**: Recopilar comentarios
3. **Iterar**: Hacer mejoras basadas en feedback

## 📞 Soporte

Si encuentras problemas:

1. **Revisar logs**: Los scripts muestran errores detallados
2. **Verificar prerequisitos**: Asegurar que todo esté instalado
3. **Limpiar proyecto**: `npm run clean` y reintentar
4. **Consultar documentación**: [Ionic](https://ionicframework.com/docs) | [Capacitor](https://capacitorjs.com/docs)

---

**¡Happy Building! 🎉**
