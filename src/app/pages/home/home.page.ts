import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { IonContent, IonInfiniteScroll, IonRefresher, LoadingController, ToastController, AlertController, IonicModule } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { LocationService, LocationData } from '../../services/location.service';
import { StorageService } from '../../services/storage.service';
import { GeocodingService, LocationSuggestion } from '../../services/geocoding.service';
import { PermissionService } from '../../services/permission.service';
import { GeofencingService } from '../../services/geofencing.service';
import { GeofencingAnalyticsService } from '../../services/geofencing-analytics.service';
import { Provider, ProviderFilters, Category } from '../../models/provider.model';
import { environment } from '../../../environments/environment';
import { NoResultsExpandComponent } from '../../components/no-results-expand/no-results-expand.component';
import Swiper from 'swiper';
import { SwiperOptions } from 'swiper/types';

// Interface para items del feed (proveedores o promociones)
interface FeedItem {
  type: 'provider' | 'promotion';
  data: any;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, NoResultsExpandComponent]
})
export class HomePage implements OnInit, AfterViewInit {
  @ViewChild(IonContent) content!: IonContent;
  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;
  @ViewChild('bannersSlider', { static: false }) bannersSlider!: ElementRef;

  providers: Provider[] = [];
  featuredProviders: Provider[] = [];
  recentProviders: Provider[] = [];
  categories: Category[] = [];
  cities: string[] = [];
  banners: any[] = [];
  currentBannerIndex: number = 0;
  
  // Feed mixto con proveedores y promociones
  feedItems: FeedItem[] = [];
  nearbyPromotions: any[] = [];
  
  currentLocation: LocationData | null = null;
  filters: ProviderFilters = {
    limit: environment.itemsPerPage
  };
  
  // Radio de búsqueda actual (sin radio por defecto)
  currentRadius: number = environment.defaultRadius;
  
  isLoading = false;
  isLoadingMore = false;
  hasMoreData = true;
  currentPage = 1; // Empezar en página 1 (backend usa páginas 1-based)
  searchQuery = '';
  selectedCategory: Category | null = null;
  selectedCity = '';
  
  // Estados para manejo de resultados
  showNoResults = false;
  isExpandingRadius = false;
  selectedRadius = environment.defaultRadius;
  
  // Filtros temporales (en el modal, no aplicados aún)
  tempSelectedCategory: Category | null = null;
  tempSelectedCity = '';
  tempSelectedRadius = environment.defaultRadius;
  tempSelectedLocation: LocationSuggestion | null = null;
  tempSelectedLocationName = '';
  
  showFilterModal = false;
  isRefreshing = false;
  
  // Location modal properties
  showLocationModal = false;
  locationSearchQuery = '';
  selectedLocationName = '';
  selectedLocation: LocationSuggestion | null = null;
  locationSuggestions: LocationSuggestion[] = [];
  

  // Configuración del swiper para banners
  bannersSwiperConfig: SwiperOptions = {
    slidesPerView: 1,
    spaceBetween: 0,
    autoplay: {
      delay: 3000,
      disableOnInteraction: false,
    },
    loop: true,
    effect: 'fade',
    fadeEffect: {
      crossFade: true
    },
    allowTouchMove: false, // Deshabilitar touch para el ícono pequeño
    on: {
      slideChange: () => {
        this.updateBannerBackground();
      }
    }
  };
  
  private bannersSwiper: Swiper | null = null;

  constructor(
    private apiService: ApiService,
    private locationService: LocationService,
    private storageService: StorageService,
    private geocodingService: GeocodingService,
    private permissionService: PermissionService,
    private geofencingService: GeofencingService,
    private geofencingAnalyticsService: GeofencingAnalyticsService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.initializeApp();
  }

  ngAfterViewInit() {
    // Inicializar Swiper después de que la vista esté lista
    setTimeout(() => {
      this.initializeSwiper();
    }, 500);
    
    // Configurar listener de scroll para debug
    setTimeout(() => {
      this.setupScrollListener();
    }, 1000);
  }

  // Configurar listener de scroll para debug
  async setupScrollListener() {
    if (this.content) {
      // Escuchar eventos de scroll para debug
      this.content.ionScroll.subscribe(async () => {
        if (this.hasMoreData && !this.isLoadingMore && !this.isLoading) {
          const shouldTrigger = await this.checkScrollPosition();
          if (shouldTrigger) {
            console.log('🔥 Home - Scroll position should trigger infinite scroll but it didnt!');
            console.log('🔥 Home - Manual trigger needed');
          }
        }
      });
    }
  }

