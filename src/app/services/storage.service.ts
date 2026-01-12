import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { BehaviorSubject, Observable } from 'rxjs';
import { ProviderFilters, Category } from '../models/provider.model';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private _storage: Storage | null = null;
  private filtersSubject = new BehaviorSubject<ProviderFilters>({});
  public filters$ = this.filtersSubject.asObservable();
  private initializationPromise: Promise<void> | null = null;

  constructor(private storage: Storage) {
    this.initializationPromise = this.init();
  }

  async init() {
    try {
      const storage = await this.storage.create();
      this._storage = storage;
      await this.loadFilters();
    } catch (error) {
      console.error('StorageService - Initialization error:', error);
    }
  }

  async ensureInitialized(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  // Filters management
  async saveFilters(filters: ProviderFilters): Promise<void> {
    if (this._storage) {
      await this._storage.set('provider_filters', filters);
      this.filtersSubject.next(filters);
    }
  }

  async loadFilters(): Promise<ProviderFilters> {
    if (this._storage) {
      const filters = await this._storage.get('provider_filters') || {};
      this.filtersSubject.next(filters);
      return filters;
    }
    return {};
  }

  async clearFilters(): Promise<void> {
    if (this._storage) {
      await this._storage.remove('provider_filters');
      this.filtersSubject.next({});
    }
  }

  // Categories cache
  async saveCategories(categories: Category[]): Promise<void> {
    if (this._storage) {
      await this._storage.set('categories', categories);
    }
  }

  async getCategories(): Promise<Category[]> {
    if (this._storage) {
      return await this._storage.get('categories') || [];
    }
    return [];
  }

  // Cities cache
  async saveCities(cities: string[]): Promise<void> {
    if (this._storage) {
      await this._storage.set('cities', cities);
    }
  }

  async getCities(): Promise<string[]> {
    if (this._storage) {
      return await this._storage.get('cities') || [];
    }
    return [];
  }

  // User preferences
  async saveUserPreference(key: string, value: any): Promise<void> {
    if (this._storage) {
      await this._storage.set(`user_${key}`, value);
    }
  }

  async getUserPreference(key: string): Promise<any> {
    if (this._storage) {
      return await this._storage.get(`user_${key}`);
    }
    return null;
  }

  // Cache management
  async clearCache(): Promise<void> {
    if (this._storage) {
      await this._storage.clear();
      this.filtersSubject.next({});
    }
  }

  async removeItem(key: string): Promise<void> {
    if (this._storage) {
      await this._storage.remove(key);
    }
  }

  // Generic storage methods for auth
  async set(key: string, value: any): Promise<void> {
    await this.ensureInitialized();
    if (this._storage) {
      await this._storage.set(key, value);
    }
  }

  async get(key: string): Promise<any> {
    await this.ensureInitialized();
    if (this._storage) {
      return await this._storage.get(key);
    }
    return null;
  }

  async remove(key: string): Promise<void> {
    await this.ensureInitialized();
    if (this._storage) {
      await this._storage.remove(key);
    }
  }

  // Get current filters
  getCurrentFilters(): ProviderFilters {
    return this.filtersSubject.value;
  }
}
