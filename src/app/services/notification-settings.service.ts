import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface NotificationSettings {
  userID: string;
  notificationsEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  promotionNotifications: boolean;
  geofenceNotifications: boolean;
  messageNotifications: boolean;
  orderNotifications: boolean;
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationSettingsService {
  private apiUrl = `${environment.apiUrl}/api/notifications`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Obtiene las preferencias de notificaciones del usuario
   */
  async getSettings(): Promise<NotificationSettings> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await firstValueFrom(
        this.http.get<{ status: string; data: NotificationSettings }>(`${this.apiUrl}/settings`, { headers })
      );
      return response.data;
    } catch (error) {
      console.error('Error getting notification settings:', error);
      throw error;
    }
  }

  /**
   * Actualiza las preferencias de notificaciones
   */
  async updateSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await firstValueFrom(
        this.http.put<{ status: string; data: NotificationSettings }>(
          `${this.apiUrl}/settings`,
          settings,
          { headers }
        )
      );
      return response.data;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  }

  /**
   * Activa/desactiva todas las notificaciones
   */
  async toggleNotifications(enabled: boolean): Promise<NotificationSettings> {
    return this.updateSettings({ notificationsEnabled: enabled, pushEnabled: enabled });
  }

  /**
   * Activa/desactiva notificaciones de promociones
   */
  async togglePromotionNotifications(enabled: boolean): Promise<NotificationSettings> {
    return this.updateSettings({ promotionNotifications: enabled });
  }

  /**
   * Activa/desactiva notificaciones de geocercas
   */
  async toggleGeofenceNotifications(enabled: boolean): Promise<NotificationSettings> {
    return this.updateSettings({ geofenceNotifications: enabled });
  }

  /**
   * Configura horas silenciosas
   */
  async setQuietHours(enabled: boolean, startTime: string, endTime: string): Promise<NotificationSettings> {
    return this.updateSettings({
      quietHours: {
        enabled,
        startTime,
        endTime
      }
    });
  }

  /**
   * Obtiene headers de autenticación
   */
  private async getAuthHeaders(): Promise<HttpHeaders> {
    const token = await this.authService.getToken();
    const headers: any = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return new HttpHeaders(headers);
  }
}

