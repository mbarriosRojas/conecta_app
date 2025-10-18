import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { PushNotificationService } from '../../services/push-notification.service';
import { LocationService } from '../../services/location.service';

@Component({
  selector: 'app-debug-push',
  templateUrl: './debug-push.page.html',
  styleUrls: ['./debug-push.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class DebugPushPage {
  logs: string[] = [];

  constructor(
    private pushNotificationService: PushNotificationService,
    private locationService: LocationService,
    private toastController: ToastController
  ) {
    // Interceptar console.log para mostrar en la app
    this.interceptConsoleLogs();
  }

  private interceptConsoleLogs() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      this.addLog('LOG', args.join(' '));
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      this.addLog('ERROR', args.join(' '));
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      this.addLog('WARN', args.join(' '));
      originalWarn.apply(console, args);
    };
  }

  private addLog(type: string, message: string) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${type}: ${message}`;
    this.logs.unshift(logEntry);
    
    // Mantener solo los últimos 50 logs
    if (this.logs.length > 50) {
      this.logs = this.logs.slice(0, 50);
    }
  }

  clearLogs() {
    this.logs = [];
  }

  async forceInitializePush() {
    console.log('🔧 Forzando inicialización de push notifications...');
    
    try {
      const initialized = await this.pushNotificationService.initialize();
      
      if (initialized) {
        this.showToast('✅ Push notifications inicializadas correctamente', 'success');
        console.log('✅ Push notifications inicializadas');
      } else {
        this.showToast('❌ Error inicializando push notifications', 'danger');
        console.log('❌ Error inicializando push notifications');
      }
    } catch (error) {
      this.showToast(`❌ Error: ${error.message}`, 'danger');
      console.error('❌ Error:', error);
    }
  }

  async getCurrentLocation() {
    console.log('📍 Obteniendo ubicación actual...');
    
    try {
      const location = await this.locationService.getCurrentPosition();
      this.showToast(`📍 Ubicación: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`, 'success');
      console.log('📍 Ubicación obtenida:', location);
    } catch (error) {
      this.showToast(`❌ Error obteniendo ubicación: ${error.message}`, 'danger');
      console.error('❌ Error obteniendo ubicación:', error);
    }
  }

  async sendTestNotification() {
    console.log('🧪 Enviando notificación de prueba...');
    
    try {
      const sent = await this.pushNotificationService.sendTestNotification();
      
      if (sent) {
        this.showToast('✅ Notificación de prueba enviada', 'success');
        console.log('✅ Notificación de prueba enviada');
      } else {
        this.showToast('❌ Error enviando notificación de prueba', 'danger');
        console.log('❌ Error enviando notificación de prueba');
      }
    } catch (error) {
      this.showToast(`❌ Error: ${error.message}`, 'danger');
      console.error('❌ Error:', error);
    }
  }

  async checkServiceStatus() {
    console.log('🔍 Verificando estado del servicio...');
    
    const isInitialized = this.pushNotificationService.isServiceInitialized();
    const currentToken = this.pushNotificationService.getCurrentToken();
    
    console.log('🔍 Estado del servicio:');
    console.log(`  - Inicializado: ${isInitialized}`);
    console.log(`  - Token actual: ${currentToken ? currentToken.substring(0, 20) + '...' : 'No hay token'}`);
    
    this.showToast(
      `Servicio: ${isInitialized ? 'Inicializado' : 'No inicializado'} | Token: ${currentToken ? 'Sí' : 'No'}`,
      isInitialized && currentToken ? 'success' : 'warning'
    );
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
