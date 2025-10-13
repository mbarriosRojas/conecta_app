import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { StatusBar, Style } from '@capacitor/status-bar';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  constructor(
    private platform: Platform
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
      
      console.log('🎉 AppComponent: Aplicación AKI iniciada correctamente');
      
    } catch (error) {
      console.error('❌ AppComponent: Error en inicialización:', error);
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