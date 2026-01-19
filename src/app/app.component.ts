import { Component, OnInit, OnDestroy } from '@angular/core';
import { Platform } from '@ionic/angular';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapacitorApp, URLOpenListenerEvent } from '@capacitor/app';
import { Router } from '@angular/router';
import { LocationService } from './services/location.service';
import { AuthService } from './services/auth.service';
import { PushNotificationService } from './services/push-notification.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  constructor(
    private platform: Platform,
    private locationService: LocationService,
    private authService: AuthService,
    private router: Router,
    private pushNotificationService: PushNotificationService
  ) {
    // 🔥 Configurar listener for deep links (OAuth redirect)
    this.initializeDeepLinking();
  }

  async ngOnInit() {
    try {
      await this.platform.ready();
      this.forceLightMode();
      await this.initializeStatusBar();
      await this.initializeLocationTracking();
      await this.initializePushNotifications();
      
      setTimeout(async () => {
        await this.initializePushNotifications();
      }, 3000);
      
    } catch (error) {
      console.error('❌ AppComponent: Error en inicialización:', error);
    }
  }

  ngOnDestroy() {
    // Detener actualizaciones de ubicación al cerrar la app
    this.locationService.stopBackgroundLocationUpdates();
    console.log('👋 AppComponent: Aplicación cerrada');
  }

  /**
   * Inicializa el seguimiento de ubicación en segundo plano
   */
  private async initializeLocationTracking() {
    try {
      console.log('📍 Inicializando seguimiento de ubicación...');
      
      // Solicitar permisos de ubicación
      const hasPermission = await this.locationService.requestPermissions();
      
      if (hasPermission) {
        // Iniciar actualizaciones en segundo plano
        // Funciona tanto para usuarios registrados como anónimos
        this.locationService.startBackgroundLocationUpdates(this.authService);
      } else {
        console.warn('⚠️ No se otorgaron permisos de ubicación');
      }
    } catch (error) {
      console.error('❌ Error iniciando seguimiento de ubicación:', error);
    }
  }

  /**
   * Inicializa el servicio de notificaciones push
   */
  private async initializePushNotifications() {
    try {
      if (!this.pushNotificationService) {
        return;
      }
      
      await this.pushNotificationService.initialize();
    } catch (error) {
      console.error('❌ Error inicializando push notifications:', error);
    }
  }

  /**
   * 🔥 Inicializa deep linking para capturar OAuth redirects
   */
  private initializeDeepLinking() {
    try {
      // Solo en dispositivos móviles (capacitor)
      if (this.platform.is('capacitor')) {
        console.log('🔗 Configurando deep linking para OAuth...');
        
        CapacitorApp.addListener('appUrlOpen', async (event: URLOpenListenerEvent) => {
          console.log('🔗 Deep Link capturado:', event.url);
          
          // Analizar la URL para extraer parámetros
          try {
          const url = new URL(event.url);
          const path = url.pathname;
          const params = url.searchParams;
          
          console.log('🔗 Path:', path);
          console.log('🔗 Params:', params.toString());
          
            // Si viene de Firebase OAuth redirect (Google Sign-In)
            // Verificar si es un redirect de OAuth por hostname, path, params o protocol (URL scheme)
            const isOAuthRedirect = 
              url.hostname === 'localhost' || 
              path.includes('__/auth/handler') || 
              params.has('code') || 
              url.protocol?.startsWith('com.googleusercontent.apps') ||
              event.url.startsWith('com.googleusercontent.apps');
            
            if (isOAuthRedirect) {
            console.log('🔗 OAuth redirect detectado, navegando a login para procesarlo...');
            // Navegar a la página de login para que procese el redirect
              // La página de login llamará a checkRedirectResult() en ngOnInit
            this.router.navigate(['/login'], { replaceUrl: true });
          } else {
            // Navegar a la ruta interna de la app
            console.log('🔗 Navegando a:', path);
            this.router.navigateByUrl(path);
            }
          } catch (error) {
            console.error('❌ Error procesando deep link:', error);
            // Si hay error, intentar navegar a login de todas formas
            this.router.navigate(['/login'], { replaceUrl: true });
          }
        });
        
        console.log('✅ Deep linking configurado');
      }
    } catch (error) {
      console.error('❌ Error configurando deep linking:', error);
    }
  }

  /**
   * 🔥 Fuerza el modo claro, desactivando el modo oscuro del sistema
   */
  private forceLightMode() {
    try {
      // Remover clase dark del body si existe
      if (document.body.classList.contains('dark')) {
        document.body.classList.remove('dark');
      }
      
      // Forzar tema claro en el documento
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.style.colorScheme = 'light';
      
      // Prevenir que Ionic detecte preferencias de modo oscuro
      const style = document.createElement('style');
      style.textContent = `
        :root {
          color-scheme: light !important;
        }
        html {
          color-scheme: light !important;
        }
        body {
          background-color: #ffffff !important;
          color: #222428 !important;
        }
      `;
      document.head.appendChild(style);
      
      console.log('✅ Modo claro forzado correctamente');
    } catch (error) {
      console.error('❌ Error forzando modo claro:', error);
    }
  }

  private async initializeStatusBar() {
    try {
      if (this.platform.is('capacitor')) {
        // Configurar para que NO se superponga con el contenido
        await StatusBar.setOverlaysWebView({ overlay: false });
        
        // Estilo ligero para status bar (iconos oscuros en fondo claro)
        await StatusBar.setStyle({ style: Style.Light });
        
        // Color de fondo del status bar
        await StatusBar.setBackgroundColor({ color: '#667eea' });
        
        // Mostrar el status bar
        await StatusBar.show();
        
        console.log('✅ StatusBar configurado con safe area');
      }
    } catch (error) {
      console.error('❌ Error inicializando StatusBar:', error);
    }
  }
}