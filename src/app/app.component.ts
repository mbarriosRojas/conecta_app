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
    console.log('🚀 AppComponent: Iniciando aplicación AKI...');
    
    try {
      // Inicializar StatusBar
      await this.initializeStatusBar();
      console.log('✅ AppComponent: StatusBar inicializado');
      
      // Esperar a que la plataforma esté lista
      await this.platform.ready();
      console.log('✅ AppComponent: Plataforma lista');
      
      // 🔥 Iniciar actualizaciones automáticas de ubicación
      await this.initializeLocationTracking();
      
      // 🔔 Inicializar notificaciones push
      await this.initializePushNotifications();
      
      // 🔄 Reintentar inicialización de push notifications después de 3 segundos
      setTimeout(async () => {
        console.log('🔄 AppComponent: Reintentando inicialización de push notifications...');
        await this.initializePushNotifications();
      }, 3000);
      
      console.log('🎉 AppComponent: Aplicación AKI iniciada correctamente');
      
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
        console.log('✅ Seguimiento de ubicación iniciado correctamente');
      } else {
        console.warn('⚠️ No se otorgaron permisos de ubicación');
        console.log('ℹ️ La app funcionará con ubicación limitada');
      }
    } catch (error) {
      console.error('❌ Error iniciando seguimiento de ubicación:', error);
      console.log('ℹ️ Continuando sin seguimiento de ubicación');
    }
  }

  /**
   * Inicializa el servicio de notificaciones push
   */
  private async initializePushNotifications() {
    try {
      console.log('🔔 AppComponent: Iniciando inicialización de push notifications...');
      
      // Verificar que el servicio esté disponible
      if (!this.pushNotificationService) {
        console.error('❌ AppComponent: PushNotificationService no está disponible');
        return;
      }
      
      console.log('🔔 AppComponent: Llamando a pushNotificationService.initialize()...');
      const initialized = await this.pushNotificationService.initialize();
      
      if (initialized) {
        console.log('✅ AppComponent: Notificaciones push inicializadas correctamente');
      } else {
        console.warn('⚠️ AppComponent: No se pudieron inicializar notificaciones push');
        console.log('ℹ️ AppComponent: La app funcionará sin notificaciones push');
      }
    } catch (error) {
      console.error('❌ AppComponent: Error inicializando notificaciones push:', error);
      console.error('❌ AppComponent: Error details:', error);
      console.log('ℹ️ AppComponent: Continuando sin notificaciones push');
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
        
        CapacitorApp.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
          console.log('🔗 Deep Link capturado:', event.url);
          
          // Analizar la URL para extraer parámetros
          const url = new URL(event.url);
          const path = url.pathname;
          const params = url.searchParams;
          
          console.log('🔗 Path:', path);
          console.log('🔗 Params:', params.toString());
          
          // Si viene de Firebase OAuth redirect
          if (path.includes('__/auth/handler') || params.has('code')) {
            console.log('🔗 OAuth redirect detectado, navegando a login para procesarlo...');
            // Navegar a la página de login para que procese el redirect
            this.router.navigate(['/login'], { replaceUrl: true });
          } else {
            // Navegar a la ruta interna de la app
            console.log('🔗 Navegando a:', path);
            this.router.navigateByUrl(path);
          }
        });
        
        console.log('✅ Deep linking configurado');
      }
    } catch (error) {
      console.error('❌ Error configurando deep linking:', error);
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