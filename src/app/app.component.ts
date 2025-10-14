import { Component, OnInit, OnDestroy } from '@angular/core';
import { Platform } from '@ionic/angular';
import { StatusBar, Style } from '@capacitor/status-bar';
import { LocationService } from './services/location.service';
import { AuthService } from './services/auth.service';

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
    private authService: AuthService
  ) {}

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