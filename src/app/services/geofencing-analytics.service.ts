import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GeofenceStats {
  geofence: {
    id: string;
    name: string;
    center: {
      latitude: number;
      longitude: number;
    };
    radius: number;
    isActive: boolean;
    stats: {
      totalEntries: number;
      totalExits: number;
      uniqueUsers: number;
      lastTriggered: Date;
    };
  };
  promotion: {
    id: string;
    text: string;
    radius: number;
    isActive: boolean;
  } | null;
  audience: {
    activeUsers4h: number;
    activeUsers24h: number;
    activeUsers7d: number;
    estimatedReach: number;
    hourlyDistribution: Array<{
      _id: number;
      count: number;
    }>;
  };
  performance: {
    totalEntries: number;
    totalExits: number;
    lastTriggered: Date;
    avgUsersPerDay: number;
  };
}

export interface GeofenceConfig {
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

export interface PromotionConfig {
  businessName: string;
  promotion_text: string;
  location: {
    latitude: number;
    longitude: number;
  };
  promo_radius_meters: number;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeofencingAnalyticsService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene las estadísticas de geofencing para un negocio
   */
  getBusinessStats(businessID: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/geofencing/business/${businessID}/stats`);
  }

  /**
   * Obtiene la configuración de geocerca de un negocio
   */
  getBusinessGeofence(businessID: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/geofencing/business/${businessID}/geofence`);
  }

  /**
   * Crea o actualiza la geocerca de un negocio
   */
  createOrUpdateGeofence(businessID: string, config: GeofenceConfig): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    return this.http.post(
      `${this.baseUrl}/api/geofencing/business/${businessID}/geofence`,
      config,
      { headers }
    );
  }

  /**
   * Elimina la geocerca de un negocio
   */
  deleteGeofence(businessID: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/geofencing/business/${businessID}/geofence`);
  }

  /**
   * Obtiene la promoción de un negocio
   */
  getBusinessPromotion(businessID: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/geofencing/business/${businessID}/promotion`);
  }

  /**
   * Crea o actualiza la promoción de un negocio
   */
  createOrUpdatePromotion(businessID: string, config: PromotionConfig): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    return this.http.post(
      `${this.baseUrl}/api/geofencing/business/${businessID}/promotion`,
      {
        ...config,
        location: {
          latitude: config.location.latitude,
          longitude: config.location.longitude
        }
      },
      { headers }
    );
  }

  /**
   * Elimina la promoción de un negocio
   */
  deletePromotion(businessID: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/geofencing/business/${businessID}/promotion`);
  }

  /**
   * Calcula el alcance estimado de una promoción
   */
  getPromotionReach(businessID: string, radius: number, latitude?: number, longitude?: number): Observable<any> {
    const params: any = {
      businessID,
      radius: radius.toString()
    };
    
    // Incluir coordenadas si están disponibles para cálculo más preciso
    if (latitude !== undefined && longitude !== undefined) {
      params.latitude = latitude.toString();
      params.longitude = longitude.toString();
    }
    
    return this.http.get(`${this.baseUrl}/api/geofencing/audience`, { params });
  }

  /**
   * Obtiene promociones cercanas a una ubicación
   */
  getNearbyPromotions(
    latitude: number,
    longitude: number,
    radius: number = 2000,
    categoryId?: string,
    limit: number = 50
  ): Observable<any> {
    const params: any = {
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius: radius.toString(),
      limit: limit.toString()
    };

    if (categoryId) {
      params.categoryId = categoryId;
    }

    return this.http.get(`${this.baseUrl}/api/geofencing/promotions/nearby`, { params });
  }
}
