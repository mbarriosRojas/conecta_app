# 🎨 Recursos AKI - Conecta Personal

## 📱 Iconos y Splash Screens Generados

### ✨ Características del Diseño
- **Gradientes modernos**: Azul púrpura (#667eea → #764ba2)
- **Acentos vibrantes**: Rosa coral (#f093fb → #f5576c)
- **Tipografía bold**: "AKI" en Arial bold
- **Elementos decorativos**: Círculos y puntos con efectos de glow
- **Diseño responsivo**: Adaptable a diferentes tamaños

### 📂 Archivos Creados

#### Iconos SVG
- `src/assets/icon/aki-logo.svg` - Icono principal (512x512)
- `src/assets/icon/aki-logo-adaptive.svg` - Icono adaptativo (108x108)

#### Splash Screen
- `src/assets/icon/aki-splash.svg` - Splash screen (1242x2208)

#### Generadores HTML
- `generate-icons.html` - Generador de iconos PNG
- `generate-splash.html` - Generador de splash screens PNG

### 🚀 Cómo Usar

#### 1. Generar Iconos PNG
```bash
# Abrir en navegador
open generate-icons.html

# Descargar todos los tamaños:
# - 48x48 (mdpi)
# - 72x72 (hdpi) 
# - 96x96 (xhdpi)
# - 144x144 (xxhdpi)
# - 192x192 (xxxhdpi)
```

#### 2. Generar Splash Screens PNG
```bash
# Abrir en navegador
open generate-splash.html

# Descargar todos los formatos:
# - 1242x2208 (Phone Portrait)
# - 2208x1242 (Phone Landscape)
# - 1536x2048 (Tablet Portrait)
# - 2048x1536 (Tablet Landscape)
```

#### 3. Instalar Recursos
```bash
# Ejecutar script de configuración
./setup-aki-resources.sh

# Sincronizar con Android
npx cap sync android

# Ejecutar en dispositivo
npx cap run android
```

### 📁 Estructura de Archivos Android

```
android/app/src/main/res/
├── mipmap-mdpi/
│   └── ic_launcher.png (48x48)
├── mipmap-hdpi/
│   └── ic_launcher.png (72x72)
├── mipmap-xhdpi/
│   └── ic_launcher.png (96x96)
├── mipmap-xxhdpi/
│   └── ic_launcher.png (144x144)
├── mipmap-xxxhdpi/
│   └── ic_launcher.png (192x192)
└── drawable-port-xxxhdpi/
    └── splash.png (1242x2208)
```

### 🎯 Configuración Actualizada

#### Capacitor Config
- **App ID**: `aki_app.app`
- **App Name**: `AKI`
- **Status Bar**: Color #667eea
- **Splash Screen**: 3 segundos, fondo #667eea

#### Colores del Tema
- **Primario**: #667eea (Azul)
- **Secundario**: #764ba2 (Púrpura)
- **Acento**: #f093fb → #f5576c (Rosa coral)
- **Fondo**: Gradiente azul-púrpura-rosa

### 🔧 Personalización

Para modificar los colores, edita los archivos SVG:
1. Cambia los valores de `stop-color` en los gradientes
2. Actualiza `capacitor.config.ts` con los nuevos colores
3. Regenera los archivos PNG

### 📱 Compatibilidad

- ✅ Android (API 21+)
- ✅ iOS (iOS 12+)
- ✅ PWA (Progressive Web App)
- ✅ Responsive Design

### 🎨 Inspiración del Diseño

El diseño de AKI está inspirado en:
- **Modernidad**: Gradientes suaves y tipografía bold
- **Interactividad**: Elementos decorativos dinámicos
- **Profesionalismo**: Colores corporativos elegantes
- **Usabilidad**: Contraste alto para mejor legibilidad

---

*Generado automáticamente para AKI - Conecta Personal* 🚀
