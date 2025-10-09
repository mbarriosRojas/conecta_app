// Firebase Cloud Messaging Service Worker
// Este archivo es necesario para push notifications web

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Configuración de Firebase (debe coincidir con tu project)
const firebaseConfig = {
  apiKey: "AIzaSyCQ-3oqcAjVF4okuy6wMOTZwj244fpWwVI",
  authDomain: "aki-app-2d2d8.firebaseapp.com",
  projectId: "aki-app-2d2d8",
  storageBucket: "aki-app-2d2d8.firebasestorage.app",
  messagingSenderId: "464389151945",
  appId: "1:464389151945:android:cdd8808e0b841cfc698118"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Obtener instancia de messaging
const messaging = firebase.messaging();

// Manejar mensajes en background
messaging.onBackgroundMessage((payload) => {
  console.log('📬 Mensaje recibido en background:', payload);
  
  const notificationTitle = payload.notification?.title || 'Nueva notificación';
  const notificationOptions = {
    body: payload.notification?.body || 'Tienes una nueva notificación',
    icon: '/assets/icon/icon.png',
    badge: '/assets/icon/icon.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
