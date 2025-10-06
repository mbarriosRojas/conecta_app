import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonInfiniteScroll, IonRefresher, LoadingController, ToastController, AlertController, IonicModule } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { LocationService, LocationData } from '../../services/location.service';
import { StorageService } from '../../services/storage.service';
import { GeocodingService, LocationSuggestion } from '../../services/geocoding.service';
import { Provider, ProviderFilters, Category } from '../../models/provider.model';
import { environment } from '../../../environments/environment';
import Swiper from 'swiper';
import { SwiperOptions } from 'swiper/types';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class HomePage implements OnInit, AfterViewInit {
  @ViewChild(IonContent) content!: IonContent;
  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;
  @ViewChild('categoriesSlider', { static: false }) categoriesSlider!: ElementRef;
  @ViewChild('bannersSlider', { static: false }) bannersSlider!: ElementRef;

  providers: Provider[] = [];
  featuredProviders: Provider[] = [];
  recentProviders: Provider[] = [];
  categories: Category[] = [];
  cities: string[] = [];
  banners: any[] = [];
  currentBannerIndex: number = 0;
  
  currentLocation: LocationData | null = null;
  filters: ProviderFilters = {
    radius: environment.defaultRadius,
    limit: environment.itemsPerPage
  };
  
  isLoading = false;
  isLoadingMore = false;
  hasMoreData = true;
  currentPage = 0;
  searchQuery = '';
  selectedCategory: Category | null = null;
  selectedCity = '';
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
  
  // Configuración del swiper para categorías
  categoriesSwiperConfig: SwiperOptions = {
    slidesPerView: 5.5,
    spaceBetween: 8,
    freeMode: true,
    grabCursor: true,
    breakpoints: {
      320: {
        slidesPerView: 4.5,
        spaceBetween: 6
      },
      480: {
        slidesPerView: 5.5,
        spaceBetween: 8
      },
      768: {
        slidesPerView: 7,
        spaceBetween: 10
      }
    }
  };

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
  
  private categoriesSwiper: Swiper | null = null;
  private bannersSwiper: Swiper | null = null;

  constructor(
    private apiService: ApiService,
    private locationService: LocationService,
    private storageService: StorageService,
    private geocodingService: GeocodingService,
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
        // Solo solicitar permisos si no tenemos ubicación guardada
        const hasPermission = await this.locationService.requestPermissions();
        if (hasPermission) {
          await this.getCurrentLocation();
        } else {
          this.showLocationPermissionAlert();
        }
      }
      
      // Cargar datos iniciales
      await this.loadInitialData();
      
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

  async loadInitialData() {
    const loading = await this.loadingController.create({
      message: 'Cargando proveedores...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Cargar categorías, ciudades y banners si no están en cache
      if (this.categories.length === 0) {
        await this.loadCategories();
      }
      if (this.cities.length === 0) {
        await this.loadCities();
      }
      if (this.banners.length === 0) {
        await this.loadBanners();
      }

      // Cargar proveedores
      await this.loadProviders(true);
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      this.showErrorToast('Error al cargar los datos');
    } finally {
      await loading.dismiss();
    }
  }

  async loadCategories() {
    try {
      this.categories = await this.apiService.getCategories().toPromise() || [];
      await this.storageService.saveCategories(this.categories);
      
      // Reinicializar Swiper después de cargar categorías
      setTimeout(() => {
        this.initializeSwiper();
      }, 100);
    } catch (error) {
      console.error('Error loading categories:', error);
      
      // Reinicializar Swiper con categorías del cache
      setTimeout(() => {
        this.initializeSwiper();
      }, 100);
    }
  }

  async loadCities() {
    try {
      this.cities = await this.apiService.getCities().toPromise() || [];
      await this.storageService.saveCities(this.cities);
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  }

  async loadBanners() {
    try {
      console.log('Loading banners...');
      this.banners = await this.apiService.getBanners().toPromise() || [];
      console.log('Loaded banners:', this.banners);
      console.log('Banners count:', this.banners.length);
      
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

  async loadProviders(reset = false) {
    if (this.isLoading && !reset) return;

    this.isLoading = true;
    
    if (reset) {
      this.currentPage = 0;
      this.providers = [];
      this.hasMoreData = true;
    }

    try {
      const currentFilters = { ...this.filters };
      currentFilters.limit = environment.itemsPerPage;
      currentFilters.page = this.currentPage;
      
      console.log('Loading providers with filters:', currentFilters);
      
      const newProviders = await this.apiService.getProviders(currentFilters).toPromise() || [];
      
      console.log('Received providers:', newProviders.length);
      
      if (reset) {
        this.providers = newProviders;
      } else {
        this.providers = [...this.providers, ...newProviders];
      }
      
      this.hasMoreData = newProviders.length === environment.itemsPerPage;
      this.currentPage++;
      
    } catch (error) {
      console.error('Error loading providers:', error);
      this.showErrorToast('Error al cargar proveedores');
    } finally {
      this.isLoading = false;
      this.isLoadingMore = false;
      this.isRefreshing = false;
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
    if (this.hasMoreData && !this.isLoadingMore) {
      this.isLoadingMore = true;
      await this.loadProviders(false);
      event.target.complete();
    } else {
      event.target.complete();
    }
  }

  async refresh(event: any) {
    this.isRefreshing = true;
    await this.loadProviders(true);
    event.target.complete();
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
    this.selectedRadius = this.tempSelectedRadius;
    this.selectedLocation = this.tempSelectedLocation;
    this.selectedLocationName = this.tempSelectedLocationName;
    
    // Aplicar filtros seleccionados
    this.filters.categoryId = this.selectedCategory?._id || '';
    this.filters.city = this.selectedCity;
    this.filters.radius = this.selectedRadius;
    
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
    // Registrar vista del proveedor
    try {
      await this.apiService.addView(provider._id).toPromise();
    } catch (error) {
      console.error('Error adding view:', error);
    }
    
    // Navegar al detalle del proveedor
    this.router.navigate(['/provider-detail', provider._id]);
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
    this.showSuccessToast(`Filtro aplicado: ${categoryName}`);
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
    // Inicializar swiper de categorías
    if (this.categoriesSlider && this.categories.length > 0) {
      if (this.categoriesSwiper) {
        this.categoriesSwiper.destroy(true, true);
      }
      this.categoriesSwiper = new Swiper(this.categoriesSlider.nativeElement, this.categoriesSwiperConfig);
    }

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

  private async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color: 'success',
      position: 'bottom'
    });
    await toast.present();
  }
}
