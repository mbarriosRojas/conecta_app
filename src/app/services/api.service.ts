import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Provider, Category, ProviderFilters, ApiResponse, PaginatedResponse, Product } from '../models/provider.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.apiUrl;
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {}

  private setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    this.setLoading(false);
    throw error;
  }

  // Providers endpoints
  getProviders(filters: ProviderFilters): Observable<Provider[]> {
    this.setLoading(true);
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof ProviderFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<ApiResponse<Provider[]>>(`${this.baseUrl}/api/provider/provider/filters/app`, { params })
      .pipe(
        map(response => {
          this.setLoading(false);
          return response.data || [];
        }),
        catchError(this.handleError.bind(this))
      );
  }

  getProviderById(id: string, lat?: number, lng?: number): Observable<Provider> {
    this.setLoading(true);
    let params = new HttpParams();
    if (lat) params = params.set('lat', lat.toString());
    if (lng) params = params.set('lng', lng.toString());

    return this.http.get<ApiResponse<Provider>>(`${this.baseUrl}/api/provider/provider/${id}`, { params })
      .pipe(
        map(response => {
          this.setLoading(false);
          return response.data;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  getHomeProviders(lat?: number, lng?: number, limit: number = 10): Observable<{featured_products: Provider[], recent: Provider[]}> {
    this.setLoading(true);
    let params = new HttpParams();
    if (lat) params = params.set('lat', lat.toString());
    if (lng) params = params.set('lng', lng.toString());
    if (limit) params = params.set('limit', limit.toString());

    return this.http.get<ApiResponse<{featured_products: Provider[], recent: Provider[]}>>(`${this.baseUrl}/api/provider/homeProviders`, { params })
      .pipe(
        map(response => {
          this.setLoading(false);
          return response.data;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  // Categories endpoints
  getCategories(): Observable<Category[]> {
    this.setLoading(true);
    return this.http.get<Category[]>(`${this.baseUrl}/api/category`)
      .pipe(
        map(categories => {
          this.setLoading(false);
          // El backend devuelve directamente el array de categorías
          return Array.isArray(categories) ? categories : [];
        }),
        catchError(this.handleError.bind(this))
      );
  }

  getCategoriesFavorite(): Observable<Category[]> {
    this.setLoading(true);
    return this.http.get<Category[]>(`${this.baseUrl}/api/category/favorite`)
      .pipe(
        map(categories => {
          this.setLoading(false);
          // El backend devuelve directamente el array de categorías
          return Array.isArray(categories) ? categories : [];
        }),
        catchError(this.handleError.bind(this))
      );
  }

  // Cities endpoints
  getCities(): Observable<string[]> {
    this.setLoading(true);
    return this.http.get<ApiResponse<string[]>>(`${this.baseUrl}/api/provider/cities`)
      .pipe(
        map(response => {
          this.setLoading(false);
          return response.data || [];
        }),
        catchError(this.handleError.bind(this))
      );
  }

  // Banners endpoints
  getBanners(): Observable<any[]> {
    this.setLoading(true);
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/api/banners`)
      .pipe(
        map(response => {
          this.setLoading(false);
          return response.data || [];
        }),
        catchError(this.handleError.bind(this))
      );
  }

  // Product endpoints
  getProductsByProvider(providerId: string, page: number = 1, limit: number = 50, filters?: any): Observable<any> {
    this.setLoading(true);
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters) {
      if (filters.category) params = params.set('category', filters.category);
      if (filters.featured) params = params.set('featured', filters.featured);
      if (filters.search) params = params.set('search', filters.search);
    }

    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/api/products/provider/${providerId}`, { params })
      .pipe(
        map(response => {
          this.setLoading(false);
          return response.data;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  getProductById(productId: string): Observable<Product> {
    this.setLoading(true);
    return this.http.get<ApiResponse<Product>>(`${this.baseUrl}/api/products/${productId}`)
      .pipe(
        map(response => {
          this.setLoading(false);
          return response.data;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  getProductCategories(providerId: string): Observable<string[]> {
    this.setLoading(true);
    return this.http.get<ApiResponse<string[]>>(`${this.baseUrl}/api/products/categories/${providerId}`)
      .pipe(
        map(response => {
          this.setLoading(false);
          return response.data || [];
        }),
        catchError(this.handleError.bind(this))
      );
  }

  getAvailableCategories(): Observable<any> {
    this.setLoading(true);
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/api/products/available-categories`)
      .pipe(
        map(response => {
          this.setLoading(false);
          return response.data || { categories: [], categoriesWithDisplay: [] };
        }),
        catchError(this.handleError.bind(this))
      );
  }

  // Provider views
  addView(providerId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/provider/addView/${providerId}`, {})
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  addMapView(providerId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/provider/addMapClick/${providerId}`, {})
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }
}