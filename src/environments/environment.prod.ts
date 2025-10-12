export const environment = {
  production: true,
  apiUrl: 'http://localhost:8080', // Backend local
  //apiUrl: 'https://conecta-backend-b5yg.onrender.com', // Backend en Render
  appName: 'Providers',
  version: '1.0.0',
  defaultRadius: 20000, // 20km en metros
  itemsPerPage: 20,
  cacheTimeout: 300000, // 5 minutos
  maxRetries: 3,
  retryDelay: 1000,
  
  // Firebase Configuration
  firebase: {
    apiKey: "AIzaSyCQ-3oqcAjVF4okuy6wMOTZwj244fpWwVI",
    authDomain: "aki-app-2d2d8.firebaseapp.com",
    projectId: "aki-app-2d2d8",
    storageBucket: "aki-app-2d2d8.firebasestorage.app",
    messagingSenderId: "464389151945",
    appId: "1:464389151945:android:cdd8808e0b841cfc698118"
  }
};