import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { Device } from '@capacitor/device';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of, interval, firstValueFrom } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';
import { registerPlugin } from '@capacitor/core';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface LocationQueryParams {
  lat?: number;
  lng?: number;
  radius?: number;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private currentLocationSubject = new BehaviorSubject<LocationData | null>(null);
  public currentLocation$ = this.currentLocationSubject.asObservable();
  private defaultRadius = 10000; // 10km en metros
  
  // 🔥 Configuración para actualización en segundo plano
  private backgroundUpdateInterval = 5 * 60 * 1000; // 5 minutos (app abierta/minimizada)
  private backgroundUpdateSubscription: any = null;
  private anonymousUserId: string | null = null;
  private deviceId: string | null = null; // ID único del dispositivo físico
  private isBackgroundUpdateEnabled = false;
  private backgroundGeolocationWatcherId: string | null = null;

  constructor(private http: HttpClient) {
    this.initializeLocation();
    this.initializeAnonymousUser();
  }

  private async initializeLocation() {
    try {
      // Intentar obtener la ubicación al inicializar el servicio
      await this.getCurrentPosition();
    } catch (error) {
      // Error silencioso
    }
  }

  async getCurrentPosition(): Promise<LocationData> {
    try {
      // En web, usar la API nativa del navegador
      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location: LocationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp
              };
              this.currentLocationSubject.next(location);
              resolve(location);
            },
            (error) => {
              console.error('❌ LocationService: Error obteniendo ubicación:', error);
              reject(new Error('No se pudo obtener la ubicación actual'));
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
          );
        });
      }

      // En dispositivos móviles, usar Capacitor
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      });

      const location: LocationData = {
        latitude: coordinates.coords.latitude,
        longitude: coordinates.coords.longitude,
        accuracy: coordinates.coords.accuracy,
        timestamp: coordinates.timestamp
      };

      this.currentLocationSubject.next(location);
      return location;
    } catch (error) {
      console.error('❌ LocationService: Error obteniendo ubicación:', error);
      throw new Error('No se pudo obtener la ubicación actual');
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      // En web, usar la API nativa del navegador
      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(true),
            () => resolve(false),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
          );
        });
      }
      
      // En dispositivos móviles, usar Capacitor
      const permissions = await Geolocation.requestPermissions();
      return permissions.location === 'granted';
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  watchPosition(): Observable<LocationData> {
    return new Observable(observer => {
      const watchId = Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        },
        (position, err) => {
          if (err || !position) {
            observer.error(err);
            return;
          }

          const location: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };

          this.currentLocationSubject.next(location);
          observer.next(location);
        }
      );

      return () => {
        Geolocation.clearWatch({ id: watchId.toString() });
      };
    });
  }

  getCurrentLocation(): LocationData | null {
    return this.currentLocationSubject.value;
  }

  calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return Math.round(R * c); // Distance in meters
  }

  formatDistance(distanceInMeters: number): string {
    if (distanceInMeters < 1000) {
      return `${distanceInMeters.toFixed(2)}m`;
    } else {
      const km = (distanceInMeters / 1000).toFixed(1);
      return `${km}km`;
    }
  }

  // Métodos para query parameters
  getLocationQueryParams(radius?: number): LocationQueryParams {
    const location = this.getCurrentLocation();
    if (!location) {
      return {};
    }

    const params: LocationQueryParams = {
      lat: location.latitude,
      lng: location.longitude
    };

    // Solo agregar radio si se especifica explícitamente
    if (radius && radius > 0) {
      params.radius = radius;
    }

    return params;
  }

  getLocationQueryString(radius?: number): string {
    const params = this.getLocationQueryParams(radius);
    if (!params.lat || !params.lng) {
      return '';
    }

    const queryParams = new URLSearchParams();
    queryParams.set('lat', params.lat.toString());
    queryParams.set('lng', params.lng.toString());
    if (params.radius) {
      queryParams.set('radius', params.radius.toString());
    }

    return queryParams.toString();
  }

  // Método para obtener ubicación como Observable
  getCurrentLocationObservable(): Observable<LocationData | null> {
    return this.currentLocation$.pipe(
      map(location => location),
      catchError(error => {
        console.error('Error en currentLocation$:', error);
        return of(null);
      })
    );
  }

  // Método para forzar actualización de ubicación
  async refreshLocation(): Promise<LocationData> {
    return await this.getCurrentPosition();
  }

  // Método para verificar si la ubicación está disponible
  isLocationAvailable(): boolean {
    return this.getCurrentLocation() !== null;
  }

  // Método para obtener ubicación con fallback
  async getLocationWithFallback(): Promise<LocationData> {
    try {
      return await this.getCurrentPosition();
    } catch (error) {
      // Si no se puede obtener la ubicación actual, usar una ubicación por defecto
      // (por ejemplo, centro de la ciudad principal)
      const fallbackLocation: LocationData = {
        latitude: 4.6097, // Bogotá, Colombia
        longitude: -74.0817,
        accuracy: 0,
        timestamp: Date.now()
      };
      
      this.currentLocationSubject.next(fallbackLocation);
      return fallbackLocation;
    }
  }

  // Método para configurar radio por defecto
  setDefaultRadius(radius: number): void {
    this.defaultRadius = radius;
  }

  getDefaultRadius(): number {
    return this.defaultRadius;
  }

  // 🔥 ============================================
  // MÉTODOS PARA USUARIOS ANÓNIMOS Y ACTUALIZACIÓN EN SEGUNDO PLANO
  // 🔥 ============================================

  /**
   * Inicializa el ID del dispositivo (userID persistente) y deviceId
   * 🔥 GARANTIZA: El mismo dispositivo siempre usa el mismo userID y deviceId
   */
  private async initializeAnonymousUser() {
    try {
      // 1. Inicializar deviceId primero (ID único del dispositivo físico)
      await this.initializeDeviceId();

      // 2. Inicializar anonymousUserId (ID persistente para ubicación)
      if (typeof localStorage !== 'undefined') {
        const storedUserId = localStorage.getItem('anonymousUserId');
        if (storedUserId) {
          this.anonymousUserId = storedUserId;
          return;
        }
      }

      // 3. Usar deviceId como anonymousUserId si está disponible
      if (this.deviceId) {
        this.anonymousUserId = this.deviceId;
      } else {
        this.anonymousUserId = this.generateUniqueId();
      }
      
      // Guardar en localStorage para persistencia
      if (typeof localStorage !== 'undefined' && this.anonymousUserId) {
        localStorage.setItem('anonymousUserId', this.anonymousUserId);
      }
    } catch (error) {
      console.warn('⚠️ Error inicializando usuario anónimo:', error);
      if (typeof localStorage !== 'undefined') {
        this.anonymousUserId = localStorage.getItem('anonymousUserId') || this.generateUniqueId();
        if (this.anonymousUserId) {
          localStorage.setItem('anonymousUserId', this.anonymousUserId);
        }
      } else {
        this.anonymousUserId = this.generateUniqueId();
      }
    }
  }

  /**
   * Inicializa el deviceId único del dispositivo físico
   * Prioridad: localStorage → Device.getId() → Generar nuevo
   */
  private async initializeDeviceId(): Promise<void> {
    try {
      // 1. Intentar obtener de localStorage (persiste entre sesiones)
      if (typeof localStorage !== 'undefined') {
        const storedDeviceId = localStorage.getItem('deviceId');
        if (storedDeviceId) {
          this.deviceId = storedDeviceId;
          return;
        }
      }

      // 2. Intentar obtener el ID del dispositivo físico
      const { Device } = await import('@capacitor/device');
      const deviceInfo = await Device.getId();
      if (deviceInfo?.identifier) {
        this.deviceId = deviceInfo.identifier;
      } else {
        // 3. Generar uno nuevo si no se pudo obtener
        this.deviceId = this.generateDeviceId();
      }
      
      // Guardar en localStorage para persistencia
      if (typeof localStorage !== 'undefined' && this.deviceId) {
        localStorage.setItem('deviceId', this.deviceId);
      }
    } catch (error) {
      console.warn('⚠️ Error obteniendo device ID:', error);
      if (typeof localStorage !== 'undefined') {
        this.deviceId = localStorage.getItem('deviceId') || this.generateDeviceId();
        if (this.deviceId) {
          localStorage.setItem('deviceId', this.deviceId);
        }
      } else {
        this.deviceId = this.generateDeviceId();
      }
    }
  }

  /**
   * Genera un deviceId único que persiste entre sesiones
   */
  private generateDeviceId(): string {
    return 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Genera un ID único para usuarios anónimos
   */
  private generateUniqueId(): string {
    return 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Obtiene el deviceId único del dispositivo físico
   * Método público para usar en otros servicios
   */
  public getDeviceId(): string {
    if (!this.deviceId) {
      if (typeof localStorage !== 'undefined') {
        this.deviceId = localStorage.getItem('deviceId');
      }
      if (!this.deviceId) {
        this.deviceId = this.generateDeviceId();
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('deviceId', this.deviceId);
        }
      }
    }
    return this.deviceId;
  }

  /**
   * Obtiene el ID de usuario para actualizar ubicación
   * 🔥 IMPORTANTE: Siempre usa el mismo ID del dispositivo
   * - Si hay usuario autenticado: usa el ID del usuario (para vincular ubicación a cuenta)
   * - Si no hay usuario: usa el anonymousUserId (ID persistente del dispositivo)
   * 
   * Esto garantiza que:
   * - El mismo dispositivo siempre actualiza el mismo registro en UserLocation
   * - Cuando el usuario hace login, se vincula su ubicación a su cuenta
   * - Cuando el usuario hace logout, sigue usando el mismo dispositivo pero como anónimo
   */
  public getUserId(authService?: any): string {
    // Si hay un usuario autenticado, usar su ID de cuenta (vincula ubicación a cuenta)
    if (authService && authService.isAuthenticated()) {
      const user = authService.getCurrentUser();
      if (user?.id) {
        return user.id; // Usar ID del usuario autenticado
      }
    }
    
    // Si no hay usuario autenticado, usar el ID persistente del dispositivo
    // Este ID se mantiene entre sesiones gracias a localStorage
    if (!this.anonymousUserId) {
      // Si no se inicializó, intentar obtener de localStorage
      if (typeof localStorage !== 'undefined') {
        this.anonymousUserId = localStorage.getItem('anonymousUserId') || this.generateUniqueId();
        if (this.anonymousUserId && !localStorage.getItem('anonymousUserId')) {
          localStorage.setItem('anonymousUserId', this.anonymousUserId);
        }
      } else {
        this.anonymousUserId = this.generateUniqueId();
      }
    }
    
    return this.anonymousUserId;
  }

  /**
   * 🔥 Sistema de tracking simplificado para evitar errores en iOS
   * - App abierta/minimizada: Cada 5 minutos (foreground tracking)
   * - App cerrada: NO se rastrea (evita problemas de permisos en iOS)
   */
  public async startBackgroundLocationUpdates(authService?: any) {
    if (this.isBackgroundUpdateEnabled) {
      return;
    }

    this.isBackgroundUpdateEnabled = true;

    // 1️⃣ Actualizar inmediatamente
    await this.updateLocationToBackend(authService);

    // 2️⃣ Timer para app abierta/minimizada (cada 5 min)
    // NOTA: No usamos background tracking nativo para evitar errores en iOS
    // El background tracking requiere permisos "Always" que causan problemas
    this.backgroundUpdateSubscription = interval(this.backgroundUpdateInterval).subscribe(async () => {
      try {
        await this.updateLocationToBackend(authService);
      } catch (error) {
        console.error('❌ [LOCATION] Error en actualización periódica:', error);
      }
    });

  }

  /**
   * ⚠️ DESACTIVADO: Tracking nativo en segundo plano
   * Este método está desactivado para evitar errores en iOS relacionados con permisos "Always"
   * Si necesitas background tracking, considera usar solo cuando tengas permisos "Always" confirmados
   */
  private async startNativeBackgroundTracking(authService?: any) {
    // DESACTIVADO: No usamos background tracking nativo para evitar errores en iOS
    // El error "Invalid parameter not satisfying: !stayUp || CLClientIsBa..." 
    // ocurre cuando se intenta habilitar allowsBackgroundLocationUpdates sin permiso "Always"
    return;
    
    /* Código original comentado - solo para referencia
    try {
      const deviceInfo = await Device.getInfo();
      if (deviceInfo.platform === 'web') {
        return;
      }
      // ... resto del código
    } catch (error) {
      throw error;
    }
    */
  }

  /**
   * Detiene la actualización automática de ubicación (ambos sistemas)
   */
  public async stopBackgroundLocationUpdates() {
    // Detener timer de actualización periódica
    if (this.backgroundUpdateSubscription) {
      this.backgroundUpdateSubscription.unsubscribe();
      this.backgroundUpdateSubscription = null;
    }

    // Detener tracking nativo background (si existe, aunque está desactivado)
    if (this.backgroundGeolocationWatcherId) {
      try {
        await BackgroundGeolocation.removeWatcher({ id: this.backgroundGeolocationWatcherId });
        this.backgroundGeolocationWatcherId = null;
      } catch (error) {
        console.error('❌ [LOCATION] Error deteniendo background tracking:', error);
      }
    }

    this.isBackgroundUpdateEnabled = false;
  }

  /**
   * Actualiza la ubicación del usuario en el backend
   * 🔥 MEJORADO: Ahora también actualiza la ubicación en DeviceToken
   */
  private async updateLocationToBackend(authService?: any): Promise<void> {
    try {
      const location = await this.getCurrentPosition();
      const userId = this.getUserId(authService);

      // Obtener información del dispositivo
      let deviceInfo: any = {};
      try {
        const info = await Device.getInfo();
        deviceInfo = {
          platform: info.platform,
          model: info.model,
          osVersion: info.osVersion,
          manufacturer: info.manufacturer
        };
      } catch (error) {
        console.warn('⚠️ No se pudo obtener info del dispositivo:', error);
      }

      const payload = {
        userID: userId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        deviceInfo,
        isAnonymous: !authService || !authService.isAuthenticated()
      };

      // Enviar ubicación al backend (UserLocation)
      this.http.post(`${environment.apiUrl}/api/location/update`, payload).subscribe({
        next: async (response: any) => {
          console.log('✅ [LOCATION] Ubicación actualizada en UserLocation');
          // 🔥 NUEVO: También actualizar ubicación en DeviceToken
          await this.updateTokenLocation(userId, location.latitude, location.longitude);
        },
        error: (error) => {
          console.error('❌ Error al actualizar ubicación en el backend:', error);
        }
      });
    } catch (error) {
      console.error('❌ Error obteniendo ubicación para actualizar backend:', error);
    }
  }

  /**
   * 🔥 NUEVO: Actualiza la ubicación en DeviceToken
   * Se llama automáticamente cuando se actualiza la ubicación en UserLocation
   */
  private async updateTokenLocation(userID: string, lat: number, lng: number): Promise<void> {
    try {
      // Obtener el token FCM desde localStorage directamente (más eficiente)
      // El token se guarda en 'fcm_token' por PushNotificationService
      let fcmToken: string | null = null;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          fcmToken = localStorage.getItem('fcm_token');
        }
      } catch (error) {
        console.warn('⚠️ [LOCATION] No se pudo acceder a localStorage:', error);
      }

      if (!fcmToken) {
        console.log('⚠️ [LOCATION] No hay token FCM para actualizar ubicación en DeviceToken');
        return;
      }

      console.log('🔄 [LOCATION] Actualizando ubicación en DeviceToken...');
      console.log(`   - userID: ${userID}`);
      console.log(`   - lat: ${lat}, lng: ${lng}`);

      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });

      const response = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/api/notifications/update-token-location`, {
          userID,
          token: fcmToken,
          lat,
          lng
        }, { headers })
      );

      if ((response as any).status === 'success') {
        console.log('✅ [LOCATION] Ubicación actualizada en DeviceToken');
      } else {
        console.warn('⚠️ [LOCATION] Respuesta del backend no exitosa al actualizar token:', response);
      }
    } catch (error: any) {
      // No es crítico si falla, solo loguear
      console.warn('⚠️ [LOCATION] Error actualizando ubicación en DeviceToken (no crítico):', error?.message || error);
    }
  }

  /**
   * Actualiza la ubicación del usuario manualmente
   */
  public async updateLocationNow(authService?: any): Promise<void> {
    return this.updateLocationToBackend(authService);
  }

  /**
   * Verifica si la actualización en segundo plano está activa
   */
  public isBackgroundUpdateActive(): boolean {
    return this.isBackgroundUpdateEnabled;
  }

  /**
   * Actualiza el userID cuando el usuario inicia sesión
   * 🔥 CRÍTICO: Sincronizar userID de ubicaciones con token FCM
   */
  public async updateUserIdOnLogin(authenticatedUserId: string, authService?: any): Promise<void> {
    try {
      
      // Actualizar el anonymousUserId local
      const oldUserId = this.anonymousUserId;
      this.anonymousUserId = authenticatedUserId;
      
      // Guardar en localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('anonymousUserId', authenticatedUserId);
      }
      
      // Actualizar ubicación inmediatamente con el nuevo userID
      await this.updateLocationToBackend(authService);
      
      
    } catch (error) {
      console.error('❌ [LOCATION] Error actualizando userID:', error);
    }
  }
}
