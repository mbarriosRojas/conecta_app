import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Plan {
  _id: string;
  name: string;
  code: string;
  description: string;
  price: number;
  currency: string;
  limits: {
    services: number;
    promotionsPerService: number;
    productsPerService: number;
  };
  features: {
    analytics: boolean;
    customDomain: boolean;
    prioritySupport: boolean;
    apiAccess: boolean;
  };
  isActive: boolean;
  isDefault: boolean;
  displayOrder: number;
}

export interface CurrentLimits {
  services: {
    limit: number;
    used: number;
    remaining: number;
  };
  promotionsPerService: {
    limit: number;
    used: { [key: string]: number };
  };
  productsPerService: {
    limit: number;
    used: { [key: string]: number };
  };
}

export interface UserSubscription {
  _id: string;
  userID: string;
  planID: Plan;
  planCode: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  startDate: Date;
  endDate: Date;
  cancelledAt?: Date;
  currentLimits: CurrentLimits;
  autoRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionPurchase {
  _id: string;
  userID: string;
  planID: Plan;
  planCode: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  transactionId?: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private apiUrl = `${environment.apiUrl}/api/subscriptions`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Obtiene todos los planes disponibles
   */
  async getPlans(): Promise<Plan[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ status: string; data: Plan[] }>(`${this.apiUrl}/plans`)
      );
      return response.data;
    } catch (error) {
      console.error('Error getting plans:', error);
      throw error;
    }
  }

  /**
   * Obtiene la suscripción actual del usuario
   */
  async getCurrentSubscription(): Promise<UserSubscription> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await firstValueFrom(
        this.http.get<{ status: string; data: UserSubscription }>(`${this.apiUrl}/current`, { headers })
      );
      return response.data;
    } catch (error) {
      console.error('Error getting current subscription:', error);
      throw error;
    }
  }

  /**
   * Compra un plan
   */
  async purchasePlan(
    planCode: string,
    paymentMethod: string = 'unknown',
    transactionId?: string
  ): Promise<{ subscription: UserSubscription; purchase: SubscriptionPurchase }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await firstValueFrom(
        this.http.post<{ status: string; data: { subscription: UserSubscription; purchase: SubscriptionPurchase } }>(
          `${this.apiUrl}/purchase`,
          { planCode, paymentMethod, transactionId },
          { headers }
        )
      );
      return response.data;
    } catch (error) {
      console.error('Error purchasing plan:', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de compras
   */
  async getPurchaseHistory(): Promise<SubscriptionPurchase[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await firstValueFrom(
        this.http.get<{ status: string; data: SubscriptionPurchase[] }>(`${this.apiUrl}/purchases`, { headers })
      );
      return response.data;
    } catch (error) {
      console.error('Error getting purchase history:', error);
      throw error;
    }
  }

  /**
   * Obtiene el límite usado para un recurso específico
   */
  getUsedLimit(subscription: UserSubscription, resourceType: 'services' | 'promotions' | 'products', serviceID?: string): number {
    switch (resourceType) {
      case 'services':
        return subscription.currentLimits.services.used;
      case 'promotions':
        if (!serviceID) return 0;
        return subscription.currentLimits.promotionsPerService.used[serviceID] || 0;
      case 'products':
        if (!serviceID) return 0;
        return subscription.currentLimits.productsPerService.used[serviceID] || 0;
      default:
        return 0;
    }
  }

  /**
   * Obtiene el límite total para un recurso específico
   */
  getLimit(subscription: UserSubscription, resourceType: 'services' | 'promotions' | 'products'): number {
    switch (resourceType) {
      case 'services':
        return subscription.currentLimits.services.limit;
      case 'promotions':
        return subscription.currentLimits.promotionsPerService.limit;
      case 'products':
        return subscription.currentLimits.productsPerService.limit;
      default:
        return 0;
    }
  }

  /**
   * Obtiene el límite restante para un recurso específico
   */
  getRemainingLimit(subscription: UserSubscription, resourceType: 'services' | 'promotions' | 'products', serviceID?: string): number {
    const limit = this.getLimit(subscription, resourceType);
    if (limit === -1) return -1; // Ilimitado
    
    const used = this.getUsedLimit(subscription, resourceType, serviceID);
    return Math.max(0, limit - used);
  }

  /**
   * Verifica si hay límite disponible
   */
  hasLimitAvailable(subscription: UserSubscription, resourceType: 'services' | 'promotions' | 'products', serviceID?: string): boolean {
    const remaining = this.getRemainingLimit(subscription, resourceType, serviceID);
    return remaining === -1 || remaining > 0;
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

