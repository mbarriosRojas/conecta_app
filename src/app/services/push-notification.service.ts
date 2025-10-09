import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { 
  PushNotifications, 
  Token, 
  PushNotificationSchema, 
  ActionPerformed 
} from '@capacitor/push-notifications';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { StorageService } from './storage.service';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private isInitialized = false;
  private currentToken: string | null = null;
  private messaging: Messaging | null = null;
  private userID: string | null = null;

  constructor(
    private platform: Platform,
    private http: HttpClient,
    private storageService: StorageService
  ) {}

  /**
   * Inicializa el servicio de notificaciones push
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔔 Inicializando servicio de notificaciones push...');

      if (this.isInitialized) {
        console.log('✅ Servicio ya inicializado');
        return true;
      }

      // Obtener o generar userID
      this.userID = await this.getUserID();

      // Inicializar según la plataforma
      if (this.platform.is('capacitor')) {
        // Plataforma móvil (iOS/Android)
        await this.initializeNativePush();
      } else {
        // Plataforma web
        await this.initializeWebPush();
      }

      this.isInitialized = true;
      console.log('✅ Servicio de notificaciones push inicializado correctamente');
      return true;

    } catch (error) {
      console.error('❌ Error inicializando servicio de push notifications:', error);
      return false;
    }
  }

  /**
   * Inicializa notificaciones push para plataformas nativas (iOS/Android)
   */
  private async initializeNativePush(): Promise<void> {
    try {
      console.log('📱 Inicializando push notifications nativas...');

      // Solicitar permisos
      const permissionStatus = await PushNotifications.requestPermissions();

      if (permissionStatus.receive === 'granted') {
        console.log('✅ Permisos de notificaciones concedidos');

        // Registrar para recibir notificaciones
        await PushNotifications.register();

        // Configurar listeners
        this.setupNativeListeners();

      } else {
        console.log('❌ Permisos de notificaciones denegados');
      }

    } catch (error) {
      console.error('❌ Error inicializando push nativas:', error);
    }
  }

  /**
   * Configura los listeners para notificaciones nativas
   */
  private setupNativeListeners(): void {
    // Listener: Registro exitoso
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('✅ Token FCM recibido:', token.value);
      this.currentToken = token.value;
      await this.registerTokenInBackend(token.value, this.getPlatformName());
    });

    // Listener: Error en registro
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('❌ Error en registro de push notifications:', error);
    });

    // Listener: Notificación recibida (app en foreground)
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('📬 Notificación recibida (foreground):', notification);
      this.handleNotificationReceived(notification);
    });

    // Listener: Notificación tocada
    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('👆 Notificación tocada:', notification);
      this.handleNotificationTapped(notification);
    });

    console.log('✅ Listeners de notificaciones nativas configurados');
  }

  /**
   * Inicializa notificaciones push para web
   */
  private async initializeWebPush(): Promise<void> {
    try {
      console.log('🌐 Inicializando push notifications web...');

      // Verificar si Firebase está configurado
      if (environment.firebase.apiKey === 'TU_API_KEY_AQUI') {
        console.warn('⚠️ Firebase no configurado en environment.ts');
        return;
      }

      // Inicializar Firebase
      const app = initializeApp(environment.firebase);
      this.messaging = getMessaging(app);

      // Solicitar permisos
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        console.log('✅ Permisos de notificaciones web concedidos');

        // Obtener token
        const token = await getToken(this.messaging, {
          vapidKey: environment.firebase.vapidKey
        });

        console.log('✅ Token FCM web recibido:', token);
        this.currentToken = token;
        await this.registerTokenInBackend(token, 'web');

        // Configurar listener para mensajes en foreground
        onMessage(this.messaging, (payload) => {
          console.log('📬 Mensaje recibido (foreground):', payload);
          this.handleWebNotification(payload);
        });

      } else {
        console.log('❌ Permisos de notificaciones web denegados');
      }

    } catch (error) {
      console.error('❌ Error inicializando push web:', error);
    }
  }

  /**
   * Registra el token en el backend
   */
  private async registerTokenInBackend(token: string, platform: string): Promise<void> {
    try {
      console.log(`📤 Registrando token en backend (${platform})...`);

      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });

      const deviceInfo = {
        model: this.platform.is('ios') ? 'iOS Device' : 
               this.platform.is('android') ? 'Android Device' : 'Web Browser',
        version: this.platform.version() || 'unknown',
        manufacturer: this.platform.is('android') ? 'Android' : 
                      this.platform.is('ios') ? 'Apple' : 'Browser'
      };

      const response = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/api/notifications/register-token`, {
          userID: this.userID,
          token,
          platform,
          deviceInfo
        }, { headers })
      );

      if ((response as any).status === 'success') {
        console.log('✅ Token registrado en backend correctamente');
        await this.storageService.set('fcm_token', token);
      }

    } catch (error) {
      console.error('❌ Error registrando token en backend:', error);
    }
  }

  /**
   * Obtiene o genera un userID único
   */
  private async getUserID(): Promise<string> {
    let userId = await this.storageService.get('userID');
    
    if (!userId) {
      // Generar ID único
      userId = 'user_' + Math.random().toString(36).substr(2, 9) + Date.now();
      await this.storageService.set('userID', userId);
      console.log('🆔 Nuevo userID generado:', userId);
    } else {
      console.log('🆔 UserID existente:', userId);
    }
    
    return userId;
  }

  /**
   * Obtiene el nombre de la plataforma
   */
  private getPlatformName(): 'android' | 'ios' | 'web' {
    if (this.platform.is('ios')) return 'ios';
    if (this.platform.is('android')) return 'android';
    return 'web';
  }

  /**
   * Maneja notificación recibida en foreground (nativa)
   */
  private handleNotificationReceived(notification: PushNotificationSchema): void {
    console.log('📬 Procesando notificación:', notification);

    // Aquí puedes mostrar una alerta personalizada o toast
    // Por ejemplo, si la notificación es de una promoción:
    if (notification.data?.type === 'promotion') {
      console.log('🎁 Promoción recibida:', notification.data.promotionText);
      // TODO: Mostrar modal o toast con la promoción
    }
  }

  /**
   * Maneja cuando el usuario toca una notificación (nativa)
   */
  private handleNotificationTapped(notification: ActionPerformed): void {
    console.log('👆 Usuario tocó notificación:', notification);

    const data = notification.notification.data;

    // Navegar según el tipo de notificación
    if (data?.type === 'promotion' && data?.businessID) {
      console.log(`🧭 Navegando a negocio: ${data.businessID}`);
      // TODO: Implementar navegación a detalle del negocio
      // this.router.navigate(['/provider-detail', data.businessID]);
    }
  }

  /**
   * Maneja notificación recibida en web
   */
  private handleWebNotification(payload: any): void {
    console.log('📬 Procesando notificación web:', payload);

    // Mostrar notificación del navegador
    if (payload.notification) {
      new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: payload.notification.icon || '/assets/icon/icon.png',
        badge: '/assets/icon/badge.png',
        tag: 'conecta-notification',
        requireInteraction: false
      });
    }
  }

  /**
   * Desregistra el token actual
   */
  async unregister(): Promise<boolean> {
    try {
      if (!this.currentToken) {
        console.log('⚠️ No hay token para desregistrar');
        return true;
      }

      console.log('🗑️ Desregistrando token...');

      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });

      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/api/notifications/unregister-token`, {
          token: this.currentToken
        }, { headers })
      );

      await this.storageService.remove('fcm_token');
      this.currentToken = null;

      console.log('✅ Token desregistrado correctamente');
      return true;

    } catch (error) {
      console.error('❌ Error desregistrando token:', error);
      return false;
    }
  }

  /**
   * Obtiene el token actual
   */
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  /**
   * Verifica si el servicio está inicializado
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Envía una notificación de prueba al usuario actual
   */
  async sendTestNotification(): Promise<boolean> {
    try {
      if (!this.userID) {
        console.error('❌ No hay userID');
        return false;
      }

      console.log('🧪 Enviando notificación de prueba...');

      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });

      const response = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/api/notifications/test`, {
          userID: this.userID,
          title: '🎉 Notificación de Prueba',
          body: '¡El sistema de notificaciones está funcionando correctamente!'
        }, { headers })
      );

      if ((response as any).status === 'success') {
        console.log('✅ Notificación de prueba enviada');
        return true;
      }

      return false;

    } catch (error) {
      console.error('❌ Error enviando notificación de prueba:', error);
      return false;
    }
  }
}

