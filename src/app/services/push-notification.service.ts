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
import { LocationService } from './location.service';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';

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
    private storageService: StorageService,
    private locationService: LocationService,
    private router: Router
  ) {}

  /**
   * Inicializa el servicio de notificaciones push
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔔 [TOKEN] ==========================================');
      console.log('🔔 [TOKEN] Inicializando servicio de notificaciones push');
      console.log('🔔 [TOKEN] ==========================================');
      
      if (this.isInitialized) {
        console.log('⚠️ [TOKEN] Servicio ya inicializado, omitiendo...');
        return true;
      }

      console.log('🔍 [TOKEN] Verificando plataforma...');
      console.log('🔍 [TOKEN] Capacitor:', this.platform.is('capacitor'));
      console.log('🔍 [TOKEN] iOS:', this.platform.is('ios'));
      console.log('🔍 [TOKEN] Android:', this.platform.is('android'));
      console.log('🔍 [TOKEN] Plataformas:', this.platform.platforms().join(', '));

      // Obtener o generar userID
      console.log('🔍 [TOKEN] Obteniendo/generando userID...');
      this.userID = this.getUserID();
      console.log('🔍 [TOKEN] userID:', this.userID ? 'Obtenido' : 'No disponible');
      
      if (!this.userID) {
        console.error('❌ [TOKEN] No se pudo obtener userID inicial, se intentará más tarde');
      }

      // Inicializar según la plataforma
      if (this.platform.is('capacitor')) {
        console.log('📱 [TOKEN] Inicializando push nativas (iOS/Android)...');
        await this.initializeNativePush();
      } else {
        console.log('⚠️ [TOKEN] Push notifications web desactivadas (no Capacitor)');
      }

      this.isInitialized = true;
      console.log('✅ [TOKEN] Servicio de notificaciones push inicializado');
      console.log('🔔 [TOKEN] ==========================================');
      return true;

    } catch (error: any) {
      console.error('❌ [TOKEN] ==========================================');
      console.error('❌ [TOKEN] ERROR inicializando push notifications:');
      console.error('❌ [TOKEN] Mensaje:', error?.message);
      console.error('❌ [TOKEN] Stack:', error?.stack);
      console.error('❌ [TOKEN] ==========================================');
      return false;
    }
  }


  /**
   * Inicializa notificaciones push para plataformas nativas (iOS/Android)
   * 🔥 CRÍTICO: En iOS, los listeners DEBEN configurarse ANTES de register()
   */
  private async initializeNativePush(): Promise<void> {
    try {
      console.log('📱 [TOKEN] Inicializando push nativas...');
      console.log(`📱 [TOKEN] Plataforma: ${this.platform.platforms().join(', ')}`);
      
      // 🔥 CRÍTICO: Configurar listeners ANTES de register() (especialmente en iOS)
      console.log('📱 [TOKEN] Configurando listeners ANTES de register()...');
      this.setupNativeListeners();
      
      console.log('📱 [TOKEN] Solicitando permisos de notificaciones...');
      const permissionStatus = await PushNotifications.requestPermissions();
      
      console.log('📱 [TOKEN] Estado de permisos:', JSON.stringify(permissionStatus));

      if (permissionStatus.receive === 'granted') {
        console.log('✅ [TOKEN] Permisos concedidos, registrando para recibir notificaciones...');
        
        try {
          await PushNotifications.register();
          console.log('✅ [TOKEN] PushNotifications.register() llamado exitosamente');
          
          // Verificar si hay un token pendiente (puede llegar inmediatamente en algunos casos)
          const pendingToken = await PushNotifications.checkPermissions();
          console.log('📱 [TOKEN] Estado de permisos después de register:', JSON.stringify(pendingToken));
          
          // 🔥 NUEVO: Verificar después de un delay si el token llegó
          // En iOS, el token puede tardar unos segundos en llegar
          setTimeout(async () => {
            const storedToken = await this.storageService.get('fcm_token');
            if (storedToken) {
              console.log('✅ [TOKEN] Token encontrado en storage después del delay');
              console.log('✅ [TOKEN] Token (primeros 30 chars):', storedToken.substring(0, 30) + '...');
              
              // Si el token está en storage pero no se registró en backend, intentar registrarlo
              if (!this.currentToken) {
                console.log('🔄 [TOKEN] Token en storage pero no en memoria, registrando en backend...');
                this.currentToken = storedToken;
                if (!this.userID) {
                  this.userID = this.locationService.getUserId();
                }
                if (this.userID) {
                  await this.registerTokenInBackend(storedToken, this.getPlatformName());
                }
              }
            } else {
              console.warn('⚠️ [TOKEN] ⚠️ ADVERTENCIA: Token NO recibido después de 5 segundos');
              console.warn('⚠️ [TOKEN] Esto puede indicar un problema de configuración de Firebase');
              
              if (this.platform.is('ios')) {
                console.warn('⚠️ [TOKEN] iOS: Verificar:');
                console.warn('   1. GoogleService-Info.plist está en el proyecto Xcode');
                console.warn('   2. GoogleService-Info.plist está en "Copy Bundle Resources"');
                console.warn('   3. Bundle ID coincide entre Xcode y Firebase');
                console.warn('   4. APNs está configurado en Firebase Console');
                console.warn('   5. Push Notifications capability está habilitada en Xcode');
                console.warn('   6. Certificado APNs no está expirado');
              }
              
              // Intentar registrar de nuevo después de más tiempo
              setTimeout(async () => {
                const retryToken = await this.storageService.get('fcm_token');
                if (retryToken) {
                  console.log('✅ [TOKEN] Token recibido en segundo intento');
                  this.currentToken = retryToken;
                  if (!this.userID) {
                    this.userID = this.locationService.getUserId();
                  }
                  if (this.userID) {
                    await this.registerTokenInBackend(retryToken, this.getPlatformName());
                  }
                } else {
                  console.error('❌ [TOKEN] Token NO recibido después de 10 segundos');
                  console.error('❌ [TOKEN] El listener "registration" no se está disparando');
                  console.error('❌ [TOKEN] Esto indica un problema de configuración de Firebase');
                }
              }, 5000);
            }
          }, 5000); // Esperar 5 segundos
          
        } catch (registerError: any) {
          console.error('❌ [TOKEN] Error en PushNotifications.register():', registerError);
          console.error('❌ [TOKEN] Mensaje:', registerError?.message);
          console.error('❌ [TOKEN] Stack:', registerError?.stack);
          
          // En iOS, a veces el error puede ser silencioso
          if (this.platform.is('ios')) {
            console.error('⚠️ [TOKEN] iOS: Verificar que GoogleService-Info.plist esté correctamente configurado');
            console.error('⚠️ [TOKEN] iOS: Verificar que Push Notifications capability esté habilitada en Xcode');
            console.error('⚠️ [TOKEN] iOS: Verificar que APNs esté configurado en Firebase Console');
          }
        }
      } else {
        console.error('❌ [TOKEN] Permisos de notificaciones denegados');
        console.error('❌ [TOKEN] Estado recibido:', permissionStatus.receive);
        
        if (this.platform.is('ios')) {
          console.error('⚠️ [TOKEN] iOS: Usuario debe conceder permisos en Configuración → AKI → Notificaciones');
        }
      }

    } catch (error: any) {
      console.error('❌ [TOKEN] Error inicializando push nativas:', error);
      console.error('❌ [TOKEN] Mensaje:', error?.message);
      console.error('❌ [TOKEN] Stack:', error?.stack);
      
      if (this.platform.is('ios')) {
        console.error('⚠️ [TOKEN] iOS: Verificar configuración de Firebase para iOS');
        console.error('⚠️ [TOKEN] iOS: Verificar que GoogleService-Info.plist esté en el proyecto');
      }
    }
  }

  /**
   * Configura listeners básicos para notificaciones
   */
  private setupBasicListeners(): void {
    // Listener: Registro exitoso (versión básica)
    PushNotifications.addListener('registration', async (token: Token) => {
      try {
        console.log('🎉 [TOKEN] Token FCM recibido');
        
        if (!token?.value) {
          console.error('❌ [TOKEN] Token vacío');
          return;
        }
        
        this.currentToken = token.value;
        await this.storageService.set('fcm_token', token.value);
        
        // Intentar registrar en backend si userID está disponible
        if (!this.userID) {
          this.userID = await this.getUserID();
        }
        
        if (this.userID) {
          console.log('📤 [TOKEN] Enviando token al backend...');
          await this.registerTokenInBackend(token.value, this.getPlatformName());
        } else {
          console.error('❌ [TOKEN] No se pudo obtener userID');
        }
      } catch (error: any) {
        console.error('❌ [TOKEN] Error:', error?.message || error);
      }
    });

    // Listener: Error en registro
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('❌ [TOKEN] Error en registro:', error);
    });

    // Listener: Notificación recibida
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      // Sin log
    });

    // Listener: Notificación tocada
    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      this.handleNotificationTapped(notification);
    });
  }

  /**
   * Configura los listeners para notificaciones nativas
   * 🔥 CRÍTICO: Debe llamarse ANTES de PushNotifications.register()
   */
  private setupNativeListeners(): void {
    console.log('📱 [TOKEN] Configurando listeners de notificaciones push...');
    
    // Listener: Registro exitoso
    PushNotifications.addListener('registration', async (token: Token) => {
      try {
        console.log('🎉 [TOKEN] ==========================================');
        console.log('🎉 [TOKEN] LISTENER: Token FCM recibido del dispositivo');
        console.log('🎉 [TOKEN] ==========================================');
        console.log('🎉 [TOKEN] Token completo:', token?.value);
        console.log('🎉 [TOKEN] Longitud del token:', token?.value?.length);
        console.log('🎉 [TOKEN] Plataforma:', this.getPlatformName());
        
        if (!token?.value) {
          console.error('❌ [TOKEN] Token vacío o inválido');
          return;
        }
        
        this.currentToken = token.value;
        console.log('✅ [TOKEN] Token guardado en memoria');
        
        // Guardar token localmente
        try {
          await this.storageService.set('fcm_token', token.value);
          console.log('✅ [TOKEN] Token guardado en Ionic Storage');
        } catch (storageError: any) {
          console.error('❌ [TOKEN] Error guardando token en Storage:', storageError);
        }
        
        // Obtener userID desde LocationService
        if (!this.userID) {
          console.log('🔍 [TOKEN] Obteniendo userID desde LocationService...');
          this.userID = this.locationService.getUserId();
          console.log('🔍 [TOKEN] userID obtenido:', this.userID ? 'Sí' : 'No');
        }
        
        if (!this.userID) {
          console.error('❌ [TOKEN] No se pudo obtener userID');
          console.error('❌ [TOKEN] Verificar que LocationService esté inicializado');
          return;
        }
        
        console.log('📤 [TOKEN] userID:', this.userID);
        console.log('📤 [TOKEN] Enviando token al backend...');
        
        await this.registerTokenInBackend(token.value, this.getPlatformName());
        
        console.log('✅ [TOKEN] ==========================================');
        console.log('✅ [TOKEN] Token registrado correctamente en backend');
        console.log('✅ [TOKEN] ==========================================');
      } catch (error: any) {
        console.error('❌ [TOKEN] ==========================================');
        console.error('❌ [TOKEN] ERROR en listener registration:');
        console.error('❌ [TOKEN] Mensaje:', error?.message);
        console.error('❌ [TOKEN] Stack:', error?.stack);
        console.error('❌ [TOKEN] ==========================================');
      }
    });

    // Listener: Error en registro
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('❌ [TOKEN] ==========================================');
      console.error('❌ [TOKEN] ERROR EN REGISTRO DE TOKEN:');
      console.error('❌ [TOKEN] Error completo:', JSON.stringify(error, null, 2));
      console.error('❌ [TOKEN] Mensaje:', error?.message);
      console.error('❌ [TOKEN] Code:', error?.code);
      console.error('❌ [TOKEN] Plataforma:', this.getPlatformName());
      
      if (this.platform.is('ios')) {
        console.error('⚠️ [TOKEN] iOS: Posibles causas:');
        console.error('   - GoogleService-Info.plist no configurado correctamente');
        console.error('   - Push Notifications capability no habilitada en Xcode');
        console.error('   - APNs no configurado en Firebase Console');
        console.error('   - Certificado APNs expirado o inválido');
        console.error('   - Bundle ID no coincide con Firebase');
      }
      
      console.error('❌ [TOKEN] ==========================================');
    });

    // Listener: Notificación recibida (app en foreground)
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('📨 [TOKEN] Notificación recibida (foreground):', notification?.title);
      this.handleNotificationReceived(notification);
    });

    // Listener: Notificación tocada
    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('👆 [TOKEN] Notificación tocada:', notification?.notification?.title);
      this.handleNotificationTapped(notification);
    });
    
    console.log('✅ [TOKEN] Listeners configurados correctamente');
  }

  /**
   * Inicializa notificaciones push para web
   */
  private async initializeWebPush(): Promise<void> {
    try {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return;
      }

      if (environment.firebase.apiKey === 'TU_API_KEY_AQUI') {
        return;
      }

      const app = initializeApp(environment.firebase);
      this.messaging = getMessaging(app);

      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        const token = await getToken(this.messaging);
        this.currentToken = token;
        await this.registerTokenInBackend(token, 'web');

        onMessage(this.messaging, (payload) => {
          this.handleWebNotification(payload);
        });
      }

    } catch (error) {
      console.error('❌ Error inicializando push web:', error);
    }
  }

  /**
   * Registra el token en el backend (versión simplificada para desarrollo)
   * 🔥 MEJORADO: Asegura que userID siempre esté disponible antes de registrar
   */
  private async registerTokenInBackend(token: string, platform: string): Promise<void> {
    try {
      // Obtener userID desde LocationService
      if (!this.userID) {
        this.userID = this.locationService.getUserId();
      }

      if (!this.userID) {
        console.error('❌ [TOKEN] No se pudo obtener userID');
        return;
      }

      if (!token) {
        console.error('❌ [TOKEN] Token vacío');
        return;
      }

      // Guardar token localmente
      await this.storageService.set('fcm_token', token);

      // Validar API URL
      if (!environment.apiUrl || environment.apiUrl === 'TU_API_URL_AQUI') {
        console.error('❌ [TOKEN] environment.apiUrl no configurado');
        return;
      }
      
      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });

      const deviceInfo = {
        model: this.platform.is('ios') ? 'iOS Device' : 
               this.platform.is('android') ? 'Android Device' : 'Web Browser',
        version: '1.0.0',
        manufacturer: this.platform.is('android') ? 'Android' : 
                      this.platform.is('ios') ? 'Apple' : 'Browser'
      };

      // 🔥 MEJORADO: Obtener ubicación con más intentos y mejor manejo de errores
      // Esto es CRÍTICO para que las estadísticas de geocerca funcionen correctamente
      let currentLocation = await this.getLocationWithRetry(5); // Aumentado a 5 intentos
      
      // Si no se pudo obtener ubicación, intentar una vez más después de un breve delay
      if (!currentLocation) {
        console.log('⚠️ [TOKEN] No se pudo obtener ubicación en el primer intento, esperando 2 segundos...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        currentLocation = await this.getLocationWithRetry(3);
      }

      // Obtener deviceId desde LocationService
      const deviceId = this.locationService.getDeviceId();

      const registrationData: any = {
        userID: this.userID,
        token,
        deviceId,
        platform,
        deviceInfo
      };

      // 🔥 CRÍTICO: Incluir ubicación SIEMPRE que esté disponible
      if (currentLocation) {
        registrationData.lat = currentLocation.lat;
        registrationData.lng = currentLocation.lng;
        console.log(`✅ [TOKEN] Ubicación incluida en registro: lat=${currentLocation.lat}, lng=${currentLocation.lng}`);
      } else {
        console.warn('⚠️ [TOKEN] ⚠️ ADVERTENCIA: Token registrado SIN ubicación. Las estadísticas de geocerca pueden no funcionar correctamente.');
        console.warn('⚠️ [TOKEN] La ubicación se actualizará automáticamente cuando esté disponible.');
      }

      console.log(`📤 [TOKEN] POST ${environment.apiUrl}/api/notifications/register-token`);
      console.log(`📤 [TOKEN] userID: ${this.userID}`);
      console.log(`📤 [TOKEN] deviceId: ${deviceId}`);
      console.log(`📤 [TOKEN] platform: ${platform}`);
      console.log(`📤 [TOKEN] token (primeros 20 chars): ${token.substring(0, 20)}...`);
      console.log(`📤 [TOKEN] token (longitud): ${token.length}`);
      console.log(`📤 [TOKEN] deviceInfo:`, deviceInfo);
      console.log(`📤 [TOKEN] location:`, currentLocation ? `lat: ${currentLocation.lat}, lng: ${currentLocation.lng}` : 'No disponible');

      const response = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/api/notifications/register-token`, registrationData, { headers })
      );

      if ((response as any).status === 'success') {
        console.log('✅ [TOKEN] Token registrado correctamente');
        const responseData = (response as any).data;
        if (responseData && !responseData.hasLocation && !currentLocation) {
          console.warn('⚠️ [TOKEN] Token registrado sin ubicación. Intentando actualizar cuando esté disponible...');
          // Intentar actualizar la ubicación después de un breve delay
          setTimeout(async () => {
            const location = await this.getLocationWithRetry(3);
            if (location) {
              console.log('🔄 [TOKEN] Actualizando ubicación del token después del registro...');
              await this.updateTokenLocationAfterRegistration(token, location.lat, location.lng);
            }
          }, 5000);
        }
      } else {
        console.error('❌ [TOKEN] Respuesta del backend no exitosa:', response);
      }

    } catch (error: any) {
      console.error('❌ [TOKEN] ==========================================');
      console.error('❌ [TOKEN] ERROR registrando token en backend:');
      console.error('❌ [TOKEN] Error completo:', JSON.stringify(error, null, 2));
      
      if (error?.status === 0) {
        console.error('❌ [TOKEN] Error de red: Backend no accesible');
        console.error('❌ [TOKEN] URL:', environment.apiUrl);
        console.error('❌ [TOKEN] Verificar que el backend esté corriendo');
        console.error('❌ [TOKEN] Verificar conectividad de red');
      } else {
        console.error('❌ [TOKEN] HTTP Status:', error?.status);
        console.error('❌ [TOKEN] HTTP Status Text:', error?.statusText);
        console.error('❌ [TOKEN] Mensaje:', error?.error?.message || error?.message);
        console.error('❌ [TOKEN] Error body:', error?.error);
      }
      
      console.error('❌ [TOKEN] Token que se intentó registrar:', token.substring(0, 20) + '...');
      console.error('❌ [TOKEN] userID:', this.userID);
      console.error('❌ [TOKEN] platform:', platform);
      console.error('❌ [TOKEN] ==========================================');
      
      // Reintentar después de 5 segundos
      console.log('🔄 [TOKEN] Reintentando registro en 5 segundos...');
      setTimeout(async () => {
        console.log('🔄 [TOKEN] Reintentando registro...');
        await this.registerTokenInBackend(token, platform);
      }, 5000);
    }
  }

  /**
   * 🔥 MEJORA: Obtiene ubicación con reintentos
   * Intenta obtener la ubicación hasta maxRetries veces antes de fallar
   */
  private async getLocationWithRetry(maxRetries: number = 3): Promise<{lat: number, lng: number} | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const location = await this.locationService.getCurrentPosition();
        return {
          lat: location.latitude,
          lng: location.longitude
        };
      } catch (error) {
        console.log(`⚠️ [TOKEN] Intento ${attempt}/${maxRetries} de obtener ubicación falló`);
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 500;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    return null;
  }

  /**
   * 🔥 NUEVO: Actualiza la ubicación del token después del registro
   * Se usa cuando el token se registró sin ubicación y luego la ubicación está disponible
   */
  private async updateTokenLocationAfterRegistration(token: string, lat: number, lng: number): Promise<void> {
    try {
      if (!this.userID) {
        this.userID = this.locationService.getUserId();
      }

      if (!this.userID) {
        console.error('❌ [TOKEN] No se pudo obtener userID para actualizar ubicación');
        return;
      }

      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });

      const response = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/api/notifications/update-token-location`, {
          userID: this.userID,
          token,
          lat,
          lng
        }, { headers })
      );

      if ((response as any).status === 'success') {
        console.log('✅ [TOKEN] Ubicación actualizada en token después del registro');
      } else {
        console.warn('⚠️ [TOKEN] Respuesta del backend no exitosa al actualizar ubicación:', response);
      }
    } catch (error: any) {
      console.warn('⚠️ [TOKEN] Error actualizando ubicación del token (no crítico):', error?.message || error);
    }
  }

  /**
   * Obtiene el userID usando LocationService para garantizar consistencia
   * 🔥 CENTRALIZADO: Siempre usa LocationService.getUserId()
   */
  private getUserID(): string {
    return this.locationService.getUserId();
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
    // Manejar notificación recibida en foreground
    if (notification.data?.type === 'promotion') {
      // TODO: Mostrar modal o toast con la promoción
    }
  }

  /**
   * Maneja cuando el usuario toca una notificación (nativa)
   * 🔥 MEJORADO: Soporte mejorado para navegación con promotionId
   */
  private async handleNotificationTapped(notification: ActionPerformed): Promise<void> {
    try {
    const data = notification.notification.data;
      console.log('👆 [NOTIFICATION] Notificación tocada, datos:', data);

    if (data?.type === 'promotion' && data?.businessID) {
        const businessID = data.businessID;
        const promotionId = data.promotionId; // 🔥 NUEVO: Obtener promotionId si está disponible

        console.log('📱 [NOTIFICATION] Navegando a promoción:', {
          businessID,
          promotionId,
          businessName: data.businessName
        });

      // Registrar tracking
      try {
        const userID = await this.getUserID();
          await this.trackPromotionOpened(businessID, userID);
      } catch (error) {
          console.warn('⚠️ [NOTIFICATION] Error en tracking (no crítico):', error);
        // No bloquear navegación por error de tracking
      }
      
        // 🔥 MEJORADO: Preparar queryParams con promotionId si está disponible
        const queryParams: any = { tab: 'promo' };
        if (promotionId) {
          queryParams.promotionId = promotionId;
        }

        // Navegar al detalle del proveedor con tab de promociones
        this.router.navigate(['/provider-detail', businessID], {
          queryParams
      }).catch(err => {
          console.error('❌ [NOTIFICATION] Error navegando:', err);
      });
      } else {
        console.log('ℹ️ [NOTIFICATION] Tipo de notificación no reconocido o falta businessID');
      }
    } catch (error) {
      console.error('❌ [NOTIFICATION] Error manejando notificación tocada:', error);
    }
  }

  /**
   * 🔥 Registra que el usuario abrió una notificación de promoción
   */
  private async trackPromotionOpened(businessID: string, userID: string): Promise<void> {
    try {
      await this.http.post(
        `${environment.apiUrl}/api/geofencing/business/${businessID}/promotion/opened`,
        { userID }
      ).toPromise();
    } catch (error) {
      // Error silencioso para no interrumpir navegación
    }
  }

  /**
   * Maneja notificación recibida en web
   * 🔥 MEJORADO: Soporte para clics en notificaciones web
   */
  private handleWebNotification(payload: any): void {
    if (payload.notification) {
      // 🔥 MEJORADO: Usar imageUrl como icon si está disponible (la API de Notifications no soporta imágenes grandes directamente)
      const icon = payload.notification.imageUrl || payload.notification.icon || '/assets/icon/icon.png';
      
      const notification = new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: icon,
        badge: '/assets/icon/badge.png',
        tag: 'conecta-notification',
        requireInteraction: false
      });

      // 🔥 NUEVO: Almacenar datos para navegación (las opciones de Notification no soportan data directamente)
      const notificationData = payload.data || {};

      // 🔥 NUEVO: Manejar clic en notificación web
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();

        if (notificationData.type === 'promotion' && notificationData.businessID) {
          const queryParams: any = { tab: 'promo' };
          if (notificationData.promotionId) {
            queryParams.promotionId = notificationData.promotionId;
          }

          this.router.navigate(['/provider-detail', notificationData.businessID], {
            queryParams
          }).catch(err => {
            console.error('❌ [NOTIFICATION] Error navegando desde web:', err);
          });
        }

        notification.close();
      };
    }
  }

  /**
   * Desregistra el token actual
   */
  async unregister(): Promise<boolean> {
    try {
      if (!this.currentToken) {
        return true;
      }

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
      return true;

    } catch (error) {
      console.error('❌ Error desregistrando token:', error);
      return false;
    }
  }

  /**
   * Actualiza el userID del token cuando el usuario inicia sesión
   */
  async updateTokenUserID(authenticatedUserID: string): Promise<boolean> {
    try {
      if (!this.currentToken) {
        return false;
      }

      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });

      // Obtener deviceId desde LocationService
      const deviceId = this.locationService.getDeviceId();
      
      const response = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/api/notifications/update-token-user`, {
          oldUserID: this.userID,
          newUserID: authenticatedUserID,
          token: this.currentToken,
          deviceId
        }, { headers })
      );

      if ((response as any).status === 'success') {
        this.userID = authenticatedUserID;
        await this.storageService.set('userID', authenticatedUserID);
        console.log('✅ [TOKEN] userID actualizado:', authenticatedUserID);
        return true;
      }

      return false;

    } catch (error) {
      console.error('❌ [TOKEN] Error actualizando userID:', error);
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
        return false;
      }

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

      return (response as any).status === 'success';

    } catch (error) {
      console.error('❌ Error enviando notificación de prueba:', error);
      return false;
    }
  }
}

