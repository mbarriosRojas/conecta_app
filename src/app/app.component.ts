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
    // Inicializar notificaciones push al arrancar la app
    await this.pushNotificationService.initialize();
  }
}
