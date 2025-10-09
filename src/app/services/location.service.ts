import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

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

  constructor() {
    this.initializeLocation();
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
              console.error('Error getting location:', error);
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
        maximumAge: 300000 // 5 minutes
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
      console.error('Error getting location:', error);
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
}
