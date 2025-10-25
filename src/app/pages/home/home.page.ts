import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { IonContent, IonRefresher, LoadingController, ToastController, AlertController, IonicModule } from '@ionic/angular';
import { Keyboard } from '@capacitor/keyboard';
import { ApiService } from '../../services/api.service';
import { LocationService, LocationData } from '../../services/location.service';
import { StorageService } from '../../services/storage.service';
import { CacheService } from '../../services/cache.service';
import { GeocodingService, LocationSuggestion } from '../../services/geocoding.service';
import { PermissionService } from '../../services/permission.service';
import { GeofencingService } from '../../services/geofencing.service';
import { GeofencingAnalyticsService } from '../../services/geofencing-analytics.service';
import { PromotionTrackingService } from '../../services/promotion-tracking.service';
import { Provider, ProviderFilters, Category } from '../../models/provider.model';
import { environment } from '../../../environments/environment';
import { NoResultsExpandComponent } from '../../components/no-results-expand/no-results-expand.component';
import { SplashService } from '../../services/splash.service';
import { AuthService } from '../../services/auth.service';
import Swiper from 'swiper';
import { SwiperOptions } from 'swiper/types';
import { Pagination, Autoplay } from 'swiper/modules';

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
  
  // Estado de autenticación
  isAuthenticated = false;
  nearbyPromotions: any[] = [];
  
  currentLocation: LocationData | null = null;
  filters: ProviderFilters = {
    limit: environment.itemsPerPage
  };
  
  // Radio de búsqueda actual (sin radio por defecto)
  currentRadius: number = environment.defaultRadius;
  
  isLoading = false;
  isLoadingMore = false;
  isSearching = false; // 🔍 Nuevo: estado para búsquedas
  isFilteringCategory = false; // 🔍 Nuevo: estado para filtrado por categoría
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
    modules: [Pagination, Autoplay],
    slidesPerView: 1,
    spaceBetween: 0,
    autoplay: {
      delay: 4000,
      disableOnInteraction: false,
    },
    loop: true,
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
      dynamicBullets: false,
    },
    grabCursor: true,
    allowTouchMove: true, // Habilitar swipe
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
    private cacheService: CacheService,
    private geocodingService: GeocodingService,
    private permissionService: PermissionService,
    private geofencingService: GeofencingService,
    private geofencingAnalyticsService: GeofencingAnalyticsService,
    private promotionTrackingService: PromotionTrackingService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private router: Router,
    private splashService: SplashService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    // Verificar estado de autenticación
    this.checkAuthStatus();
    
    // Esperar a que termine el splash screen antes de cargar datos
    this.splashService.splashVisible$.subscribe(async (isVisible) => {
      if (!isVisible) {
        // El splash ha terminado, ahora cargar los datos
        await this.initializeApp();
        
        // Hacer disponible el método de emergencia globalmente para debugging
        (window as any).forceLoadMoreManual = () => this.forceLoadMoreManual();
        console.log('🚨 Emergency method available: window.forceLoadMoreManual()');
      }
    });
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

  // Verificar estado de autenticación
  async checkAuthStatus() {
    try {
      await this.authService.waitForInitialization();
      this.isAuthenticated = this.authService.isAuthenticated();
      console.log('Home - Usuario autenticado:', this.isAuthenticated);
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      this.isAuthenticated = false;
    }
  }

  // Ir a la página de login
  goToLogin() {
    this.router.navigate(['/login'], { 
      queryParams: { returnUrl: '/tabs/home' }
    });
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
    
    try {
      // Usar estrategia Cache-First: muestra cache inmediatamente y actualiza en background
      this.categories = await this.cacheService.cacheFirst(
        'categories',
        'categories',
        async () => {
          const categories = await firstValueFrom(this.apiService.getCategories());
          
          // También guardar en el storage antiguo para compatibilidad
          await this.storageService.saveCategories(categories);
          
          return categories;
        }
      );
      
      console.log('Home - Categories loaded:', this.categories.length);
      
      // Reinicializar Swiper
      setTimeout(() => {
        this.initializeSwiper();
      }, 100);
      
    } catch (error: any) {
      console.error('Home - Error loading categories:', error);
      
      // Fallback a categorías por defecto
      this.categories = [
        { _id: '1', name: 'Todos', image: 'assets/icons/grid.svg', background: '#f0f0f0', position: 1, favorite: true } as any,
        { _id: '2', name: 'Restaurantes', image: 'assets/icons/cutlery.svg', background: '#ff6b6b', position: 2, favorite: true } as any,
        { _id: '3', name: 'Servicios', image: 'assets/icons/service.svg', background: '#4ecdc4', position: 3, favorite: true } as any
      ];
      
      setTimeout(() => {
        this.initializeSwiper();
      }, 100);
    }
  }

  async loadCities() {
    console.log('Home - loadCities started');
    try {
      // Usar estrategia Cache-First
      this.cities = await this.cacheService.cacheFirst(
        'cities',
        'cities',
        async () => {
          const cities = await firstValueFrom(this.apiService.getCities());
          await this.storageService.saveCities(cities);
          return cities || [];
        }
      );
      
      console.log('Home - Cities loaded:', this.cities.length);
    } catch (error) {
      console.error('Home - Error loading cities:', error);
      this.cities = [];
    }
  }

  async loadBanners() {
    console.log('Home - loadBanners started');
    try {
      // Usar estrategia Cache-First
      this.banners = await this.cacheService.cacheFirst(
        'banners',
        'banners',
        async () => {
          return await firstValueFrom(this.apiService.getBanners()) || [];
        }
      );
      
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
      this.banners = [];
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
      
      // 🚀 OPTIMIZACIÓN: Mostrar cache inmediatamente si existe
      const cachedProviders = await this.cacheService.getCache<any>('providers_page_1');
      if (cachedProviders && cachedProviders.data && cachedProviders.data.length > 0) {
        console.log('⚡ Mostrando providers del cache inmediatamente...');
        this.providers = cachedProviders.data;
        this.mixProvidersWithPromotions();
        // Continuar cargando datos frescos en background
      } else {
        this.providers = [];
      }
      
      this.hasMoreData = true;
      console.log('Home - Reset providers data, currentPage set to:', this.currentPage);
    }

    try {
      const currentFilters = { ...this.filters };
      currentFilters.limit = environment.itemsPerPage;
      
      // Para paginación: si es reset, usar página 1; si no, usar currentPage + 1
      const pageToRequest = reset ? 1 : this.currentPage + 1;
      currentFilters.page = pageToRequest;
      
      // Usar el radio especificado o el radio actual
      const searchRadius = radius || this.currentRadius;
      
      console.log('Home - Loading providers with filters:', currentFilters, 'radius:', searchRadius);
      console.log('Home - About to request page:', pageToRequest, '(reset:', reset, ', currentPage:', this.currentPage, ')');
      
      // Usar Network-First con timeout de 5 segundos
      const cacheKey = `providers_page_${pageToRequest}`;
      const response = await this.cacheService.networkFirst(
        cacheKey,
        'providers',
        async () => {
          return await firstValueFrom(this.apiService.getProviders(currentFilters, searchRadius));
        },
        { timeout: 5000 }
      );
      
      console.log('Home - Received response:', response);
      
      // 🚀 NUEVO: Procesar productos encontrados si existen
      let foundProducts: any[] = [];
      if (response && (response as any).productsFound && (response as any).productsFound.products) {
        foundProducts = (response as any).productsFound.products;
        console.log('✅ [PRODUCTS FOUND] Productos encontrados:', foundProducts.length);
        foundProducts.forEach((product, index) => {
          console.log(`   ${index + 1}. "${product.name}" - ${product.category} - Provider: ${product.providerName}`);
        });
      }
      
      // 🔥 CORREGIDO: Procesar productos ANTES de verificar providers
      let productProviders: any[] = [];
      if (foundProducts.length > 0) {
        console.log('🔍 [PRODUCTS] Convirtiendo productos a formato de provider...');
        productProviders = foundProducts.map(product => ({
          _id: `product_${product._id}`,
          name: product.name,
          description: product.description || `Producto: ${product.name}`,
          logo: product.images && product.images.length > 0 ? product.images[0] : 'assets/images/default-product.png',
          images: product.images || [],
          categoryId: product.category,
          address: product.address,
          rating: 0,
          views: 0,
          verified: false,
          stand_out: product.featured || false,
          distance: product.address?.location?.coordinates ? this.calculateDistance(
            this.currentLocation?.latitude || 0,
            this.currentLocation?.longitude || 0,
            product.address.location.coordinates[1],
            product.address.location.coordinates[0]
          ) : 0,
          isProduct: true,
          originalProduct: product,
          providerName: product.providerName,
          providerId: product.providerId
        }));
        console.log('✅ [PRODUCTS] Productos convertidos:', productProviders.length);
      }
      
      // 🔥 CORREGIDO: Manejar tanto providers como productos
      const hasProviders = response && response.data && response.data.length > 0;
      const hasProducts = productProviders.length > 0;
      
      if (hasProviders || hasProducts) {
        if (reset) {
          // 🔥 Combinar productos + providers (productos primero)
          this.providers = [...productProviders, ...(response.data || [])] as any[];
          this.currentRadius = searchRadius;
          
          console.log('✅ [RESULTS] Total items:', this.providers.length, '(Productos:', productProviders.length, 'Providers:', response.data?.length || 0, ')');
          
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
        
        // Actualizar currentPage basado en la página que se solicitó exitosamente
        if (reset) {
          this.currentPage = 1; // Asegurar que esté en página 1 después de reset
        } else {
          this.currentPage = pageToRequest; // Usar la página que se solicitó
        }
        console.log('Home - Current page updated to:', this.currentPage);
        
        console.log('Home - Providers loaded:', this.providers.length, 'Has more:', this.hasMoreData);
        console.log('Home - State after load - currentPage:', this.currentPage, 'hasMoreData:', this.hasMoreData, 'isLoadingMore:', this.isLoadingMore, 'isLoading:', this.isLoading);
        console.log('Home - Pagination info:', response.pagination);
      } else {
        // 🔥 CORREGIDO: No mostrar "sin resultados" si NO hay providers pero SÍ hay productos
        if (reset) {
          this.providers = productProviders.length > 0 ? productProviders as any[] : [];
          this.feedItems = productProviders.length > 0 ? productProviders.map(p => ({ type: 'provider', data: p })) : [];
          console.log('✅ [NO PROVIDERS] Pero sí hay productos:', productProviders.length);
        }
        
        if (this.providers.length === 0) {
          this.hasMoreData = false;
          this.showNoResults = true;
          console.log('❌ [NO RESULTS] No hay providers ni productos');
        } else {
          this.hasMoreData = false; // No hay más providers, solo productos
          this.showNoResults = false;
          console.log('✅ [PRODUCTS ONLY] Mostrando solo productos');
        }
      }
      
    } catch (error) {
      console.error('Home - Error loading providers:', error);
      
      // Si hay providers del cache mostrados, no mostrar error
      if (this.providers.length === 0) {
        this.showErrorToast('Error al cargar proveedores');
        this.showNoResults = true;
      }
    } finally {
      console.log('Home - loadProviders finished, setting isLoading to false');
      this.isLoading = false;
      // No resetear isLoadingMore aquí, se maneja en loadMore
      this.isRefreshing = false;
      this.isExpandingRadius = false;
    }
  }

  private searchTimeout: any;

  async onSearch(event: any) {
    const query = event.target.value.trim();
    this.searchQuery = query;
    this.filters.search = query;
    await this.storageService.saveFilters(this.filters);
    
    // Limpiar timeout anterior
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    // Si está vacío, buscar inmediatamente
    if (!query) {
      this.isSearching = true;
      await this.loadProviders(true);
      this.isSearching = false;
      return;
    }
    
    // 🔍 Mostrar estado de búsqueda
    this.isSearching = true;
    
    // Debounce search - esperar 800ms después del último tipo
    this.searchTimeout = setTimeout(async () => {
      if (this.searchQuery === query) {
        await this.loadProviders(true);
        this.isSearching = false;
        
        // Ocultar el teclado después de buscar
        try {
          await Keyboard.hide();
        } catch (error) {
          // En navegador web no hay teclado nativo
          console.log('Keyboard.hide not available in web');
        }
      }
    }, 800);
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


  async refresh(event: any) {
    this.isRefreshing = true;
    
    // Invalidar cache de providers para forzar carga fresca
    await this.cacheService.invalidateCacheByPattern('providers_page');
    
    await this.loadProviders(true);
    event.target.complete();
  }


  // Método para cargar más proveedores usando el botón "Ver más"
  async loadMoreProviders() {
    console.log('🔘 Botón "Ver más" presionado');
    
    // Verificar condiciones antes de proceder
    if (!this.hasMoreData) {
      console.log('🔘 No hay más datos disponibles');
      return;
    }
    
    if (this.isLoadingMore) {
      console.log('🔘 Ya está cargando más datos');
      return;
    }
    
    if (this.isLoading) {
      console.log('🔘 Carga principal en progreso');
      return;
    }

    console.log('🔘 Iniciando carga de más proveedores...');
    this.isLoadingMore = true;
    
    try {
      console.log('🔘 Cargando página:', this.currentPage + 1);
      await this.loadProviders(false);
      console.log('🔘 Carga completada exitosamente');
      
    } catch (error) {
      console.error('🔘 Error cargando más proveedores:', error);
      this.showErrorToast('Error al cargar más servicios');
      
    } finally {
      this.isLoadingMore = false;
      console.log('🔘 Estado de carga completado');
    }
  }

  // Método de emergencia para forzar carga manual (llamable desde consola)
  async forceLoadMoreManual() {
    console.log('🚨 FORCE LOAD MORE MANUAL - Emergency method called');
    
    if (this.hasMoreData && !this.isLoadingMore && !this.isLoading) {
      console.log('🚨 Executing manual load...');
      try {
        this.isLoadingMore = true;
        await this.loadProviders(false);
        console.log('🚨 Manual load completed successfully');
      } catch (error) {
        console.error('🚨 Error in manual load:', error);
      } finally {
        this.isLoadingMore = false;
      }
    } else {
      console.log('🚨 Cannot load - conditions not met:', {
        hasMoreData: this.hasMoreData,
        isLoadingMore: this.isLoadingMore,
        isLoading: this.isLoading
      });
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

  async applyFilters() {
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
    
    await this.storageService.saveFilters(this.filters);
    this.closeFilterModal();
    
    // 🔍 Mostrar loader mientras se aplican filtros
    const loading = await this.loadingController.create({
      message: 'Aplicando filtros...',
      spinner: 'crescent',
      duration: 10000
    });
    await loading.present();
    
    await this.loadProviders(true);
    await loading.dismiss();
    
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

  async onProviderClick(provider: any) {
    console.log('Provider/Product clicked:', provider);
    
    // 🔥 Si es un producto, usar el providerId y abrir tab de catálogo
    if (provider.isProduct && provider.providerId) {
      console.log('📦 Es un producto, navegando al provider con tab catálogo');
      console.log('   ProductID:', provider._id);
      console.log('   ProviderID:', provider.providerId);
      
      // Navegar al proveedor con la tab de catálogo activa
      this.router.navigate(['/provider-detail', provider.providerId], {
        queryParams: { tab: 'catalog' }
      });
      
      // Registrar vista del proveedor en background
      try {
        await firstValueFrom(this.apiService.addView(provider.providerId));
        console.log('View registered successfully');
      } catch (error) {
        console.error('Error adding view:', error);
      }
      
      return;
    }
    
    // 🔥 Si es un proveedor normal
    console.log('🏪 Es un proveedor, navegando al detalle');
    console.log('   ProviderID:', provider._id);
    
    // Navegar al detalle del proveedor
    this.router.navigate(['/provider-detail', provider._id]);
    
    // Registrar vista del proveedor en background (no bloqueante)
    try {
      await firstValueFrom(this.apiService.addView(provider._id));
      console.log('View registered successfully');
    } catch (error) {
      console.error('Error adding view:', error);
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

  async selectCategory(category: Category | null) {
    // 🔍 Mostrar estado de carga para categoría
    this.isFilteringCategory = true;
    this.selectedCategory = category;
    this.filters.categoryId = category?._id || '';
    await this.storageService.saveFilters(this.filters);
    
    const categoryName = category ? category.name : 'Todos';
    console.log(`🔍 Filtrando por categoría: ${categoryName}`);
    
    await this.loadProviders(true);
    this.isFilteringCategory = false;
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
    // Actualizar índice del banner actual
    if (this.bannersSwiper && this.banners.length > 0) {
      this.currentBannerIndex = this.bannersSwiper.realIndex;
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

  // 🚀 NUEVO: Función para calcular distancia entre dos puntos
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
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
  async goToProvider(businessID: string, tab?: string) {
    // 🔥 Si navega al tab 'promo', trackear vista desde home
    if (tab === 'promo') {
      try {
        await this.promotionTrackingService.trackPromotionView(businessID, 'home');
      } catch (error) {
        console.error('Error tracking promotion view from home:', error);
      }
    }

    // Navegar con tab específica
    if (tab) {
      this.router.navigate(['/provider-detail', businessID], {
        queryParams: { tab }
      });
    } else {
      this.router.navigate(['/provider-detail', businessID]);
    }
  }
}