  async initializeApp() {
    try {
      // Cargar datos desde storage
      await this.loadCachedData();
      
      // Verificar si ya tenemos ubicación guardada
      if (this.currentLocation) {
        this.filters.lat = this.currentLocation.latitude;
        this.filters.lng = this.currentLocation.longitude;
        console.log('Usando ubicación guardada:', this.currentLocation);
      } else {
        // Solicitar permisos de ubicación explícitamente
        console.log('Solicitando permisos de ubicación...');
        const hasPermission = await this.permissionService.checkAndRequestLocationPermission();
        if (hasPermission) {
          await this.getCurrentLocation();
        } else {
          console.log('Permisos de ubicación denegados, continuando sin ubicación');
        }
      }
      
      // Cargar datos iniciales
      await this.loadInitialData();
      
      // Inicializar geofencing (en segundo plano, no bloquea la UI)
      this.initializeGeofencing();
      
    } catch (error) {
      console.error('Error initializing app:', error);
      this.showErrorToast('Error al inicializar la aplicación');
    }
  }

  async loadCachedData() {
    try {
      this.categories = await this.storageService.getCategories();
      this.cities = await this.storageService.getCities();
      this.filters = await this.storageService.loadFilters();
      
      // Cargar ubicación guardada
      const savedLocation = await this.storageService.getUserPreference('currentLocation');
      if (savedLocation) {
        this.currentLocation = savedLocation;
      }
      
      if (this.filters.radius) {
        this.selectedRadius = this.filters.radius;
      }
      if (this.filters.city) {
        this.selectedCity = this.filters.city;
      }
      if (this.filters.search) {
        this.searchQuery = this.filters.search;
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  }

  async getCurrentLocation() {
    try {
      this.currentLocation = await this.locationService.getCurrentPosition();
      this.filters.lat = this.currentLocation.latitude;
      this.filters.lng = this.currentLocation.longitude;
      
      // Guardar la ubicación y filtros
      await this.storageService.saveUserPreference('currentLocation', this.currentLocation);
      await this.storageService.saveFilters(this.filters);
      
      console.log('Ubicación obtenida:', this.currentLocation);
    } catch (error) {
      console.error('Error getting location:', error);
      this.showErrorToast('No se pudo obtener la ubicación actual');
    }
  }

  /**
   * Inicializa el servicio de geofencing en segundo plano
   */
  private async initializeGeofencing(): Promise<void> {
    try {
      console.log('🔧 Inicializando geofencing en segundo plano...');
      
      // Verificar si el usuario quiere recibir notificaciones de geofencing
      const geofencingEnabled = await this.storageService.get('geofencing_enabled');
      
      if (geofencingEnabled === 'true') {
        const initialized = await this.geofencingService.initialize();
        if (initialized) {
          console.log('✅ Geofencing inicializado correctamente');
        } else {
          console.log('❌ Error inicializando geofencing');
        }
      } else {
        console.log('ℹ️ Geofencing deshabilitado por el usuario');
      }
      
    } catch (error) {
      console.error('Error inicializando geofencing:', error);
      // No mostrar error al usuario, es opcional
    }
  }

  async loadInitialData() {
    console.log('Home - loadInitialData started');
    
    const loading = await this.loadingController.create({
      message: 'Cargando proveedores...',
      spinner: 'crescent'
    });
    await loading.present();
    console.log('Home - Loading controller presented');

    // Timeout de seguridad para cerrar el loading después de 30 segundos
    const timeoutId = setTimeout(async () => {
      console.warn('Home - Loading timeout reached, dismissing loading');
      try {
        await loading.dismiss();
      } catch (e) {
        console.error('Error dismissing loading on timeout:', e);
      }
    }, 30000);

    try {
      // Cargar categorías, ciudades y banners si no están en cache
      // Hacer estas cargas en paralelo para ser más eficiente
      const loadPromises = [];
      
      if (this.categories.length === 0) {
        console.log('Home - Loading categories...');
        loadPromises.push(this.loadCategories().catch(error => {
          console.error('Home - Error loading categories:', error);
          return null;
        }));
      }
      
      if (this.cities.length === 0) {
        console.log('Home - Loading cities...');
        loadPromises.push(this.loadCities().catch(error => {
          console.error('Home - Error loading cities:', error);
          return null;
        }));
      }
      
      if (this.banners.length === 0) {
        console.log('Home - Loading banners...');
        loadPromises.push(this.loadBanners().catch(error => {
          console.error('Home - Error loading banners:', error);
          return null;
        }));
      }

      // Esperar a que terminen las cargas en paralelo
      if (loadPromises.length > 0) {
        console.log('Home - Waiting for parallel loads to complete...');
        try {
          await Promise.all(loadPromises);
        } catch (error) {
          console.log('Home - Some parallel loads failed, but continuing...');
        }
        console.log('Home - Parallel loads completed');
      }

      // Cargar proveedores
      console.log('Home - Loading providers...');
      await this.loadProviders(true);
      console.log('Home - Providers loaded successfully');
      
    } catch (error) {
      console.error('Home - Error loading initial data:', error);
      this.showErrorToast('Error al cargar los datos');
    } finally {
      console.log('Home - Dismissing loading controller');
      clearTimeout(timeoutId);
      await loading.dismiss();
      console.log('Home - Loading controller dismissed');
    }
  }

  async loadCategories() {
    console.log('Home - loadCategories started');
    
    // Primero intentar cargar desde cache
    try {
      const cachedCategories = await this.storageService.getCategories();
      if (cachedCategories && cachedCategories.length > 0) {
        this.categories = cachedCategories;
        console.log('Home - Using cached categories initially:', this.categories.length);
        
        // Reinicializar Swiper inmediatamente con cache
        setTimeout(() => {
          this.initializeSwiper();
        }, 100);
      }
    } catch (cacheError) {
      console.log('Home - No cached categories found');
    }
    
    // Luego intentar cargar desde API en background
    try {
      console.log('Home - Fetching categories from API...');
          // Timeout aumentado a 10 segundos para dar más tiempo
          const categoriesPromise = firstValueFrom(this.apiService.getCategories());
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Categories timeout')), 10000)
          );
      
      const apiCategories = await Promise.race([categoriesPromise, timeoutPromise]) as any[] || [];
      
      if (apiCategories.length > 0) {
        this.categories = apiCategories;
        await this.storageService.saveCategories(this.categories);
        console.log('Home - Categories loaded from API:', this.categories.length);
        
        // Reinicializar Swiper con nuevas categorías
        setTimeout(() => {
          this.initializeSwiper();
        }, 100);
      }
        } catch (error: any) {
          console.error('Home - Error loading categories from API:', error);
          console.error('Home - Error details:', {
            message: error?.message || 'Unknown error',
            name: error?.name || 'Error',
            stack: error?.stack
          });
          
          // Si no hay categorías del cache, usar categorías por defecto
          if (this.categories.length === 0) {
            console.log('Home - Using default categories due to API error');
            this.categories = [
              { _id: '1', name: 'Todos', image: 'assets/icons/grid.svg', background: '#f0f0f0', position: 1, favorite: true } as any,
              { _id: '2', name: 'Restaurantes', image: 'assets/icons/cutlery.svg', background: '#ff6b6b', position: 2, favorite: true } as any,
              { _id: '3', name: 'Servicios', image: 'assets/icons/service.svg', background: '#4ecdc4', position: 3, favorite: true } as any
            ];
          }
        }
  }

  async loadCities() {
    console.log('Home - loadCities started');
    try {
      this.cities = await firstValueFrom(this.apiService.getCities()) || [];
      await this.storageService.saveCities(this.cities);
      console.log('Home - Cities loaded:', this.cities.length);
    } catch (error) {
      console.error('Home - Error loading cities:', error);
    }
  }

  async loadBanners() {
    console.log('Home - loadBanners started');
    try {
      this.banners = await firstValueFrom(this.apiService.getBanners()) || [];
      console.log('Home - Banners loaded:', this.banners.length);
      
      // Actualizar el fondo del banner con la primera imagen
      if (this.banners.length > 0) {
        setTimeout(() => {
          const bannerElement = document.querySelector('.promotional-banner') as HTMLElement;
          if (bannerElement) {
            bannerElement.style.backgroundImage = `url(${this.banners[0].image})`;
          }
        }, 100);
      }
      
      // Reinicializar Swiper de banners después de cargar
      setTimeout(() => {
        this.initializeSwiper();
      }, 100);
    } catch (error) {
      console.error('Error loading banners:', error);
    }
  }

  async loadProviders(reset = false, radius?: number) {
    console.log('Home - loadProviders called, reset:', reset, 'isLoading:', this.isLoading);
    
    if (this.isLoading && !reset) {
      console.log('Home - Already loading, skipping request');
      return;
    }

    this.isLoading = true;
    this.showNoResults = false;
    
    if (reset) {
      this.currentPage = 1; // Siempre empezar en página 1
      this.providers = [];
      this.hasMoreData = true;
      console.log('Home - Reset providers data, currentPage set to:', this.currentPage);
    }
    // No incrementar aquí, se hace después de la consulta exitosa

    try {
      const currentFilters = { ...this.filters };
      currentFilters.limit = environment.itemsPerPage;
      currentFilters.page = this.currentPage;
      
      // Usar el radio especificado o el radio actual
      const searchRadius = radius || this.currentRadius;
      
      console.log('Home - Loading providers with filters:', currentFilters, 'radius:', searchRadius);
      console.log('Home - About to request page:', this.currentPage);
      
      const response = await firstValueFrom(this.apiService.getProviders(currentFilters, searchRadius));
      
      console.log('Home - Received response:', response);
      
      if (response && response.data && response.data.length > 0) {
        if (reset) {
          this.providers = response.data;
          this.currentRadius = searchRadius;
          
          // Mostrar componente de no resultados si no hay datos
          this.showNoResults = false;
          
          // Cargar promociones si hay una categoría seleccionada (no "Todos")
          if (this.selectedCategory && this.selectedCategory._id !== '1') {
            await this.loadNearbyPromotions();
          } else {
            this.nearbyPromotions = [];
          }
          
          // Mezclar providers con promociones
          this.mixProvidersWithPromotions();
        } else {
          this.providers = [...this.providers, ...response.data];
          // Al cargar más, también mezclar con promociones si las hay
          if (this.nearbyPromotions.length > 0) {
            this.mixProvidersWithPromotions();
          } else {
            this.feedItems = this.providers.map(p => ({ type: 'provider', data: p }));
          }
        }
        
        // Actualizar información de paginación
        this.hasMoreData = response.pagination?.hasNextPage || false;
        
        // Incrementar página solo después de carga exitosa
        if (!reset) {
          this.currentPage++;
          console.log('Home - Page incremented to:', this.currentPage);
        }
        
        console.log('Home - Providers loaded:', this.providers.length, 'Has more:', this.hasMoreData);
        console.log('Home - State after load - currentPage:', this.currentPage, 'hasMoreData:', this.hasMoreData, 'isLoadingMore:', this.isLoadingMore, 'isLoading:', this.isLoading);
        console.log('Home - Pagination info:', response.pagination);
        this.logInfiniteScrollState();
      } else {
        if (reset) {
          this.providers = [];
          this.feedItems = [];
        }
        this.hasMoreData = false;
        this.showNoResults = true;
        console.log('Home - No providers found');
      }
      
    } catch (error) {
      console.error('Home - Error loading providers:', error);
      this.showErrorToast('Error al cargar proveedores');
      this.showNoResults = true;
    } finally {
      console.log('Home - loadProviders finished, setting isLoading to false');
      this.isLoading = false;
      // No resetear isLoadingMore aquí, se maneja en loadMore
      this.isRefreshing = false;
      this.isExpandingRadius = false;
      
      // Forzar actualización del componente infinite scroll después de cada carga
      setTimeout(() => {
        if (this.infiniteScroll && this.hasMoreData) {
          this.infiniteScroll.disabled = false;
          console.log('Home - Forced infiniteScroll.disabled = false after loadProviders');
        }
      }, 100);
    }
  }

  async onSearch(event: any) {
    const query = event.target.value.trim();
    this.searchQuery = query;
    this.filters.search = query;
    await this.storageService.saveFilters(this.filters);
    
    // Debounce search
    setTimeout(() => {
      if (this.searchQuery === query) {
        this.loadProviders(true);
      }
    }, 500);
  }


  async onFilterChange() {
    this.filters = {
      ...this.filters,
      categoryId: this.selectedCategory?._id,
      city: this.selectedCity,
      radius: this.selectedRadius,
      search: this.searchQuery
    };
    await this.storageService.saveFilters(this.filters);
    this.loadProviders(true);
  }

  async loadMore(event: any) {
    console.log('🚀 Home - loadMore called - SCROLL INFINITE TRIGGERED!');
    console.log('Home - Event received:', event);
    this.logInfiniteScrollState();
    
    // Verificar condiciones antes de proceder
    if (!this.hasMoreData) {
      console.log('Home - loadMore skipped: no more data available');
      event.target.complete();
      return;
    }
    
    if (this.isLoadingMore) {
      console.log('Home - loadMore skipped: already loading more');
      event.target.complete();
      return;
    }
    
    if (this.isLoading) {
      console.log('Home - loadMore skipped: main loading in progress');
      event.target.complete();
      return;
    }

    console.log('Home - All checks passed, proceeding with loadMore');
    this.isLoadingMore = true;
    
    try {
      console.log('Home - Calling loadProviders(false) for page:', this.currentPage + 1);
      await this.loadProviders(false);
      console.log('Home - loadProviders completed successfully in loadMore');
    } catch (error) {
      console.error('Home - Error in loadMore:', error);
      this.hasMoreData = false; // En caso de error, detener el scroll infinito
    } finally {
      this.isLoadingMore = false;
      event.target.complete();
      console.log('Home - loadMore completed, isLoadingMore set to false');
      
      // Forzar actualización del componente infinite scroll
      setTimeout(() => {
        if (this.infiniteScroll) {
          this.infiniteScroll.disabled = false;
          console.log('Home - Forced infiniteScroll.disabled = false');
        }
      }, 100);
      
      this.logInfiniteScrollState();
    }
  }

  async refresh(event: any) {
    this.isRefreshing = true;
    await this.loadProviders(true);
    event.target.complete();
  }

  // Método para debuggear el estado del infinite scroll
  logInfiniteScrollState() {
    console.log('Home - Infinite Scroll State Debug:');
    console.log('  - hasMoreData:', this.hasMoreData);
    console.log('  - isLoadingMore:', this.isLoadingMore);
    console.log('  - isLoading:', this.isLoading);
    console.log('  - currentPage:', this.currentPage);
    console.log('  - totalProviders:', this.providers.length);
    console.log('  - infiniteScroll disabled:', (!this.hasMoreData || this.isLoadingMore));
    console.log('  - itemsPerPage:', environment.itemsPerPage);
    console.log('  - expectedNextPage:', this.currentPage + 1);
    
    // Verificar el estado del componente ion-infinite-scroll
    if (this.infiniteScroll) {
      console.log('  - infiniteScroll component exists:', !!this.infiniteScroll);
      console.log('  - infiniteScroll disabled state:', this.infiniteScroll.disabled);
      console.log('  - infiniteScroll threshold:', this.infiniteScroll.threshold);
    } else {
      console.log('  - infiniteScroll component: NOT FOUND');
    }
  }

  // Método para forzar el scroll infinito (debug)
  async forceLoadMore() {
    console.log('Home - Force loadMore called');
    if (this.hasMoreData && !this.isLoadingMore && !this.isLoading) {
      console.log('Home - Forcing loadMore execution');
      await this.loadMore({ target: { complete: () => console.log('Force complete called') } });
    } else {
      console.log('Home - Cannot force loadMore - conditions not met');
      this.logInfiniteScrollState();
    }
  }

  // Método para forzar la habilitación del infinite scroll
  forceEnableInfiniteScroll() {
    if (this.infiniteScroll && this.hasMoreData) {
      this.infiniteScroll.disabled = false;
      console.log('Home - Manually enabled infinite scroll');
      this.logInfiniteScrollState();
    }
  }

  // Método para verificar la posición del scroll
  async checkScrollPosition() {
    if (this.content) {
      const scrollElement = await this.content.getScrollElement();
      const scrollHeight = scrollElement.scrollHeight;
      const scrollTop = scrollElement.scrollTop;
      const clientHeight = scrollElement.clientHeight;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      console.log('Home - Scroll Position Debug:');
      console.log('  - scrollHeight:', scrollHeight);
      console.log('  - scrollTop:', scrollTop);
      console.log('  - clientHeight:', clientHeight);
      console.log('  - distanceFromBottom:', distanceFromBottom);
      console.log('  - threshold: 100px');
      console.log('  - should trigger:', distanceFromBottom <= 100);
      
      return distanceFromBottom <= 100;
    }
    return false;
  }


  async clearFilters() {
    // Limpiar filtros temporales
    this.tempSelectedCategory = null;
    this.tempSelectedCity = '';
    this.tempSelectedRadius = environment.defaultRadius;
    this.tempSelectedLocation = null;
    this.tempSelectedLocationName = '';
    
    // Limpiar filtros reales
    this.selectedCategory = null;
    this.selectedCity = '';
    this.selectedRadius = environment.defaultRadius;
    this.selectedLocation = null;
    this.selectedLocationName = '';
    this.searchQuery = '';
    
    this.filters = {
      lat: this.currentLocation?.latitude,
      lng: this.currentLocation?.longitude,
      radius: environment.defaultRadius,
      limit: environment.itemsPerPage
    };
    
    await this.storageService.saveFilters(this.filters);
    this.loadProviders(true);
  }

  async showLocationPermissionAlert() {
    const alert = await this.alertController.create({
      header: 'Permisos de Ubicación',
      message: 'Para mostrar proveedores cercanos, necesitamos acceso a tu ubicación.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Configurar',
          handler: () => {
            // Abrir configuración de la app
            // TODO: Implementar apertura de configuración
          }
        }
      ]
    });
    await alert.present();
  }

  async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'danger'
    });
    await toast.present();
  }

  openFilterModal() {
    // Inicializar filtros temporales con los valores actuales
    this.tempSelectedCategory = this.selectedCategory;
    this.tempSelectedCity = this.selectedCity;
    this.tempSelectedRadius = this.selectedRadius;
    this.tempSelectedLocation = this.selectedLocation;
    this.tempSelectedLocationName = this.selectedLocationName;
    this.showFilterModal = true;
  }

  closeFilterModal() {
    this.showFilterModal = false;
  }

  applyFilters() {
    // Aplicar filtros temporales a los filtros reales
    this.selectedCategory = this.tempSelectedCategory;
    this.selectedCity = this.tempSelectedCity;
    // Asegurar que el radio sea un número
    this.selectedRadius = parseInt(this.tempSelectedRadius.toString());
    this.selectedLocation = this.tempSelectedLocation;
    this.selectedLocationName = this.tempSelectedLocationName;
    
    // Aplicar filtros seleccionados
    this.filters.categoryId = this.selectedCategory?._id || '';
    this.filters.city = this.selectedCity;
    this.filters.radius = this.selectedRadius;
    
    console.log('Home - Applied filters:', {
      categoryId: this.filters.categoryId,
      city: this.filters.city,
      radius: this.filters.radius,
      selectedRadius: this.selectedRadius
    });
    
    // Si hay ubicación seleccionada, usarla; si no, usar ubicación actual
    if (this.selectedLocation) {
      this.filters.lat = this.selectedLocation.lat;
      this.filters.lng = this.selectedLocation.lng;
    } else if (this.currentLocation) {
      this.filters.lat = this.currentLocation.latitude;
      this.filters.lng = this.currentLocation.longitude;
    }
    
    this.storageService.saveFilters(this.filters);
    this.closeFilterModal();
    this.loadProviders(true);
    this.showSuccessToast('Filtros aplicados');
  }

  getStarRating(rating: number): string[] {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push('star');
    }
    
    if (hasHalfStar) {
      stars.push('star-half');
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push('star-outline');
    }
    
    return stars;
  }

  formatDistance(distance: number): string {
    return this.locationService.formatDistance(distance);
  }

  trackByProviderId(index: number, provider: Provider): string {
    return provider._id;
  }

  async onProviderClick(provider: Provider) {
    console.log('Provider clicked:', provider._id);
    
    // Navegar primero al detalle del proveedor (no esperar la vista)
    this.router.navigate(['/provider-detail', provider._id]);
    
    // Registrar vista del proveedor en background (no bloqueante)
    try {
      await firstValueFrom(this.apiService.addView(provider._id));
      console.log('View registered successfully');
    } catch (error) {
      console.error('Error adding view:', error);
      // No hacer nada más, la vista ya se registró o falló silenciosamente
    }
  }

  // Location modal methods
  openLocationModal() {
    this.showLocationModal = true;
    // Inicializar con ubicación actual si está disponible
    if (this.currentLocation) {
      this.selectedLocation = {
        lat: this.currentLocation.latitude,
        lng: this.currentLocation.longitude,
        name: 'Mi ubicación actual',
        formatted_address: 'Mi ubicación actual'
      };
      this.selectedLocationName = 'Mi ubicación actual';
    }
  }

  closeLocationModal() {
    this.showLocationModal = false;
  }

  onLocationSearch(event: any) {
    const query = event.target.value;
    this.locationSearchQuery = query;
    
    if (query.length > 2) {
      this.geocodingService.searchLocations(query).subscribe(suggestions => {
        this.locationSuggestions = suggestions;
      });
    } else {
      this.locationSuggestions = [];
    }
  }

  selectLocation(location: LocationSuggestion) {
    this.tempSelectedLocation = location;
    this.tempSelectedLocationName = location.formatted_address;
    this.locationSearchQuery = location.formatted_address;
    this.locationSuggestions = [];
  }

  useCurrentLocation() {
    if (this.currentLocation) {
      // Usar reverse geocoding para obtener el nombre de la ubicación
      this.geocodingService.reverseGeocode(
        this.currentLocation.latitude, 
        this.currentLocation.longitude
      ).subscribe(location => {
        if (location) {
          this.tempSelectedLocation = location;
          this.tempSelectedLocationName = location.formatted_address;
        } else {
          this.tempSelectedLocation = {
            lat: this.currentLocation!.latitude,
            lng: this.currentLocation!.longitude,
            name: 'Mi ubicación actual',
            formatted_address: 'Mi ubicación actual'
          };
          this.tempSelectedLocationName = 'Mi ubicación actual';
        }
      });
    }
  }

  applyLocationFilter() {
    if (this.selectedLocation) {
      this.filters.lat = this.selectedLocation.lat;
      this.filters.lng = this.selectedLocation.lng;
      this.filters.radius = this.selectedRadius;
      
      // Guardar filtros
      this.storageService.saveFilters(this.filters);
      
      // Cerrar modal y recargar proveedores
      this.closeLocationModal();
      this.loadProviders(true);
      
      this.showSuccessToast('Filtro de ubicación aplicado');
    }
  }

  getLocationMapUrl(): string {
    if (!this.selectedLocation) {
      return '';
    }

    const { lat, lng } = this.selectedLocation;
    const radiusKm = this.selectedRadius / 1000;
    
    // Calcular el área de cobertura basada en el radio
    const latOffset = (radiusKm / 111) * 0.8; // Aumentar el área visible
    const lngOffset = (radiusKm / (111 * Math.cos(lat * Math.PI / 180))) * 0.8;
    
    const minLat = lat - latOffset;
    const maxLat = lat + latOffset;
    const minLng = lng - lngOffset;
    const maxLng = lng + lngOffset;
    
    // Usar OpenStreetMap con área de cobertura más amplia
    return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng},${minLat},${maxLng},${maxLat}&layer=mapnik&marker=${lat},${lng}`;
  }

  getZoomLevel(radiusKm: number): string {
    // Calcular zoom basado en el radio
    if (radiusKm <= 1) return '15';
    if (radiusKm <= 5) return '13';
    if (radiusKm <= 10) return '12';
    if (radiusKm <= 20) return '11';
    if (radiusKm <= 50) return '10';
    return '9';
  }

  onMapError(event: any) {
    console.log('Mapa no disponible, usando fallback visual');
  }

  getRadarSize(): number {
    // Calcular el tamaño del radar basado en el radio
    const radiusKm = this.selectedRadius / 1000;
    const baseSize = 200;
    const maxSize = 300;
    
    // Escalar el tamaño basado en el radio (1km = 200px, 50km = 300px)
    const size = baseSize + (radiusKm / 50) * (maxSize - baseSize);
    return Math.min(size, maxSize);
  }

  getMapRadiusSize(): number {
    // Calcular el tamaño del indicador de radio en el mapa
    const radiusKm = this.selectedRadius / 1000;
    const baseSize = 40;
    const maxSize = 120;
    
    // Escalar el tamaño basado en el radio (1km = 40px, 50km = 120px)
    const size = baseSize + (radiusKm / 50) * (maxSize - baseSize);
    return Math.min(size, maxSize);
  }

  selectCategory(category: Category | null) {
    this.selectedCategory = category;
    this.filters.categoryId = category?._id || '';
    this.storageService.saveFilters(this.filters);
    this.loadProviders(true);
    const categoryName = category ? category.name : 'Todos';
  }

  onImageError(event: any) {
    // Si la imagen falla al cargar, usar un ícono por defecto
    const img = event.target;
    const categoryIcon = img.parentElement;
    
    // Crear un ícono de fallback
    const fallbackIcon = document.createElement('ion-icon');
    fallbackIcon.setAttribute('name', 'business-outline');
    fallbackIcon.style.fontSize = '24px';
    fallbackIcon.style.color = 'var(--primary-color)';
    
    // Reemplazar la imagen con el ícono
    categoryIcon.innerHTML = '';
    categoryIcon.appendChild(fallbackIcon);
  }

  getCategoryIcon(categoryName: string): string {
    const iconMap: { [key: string]: string } = {
      'Restaurantes': 'restaurant-outline',
      'Salud': 'medical-outline',
      'Belleza': 'flower-outline',
      'Automotriz': 'car-outline',
      'Hogar': 'home-outline',
      'Tecnología': 'phone-portrait-outline',
      'Educación': 'school-outline',
      'Deportes': 'fitness-outline',
      'Mascotas': 'paw-outline',
      'Eventos': 'calendar-outline',
      'Construcción': 'construct-outline',
      'Limpieza': 'sparkles-outline',
      'Transporte': 'bus-outline',
      'Legal': 'document-text-outline',
      'Financiero': 'card-outline'
    };
    return iconMap[categoryName] || 'business-outline';
  }

  private initializeSwiper() {
    // Inicializar swiper de banners
    if (this.bannersSlider && this.banners.length > 0) {
      if (this.bannersSwiper) {
        this.bannersSwiper.destroy(true, true);
      }
      this.bannersSwiper = new Swiper(this.bannersSlider.nativeElement, this.bannersSwiperConfig);
    }
  }

  updateBannerBackground() {
    if (this.bannersSwiper && this.banners.length > 0) {
      this.currentBannerIndex = this.bannersSwiper.realIndex;
      // Forzar actualización del DOM
      setTimeout(() => {
        const bannerElement = document.querySelector('.promotional-banner') as HTMLElement;
        if (bannerElement && this.banners[this.currentBannerIndex]) {
          bannerElement.style.backgroundImage = `url(${this.banners[this.currentBannerIndex].image})`;
        }
      }, 100);
    }
  }

  openBannerLink(link: string) {
    if (link) {
      window.open(link, '_blank');
    }
  }


  // Método para expandir el radio de búsqueda (tipo Tinder)
  async onExpandRadius(newRadius: number) {
    this.isExpandingRadius = true;
    this.showNoResults = false;
    
    console.log(`Expandiendo radio de búsqueda a ${newRadius}m`);
    
    // Mostrar toast informativo
    this.showSuccessToast(`Buscando en un radio de ${(newRadius / 1000).toFixed(0)}km...`);
    
    // Cargar providers con el nuevo radio
    await this.loadProviders(true, newRadius);
  }

  // Método para reintentar la búsqueda
  async onRetrySearch() {
    console.log('Reintentando búsqueda...');
    await this.loadProviders(true);
  }

  private async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color: 'success',
      position: 'bottom'
    });
    await toast.present();
  }

  /**
   * Carga promociones cercanas para la categoría seleccionada
   */
  async loadNearbyPromotions() {
    if (!this.currentLocation) {
      return;
    }

    try {
      const response = await firstValueFrom(
        this.geofencingAnalyticsService.getNearbyPromotions(
          this.currentLocation.latitude,
          this.currentLocation.longitude,
          this.currentRadius,
          this.selectedCategory?._id,
          10 // Máximo 10 promociones para mezclar
        )
      );

      if (response && response.status === 'success') {
        this.nearbyPromotions = response.data.promotions || [];
        console.log('Promociones cercanas cargadas:', this.nearbyPromotions.length);
      }
    } catch (error) {
      console.error('Error loading nearby promotions:', error);
      this.nearbyPromotions = [];
    }
  }

  /**
   * Mezcla providers con promociones en el feed
   * Inserta 1-2 promociones aleatoriamente cada 10 items aproximadamente
   */
  mixProvidersWithPromotions() {
    if (this.nearbyPromotions.length === 0 || this.providers.length === 0) {
      // Si no hay promociones, solo mostrar providers
      this.feedItems = this.providers.map(p => ({ type: 'provider' as const, data: p }));
      return;
    }

    const feedItems: FeedItem[] = [];
    const promotionsCopy = [...this.nearbyPromotions];
    const ITEMS_BETWEEN_PROMOS = 10; // Insertar promo cada 10 items

    // Barajar promociones para aleatoriedad
    promotionsCopy.sort(() => Math.random() - 0.5);

    let promoIndex = 0;

    for (let i = 0; i < this.providers.length; i++) {
      // Agregar provider
      feedItems.push({ type: 'provider', data: this.providers[i] });

      // Insertar promoción cada X items (pero no en las primeras posiciones)
      if (i > 0 && (i + 1) % ITEMS_BETWEEN_PROMOS === 0 && promoIndex < promotionsCopy.length) {
        feedItems.push({ type: 'promotion', data: promotionsCopy[promoIndex] });
        promoIndex++;
      }
    }

    this.feedItems = feedItems;
    console.log('Feed mezclado:', this.feedItems.length, 'items (', 
                promoIndex, 'promociones insertadas)');
  }

  /**
   * Verifica si un item del feed es una promoción
   */
  isPromotion(item: FeedItem): boolean {
    return item.type === 'promotion';
  }

  /**
   * Obtiene el ícono según el tipo de promoción
   */
  getPromotionIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'DISCOUNT': 'pricetag',
      'OFFER': 'gift',
      'EVENT': 'calendar',
      'GENERAL': 'megaphone'
    };
    return icons[type] || 'megaphone';
  }

  /**
   * Navega a la página de promociones cercanas
   */
  goToPromotionsPage() {
    this.router.navigate(['/promotions-nearby']);
  }

  /**
   * TrackBy function para el feed mezclado
   */
  trackByFeedItemId(index: number, item: FeedItem): any {
    if (item.type === 'provider') {
      return item.data._id || index;
    } else {
      return `promo-${item.data._id}` || `promo-${index}`;
    }
  }

  /**
   * Navega al detalle del proveedor
   */
  goToProvider(businessID: string) {
    this.router.navigate(['/provider-detail', businessID]);
  }
}
