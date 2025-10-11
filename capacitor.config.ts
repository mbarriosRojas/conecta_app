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
      style: 'default',
      backgroundColor: '#667eea'
    },
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#667eea',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;
