import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';

/**
 * Servicio de caché robusto con estrategias de:
 * - Cache-First: Muestra datos inmediatamente del cache, actualiza en background
 * - Network-First: Intenta red primero, fallback a cache si falla
 * - Stale-While-Revalidate: Muestra cache mientras actualiza en background
 */
@Injectable({
  providedIn: 'root'
})
export class CacheService {
  
  private cachePrefix = 'cache_';
  private cacheTimestamps: Map<string, number> = new Map();
  
  // TTL por defecto: 5 minutos
  private defaultTTL = 5 * 60 * 1000;
  
  // 🔥 OPTIMIZADO: Configuraciones de TTL reducidas para datos dinámicos
  // Reducidos para que los cambios se reflejen inmediatamente
  private cacheTTLConfig = {
    'providers': 30 * 1000,          // 30 segundos para providers (datos muy dinámicos)
    'categories': 2 * 60 * 1000,     // 2 minutos para categorías (antes 10 minutos)
    'cities': 30 * 60 * 1000,        // 30 minutos para ciudades (casi estático, se mantiene)
    'banners': 5 * 60 * 1000,        // 5 minutos para banners (antes 10 minutos)
    'promotions': 30 * 1000,         // 30 segundos para promociones (datos muy dinámicos)
    'provider_detail': 1 * 60 * 1000, // 1 minuto para detalle de provider (antes 5 minutos)
    'user_services': 10 * 1000       // 10 segundos para servicios del usuario (muy dinámico)
  };

  constructor(private storageService: StorageService) {
    this.loadCacheTimestamps();
  }

  /**
   * Cargar timestamps del cache desde storage
   */
  private async loadCacheTimestamps() {
    try {
      const timestamps = await this.storageService.get('cache_timestamps');
      if (timestamps) {
        this.cacheTimestamps = new Map(JSON.parse(timestamps));
      }
    } catch (error) {
      console.error('Error loading cache timestamps:', error);
    }
  }

  /**
   * Guardar timestamps del cache
   */
  private async saveCacheTimestamps() {
    try {
      const timestampsArray = Array.from(this.cacheTimestamps.entries());
      await this.storageService.set('cache_timestamps', JSON.stringify(timestampsArray));
    } catch (error) {
      console.error('Error saving cache timestamps:', error);
    }
  }

  /**
   * Obtener TTL para un tipo de cache
   */
  private getTTL(cacheType: string): number {
    return this.cacheTTLConfig[cacheType as keyof typeof this.cacheTTLConfig] || this.defaultTTL;
  }

  /**
   * Verificar si el cache es válido (no expiró)
   */
  private isCacheValid(cacheKey: string, cacheType: string): boolean {
    const timestamp = this.cacheTimestamps.get(cacheKey);
    if (!timestamp) return false;
    
    const now = Date.now();
    const ttl = this.getTTL(cacheType);
    const age = now - timestamp;
    
    return age < ttl;
  }

  /**
   * Estrategia: Cache-First con actualización en background
   * Ideal para: categorías, ciudades, banners
   */
  async cacheFirst<T>(
    cacheKey: string,
    cacheType: string,
    fetchFn: () => Promise<T>,
    options?: { forceRefresh?: boolean }
  ): Promise<T> {
    const fullKey = `${this.cachePrefix}${cacheKey}`;
    
    try {
      // Si se fuerza refresh, ir directo a la red
      if (options?.forceRefresh) {
        console.log(`🔄 Cache-First [${cacheKey}]: Force refresh, fetching from network...`);
        const freshData = await fetchFn();
        await this.setCache(fullKey, cacheType, freshData);
        return freshData;
      }

      // Intentar obtener del cache primero
      const cachedData = await this.storageService.get(fullKey);
      
      if (cachedData && this.isCacheValid(fullKey, cacheType)) {
        console.log(`✅ Cache-First [${cacheKey}]: Valid cache found, returning immediately`);
        
        // Actualizar en background sin esperar
        this.updateCacheInBackground(fullKey, cacheType, fetchFn);
        
        return JSON.parse(cachedData);
      } else {
        console.log(`❌ Cache-First [${cacheKey}]: No valid cache, fetching from network...`);
        const freshData = await fetchFn();
        await this.setCache(fullKey, cacheType, freshData);
        return freshData;
      }
    } catch (error) {
      console.error(`❌ Cache-First [${cacheKey}]: Network error, trying cache fallback...`, error);
      
      // Si hay error de red, intentar usar cache aunque esté expirado
      const cachedData = await this.storageService.get(fullKey);
      if (cachedData) {
        console.log(`⚠️ Cache-First [${cacheKey}]: Using stale cache as fallback`);
        return JSON.parse(cachedData);
      }
      
      throw error;
    }
  }

