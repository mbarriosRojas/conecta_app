import { Component, OnInit } from '@angular/core';
import { PushNotificationService } from './services/push-notification.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  constructor(private pushNotificationService: PushNotificationService) {}

  async ngOnInit() {
    console.log('🚀 AppComponent: Iniciando aplicación...');
    try {
      // Inicializar notificaciones push al arrancar la app
      console.log('🔔 AppComponent: Inicializando servicio de notificaciones...');
      const result = await this.pushNotificationService.initialize();
      console.log('🔔 AppComponent: Resultado de inicialización:', result);
    } catch (error) {
      console.error('❌ AppComponent: Error inicializando notificaciones:', error);
    }
  }
}
