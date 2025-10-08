# Configuración de Permisos - Infinity Providers App

## ✅ Permisos configurados:

### **Cámara y Fotos:**
- ✅ `NSCameraUsageDescription` - iOS
- ✅ `NSPhotoLibraryUsageDescription` - iOS  
- ✅ `CAMERA` - Android
- ✅ `READ_EXTERNAL_STORAGE` - Android
- ✅ `WRITE_EXTERNAL_STORAGE` - Android

### **Ubicación:**
- ✅ `NSLocationWhenInUseUsageDescription` - iOS
- ✅ `NSLocationAlwaysAndWhenInUseUsageDescription` - iOS
- ✅ `ACCESS_FINE_LOCATION` - Android
- ✅ `ACCESS_COARSE_LOCATION` - Android
- ✅ `ACCESS_BACKGROUND_LOCATION` - Android

### **Archivos:**
- ✅ `NSDocumentsFolderUsageDescription` - iOS
- ✅ Permisos de filesystem en Capacitor

## 🔧 Próximos pasos:

### **1. Sincronizar cambios:**
```bash
npx cap sync
```

### **2. Recompilar la aplicación:**
```bash
ionic capacitor build android --prod
```

### **3. Generar nuevo APK:**
```bash
cd android
./gradlew assembleRelease
```

### **4. Instalar en dispositivo:**
- Desinstalar la versión anterior
- Instalar la nueva versión
- Otorgar permisos cuando la app los solicite

## ⚠️ Notas importantes:

- **Android 6+**: Los permisos se solicitan en tiempo de ejecución
- **iOS**: Los permisos se solicitan cuando se usa la funcionalidad por primera vez
- **Ubicación**: Se solicitará permiso "Solo mientras se usa la app" o "Siempre"
- **Cámara**: Se solicitará permiso para cámara y galería por separado

## 🐛 Solución de problemas:

Si los permisos no se solicitan:
1. Verificar que la app esté compilada con los nuevos archivos
2. Desinstalar y reinstalar la app
3. Ir a Configuración > Aplicaciones > Infinity Providers > Permisos
4. Otorgar permisos manualmente