  /**
   * Estrategia: Network-First con fallback a cache
   * Ideal para: providers, promotions
   */
  async networkFirst<T>(
    cacheKey: string,
    cacheType: string,
    fetchFn: () => Promise<T>,
    options?: { timeout?: number }
  ): Promise<T> {
    const fullKey = `${this.cachePrefix}${cacheKey}`;
    const timeout = options?.timeout || 5000; // 5 segundos por defecto
    
    try {
      // Intentar obtener de la red con timeout
      const networkPromise = fetchFn();
      const timeoutPromise = new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), timeout)
      );
      
      console.log(`🌐 Network-First [${cacheKey}]: Fetching from network...`);
      const freshData = await Promise.race([networkPromise, timeoutPromise]);
      
      // Guardar en cache
      await this.setCache(fullKey, cacheType, freshData);
      console.log(`✅ Network-First [${cacheKey}]: Fresh data obtained and cached`);
      
      return freshData;
      
    } catch (error) {
      console.error(`❌ Network-First [${cacheKey}]: Network failed, trying cache...`, error);
      
      // Si falla la red, usar cache
      const cachedData = await this.storageService.get(fullKey);
      if (cachedData) {
        console.log(`⚠️ Network-First [${cacheKey}]: Using cache as fallback`);
        return JSON.parse(cachedData);
      }
      
      throw error;
    }
  }

  /**
   * Estrategia: Stale-While-Revalidate
   * Retorna cache inmediatamente y actualiza en background
   * Ideal para: UX óptima cuando los datos no cambian frecuentemente
   */
  async staleWhileRevalidate<T>(
    cacheKey: string,
    cacheType: string,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const fullKey = `${this.cachePrefix}${cacheKey}`;
    
    try {
      // Obtener cache inmediatamente
      const cachedData = await this.storageService.get(fullKey);
      
      if (cachedData) {
        console.log(`⚡ Stale-While-Revalidate [${cacheKey}]: Returning cache, revalidating...`);
        
        // Actualizar en background
        this.updateCacheInBackground(fullKey, cacheType, fetchFn);
        
        return JSON.parse(cachedData);
      } else {
        // Si no hay cache, esperar a la red
        console.log(`🌐 Stale-While-Revalidate [${cacheKey}]: No cache, fetching from network...`);
        const freshData = await fetchFn();
        await this.setCache(fullKey, cacheType, freshData);
        return freshData;
      }
    } catch (error) {
      console.error(`❌ Stale-While-Revalidate [${cacheKey}]: Error`, error);
      throw error;
    }
  }

  /**
   * Actualizar cache en background (no bloqueante)
   */
  private async updateCacheInBackground<T>(
    fullKey: string,
    cacheType: string,
    fetchFn: () => Promise<T>
  ): Promise<void> {
    try {
      const freshData = await fetchFn();
      await this.setCache(fullKey, cacheType, freshData);
      console.log(`🔄 Background update completed for ${fullKey}`);
    } catch (error) {
      console.error(`❌ Background update failed for ${fullKey}:`, error);
      // No hacer nada, el usuario ya tiene los datos del cache
    }
  }

  /**
   * Guardar en cache con timestamp
   */
  private async setCache<T>(fullKey: string, cacheType: string, data: T): Promise<void> {
    try {
      await this.storageService.set(fullKey, JSON.stringify(data));
      this.cacheTimestamps.set(fullKey, Date.now());
      await this.saveCacheTimestamps();
      
      console.log(`💾 Cache saved: ${fullKey} (TTL: ${this.getTTL(cacheType) / 1000}s)`);
    } catch (error) {
      console.error(`Error setting cache for ${fullKey}:`, error);
    }
  }

  /**
   * Obtener datos del cache directamente (sin red)
   */
  async getCache<T>(cacheKey: string): Promise<T | null> {
    const fullKey = `${this.cachePrefix}${cacheKey}`;
    try {
      const cachedData = await this.storageService.get(fullKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      return null;
    } catch (error) {
      console.error(`Error getting cache for ${cacheKey}:`, error);
      return null;
    }
  }

  /**
   * Invalidar cache específico
   */
  async invalidateCache(cacheKey: string): Promise<void> {
    const fullKey = `${this.cachePrefix}${cacheKey}`;
    try {
      await this.storageService.remove(fullKey);
      this.cacheTimestamps.delete(fullKey);
      await this.saveCacheTimestamps();
      console.log(`🗑️ Cache invalidated: ${fullKey}`);
    } catch (error) {
      console.error(`Error invalidating cache for ${cacheKey}:`, error);
    }
  }

  /**
   * Invalidar todo el cache
   */
  async clearAllCache(): Promise<void> {
    try {
      // Obtener todas las keys que empiezan con el prefijo
      for (const [key] of this.cacheTimestamps.entries()) {
        await this.storageService.remove(key);
      }
      
      this.cacheTimestamps.clear();
      await this.storageService.remove('cache_timestamps');
      
      console.log('🗑️ All cache cleared');
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }

  /**
   * Invalidar cache por patrón (ej: todos los providers)
   */
  async invalidateCacheByPattern(pattern: string): Promise<void> {
    try {
      const keysToInvalidate: string[] = [];
      
      for (const [key] of this.cacheTimestamps.entries()) {
        if (key.includes(pattern)) {
          keysToInvalidate.push(key);
        }
      }
      
      for (const key of keysToInvalidate) {
        await this.storageService.remove(key);
        this.cacheTimestamps.delete(key);
      }
      
      await this.saveCacheTimestamps();
      console.log(`🗑️ Invalidated ${keysToInvalidate.length} cache entries matching "${pattern}"`);
    } catch (error) {
      console.error(`Error invalidating cache by pattern ${pattern}:`, error);
    }
  }

  /**
   * 🔥 Helper: Invalidar todos los caches relacionados con providers
   * Útil cuando se crea/actualiza/elimina un provider
   */
  async invalidateProviderCaches(): Promise<void> {
    await Promise.all([
      this.invalidateCacheByPattern('providers_page'),
      this.invalidateCacheByPattern('providers'),
      this.invalidateCache('user_services'),
      this.invalidateCacheByPattern('provider_detail')
    ]);
    console.log('🗑️ All provider-related caches invalidated');
  }

  /**
   * 🔥 Helper: Invalidar todos los caches relacionados con categories
   * Útil cuando se crea/actualiza/elimina una categoría
   */
  async invalidateCategoryCaches(): Promise<void> {
    await Promise.all([
      this.invalidateCache('categories'),
      // También invalidar providers porque pueden verse afectados
      this.invalidateCacheByPattern('providers_page')
    ]);
    console.log('🗑️ All category-related caches invalidated');
  }

  /**
   * 🔥 Helper: Invalidar todos los caches relacionados con promociones
   */
  async invalidatePromotionCaches(): Promise<void> {
    await Promise.all([
      this.invalidateCacheByPattern('promotions'),
      this.invalidateCacheByPattern('providers_page')
    ]);
    console.log('🗑️ All promotion-related caches invalidated');
  }

  /**
   * Precargar datos en cache de forma optimista
   */
  async precache<T>(cacheKey: string, cacheType: string, data: T): Promise<void> {
    const fullKey = `${this.cachePrefix}${cacheKey}`;
    await this.setCache(fullKey, cacheType, data);
    console.log(`📦 Precached: ${fullKey}`);
  }

  /**
   * Obtener información del cache (útil para debugging)
   */
  async getCacheInfo(): Promise<any> {
    const info: any = {
      totalEntries: this.cacheTimestamps.size,
      entries: []
    };
    
    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      const age = Date.now() - timestamp;
      const ageMinutes = Math.floor(age / 60000);
      
      info.entries.push({
        key,
        timestamp: new Date(timestamp).toISOString(),
        age: `${ageMinutes}m`,
        isValid: age < this.defaultTTL
      });
    }
    
    return info;
  }
}

