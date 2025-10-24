import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { Device } from '@capacitor/device';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, interval } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

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
  private backgroundUpdateInterval = 5 * 60 * 1000; // 5 minutos
  private backgroundUpdateSubscription: any = null;
  private anonymousUserId: string | null = null;
  private isBackgroundUpdateEnabled = false;

  constructor(private http: HttpClient) {
    this.initializeLocation();
    this.initializeAnonymousUser();
  }

  private async initializeLocation() {
    try {
      // Intentar obtener la ubicación al inicializar el servicio
      await this.getCurrentPosition();
    } catch (error) {
      console.log('No se pudo obtener la ubicación inicial:', error);
    }
  }

  async getCurrentPosition(): Promise<LocationData> {
    try {
      console.log('📍 LocationService: Obteniendo ubicación actual...');
      console.log('📍 LocationService: Window disponible:', typeof window !== 'undefined');
      console.log('📍 LocationService: Geolocation disponible:', typeof window !== 'undefined' && 'geolocation' in navigator);
      
      // En web, usar la API nativa del navegador
      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        console.log('📍 LocationService: Usando API web de geolocalización');
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location: LocationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp
              };
              console.log('📍 LocationService: Ubicación obtenida (web):', location);
              this.currentLocationSubject.next(location);
              resolve(location);
            },
            (error) => {
              console.error('❌ LocationService: Error obteniendo ubicación (web):', error);
              reject(new Error('No se pudo obtener la ubicación actual'));
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
          );
        });
      }

      // En dispositivos móviles, usar Capacitor
      console.log('📍 LocationService: Usando Capacitor Geolocation');
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      });

      const location: LocationData = {
        latitude: coordinates.coords.latitude,
        longitude: coordinates.coords.longitude,
        accuracy: coordinates.coords.accuracy,
        timestamp: coordinates.timestamp
      };

      console.log('📍 LocationService: Ubicación obtenida (Capacitor):', location);
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
   * Inicializa el ID de usuario anónimo usando el device ID o genera uno único
   */
  private async initializeAnonymousUser() {
    try {
      // Intentar obtener el ID del dispositivo
      const deviceInfo = await Device.getId();
      this.anonymousUserId = deviceInfo.identifier || this.generateUniqueId();
      console.log('📱 ID de usuario anónimo:', this.anonymousUserId);
      
      // Guardar en localStorage para persistencia
      if (typeof localStorage !== 'undefined' && this.anonymousUserId) {
        localStorage.setItem('anonymousUserId', this.anonymousUserId);
      }
    } catch (error) {
      console.warn('⚠️ No se pudo obtener device ID, generando ID único:', error);
      // Si falla, intentar recuperar del localStorage o generar uno nuevo
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
   * Genera un ID único para usuarios anónimos
   */
  private generateUniqueId(): string {
    return 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Obtiene el ID de usuario (registrado o anónimo)
   */
  public getUserId(authService?: any): string {
    // Si hay un usuario autenticado, usar su ID
    if (authService && authService.isAuthenticated()) {
      const user = authService.getCurrentUser();
      return user?.id || this.anonymousUserId || this.generateUniqueId();
    }
    // Si no hay usuario autenticado, usar el ID anónimo
    return this.anonymousUserId || this.generateUniqueId();
  }

  /**
   * Inicia la actualización automática de ubicación en segundo plano
   */
  public startBackgroundLocationUpdates(authService?: any) {
    if (this.isBackgroundUpdateEnabled) {
      console.log('🔄 Actualización en segundo plano ya está activa');
      return;
    }

    console.log('🚀 Iniciando actualización de ubicación en segundo plano...');
    this.isBackgroundUpdateEnabled = true;

    // Actualizar inmediatamente
    this.updateLocationToBackend(authService);

    // Configurar intervalo para actualizaciones periódicas
    this.backgroundUpdateSubscription = interval(this.backgroundUpdateInterval).subscribe(async () => {
      try {
        await this.updateLocationToBackend(authService);
      } catch (error) {
        console.error('❌ Error en actualización periódica de ubicación:', error);
      }
    });

    console.log('✅ Actualización en segundo plano iniciada (cada 5 minutos)');
  }

  /**
   * Detiene la actualización automática de ubicación
   */
  public stopBackgroundLocationUpdates() {
    if (this.backgroundUpdateSubscription) {
      this.backgroundUpdateSubscription.unsubscribe();
      this.backgroundUpdateSubscription = null;
      this.isBackgroundUpdateEnabled = false;
      console.log('🛑 Actualización en segundo plano detenida');
    }
  }

  /**
   * Actualiza la ubicación del usuario en el backend
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

      console.log('📍 Enviando ubicación al backend:', payload);

      // Enviar ubicación al backend
      this.http.post(`${environment.apiUrl}/api/location/update`, payload).subscribe({
        next: (response: any) => {
          console.log('✅ Ubicación actualizada en el backend:', response);
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
      console.log(`📍 [LOCATION] Actualizando userID: ${this.anonymousUserId} → ${authenticatedUserId}`);
      
      // Actualizar el anonymousUserId local
      const oldUserId = this.anonymousUserId;
      this.anonymousUserId = authenticatedUserId;
      
      // Guardar en localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('anonymousUserId', authenticatedUserId);
      }
      
      // Actualizar ubicación inmediatamente con el nuevo userID
      await this.updateLocationToBackend(authService);
      
      console.log(`✅ [LOCATION] UserID actualizado y ubicación sincronizada`);
      
    } catch (error) {
      console.error('❌ [LOCATION] Error actualizando userID:', error);
    }
  }
}
