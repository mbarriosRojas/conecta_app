import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'aki_app.app',
  appName: 'AKI',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Geolocation: {
      permissions: ['location']
    },
    Camera: {
      permissions: ['camera', 'photos']
    },
    Filesystem: {
      permissions: ['read', 'write']
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#667eea',
      overlaysWebView: false
    },
    SplashScreen: {
      launchShowDuration: 4000,
      launchAutoHide: false, // Lo controlaremos manualmente desde la app
      backgroundColor: '#000000', // Fondo negro para que se vea mejor el video
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
      splashFullScreen: true,
      splashImmersive: true
    },
    // 🔥 Push Notifications Configuration
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    // ⚠️ Background Geolocation desactivado para evitar errores en iOS
    // Si necesitas background tracking, debes tener permisos "Always" confirmados
    // BackgroundGeolocation: {
    //   backgroundMessage: "Recibiendo ofertas basadas en tu ubicación",
    //   backgroundTitle: "AKI - Ubicación activa",
    //   requestPermissions: false,
    //   stale: false,
    //   distanceFilter: 100
    // }
  },
  // 🔥 Configuración para deep linking (OAuth redirect)
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;
