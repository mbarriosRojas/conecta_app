import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, timeout } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Provider, Category, ProviderFilters, ApiResponse, PaginatedResponse, Product } from '../models/provider.model';
import { LocationService } from './location.service';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.apiUrl;
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(
    private http: HttpClient,
    private locationService: LocationService,
    private storageService: StorageService
  ) {}

  private setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    this.setLoading(false);
    throw error;
  }

  // Método para crear headers con token de autenticación
  private async getAuthHeaders(): Promise<HttpHeaders> {
    try {
      const token = await this.storageService.get('auth_token');
      console.log('ApiService - getAuthHeaders: token length:', token ? token.length : 0);
      
      if (token) {
        return new HttpHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        });
      }
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    } catch (error) {
      console.error('ApiService - getAuthHeaders: error getting token:', error);
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }
  }

  // Método para agregar coordenadas a los parámetros HTTP (sin radio por defecto)
  private addLocationToParams(params: HttpParams, radius?: number): HttpParams {
    const locationParams = this.locationService.getLocationQueryParams();
    
    if (locationParams.lat && locationParams.lng) {
      params = params.set('lat', locationParams.lat.toString());
      params = params.set('lng', locationParams.lng.toString());
      
      // Solo agregar radio si se especifica explícitamente
      if (radius && radius > 0) {
        params = params.set('radius', radius.toString());
      }
    }
    
    return params;
  }

  // Método para agregar coordenadas a query string
  private addLocationToQueryString(url: string, radius?: number): string {
    const locationQuery = this.locationService.getLocationQueryString(radius);
    
    if (locationQuery) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}${locationQuery}`;
    }
    
    return url;
  }

  // Providers endpoints
  getProviders(filters: ProviderFilters, radius?: number): Observable<PaginatedResponse<Provider>> {
    this.setLoading(true);
    let params = new HttpParams();
    
    // Filtrar y agregar parámetros básicos (excluyendo radius, lat, lng)
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof ProviderFilters];
      if (value !== undefined && value !== null && value !== '' && 
          !['radius', 'lat', 'lng'].includes(key)) {
        params = params.set(key, value.toString());
      }
    });

    // Agregar coordenadas automáticamente (sin radio por defecto)
    params = this.addLocationToParams(params);

    // Solo agregar radio si se especifica explícitamente
    if (radius && radius > 0) {
      params = params.set('radius', radius.toString());
    }

    return this.http.get<PaginatedResponse<Provider>>(`${this.baseUrl}/api/provider/provider/filters/app`, { params })
      .pipe(
        map(response => {
          this.setLoading(false);
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  getProviderById(id: string, lat?: number, lng?: number): Observable<Provider> {
    this.setLoading(true);
    let params = new HttpParams();
    
    // Si se proporcionan coordenadas específicas, usarlas; sino, usar las del servicio
    if (lat && lng) {
      params = params.set('lat', lat.toString());
      params = params.set('lng', lng.toString());
    } else {
      params = this.addLocationToParams(params);
    }

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
    
    // Si se proporcionan coordenadas específicas, usarlas; sino, usar las del servicio
    if (lat && lng) {
      params = params.set('lat', lat.toString());
      params = params.set('lng', lng.toString());
    } else {
      params = this.addLocationToParams(params);
    }
    
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
    console.log('ApiService - getCategories called, URL:', `${this.baseUrl}/api/category`);
    return this.http.get<Category[]>(`${this.baseUrl}/api/category`)
      .pipe(
        map(categories => {
          console.log('ApiService - getCategories success, received:', categories);
          this.setLoading(false);
          // El backend devuelve directamente el array de categorías
          return Array.isArray(categories) ? categories : [];
        }),
        catchError(error => {
          console.error('ApiService - getCategories error:', error);
          this.setLoading(false);
          return this.handleError(error);
        })
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

  // User Providers CRUD endpoints - Método simplificado (el interceptor maneja el token)
  async getUserProviders(): Promise<ApiResponse<Provider[]>> {
    console.log('ApiService - getUserProviders: starting...');
    this.setLoading(true);
    
    try {
      const url = `${this.baseUrl}/api/provider/user/my-providers`;
      console.log('ApiService - getUserProviders: making HTTP request to:', url);
      
      // El interceptor se encarga de agregar el token automáticamente
      const response = await firstValueFrom(
        this.http.get<ApiResponse<Provider[]>>(url).pipe(
          timeout(10000), // 10 segundos de timeout
          catchError(error => {
            console.error('ApiService - getUserProviders: HTTP error:', error);
            throw error;
          })
        )
      );
      
      console.log('ApiService - getUserProviders: response received successfully', response);
      this.setLoading(false);
      return response;
    } catch (error) {
      console.error('ApiService - getUserProviders: error occurred', error);
      this.setLoading(false);
      throw error;
    }
  }

  getUserProviderById(id: string): Observable<ApiResponse<Provider>> {
    this.setLoading(true);
    return this.http.get<ApiResponse<Provider>>(`${this.baseUrl}/api/provider/user/${id}`)
      .pipe(
        map(response => {
          this.setLoading(false);
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  createProvider(formData: FormData): Observable<ApiResponse<Provider>> {
    this.setLoading(true);
    return this.http.post<ApiResponse<Provider>>(`${this.baseUrl}/api/provider`, formData)
      .pipe(
        map(response => {
          this.setLoading(false);
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  updateUserProvider(id: string, formData: FormData): Observable<ApiResponse<Provider>> {
    this.setLoading(true);
    return this.http.put<ApiResponse<Provider>>(`${this.baseUrl}/api/provider/user/${id}`, formData)
      .pipe(
        map(response => {
          this.setLoading(false);
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  deleteUserProvider(id: string): Observable<ApiResponse<null>> {
    this.setLoading(true);
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/api/provider/user/${id}`)
      .pipe(
        map(response => {
          this.setLoading(false);
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  // Métodos para gestión de usuario
  getUserProfile(): Observable<ApiResponse<any>> {
    this.setLoading(true);
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/api/users/`)
      .pipe(
        map(response => {
          this.setLoading(false);
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  updateUserProfile(userData: any): Observable<ApiResponse<any>> {
    this.setLoading(true);
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/api/users/updateUser`, userData)
      .pipe(
        map(response => {
          this.setLoading(false);
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  updateUserProfileWithImage(userData: FormData): Observable<ApiResponse<any>> {
    this.setLoading(true);
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/api/users/updateUser`, userData)
      .pipe(
        map(response => {
          this.setLoading(false);
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  // ===== PRODUCTOS ENDPOINTS =====
  
  // Obtener productos de un proveedor específico
  getProductsByProvider(providerId: string): Observable<ApiResponse<any[]>> {
    this.setLoading(true);
    console.log(`${this.baseUrl}/api/product/provider/${providerId}`);
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/api/product/provider/${providerId}`)
      .pipe(
        map(response => {
          console.log('ApiService - getProductsByProvider: response:', response);
          this.setLoading(false);
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  // Obtener un producto por ID
  getProductById(productId: string): Observable<ApiResponse<any>> {
    this.setLoading(true);
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/api/product/${productId}`)
      .pipe(
        map(response => {
          this.setLoading(false);
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  // Crear un nuevo producto
  createProduct(productData: FormData): Observable<ApiResponse<any>> {
    this.setLoading(true);
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/api/product`, productData)
      .pipe(
        map(response => {
          this.setLoading(false);
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  // Actualizar un producto existente
  updateProduct(productId: string, productData: FormData): Observable<ApiResponse<any>> {
    this.setLoading(true);
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/api/product/${productId}`, productData)
      .pipe(
        map(response => {
          this.setLoading(false);
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  // Eliminar un producto
  deleteProduct(productId: string): Observable<ApiResponse<any>> {
    this.setLoading(true);
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/api/product/${productId}`)
      .pipe(
        map(response => {
          this.setLoading(false);
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  // Obtener categorías disponibles para productos
  getProductCategories(providerId: string): Observable<ApiResponse<any[]>> {
    this.setLoading(true);
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/api/product/categories/${providerId}`)
      .pipe(
        map(response => {
          this.setLoading(false);
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  // Obtener todas las categorías disponibles para productos
  getAvailableProductCategories(): Observable<ApiResponse<string[]>> {
    this.setLoading(true);
    return this.http.get<ApiResponse<string[]>>(`${this.baseUrl}/api/product/available-categories`)
      .pipe(
        map(response => {
          this.setLoading(false);
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  // 🚀 NUEVO: Método para obtener promociones/cupones por proveedor
  getPromotionsByProvider(providerId: string): Observable<any> {
    // 🔥 Usar el endpoint correcto de geofencing/businesspromotions
    return this.http.get(`${this.baseUrl}/api/geofencing/business/${providerId}/promotion`)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }
}