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
  status: 'active' | 'expired' | 'cancelled' | 'pending' | 'verifying';
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
      const url = `${this.apiUrl}/plans`;
      console.log('📡 SubscriptionService - getPlans URL:', url);
      
      const response = await firstValueFrom(
        this.http.get<{ status: string; data: Plan[] }>(url)
      );
      
      console.log('📡 SubscriptionService - getPlans response:', response);
      console.log('📡 SubscriptionService - response.status:', response.status);
      console.log('📡 SubscriptionService - response.data:', response.data);
      console.log('📡 SubscriptionService - response.data type:', typeof response.data);
      console.log('📡 SubscriptionService - response.data is array?:', Array.isArray(response.data));
      
      // Asegurar que devolvemos un array
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      } else {
        console.warn('⚠️ SubscriptionService - response.data no es un array válido:', response.data);
        return [];
      }
    } catch (error: any) {
      console.error('❌ SubscriptionService - Error getting plans:', error);
      console.error('❌ SubscriptionService - Error status:', error.status);
      console.error('❌ SubscriptionService - Error message:', error.message);
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
    paymentMethodCode?: string
  ): Promise<{ subscription: UserSubscription; purchase: SubscriptionPurchase; paymentData?: { bank: string; phoneNumber: string; identificationNumber: string } }> {
    try {
      const headers = await this.getAuthHeaders();
      const requestBody: any = { planCode };
      
      if (paymentMethodCode) {
        requestBody.paymentMethodCode = paymentMethodCode;
      }
      
      const response = await firstValueFrom(
        this.http.post<{ status: string; data: { subscription: UserSubscription; purchase: SubscriptionPurchase; paymentData?: { bank: string; phoneNumber: string; identificationNumber: string } }; message: string }>(
          `${this.apiUrl}/purchase`,
          requestBody,
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
   * Obtiene los métodos de pago disponibles según el país del usuario
   */
  async getPaymentMethods(): Promise<{ country: string; paymentMethods: any[] }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await firstValueFrom(
        this.http.get<{ status: string; data: { country: string; paymentMethods: any[] } }>(
          `${this.apiUrl}/payment-methods`,
          { headers }
        )
      );
      return response.data;
    } catch (error) {
      console.error('Error getting payment methods:', error);
      throw error;
    }
  }

  /**
   * Obtiene los datos de pago para un método específico
   */
  async getPaymentAccount(paymentMethodCode: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await firstValueFrom(
        this.http.get<{ status: string; data: any }>(
          `${this.apiUrl}/payment-accounts/${paymentMethodCode}`,
          { headers }
        )
      );
      return response.data;
    } catch (error) {
      console.error('Error getting payment account:', error);
      throw error;
    }
  }

  /**
   * Reporta un pago para una suscripción pendiente
   */
  async reportPayment(
    identificationNumber?: string,
    bank?: string,
    lastSixDigits?: string,
    paymentProof?: string,
    paymentDate?: string,
    reportedAmount?: number,
    reportedCurrency?: string,
    transactionNumber?: string,
    referenceNumber?: string
  ): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await firstValueFrom(
        this.http.post<{ status: string; data: any; message: string }>(
          `${this.apiUrl}/report-payment`,
          {
            // Campos nuevos (requeridos)
            paymentDate: paymentDate || new Date().toISOString(),
            reportedAmount: reportedAmount || 0,
            reportedCurrency: reportedCurrency || 'USD',
            paymentProof: paymentProof || undefined,
            // Campos específicos según método
            identificationNumber: identificationNumber || undefined,
            bank: bank || undefined,
            lastSixDigits: lastSixDigits || undefined,
            transactionNumber: transactionNumber || undefined,
            referenceNumber: referenceNumber || undefined
          },
          { headers }
        )
      );
      return response.data;
    } catch (error) {
      console.error('Error reporting payment:', error);
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

