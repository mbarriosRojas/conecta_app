import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, ToastController, AlertController, ActionSheetController, Platform, IonicModule, IonContent, IonInfiniteScroll } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CacheService } from '../../services/cache.service';
import { LocationService, LocationData } from '../../services/location.service';
import { GeocodingService, LocationSuggestion } from '../../services/geocoding.service';
import { Provider, Product, Schedule } from '../../models/provider.model';
import { environment } from '../../../environments/environment';
import Swiper from 'swiper';
import { SwiperOptions } from 'swiper/types';
import { register } from 'swiper/element/bundle';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { InfiniteScrollCustomEvent } from '@ionic/angular';
import { Subscription, firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-provider-detail',
  templateUrl: './provider-detail.page.html',
  styleUrls: ['./provider-detail.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ProviderDetailPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('imagesSlider', { static: false }) imagesSlider!: ElementRef;
  @ViewChild('productsSlider', { static: false }) productsSlider!: ElementRef;
  @ViewChild('categorySlider', { static: false }) categorySlider!: ElementRef;
  @ViewChild('gallerySlider', { static: false }) gallerySlider!: ElementRef;
  @ViewChild(IonContent) content!: IonContent;
  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;

  provider: Provider | null = null;
  currentLocation: LocationData | null = null;
  mapUrl: SafeResourceUrl = '';
  products: Product[] = [];
  productCategories: string[] = [];
  selectedCategory = 'all';
  
  // Modal de producto
  isProductModalOpen = false;
  selectedProduct: Product | null = null;
  
  // Modal de mapa
  isMapModalOpen = false;
  
  // Modal de galería de imágenes
  isGalleryModalOpen = false;
  selectedImageIndex = 0;
  currentPage = 1;
  hasMoreProducts = true;
  isLoadingProducts = false;
  activeSection = 'info'; // 'info', 'catalog', 'share'
  
  // Swiper configurations
  imagesSwiperConfig: SwiperOptions = {
    slidesPerView: 1,
    spaceBetween: 0,
    autoplay: {
      delay: 3000,
      disableOnInteraction: false,
    },
    loop: true,
    pagination: {
      el: '.images-slider .swiper-pagination',
      clickable: true,
    },
    navigation: {
      nextEl: '.images-slider .swiper-button-next',
      prevEl: '.images-slider .swiper-button-prev',
    },
    grabCursor: true,
    allowTouchMove: true,
    speed: 300,
    effect: 'slide',
  };

  productsSwiperConfig: SwiperOptions = {
    slidesPerView: 2.2,
    spaceBetween: 12,
    freeMode: true,
    grabCursor: true,
    breakpoints: {
      320: { slidesPerView: 1.5, spaceBetween: 8 },
      480: { slidesPerView: 2.2, spaceBetween: 12 },
      768: { slidesPerView: 3, spaceBetween: 16 }
    }
  };

  categorySwiperConfig: SwiperOptions = {
    slidesPerView: 'auto',
    spaceBetween: 12,
    freeMode: true,
    grabCursor: true,
    centeredSlides: false,
    breakpoints: {
      320: { slidesPerView: 'auto', spaceBetween: 8 },
      480: { slidesPerView: 'auto', spaceBetween: 12 },
      768: { slidesPerView: 'auto', spaceBetween: 16 }
    }
  };

  gallerySwiperConfig: SwiperOptions = {
    slidesPerView: 1,
    spaceBetween: 0,
    centeredSlides: true,
    grabCursor: true,
    allowTouchMove: true,
    keyboard: {
      enabled: true,
    },
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
      type: 'fraction',
    },
    zoom: {
      maxRatio: 3,
      minRatio: 1,
    },
    effect: 'slide',
    speed: 300,
    resistanceRatio: 0.85,
    followFinger: true,
    touchRatio: 1,
    touchAngle: 45,
    simulateTouch: true,
    allowSlideNext: true,
    allowSlidePrev: true,
  };

  private imagesSwiper: Swiper | null = null;
  private productsSwiper: Swiper | null = null;
  private categorySwiper: Swiper | null = null;
  private gallerySwiper: Swiper | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private cacheService: CacheService,
    private locationService: LocationService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private actionSheetController: ActionSheetController,
    private sanitizer: DomSanitizer
  ) {}

  async ngOnInit() {
    await this.loadCurrentLocation();
    await this.loadProvider();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initializeSwipers();
    }, 500);
  }

  ngOnDestroy() {
    // Limpiar swipers
    if (this.imagesSwiper) {
      this.imagesSwiper.destroy(true, true);
    }
    if (this.categorySwiper) {
      this.categorySwiper.destroy(true, true);
    }
    if (this.productsSwiper) {
      this.productsSwiper.destroy(true, true);
    }
    if (this.gallerySwiper) {
      this.gallerySwiper.destroy(true, true);
    }
  }

  async loadCurrentLocation() {
    try {
      this.currentLocation = await this.locationService.getCurrentPosition();
    } catch (error) {
      console.error('Error getting current location:', error);
    }
  }

  async loadProvider() {
    const loading = await this.loadingController.create({
      message: 'Cargando información...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const providerId = this.route.snapshot.paramMap.get('id');
      if (!providerId) {
        throw new Error('ID de proveedor no encontrado');
      }

      // Usar Network-First con timeout corto
      this.provider = await this.cacheService.networkFirst(
        `provider_detail_${providerId}`,
        'provider_detail',
        async () => {
          return await this.apiService.getProviderById(
            providerId,
            this.currentLocation?.latitude,
            this.currentLocation?.longitude
          ).toPromise() || null;
        },
        { timeout: 5000 }
      );

      if (this.provider) {
        console.log("data provider....", this.provider);
        // Actualizar URL del mapa
        this.updateMapUrl();
        
        // Registrar vista del proveedor (en background, no bloqueante)
        this.apiService.addView(providerId).toPromise().catch(err => 
          console.log('View registration failed silently:', err)
        );
        
        // Cargar productos y categorías
        await this.loadProductCategories();
        await this.loadProducts();
        
        // Inicializar swiper de categorías después de cargar las categorías
        setTimeout(() => {
          this.initializeSwipers();
        }, 100);
      }

      // Reinicializar swiper de imágenes después de cargar el proveedor
      setTimeout(() => {
        this.initializeSwipers();
      }, 100);

    } catch (error) {
      console.error('Error loading provider:', error);
      this.showErrorToast('Error al cargar la información del proveedor');
        this.router.navigate(['/tabs/home']);
    } finally {
      await loading.dismiss();
    }
  }

  async loadProductCategories() {
    if (!this.provider) return;

    try {
      // Cargar productos primero para obtener las categorías reales
      const response = await firstValueFrom(this.apiService.getProductsByProvider(this.provider._id));
      
      if (response?.data && (response.data as any).products && Array.isArray((response.data as any).products)) {
        // Usar las categorías que vienen del API (response.data.categories) si están disponibles
        if ((response.data as any).categories && Array.isArray((response.data as any).categories)) {
          console.log('ProviderDetail - Categories from API:', (response.data as any).categories);
          this.productCategories = ['all', ...(response.data as any).categories];
        } else {
          // Fallback: extraer categorías únicas de los productos
          const uniqueCategories = new Set<string>();
          (response.data as any).products.forEach((product: any) => {
            if (product.category && product.category.trim()) {
              uniqueCategories.add(product.category.trim());
            }
          });
          
          // Convertir Set a Array y ordenar
          const categoriesArray = Array.from(uniqueCategories).sort();
          console.log('ProviderDetail - Categories found in products:', categoriesArray);
          
          // Agregar 'all' al inicio del array
          this.productCategories = ['all', ...categoriesArray];
        }
      } else {
        console.log('ProviderDetail - No products found, using default categories');
        // Si no hay productos, usar categorías por defecto
        const defaultCategories = [
          'COMIDA', 'BEBIDAS', 'POSTRES', 'PRODUCTOS', 'SERVICIOS', 'OTROS'
        ];
        this.productCategories = ['all', ...defaultCategories];
      }
      
      console.log('ProviderDetail - Final categories:', this.productCategories);
    } catch (error) {
      console.error('Error loading product categories:', error);
      // Si hay error, al menos mostrar 'all'
      this.productCategories = ['all'];
    }
  }

  async loadProducts(reset = false) {
    if (!this.provider || this.isLoadingProducts) return;

    this.isLoadingProducts = true;
    if (reset) {
      this.currentPage = 1;
      this.products = [];
      this.hasMoreProducts = true;
    }

    try {
      console.log('ProviderDetail - Loading products for provider:', this.provider._id);
      const response = await firstValueFrom(this.apiService.getProductsByProvider(this.provider._id));
      console.log('ProviderDetail - API response:', response);

      if (response?.data) {
        console.log('ProviderDetail - Response data:', response.data);
        // Los productos están en response.data.products, no directamente en response.data
        const allProducts = Array.isArray((response.data as any).products) ? (response.data as any).products : [];
        console.log('ProviderDetail - All products processed:', allProducts);
        
        // Filtrar por categoría si no es 'all'
        let filteredProducts = allProducts;
        if (this.selectedCategory !== 'all') {
          filteredProducts = allProducts.filter((product: any) => 
            product.category === this.selectedCategory
          );
          console.log('ProviderDetail - Filtered products for category', this.selectedCategory, ':', filteredProducts);
        }
        
        // Asegurar que filteredProducts sea siempre un array antes de usar spread operator
        const productsToAdd = Array.isArray(filteredProducts) ? filteredProducts : [];
        console.log('ProviderDetail - Products to add:', productsToAdd);
        
        if (reset) {
          this.products = productsToAdd;
        } else {
          this.products = [...this.products, ...productsToAdd];
        }
        
        console.log('ProviderDetail - Final products array:', this.products);
        
        // Por ahora no hay paginación en el nuevo endpoint, mostrar todos
        this.hasMoreProducts = false;
      } else {
        console.log('ProviderDetail - No data in response or response is null');
      }

      // Reinicializar swiper de productos después de cargar
      setTimeout(() => {
        this.initializeSwipers();
      }, 100);

    } catch (error) {
      console.error('Error loading products:', error);
      this.showErrorToast('Error al cargar los productos');
    } finally {
      this.isLoadingProducts = false;
    }
  }

  private initializeSwipers() {
    // Inicializar swiper de imágenes
    if (this.imagesSlider && this.provider?.images && this.provider.images.length > 0) {
      if (this.imagesSwiper) {
        this.imagesSwiper.destroy(true, true);
      }
      try {
        this.imagesSwiper = new Swiper(this.imagesSlider.nativeElement, this.imagesSwiperConfig);
        console.log('Images swiper initialized successfully');
      } catch (error) {
        console.error('Error initializing images swiper:', error);
      }
    }

    // Inicializar swiper de categorías
    if (this.categorySlider && this.productCategories.length > 0) {
      if (this.categorySwiper) {
        this.categorySwiper.destroy(true, true);
      }
      try {
        this.categorySwiper = new Swiper(this.categorySlider.nativeElement, this.categorySwiperConfig);
        console.log('Category swiper initialized successfully');
      } catch (error) {
        console.error('Error initializing category swiper:', error);
      }
    }

    // Inicializar swiper de productos
    if (this.productsSlider && this.products.length > 0) {
      if (this.productsSwiper) {
        this.productsSwiper.destroy(true, true);
      }
      try {
        this.productsSwiper = new Swiper(this.productsSlider.nativeElement, this.productsSwiperConfig);
        console.log('Products swiper initialized successfully');
      } catch (error) {
        console.error('Error initializing products swiper:', error);
      }
    }
  }

  private initializeGallerySwiper() {
    if (this.gallerySlider && this.provider?.images && this.provider.images.length > 0) {
      if (this.gallerySwiper) {
        this.gallerySwiper.destroy(true, true);
      }
      
      const config = { ...this.gallerySwiperConfig };
      if (this.selectedImageIndex > 0) {
        config.initialSlide = this.selectedImageIndex;
      }
      
      this.gallerySwiper = new Swiper(this.gallerySlider.nativeElement, config);
    }
  }

  setActiveSection(section: string) {
    this.activeSection = section;
    if (section === 'catalog' && this.products.length === 0) {
      this.loadProducts(true);
    }
  }

  onCategoryChange() {
    this.loadProducts(true);
  }

  async callProvider() {
    if (!this.provider?.phone_contact && !this.provider?.phone_number) {
      this.showErrorToast('Número de teléfono no disponible');
      return;
    }

    const phoneNumber = this.provider.phone_contact || this.provider.phone_number;
    const actionSheet = await this.actionSheetController.create({
      header: 'Llamar a ' + this.provider.name,
      buttons: [
        {
          text: 'Llamar',
          icon: 'call',
          handler: () => {
            window.open(`tel:${phoneNumber}`, '_self');
          }
        },
        {
          text: 'WhatsApp',
          icon: 'logo-whatsapp',
          handler: () => {
            const message = encodeURIComponent(`Hola, me interesa conocer más sobre sus servicios.`);
            window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
          }
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  openGallery(index: number = 0) {
    if (!this.provider?.images || this.provider.images.length === 0) {
      this.showErrorToast('No hay imágenes disponibles');
      return;
    }

    this.selectedImageIndex = index;
    this.isGalleryModalOpen = true;
    
    // Inicializar el swiper de la galería después de que se abra el modal
    setTimeout(() => {
      this.initializeGallerySwiper();
    }, 300);
  }

  async shareProvider() {
    if (!this.provider) return;

    const shareData = {
      title: this.provider.name,
      text: this.provider.description || 'Mira este negocio en Infinity Providers',
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Error sharing:', error);
        this.showErrorToast('Error al compartir');
      }
    } else {
      // Fallback para navegadores que no soportan Web Share API
      const actionSheet = await this.actionSheetController.create({
        header: 'Compartir ' + this.provider.name,
        buttons: [
          {
            text: 'Copiar enlace',
            icon: 'copy',
            handler: () => {
              navigator.clipboard.writeText(window.location.href);
              this.showSuccessToast('Enlace copiado al portapapeles');
            }
          },
          {
            text: 'WhatsApp',
            icon: 'logo-whatsapp',
            handler: () => {
              const message = encodeURIComponent(`Mira este negocio: ${this.provider?.name}\n${window.location.href}`);
              window.open(`https://wa.me/?text=${message}`, '_blank');
            }
          },
          {
            text: 'Facebook',
            icon: 'logo-facebook',
            handler: () => {
              const url = encodeURIComponent(window.location.href);
              window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
            }
          },
          {
            text: 'Twitter',
            icon: 'logo-twitter',
            handler: () => {
              const text = encodeURIComponent(`Mira este negocio: ${this.provider?.name}`);
              const url = encodeURIComponent(window.location.href);
              window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
            }
          },
          {
            text: 'Cancelar',
            icon: 'close',
            role: 'cancel'
          }
        ]
      });
      await actionSheet.present();
    }
  }

  getDistance(): string {
    if (!this.provider?.address?.location || !this.currentLocation) {
      return 'Distancia no disponible';
    }

    const distance = this.calculateDistance(
      this.currentLocation.latitude,
      this.currentLocation.longitude,
      this.provider.address.location.coordinates[1], // lat
      this.provider.address.location.coordinates[0]  // lng
    );

    return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }


  getCategoryName(categoryId: string | any): string {
    if (typeof categoryId === 'object' && categoryId?.name) {
      return categoryId.name;
    }
    return categoryId || 'Sin categoría';
  }

  formatPrice(price?: number): string {
    if (!price) return 'Consultar precio';
    return `$${price.toLocaleString()}`;
  }

  async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'bottom'
    });
    await toast.present();
  }

  async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color: 'success',
      position: 'bottom'
    });
    await toast.present();
  }

    // Helper methods for template null checking
    hasImages(): boolean {
      return !!(this.provider?.images && this.provider.images.length > 0);
    }

    hasNoImages(): boolean {
      return !this.provider?.images || this.provider.images.length === 0;
    }

    // Métodos para agrupar productos por categoría
    getCategoriesWithProducts(): string[] {
      const categories = new Set<string>();
      this.products.forEach(product => {
        if (product.category) {
          categories.add(product.category);
        }
      });
      return Array.from(categories).sort();
    }

    getProductsByCategory(category: string): Product[] {
      return this.products.filter(product => product.category === category);
    }

    onProductCategoryChange(category: string) {
      this.selectedCategory = category;
      if (this.provider) {
        this.loadProducts(true);
      }
    }

    // Formatear categoría para mostrar (convertir de MAYÚSCULAS a formato legible)
    formatCategoryLabel(category: string): string {
      if (category === 'all') {
        return 'Todos';
      }
      return category
        .toLowerCase()
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    // Métodos para el mapa
    updateMapUrl() {
      if (this.provider && this.provider.address && this.provider.address.location) {
        const providerLat = this.provider.address.location.coordinates[1];
        const providerLng = this.provider.address.location.coordinates[0];

        if (this.currentLocation) {
          // Si tenemos ubicación del usuario, crear ruta visual estilo Google Maps
          const userLat = this.currentLocation.latitude;
          const userLng = this.currentLocation.longitude;
          
          // Usar Leaflet con OpenStreetMap para mostrar ruta visual
          // Crear URL que incluya marcadores y una línea de conexión
          const mapUrl = this.createMapWithRoute(userLat, userLng, providerLat, providerLng);
          this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(mapUrl);
        } else {
          // Sin ubicación del usuario, mostrar solo el negocio
          const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${providerLng - 0.01},${providerLat - 0.01},${providerLng + 0.01},${providerLat + 0.01}&layer=mapnik&marker=${providerLat},${providerLng}`;
          this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(osmUrl);
        }
      } else {
        this.mapUrl = '';
      }
    }

    // Crear mapa con ruta visual entre dos puntos
    private createMapWithRoute(userLat: number, userLng: number, providerLat: number, providerLng: number): string {
      // Usar Leaflet con OpenStreetMap para crear un mapa con ruta visual
      const centerLat = (userLat + providerLat) / 2;
      const centerLng = (userLng + providerLng) / 2;
      
      // Calcular zoom apropiado basado en la distancia
      const distance = this.calculateDistance(userLat, userLng, providerLat, providerLng);
      let zoom = 10;
      if (distance < 1) zoom = 15;
      else if (distance < 5) zoom = 12;
      else if (distance < 20) zoom = 10;
      else if (distance < 100) zoom = 8;
      else zoom = 6;
      
      // Crear HTML para el mapa con Leaflet
      const mapHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            body, html { margin: 0; padding: 0; height: 100%; }
            #map { height: 100%; width: 100%; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            var map = L.map('map').setView([${centerLat}, ${centerLng}], ${zoom});
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            
            // Marcador del usuario
            var userIcon = L.divIcon({
              className: 'user-marker',
              html: '<div style="background: #4285f4; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
              iconSize: [26, 26],
              iconAnchor: [13, 13]
            });
            
            // Marcador del negocio
            var businessIcon = L.divIcon({
              className: 'business-marker',
              html: '<div style="background: #ea4335; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
              iconSize: [26, 26],
              iconAnchor: [13, 13]
            });
            
            // Agregar marcadores
            L.marker([${userLat}, ${userLng}], { icon: userIcon }).addTo(map)
              .bindPopup('Tu ubicación');
            
            L.marker([${providerLat}, ${providerLng}], { icon: businessIcon }).addTo(map)
              .bindPopup('${this.provider?.name || 'Negocio'}');
            
            // Crear ruta visual entre los puntos
            var route = L.polyline([
              [${userLat}, ${userLng}],
              [${providerLat}, ${providerLng}]
            ], {
              color: '#4285f4',
              weight: 4,
              opacity: 0.8,
              dashArray: '10, 10'
            }).addTo(map);
            
            // Ajustar la vista para incluir ambos marcadores
            var group = new L.featureGroup([L.marker([${userLat}, ${userLng}]), L.marker([${providerLat}, ${providerLng}])]);
            map.fitBounds(group.getBounds().pad(0.1));
          </script>
        </body>
        </html>
      `;
      
      // Convertir HTML a data URL
      return 'data:text/html;charset=utf-8,' + encodeURIComponent(mapHtml);
    }

    getMapUrl(): SafeResourceUrl {
      return this.mapUrl;
    }

    // Métodos para el modal de producto
    openProductModal(product: Product) {
      this.selectedProduct = product;
      this.isProductModalOpen = true;
    }

    closeProductModal() {
      this.isProductModalOpen = false;
      this.selectedProduct = null;
    }

    // Métodos para el modal de mapa
    openFullScreenMap() {
      this.isMapModalOpen = true;
    }

    closeMapModal() {
      this.isMapModalOpen = false;
    }

    // Métodos para el modal de galería
    closeGalleryModal() {
      this.isGalleryModalOpen = false;
      if (this.gallerySwiper) {
        this.gallerySwiper.destroy(true, true);
        this.gallerySwiper = null;
      }
    }

    // Método para mostrar información de navegación
    async showNavigationInfo() {
      if (!this.provider?.address?.location) {
        this.showErrorToast('Ubicación del negocio no disponible');
        return;
      }

      const providerLat = this.provider.address.location.coordinates[1];
      const providerLng = this.provider.address.location.coordinates[0];
      
      let message = `📍 ${this.provider.name}\n`;
      message += `📍 ${this.provider.address.street || 'Dirección no disponible'}\n`;
      message += `📍 ${this.provider.address.city || ''}, ${this.provider.address.departament || ''}\n`;
      
      if (this.currentLocation) {
        message += `\n📏 Distancia: ${this.getDistance()}\n`;
        message += `\n🗺️ La ruta se muestra en el mapa embebido arriba`;
      } else {
        message += `\n⚠️ Activa la geolocalización para ver la ruta desde tu ubicación`;
      }

      const alert = await this.alertController.create({
        header: 'Información de Ubicación',
        message: message,
        buttons: [
          {
            text: 'Copiar dirección',
            handler: () => {
              const address = `${this.provider?.address?.street || ''}, ${this.provider?.address?.city || ''}, ${this.provider?.address?.departament || ''}`.trim();
              navigator.clipboard.writeText(address);
              this.showSuccessToast('Dirección copiada al portapapeles');
            }
          },
          {
            text: 'Cerrar',
            role: 'cancel'
          }
        ]
      });
      await alert.present();
    }

    async openWhatsAppForProduct() {
      if (!this.selectedProduct || !this.provider) return;

      const productName = this.selectedProduct.name;
      const productPrice = this.selectedProduct.price ? this.formatPrice(this.selectedProduct.price) : 'Consultar precio';
      const providerName = this.provider.name;
      const providerPhone = this.provider.phone_contact || this.provider.phone_number;

      if (!providerPhone) {
        this.showErrorToast('Número de WhatsApp no disponible');
        return;
      }

      // Crear mensaje para WhatsApp
      const message = `¡Hola! Me interesa el producto "${productName}" de ${providerName}.\n\n` +
        `💰 Precio: ${productPrice}\n` +
        `📝 Descripción: ${this.selectedProduct.description}\n\n` +
        `¿Podrías darme más información sobre disponibilidad y cómo puedo adquirirlo?`;

      // Formatear número de teléfono (remover caracteres especiales y agregar código de país si es necesario)
      let phoneNumber = providerPhone.replace(/[^\d]/g, '');
      if (!phoneNumber.startsWith('57')) {
        phoneNumber = '57' + phoneNumber;
      }

      // Crear URL de WhatsApp
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

      // Abrir WhatsApp
      if (navigator.userAgent.includes('Mobile')) {
        // En móvil, abrir la app de WhatsApp
        window.open(whatsappUrl, '_blank');
      } else {
        // En desktop, abrir WhatsApp Web
        window.open(whatsappUrl, '_blank');
      }

      // Cerrar el modal después de abrir WhatsApp
      this.closeProductModal();
    }
}