import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { StatusBar, Style } from '@capacitor/status-bar';
import { PushNotificationService } from './services/push-notification.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  constructor(
    private platform: Platform,
    private pushNotificationService: PushNotificationService
  ) {}

  async ngOnInit() {
    console.log('🚀 AppComponent: Iniciando aplicación...');
    
    // Inicializar StatusBar
    await this.initializeStatusBar();
    
    try {
      // Inicializar notificaciones push al arrancar la app
      console.log('🔔 AppComponent: Inicializando servicio de notificaciones...');
      const result = await this.pushNotificationService.initialize();
      console.log('🔔 AppComponent: Resultado de inicialización:', result);
    } catch (error) {
      console.error('❌ AppComponent: Error inicializando notificaciones:', error);
    }
  }

  private async initializeStatusBar() {
    try {
      if (this.platform.is('capacitor')) {
        await StatusBar.setStyle({ style: Style.Default });
        await StatusBar.setBackgroundColor({ color: '#ffffff' });
        await StatusBar.show();
        console.log('✅ StatusBar inicializado correctamente');
      }
    } catch (error) {
      console.error('❌ Error inicializando StatusBar:', error);
    }
  }
}
