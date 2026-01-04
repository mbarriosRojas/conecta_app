import { Injectable } from '@angular/core';
import { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';
import { registerPlugin } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { StorageService } from './storage.service';
import { ToastController, AlertController } from '@ionic/angular';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

export interface GeofenceRegion {
  id: string;
  name: string;
  center: {
    latitude: number;
    longitude: number;
  };
  radius: number;
  description?: string;
  notificationSettings?: {
    onEntry: boolean;
    onExit: boolean;
    cooldownMinutes: number;
  };
}

export interface GeofenceEvent {
  userID: string;
  businessID: string;
  eventType: 'ENTRY' | 'EXIT';
  coordinates: {
    latitude: number;
    longitude: number;
  };
  deviceInfo?: {
    platform: string;
    version: string;
    model: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class GeofencingService {
  private isInitialized = false;
  private isMonitoring = false;
  private currentRegions: GeofenceRegion[] = [];
  private lastKnownLocation: { latitude: number; longitude: number } | null = null;
  private watcherId: string | null = null;

  constructor(
    private http: HttpClient,
    private storageService: StorageService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  /**
   * Inicializa el servicio de geofencing
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔧 Inicializando servicio de geofencing...');
      
      if (this.isInitialized) {
        console.log('✅ Servicio ya inicializado');
        return true;
      }

      // Verificar si el usuario quiere usar geofencing
      const geofencingEnabled = await this.storageService.get('geofencing_enabled');
      
      if (geofencingEnabled === 'true') {
        await this.startGeofencing();
      }

      this.isInitialized = true;
      console.log('✅ Servicio de geofencing inicializado');
      return true;

    } catch (error) {
      console.error('Error inicializando servicio de geofencing:', error);
      return false;
    }
  }

  /**
   * Verifica si el usuario tiene permisos de ubicación
   */
  async checkLocationPermission(): Promise<boolean> {
    try {
      const permissions = await Geolocation.checkPermissions();
      return permissions.location === 'granted';
    } catch (error) {
      console.error('Error verificando permisos:', error);
      return false;
    }
  }

  /**
   * Solicita permisos de ubicación
   */
  async requestLocationPermission(): Promise<boolean> {
    try {
      const permissions = await Geolocation.requestPermissions();
      return permissions.location === 'granted';
    } catch (error) {
      console.error('Error solicitando permisos:', error);
      return false;
    }
  }

  /**
   * Inicia el monitoreo de geofencing
   */
  async startGeofencing(): Promise<boolean> {
    try {
      console.log('🚀 Iniciando geofencing...');

      // Verificar permisos
      const hasPermission = await this.checkLocationPermission();
      if (!hasPermission) {
        const granted = await this.requestLocationPermission();
        if (!granted) {
          console.log('❌ Permisos de ubicación no concedidos');
          return false;
        }
      }

      // Cargar geocercas del servidor
      await this.loadGeofences();

      // ⚠️ NOTA: Background tracking desactivado para evitar errores en iOS
      // El geofencing funcionará solo cuando la app está abierta/minimizada
      console.log('⚠️ [GEOFENCING] Background tracking desactivado - geofencing funcionará solo en foreground');
      console.log('ℹ️ [GEOFENCING] Para activar background tracking necesitas permisos "Always" y modificar este código');
      return false;

      /* Código original comentado - desactivado para evitar errores en iOS
      const permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted') {
        const newPermissions = await Geolocation.requestPermissions();
        if (newPermissions.location !== 'granted') {
          console.log('❌ Permisos de ubicación no concedidos para geofencing');
          return false;
        }
      }

      const watcherId = await BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: 'Recibiendo ofertas de negocios cercanos',
          backgroundTitle: 'Geomarketing Activo',
          requestPermissions: false
        },
        (location: any, error?: any) => {
          if (error) {
            console.error('Error en geolocalización:', error);
            return;
          }
          
          if (location) {
            this.handleLocationUpdate(location);
          }
        }
      );

      this.watcherId = watcherId;
      this.isMonitoring = true;
      await this.storageService.set('geofencing_enabled', 'true');
      
      console.log('✅ Geofencing iniciado correctamente');
      return true;
      */

    } catch (error) {
      console.error('Error iniciando geofencing:', error);
      return false;
    }
  }

  /**
   * Detiene el monitoreo de geofencing
   */
  async stopGeofencing(): Promise<boolean> {
    try {
      console.log('⏹️ Deteniendo geofencing...');

      if (this.watcherId) {
        await BackgroundGeolocation.removeWatcher({ id: this.watcherId });
        this.watcherId = null;
      }

      this.isMonitoring = false;
      await this.storageService.set('geofencing_enabled', 'false');
      
      console.log('✅ Geofencing detenido correctamente');
      return true;

    } catch (error) {
      console.error('Error deteniendo geofencing:', error);
      return false;
    }
  }

  /**
   * Carga las geocercas del servidor
   */
  private async loadGeofences(): Promise<void> {
    try {
      console.log('📡 Cargando geocercas del servidor...');
      
      if (!this.lastKnownLocation) {
        const location = await Geolocation.getCurrentPosition();
        this.lastKnownLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        };
      }

      const response = await this.http.get<any>(`${environment.apiUrl}/api/geofencing/geofences`, {
        params: {
          lat: this.lastKnownLocation.latitude.toString(),
          lng: this.lastKnownLocation.longitude.toString(),
          radius: '50000' // 50km
        }
      }).toPromise();

      if (response && response.data) {
        this.currentRegions = response.data.map((geofence: any) => ({
          id: geofence.id,
          name: geofence.name,
          center: geofence.center,
          radius: geofence.radius,
          description: geofence.description,
          notificationSettings: geofence.notificationSettings
        }));

        console.log(`✅ ${this.currentRegions.length} geocercas cargadas`);
      }

    } catch (error) {
      console.error('Error cargando geocercas:', error);
    }
  }

  /**
   * Maneja las actualizaciones de ubicación
   */
  private async handleLocationUpdate(location: any): Promise<void> {
    try {
      console.log('📍 Nueva ubicación:', location);

      const newLocation = {
        latitude: location.latitude,
        longitude: location.longitude
      };

      // Verificar si el usuario entró o salió de alguna geocerca
      for (const region of this.currentRegions) {
        const distance = this.calculateDistance(
          newLocation,
          region.center
        );

        const wasInside = this.lastKnownLocation ? 
          this.calculateDistance(this.lastKnownLocation, region.center) <= region.radius : false;
        const isInside = distance <= region.radius;

        if (!wasInside && isInside) {
          // Usuario entró a la geocerca
          await this.sendGeofenceEvent({
            userID: await this.getUserId(),
            businessID: region.id,
            eventType: 'ENTRY',
            coordinates: newLocation
          });
        } else if (wasInside && !isInside) {
          // Usuario salió de la geocerca
          await this.sendGeofenceEvent({
            userID: await this.getUserId(),
            businessID: region.id,
            eventType: 'EXIT',
            coordinates: newLocation
          });
        }
      }

      this.lastKnownLocation = newLocation;
      
      // Actualizar ubicación en el token FCM si hay un cambio significativo
      await this.updateTokenLocation(newLocation);

    } catch (error) {
      console.error('Error manejando actualización de ubicación:', error);
    }
  }

  /**
   * Actualiza la ubicación en el token FCM
   */
  private async updateTokenLocation(location: { latitude: number; longitude: number }): Promise<void> {
    try {
      const fcmToken = await this.storageService.get('fcm_token');
      if (!fcmToken) {
        console.log('⚠️ No hay token FCM para actualizar ubicación');
        return;
      }

      const userID = await this.getUserId();
      if (!userID) {
        console.log('⚠️ No hay userID para actualizar ubicación');
        return;
      }

      console.log('🔄 Actualizando ubicación en token FCM...');

      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });

      await this.http.post(`${environment.apiUrl}/api/notifications/update-token-location`, {
        userID,
        token: fcmToken,
        lat: location.latitude,
        lng: location.longitude
      }, { headers }).toPromise();

      console.log('✅ Ubicación actualizada en token FCM');

    } catch (error) {
      console.error('❌ Error actualizando ubicación en token FCM:', error);
    }
  }

  /**
   * Envía un evento de geofencing al servidor
   */
  private async sendGeofenceEvent(event: GeofenceEvent): Promise<void> {
    try {
      console.log('📤 Enviando evento de geofencing:', event);

      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });

      await this.http.post(`${environment.apiUrl}/api/geofencing/trigger`, event, { headers }).toPromise();
      
      console.log('✅ Evento de geofencing enviado correctamente');

    } catch (error) {
      console.error('Error enviando evento de geofencing:', error);
    }
  }

  /**
   * Calcula la distancia entre dos puntos geográficos
   */
  private calculateDistance(point1: { latitude: number; longitude: number }, point2: { latitude: number; longitude: number }): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = point1.latitude * Math.PI / 180;
    const φ2 = point2.latitude * Math.PI / 180;
    const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180;
    const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Obtiene el ID del usuario
   */
  private async getUserId(): Promise<string> {
    let userId = await this.storageService.get('userID');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9);
      await this.storageService.set('userID', userId);
    }
    return userId;
  }

  /**
   * Verifica si el geofencing está activo
   */
  isGeofencingActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Obtiene las geocercas actuales
   */
  getCurrentRegions(): GeofenceRegion[] {
    return this.currentRegions;
  }

  /**
   * Sincroniza las geocercas con el servidor
   */
  async syncGeofences(): Promise<void> {
    await this.loadGeofences();
  }
}