import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { StorageService } from './storage.service';

export type PromotionViewSource = 'home' | 'nearby' | 'detail';

@Injectable({
  providedIn: 'root'
})
export class PromotionTrackingService {

  // Cache para evitar trackear múltiples veces la misma vista en poco tiempo
  private viewCache = new Map<string, number>();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

  constructor(
    private http: HttpClient,
    private storageService: StorageService
  ) {}

  /**
   * 🔥 Trackea cuando un usuario ve una promoción desde diferentes fuentes
   * @param businessID ID del negocio con la promoción
   * @param source Fuente desde donde se vio: 'home', 'nearby', 'detail'
   */
  public async trackPromotionView(
    businessID: string, 
    source: PromotionViewSource
  ): Promise<void> {
    try {
      // Verificar si ya se registró esta vista recientemente (evitar duplicados)
      const cacheKey = `${businessID}-${source}`;
      const lastTracked = this.viewCache.get(cacheKey);
      const now = Date.now();

      if (lastTracked && (now - lastTracked) < this.CACHE_DURATION) {
        console.log(`👁️ [TRACKING] Vista ya registrada recientemente: ${businessID} desde ${source}`);
        return;
      }

      // Obtener userID
      const userID = await this.getUserID();

      console.log(`👁️ [TRACKING] Registrando vista de promoción: ${businessID} desde ${source}`);

      // Enviar tracking al backend
      await this.http.post(
        `${environment.apiUrl}/api/geofencing/business/${businessID}/promotion/view`,
        { userID, source }
      ).toPromise();

      // Guardar en cache
      this.viewCache.set(cacheKey, now);

      console.log(`✅ [TRACKING] Vista registrada: ${businessID} desde ${source}`);

    } catch (error) {
      console.error('❌ [TRACKING] Error registrando vista de promoción:', error);
      // No lanzar error para no interrumpir la experiencia del usuario
    }
  }

  /**
   * Obtiene el ID de usuario (registrado o anónimo)
   */
  private async getUserID(): Promise<string> {
    // Intentar obtener de localStorage primero (usado por LocationService)
    if (typeof localStorage !== 'undefined') {
      const anonymousId = localStorage.getItem('anonymousUserId');
      if (anonymousId) {
        return anonymousId;
      }
    }

    // Si no existe, obtener de Ionic Storage
    let userId = await this.storageService.get('userID');
    
    if (!userId) {
      // Generar nuevo ID si no existe
      userId = this.generateUniqueId();
      await this.storageService.set('userID', userId);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('anonymousUserId', userId);
      }
    }

    return userId;
  }

  /**
   * Genera un ID único para usuarios anónimos
   */
  private generateUniqueId(): string {
    return 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Limpia el cache de vistas (útil para testing)
   */
  public clearViewCache(): void {
    this.viewCache.clear();
  }
}

