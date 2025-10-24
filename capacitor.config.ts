import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aki.conectapersonal',
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
    }
  },
  // 🔥 Configuración para deep linking (OAuth redirect)
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  },
  // 🔥 Deep Linking para Google OAuth
  appUrlOpen: {
    // URLs que la app debe capturar
    schemes: ['com.aki.conectapersonal'],
    // Dominios personalizados
    hosts: ['aki-app-2d2d8.firebaseapp.com', 'localhost']
  }
};

export default config;
