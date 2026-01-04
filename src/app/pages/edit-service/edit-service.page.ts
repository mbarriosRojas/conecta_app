import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, ToastController, AlertController, ActionSheetController, IonModal } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { CacheService } from '../../services/cache.service';
import { AuthService } from '../../services/auth.service';
import { Category, Provider, Question } from '../../models/provider.model';
import { MapAddressComponent, AddressData } from '../../components/map-address/map-address.component';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { firstValueFrom } from 'rxjs';
import { GeofencingAnalyticsService, GeofenceStats, GeofenceConfig, PromotionConfig } from '../../services/geofencing-analytics.service';

@Component({
  selector: 'app-edit-service',
  templateUrl: './edit-service.page.html',
  styleUrls: ['./edit-service.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, MapAddressComponent]
})
export class EditServicePage implements OnInit {
  categories: Category[] = [];
  provider: Provider | null = null;
  isLoading = false;
  
  // Control de secciones desplegables
  expandedSections = {
    basic: true,      // Información básica siempre abierta
    contact: false,
    social: false,
    location: false,
    products: false,
    schedule: false,
    questions: false,
    images: false,
    geofencing: false,
    geomarketing: false
  };
  
  // Datos iniciales para el componente de dirección
  initialAddressData: Partial<AddressData> = {
    country: 'Colombia'
  };
  providerId: string = '';

  // Gestión de productos
  products: any[] = [];
  filteredProducts: any[] = [];
  productSearchQuery: string = '';
  selectedProduct: any = null;
  productCategories: string[] = [
    // Comida y Bebidas
    'COMIDA', 'BEBIDAS', 'POSTRES', 'ACOMPAÑAMIENTOS', 'DESAYUNOS', 'ALMUERZOS', 'CENAS',
    'SNACKS', 'DULCES', 'HELADOS', 'CAFÉ', 'TÉ', 'JUGOS', 'LICORES',
    // Productos y Servicios Generales
    'PRODUCTOS', 'SERVICIOS', 'ACCESORIOS', 'ROPA', 'CALZADO', 'ELECTRÓNICOS',
    'HOGAR', 'DECORACIÓN', 'JARDÍN', 'HERRAMIENTAS', 'AUTOMOTRIZ',
    // Salud y Belleza
    'SALUD', 'BELLEZA', 'COSMÉTICOS', 'MEDICAMENTOS', 'SUPLEMENTOS',
    // Entretenimiento y Deportes
    'DEPORTES', 'FITNESS', 'ENTRETENIMIENTO', 'JUEGOS', 'LIBROS', 'MÚSICA',
    // Servicios Profesionales
    'CONSULTORÍA', 'EDUCACIÓN', 'TECNOLOGÍA', 'REPARACIONES', 'LIMPIEZA',
    'TRANSPORTE', 'TURISMO', 'EVENTOS', 'FOTOGRAFÍA', 'DISEÑO',
    // Otros
    'OTROS', 'PROMOCIONES', 'OFERTAS'
  ];
  isProductModalOpen = false;
  editingProduct: any = null;
  isLoadingProduct = false;
  productTagsInput = '';
  
  // Formulario de producto
  productFormData = {
    name: '',
    description: '',
    category: '',
    price: null as number | null,
    featured: false,
    isActive: true,
    stock: null as number | null,
    images: [] as File[]
  };
  
  // Form data
  formData = {
    name: '',
    description: '',
    categoryId: '',
    phone_contact: '',
    phone_number: '',
    email: '',
    site_web: '',
    video: '',
    facebook: '',
    instagram: '',
    tiktok: '',
    linkedin: '',
    isHighlighted: false,
    isVerified: false,
    slug: '',
    schedule: [
      { day: 'Lunes', active: true, start: '08:00', end: '18:00' },
      { day: 'Martes', active: true, start: '08:00', end: '18:00' },
      { day: 'Miércoles', active: true, start: '08:00', end: '18:00' },
      { day: 'Jueves', active: true, start: '08:00', end: '18:00' },
      { day: 'Viernes', active: true, start: '08:00', end: '18:00' },
      { day: 'Sábado', active: true, start: '08:00', end: '18:00' },
      { day: 'Domingo', active: false, start: '08:00', end: '18:00' }
    ],
    questions: [
      { question: '', answer: '' }
    ],
    address: {
      street: '',
      city: '',
      departament: '',
      country: 'Colombia',
      location: {
        type: 'Point',
        coordinates: [0, 0] // [lng, lat]
      }
    }
  };

  selectedImages: File[] = [];
  selectedLogo: File | null = null;
  currentLocation: { lat: number; lng: number } | null = null;
  imagesToDelete: string[] = [];
  
  // Variables para controlar la visibilidad de botones
  showLogoButton = false;
  showImagesButton = false;

  // Geofencing y Analytics
  @ViewChild('geofenceModal') geofenceModal!: IonModal;
  @ViewChild('promotionModal') promotionModal!: IonModal;
  
  geofenceStats: GeofenceStats | null = null;
  hasGeofence = false;
  hasPromotion = false;
  currentPromotion: any = null;
  isLoadingGeofence = false;
  isLoadingPromotion = false;
  promotionAudiencePreview: any = null;
  
  geofenceConfig: GeofenceConfig = {
    name: '',
    center: {
      latitude: 0,
      longitude: 0
    },
    radius: 200,
    description: '',
    notificationSettings: {
      onEntry: true,
      onExit: false,
      cooldownMinutes: 30
    }
  };
  
  promotionConfig: PromotionConfig = {
    businessName: '',
    promotion_text: '',
    location: {
      latitude: 0,
      longitude: 0
    },
    promo_radius_meters: 200,
    isActive: true,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 días desde hoy
  };

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private apiService: ApiService,
    private cacheService: CacheService,
    private authService: AuthService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private actionSheetController: ActionSheetController,
    private geofencingAnalyticsService: GeofencingAnalyticsService
  ) {}

  async ngOnInit() {
    this.providerId = this.route.snapshot.paramMap.get('id') || '';
    if (this.providerId) {
      await Promise.all([
        this.loadCategories(),
        this.loadProvider()
      ]);
      
      // Cargar estadísticas de geofencing después de cargar el provider
      await this.loadGeofenceStats();
    }
  }

  // Método para controlar secciones desplegables
  toggleSection(section: string) {
    this.expandedSections[section as keyof typeof this.expandedSections] = 
      !this.expandedSections[section as keyof typeof this.expandedSections];
  }

  async loadCategories() {
    try {
      const categories = await firstValueFrom(this.apiService.getCategories());
      this.categories = categories || [];
    } catch (error) {
      console.error('Error loading categories:', error);
      this.showErrorToast('Error al cargar las categorías');
    }
  }

  async loadProducts() {
    try {
      const response = await firstValueFrom(this.apiService.getProductsByProvider(this.providerId));
      // Los productos están en response.data.products
      this.products = (response?.data as any)?.products || [];
      this.filteredProducts = [...this.products]; // Inicializar productos filtrados
      console.log('EditService - Products loaded:', this.products);
    } catch (error) {
      console.error('Error loading products:', error);
      this.showErrorToast('Error al cargar los productos');
    }
  }

  /**
   * Filtra productos por nombre
   */
  filterProducts() {
    if (!this.productSearchQuery.trim()) {
      this.filteredProducts = [...this.products];
    } else {
      this.filteredProducts = this.products.filter(product =>
        product.name.toLowerCase().includes(this.productSearchQuery.toLowerCase())
      );
    }
  }

  /**
   * Selecciona un producto
   */
  selectProduct(product: any) {
    this.selectedProduct = product;
  }

  /**
   * Maneja errores de carga de imágenes
   */
  onImageError(event: any) {
    event.target.style.display = 'none';
    event.target.nextElementSibling.style.display = 'flex';
  }

  /**
   * Obtiene la fecha actual en formato ISO
   */
  getCurrentDate(): string {
    return new Date().toISOString();
  }

  async loadProvider() {
    const loading = await this.loadingController.create({
      message: 'Cargando servicio...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const response = await firstValueFrom(this.apiService.getUserProviderById(this.providerId));
      if (response?.data) {
        this.provider = response.data;
        this.populateForm();
        // Inicializar visibilidad de botones
        this.initializeButtonVisibility();
        // Cargar productos después de cargar el proveedor
        await this.loadProducts();
      }
    } catch (error) {
      console.error('Error loading provider:', error);
      this.showErrorToast('Error al cargar el servicio');
      this.router.navigate(['/tabs/services']);
    } finally {
      await loading.dismiss();
    }
  }

  initializeButtonVisibility() {
    // Mostrar botón de logo solo si no hay logo existente
    this.showLogoButton = !this.provider?.logo;
    
    // Mostrar botón de imágenes solo si no hay imágenes existentes
    this.showImagesButton = !this.provider?.images || this.provider.images.length === 0;
  }

  deleteLogo() {
    if (this.provider?.logo) {
      this.imagesToDelete.push('logo');
      this.provider.logo = '';
      this.showLogoButton = true; // Mostrar botón para seleccionar nuevo logo
      this.showSuccessToast('Logo marcado para eliminar');
    }
  }

  deleteImage(imageUrl: string, index: number) {
    if (this.provider?.images) {
      this.imagesToDelete.push(imageUrl);
      this.provider.images.splice(index, 1);
      
      // Si no quedan imágenes, mostrar botón para seleccionar
      if (this.provider.images.length === 0) {
        this.showImagesButton = true;
      }
      
      this.showSuccessToast('Imagen marcada para eliminar');
    }
  }

  populateForm() {
    if (!this.provider) return;

    this.formData = {
      name: this.provider.name || '',
      description: this.provider.description || '',
      categoryId: typeof this.provider.categoryId === 'object' ? this.provider.categoryId?._id || '' : this.provider.categoryId || '',
      phone_contact: this.provider.phone_contact || '',
      phone_number: this.provider.phone_number || '',
      email: this.provider.email || '',
      site_web: this.provider.site_web || '',
      video: this.provider.video || '',
      facebook: this.provider.social?.facebook || '',
      instagram: this.provider.social?.instagram || '',
      tiktok: this.provider.social?.tiktok || '',
      linkedin: this.provider.social?.linkedin || '',
      isHighlighted: this.provider.stand_out || false,
      isVerified: this.provider.verified || false,
      slug: this.provider.slug || '',
      schedule: this.provider.schedule || this.formData.schedule,
      questions: this.provider.questions || [{ question: '', answer: '' }],
      address: this.provider.address || this.formData.address
    };

    // Set current location if available
    if (this.provider.address?.location?.coordinates) {
      this.currentLocation = {
        lat: this.provider.address.location.coordinates[1],
        lng: this.provider.address.location.coordinates[0]
      };
      
      // Inicializar datos de dirección para el componente de mapa
      this.initialAddressData = {
        street: this.provider.address.street || '',
        city: this.provider.address.city || '',
        department: this.provider.address.departament || '',
        country: this.provider.address.country || 'Colombia',
        coordinates: {
          lat: this.provider.address.location.coordinates[1],
          lng: this.provider.address.location.coordinates[0]
        },
        formattedAddress: `${this.provider.address.street || ''}, ${this.provider.address.city || ''}, ${this.provider.address.country || 'Colombia'}`
      };
    }
  }

  // Métodos para manejar la dirección con mapa
  onAddressSelected(addressData: AddressData) {
    console.log('Dirección seleccionada:', addressData);
    
    // Actualizar los datos del formulario con la dirección seleccionada
    this.formData.address.street = addressData.street;
    this.formData.address.city = addressData.city;
    this.formData.address.departament = addressData.department;
    this.formData.address.country = addressData.country;
    
    // Actualizar las coordenadas
    this.formData.address.location.coordinates = [
      addressData.coordinates.lng,
      addressData.coordinates.lat
    ];
    
    this.showSuccessToast('Ubicación actualizada');
  }

  onAddressChanged(addressData: Partial<AddressData>) {
    // Actualizar en tiempo real mientras el usuario interactúa con el mapa
    if (addressData.street) {
      this.formData.address.street = addressData.street;
    }
    if (addressData.city) {
      this.formData.address.city = addressData.city;
    }
    if (addressData.department) {
      this.formData.address.departament = addressData.department;
    }
    if (addressData.coordinates) {
      this.formData.address.location.coordinates = [
        addressData.coordinates.lng,
        addressData.coordinates.lat
      ];
    }
  }

  async selectLogo() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Seleccionar logo del servicio',
      buttons: [
        {
          text: 'Tomar foto',
          icon: 'camera',
          handler: () => {
            this.takePhoto('logo');
          }
        },
        {
          text: 'Elegir de galería',
          icon: 'images',
          handler: () => {
            this.selectFromGallery('logo');
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

  async selectImages() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Seleccionar imágenes del servicio',
      buttons: [
        {
          text: 'Tomar foto',
          icon: 'camera',
          handler: () => {
            this.takePhoto('images');
          }
        },
        {
          text: 'Elegir de galería',
          icon: 'images',
          handler: () => {
            this.selectFromGallery('images');
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

  async takePhoto(type: 'logo' | 'images') {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });

      if (image.webPath) {
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        if (type === 'logo') {
          this.selectedLogo = file;
          this.showLogoButton = false; // Ocultar botón después de seleccionar
        } else {
          this.selectedImages.push(file);
          this.showImagesButton = false; // Ocultar botón después de seleccionar
        }
        
        this.showSuccessToast('Foto tomada correctamente');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      this.showErrorToast('Error al tomar la foto');
    }
  }

  async selectFromGallery(type: 'logo' | 'images') {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos
      });

      if (image.webPath) {
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        const file = new File([blob], `gallery_${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        if (type === 'logo') {
          this.selectedLogo = file;
          this.showLogoButton = false; // Ocultar botón después de seleccionar
        } else {
          this.selectedImages.push(file);
          this.showImagesButton = false; // Ocultar botón después de seleccionar
        }
        
        this.showSuccessToast('Imagen seleccionada correctamente');
      }
    } catch (error) {
      console.error('Error selecting from gallery:', error);
      this.showErrorToast('Error al seleccionar la imagen');
    }
  }

  // Métodos para productos
  async selectProductImages() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Seleccionar imágenes del producto',
      buttons: [
        {
          text: 'Tomar foto',
          icon: 'camera',
          handler: () => {
            this.takeProductPhoto();
          }
        },
        {
          text: 'Elegir de galería',
          icon: 'images',
          handler: () => {
            this.selectProductFromGallery();
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

  async takeProductPhoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });

      if (image.webPath) {
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        const file = new File([blob], `product_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        this.productFormData.images.push(file);
        this.showSuccessToast('Foto del producto tomada correctamente');
      }
    } catch (error) {
      console.error('Error taking product photo:', error);
      this.showErrorToast('Error al tomar la foto del producto');
    }
  }

  async selectProductFromGallery() {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos
      });

      if (image.webPath) {
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        const file = new File([blob], `product_gallery_${Date.now()}.jpg`, { type: 'image/jpeg' });
        this.productFormData.images.push(file);
        this.showSuccessToast('Imagen del producto seleccionada correctamente');
      }
    } catch (error) {
      console.error('Error selecting product from gallery:', error);
      this.showErrorToast('Error al seleccionar la imagen del producto');
    }
  }

  onLogoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedLogo = file;
    }
  }

  onImagesSelected(event: any) {
    const files = Array.from(event.target.files) as File[];
    this.selectedImages = files;
  }

  addQuestion() {
    this.formData.questions.push({ question: '', answer: '' });
  }

  removeQuestion(index: number) {
    this.formData.questions.splice(index, 1);
  }

  updateSchedule(dayIndex: number, field: string, value: any) {
    (this.formData.schedule[dayIndex] as any)[field] = value;
  }

  async onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Actualizando servicio...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const formData = new FormData();
      
      // 🔥 IMPORTANTE: Agregar userId del usuario autenticado
      const currentUser = this.authService.getCurrentUser();
      if (currentUser) {
        formData.append('userId', currentUser.id);
        console.log('✅ Agregando userId al formulario de edición:', currentUser.id);
      } else {
        console.error('❌ No se encontró usuario autenticado');
        this.showErrorToast('Debes estar logueado para editar un servicio');
        return;
      }
      
      // Basic information
      formData.append('name', this.formData.name);
      formData.append('description', this.formData.description);
      formData.append('category', this.formData.categoryId);
      formData.append('phone_contact', this.formData.phone_contact);
      formData.append('phone_number', this.formData.phone_number);
      formData.append('email', this.formData.email);
      formData.append('site_web', this.formData.site_web);
      formData.append('video', this.formData.video);
      formData.append('isHighlighted', this.formData.isHighlighted.toString());
      formData.append('isVerified', this.formData.isVerified.toString());
      formData.append('slug', this.formData.slug);

      // Social media
      formData.append('facebook', this.formData.facebook);
      formData.append('instagram', this.formData.instagram);
      formData.append('tiktok', this.formData.tiktok);
      formData.append('linkedin', this.formData.linkedin);

      // Schedule and questions
      formData.append('schedule', JSON.stringify(this.formData.schedule));
      formData.append('questions', JSON.stringify(this.formData.questions));

      // Address
      formData.append('address', JSON.stringify(this.formData.address));

      // Images to delete
      formData.append('imagesToDelete', JSON.stringify(this.imagesToDelete));

      // Images
      if (this.selectedLogo) {
        formData.append('logo', this.selectedLogo);
      }
      
      if (this.selectedImages.length > 0) {
        this.selectedImages.forEach((image, index) => {
          formData.append('images', image);
        });
      }

      const response = await firstValueFrom(this.apiService.updateUserProvider(this.providerId, formData));
      
      if (response) {
        // 🔥 OPTIMIZADO: Invalidar todos los caches relacionados con providers
        await this.cacheService.invalidateProviderCaches();
        // También invalidar el detalle específico del provider
        await this.cacheService.invalidateCache(`provider_detail_${this.providerId}`);
        
        console.log('✅ Cache invalidado - el servicio actualizado aparecerá inmediatamente');
        this.showSuccessToast('Servicio actualizado correctamente');
        this.router.navigate(['/tabs/services']);
      }
    } catch (error) {
      console.error('Error updating provider:', error);
      this.showErrorToast('Error al actualizar el servicio');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

  validateForm(): boolean {
    if (!this.formData.name.trim()) {
      this.showErrorToast('El nombre es requerido');
      return false;
    }
    
    if (!this.formData.description.trim()) {
      this.showErrorToast('La descripción es requerida');
      return false;
    }
    
    if (!this.formData.categoryId) {
      this.showErrorToast('La categoría es requerida');
      return false;
    }
    
    if (!this.formData.phone_contact.trim()) {
      this.showErrorToast('El teléfono de contacto es requerido');
      return false;
    }
    
    if (!this.formData.address.street.trim()) {
      this.showErrorToast('La dirección es requerida');
      return false;
    }
    
    if (!this.formData.address.city.trim()) {
      this.showErrorToast('La ciudad es requerida');
      return false;
    }
    
    return true;
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

  // ===== MÉTODOS PARA GESTIÓN DE PRODUCTOS =====

  openProductModal(product?: any) {
    this.editingProduct = product || null;
    
    if (product) {
      // Editar producto existente
      this.productFormData = {
        name: product.name || '',
        description: product.description || '',
        category: product.category || '',
        price: product.price || null,
        featured: product.featured || false,
        isActive: product.isActive !== undefined ? product.isActive : true,
        stock: product.stock || null,
        images: []
      };
      this.productTagsInput = product.tags ? product.tags.join(', ') : '';
    } else {
      // Nuevo producto
      this.productFormData = {
        name: '',
        description: '',
        category: '',
        price: null,
        featured: false,
        isActive: true,
        stock: null,
        images: []
      };
      this.productTagsInput = '';
    }
    
    this.isProductModalOpen = true;
  }

  closeProductModal() {
    this.isProductModalOpen = false;
    this.editingProduct = null;
    this.productFormData = {
      name: '',
      description: '',
      category: '',
      price: null,
      featured: false,
      isActive: true,
      stock: null,
      images: []
    };
    this.productTagsInput = '';
  }

  onProductImagesSelected(event: any) {
    const files = Array.from(event.target.files) as File[];
    this.productFormData.images = files;
  }

  async saveProduct() {
    if (!this.validateProductForm()) {
      return;
    }

    this.isLoadingProduct = true;

    try {
      const formData = new FormData();
      
      // Datos básicos del producto
      formData.append('name', this.productFormData.name);
      formData.append('description', this.productFormData.description);
      formData.append('category', this.productFormData.category);
      formData.append('providerId', this.providerId);
      
      if (this.productFormData.price !== null) {
        formData.append('price', this.productFormData.price.toString());
      }
      
      formData.append('featured', this.productFormData.featured.toString());
      formData.append('isActive', this.productFormData.isActive.toString());
      
      if (this.productFormData.stock !== null) {
        formData.append('stock', this.productFormData.stock.toString());
      }

      // Tags
      if (this.productTagsInput.trim()) {
        const tags = this.productTagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
        formData.append('tags', JSON.stringify(tags));
      }

      // 🔥 Imágenes - Agregar logging para debugging
      console.log('📸 Agregando imágenes al FormData:', this.productFormData.images.length);
      this.productFormData.images.forEach((image, index) => {
        console.log(`📸 Imagen ${index + 1}:`, image.name, image.size, 'bytes');
        formData.append('images', image);
      });

      let response;
      if (this.editingProduct) {
        // Actualizar producto existente
        response = await firstValueFrom(this.apiService.updateProduct(this.editingProduct._id, formData));
      } else {
        // Crear nuevo producto
        response = await firstValueFrom(this.apiService.createProduct(formData));
      }

      if (response) {
        // 🔥 OPTIMIZADO: Invalidar todos los caches relacionados con providers
        await this.cacheService.invalidateProviderCaches();
        // También invalidar el detalle específico del provider
        await this.cacheService.invalidateCache(`provider_detail_${this.providerId}`);
        
        console.log('✅ Cache invalidado - el producto aparecerá inmediatamente');
        this.showSuccessToast(this.editingProduct ? 'Producto actualizado correctamente' : 'Producto creado correctamente');
        this.closeProductModal();
        await this.loadProducts(); // Recargar lista de productos
      }
    } catch (error) {
      console.error('Error saving product:', error);
      this.showErrorToast('Error al guardar el producto');
    } finally {
      this.isLoadingProduct = false;
    }
  }

  validateProductForm(): boolean {
    if (!this.productFormData.name.trim()) {
      this.showErrorToast('El nombre del producto es requerido');
      return false;
    }
    
    if (!this.productFormData.description.trim()) {
      this.showErrorToast('La descripción del producto es requerida');
      return false;
    }
    
    if (!this.productFormData.category) {
      this.showErrorToast('La categoría del producto es requerida');
      return false;
    }
    
    // 🔥 IMPORTANTE: Validar que se hayan seleccionado imágenes
    if (!this.productFormData.images || this.productFormData.images.length === 0) {
      this.showErrorToast('Debe seleccionar al menos una imagen para el producto');
      return false;
    }
    
    console.log('✅ Validación de producto exitosa, imágenes:', this.productFormData.images.length);
    return true;
  }

  async deleteProduct(productId: string, index: number) {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: '¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              const response = await firstValueFrom(this.apiService.deleteProduct(productId));
              if (response) {
                // 🔥 OPTIMIZADO: Invalidar todos los caches relacionados con providers
                await this.cacheService.invalidateProviderCaches();
                // También invalidar el detalle específico del provider
                await this.cacheService.invalidateCache(`provider_detail_${this.providerId}`);
                
                console.log('✅ Cache invalidado - el producto eliminado se reflejará inmediatamente');
                this.products.splice(index, 1);
                this.showSuccessToast('Producto eliminado correctamente');
              }
            } catch (error) {
              console.error('Error deleting product:', error);
              this.showErrorToast('Error al eliminar el producto');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  editProduct(product: any) {
    this.openProductModal(product);
  }

  // ========== Métodos de Geofencing y Analytics ==========

  /**
   * Carga las estadísticas de geofencing del negocio
   */
  async loadGeofenceStats() {
    if (!this.provider?._id) return;

    try {
      const response = await firstValueFrom(
        this.geofencingAnalyticsService.getBusinessStats(this.provider._id)
      );

      if (response?.status === 'success' && response.data) {
        this.geofenceStats = response.data;
        this.hasGeofence = !!response.data.geofence;
        this.hasPromotion = !!response.data.promotion;
        this.currentPromotion = response.data.promotion;
      }
    } catch (error: any) {
      if (error.status !== 404) {
        console.error('Error loading geofence stats:', error);
      } else {
        // No existe geocerca aún
        this.hasGeofence = false;
        this.hasPromotion = false;
      }
    }
  }

  /**
   * Abre el modal de configuración de geocerca
   */
  async openGeofenceConfigModal() {
    if (!this.provider) return;

    // Configurar datos iniciales
    this.geofenceConfig.center = {
      latitude: this.provider.address?.location?.coordinates?.[1] || 0,
      longitude: this.provider.address?.location?.coordinates?.[0] || 0
    };
    this.geofenceConfig.name = this.provider.name;

    // Si ya existe una geocerca, cargar sus datos
    if (this.hasGeofence && this.geofenceStats?.geofence) {
      const geofence = this.geofenceStats.geofence;
      this.geofenceConfig = {
        name: geofence.name,
        center: geofence.center,
        radius: geofence.radius,
        description: '',
        notificationSettings: geofence.stats ? {
          onEntry: true,
          onExit: false,
          cooldownMinutes: 30
        } : {
          onEntry: true,
          onExit: false,
          cooldownMinutes: 30
        }
      };
    }

    this.geofenceModal.present();
  }

  /**
   * Cierra el modal de configuración de geocerca
   */
  closeGeofenceModal() {
    this.geofenceModal.dismiss();
  }

  /**
   * Guarda la configuración de la geocerca
   */
  async saveGeofence() {
    if (!this.provider?._id) return;

    this.isLoadingGeofence = true;

    try {
      const response = await firstValueFrom(
        this.geofencingAnalyticsService.createOrUpdateGeofence(
          this.provider._id,
          this.geofenceConfig
        )
      );

      if (response?.status === 'success') {
        this.showSuccessToast('Geocerca guardada exitosamente');
        this.closeGeofenceModal();
        await this.loadGeofenceStats();
      }
    } catch (error) {
      console.error('Error saving geofence:', error);
      this.showErrorToast('Error al guardar la geocerca');
    } finally {
      this.isLoadingGeofence = false;
    }
  }

  /**
   * Elimina la geocerca del negocio
   */
  async deleteGeofence() {
    if (!this.provider?._id) return;

    const alert = await this.alertController.create({
      header: 'Confirmar Eliminación',
      message: '¿Estás seguro de eliminar esta geocerca? Perderás todas las estadísticas asociadas.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await firstValueFrom(
                this.geofencingAnalyticsService.deleteGeofence(this.provider!._id)
              );
              
              this.showSuccessToast('Geocerca eliminada exitosamente');
              this.closeGeofenceModal();
              this.hasGeofence = false;
              this.geofenceStats = null;
            } catch (error) {
              console.error('Error deleting geofence:', error);
              this.showErrorToast('Error al eliminar la geocerca');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Abre el modal de creación/edición de promoción
   */
  async openPromotionModal() {
    if (!this.provider) return;

    // Configurar datos iniciales
    this.promotionConfig.businessName = this.provider.name;
    this.promotionConfig.location = {
      latitude: this.provider.address?.location?.coordinates?.[1] || 0,
      longitude: this.provider.address?.location?.coordinates?.[0] || 0
    };

    // Si ya existe una promoción, cargar sus datos
    if (this.hasPromotion && this.currentPromotion) {
      this.promotionConfig = {
        businessName: this.currentPromotion.businessName || this.provider.name,
        promotion_text: this.currentPromotion.text || '',
        location: {
          latitude: this.currentPromotion.location?.coordinates?.[1] || this.provider.address?.location?.coordinates?.[1] || 0,
          longitude: this.currentPromotion.location?.coordinates?.[0] || this.provider.address?.location?.coordinates?.[0] || 0
        },
        promo_radius_meters: this.currentPromotion.radius || 200,
        isActive: this.currentPromotion.isActive !== undefined ? this.currentPromotion.isActive : true,
        startDate: this.currentPromotion.startDate || new Date().toISOString(),
        endDate: this.currentPromotion.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };
    }

    // Calcular alcance estimado
    await this.calculatePromotionReach();

    this.promotionModal.present();
  }

  /**
   * Cierra el modal de promoción
   */
  closePromotionModal() {
    this.promotionModal.dismiss();
  }

  /**
   * Guarda la promoción
   */
  async savePromotion() {
    if (!this.provider?._id) return;

    if (!this.promotionConfig.promotion_text || this.promotionConfig.promotion_text.trim() === '') {
      this.showErrorToast('El texto de la promoción es requerido');
      return;
    }

    this.isLoadingPromotion = true;

    try {
      const response = await firstValueFrom(
        this.geofencingAnalyticsService.createOrUpdatePromotion(
          this.provider._id,
          this.promotionConfig
        )
      );

      if (response?.status === 'success') {
        // 🔥 OPTIMIZADO: Invalidar caches relacionados con promociones
        await this.cacheService.invalidatePromotionCaches();
        await this.cacheService.invalidateCache(`provider_detail_${this.providerId}`);
        
        this.showSuccessToast('Promoción guardada exitosamente');
        this.closePromotionModal();
        await this.loadGeofenceStats();
      }
    } catch (error) {
      console.error('Error saving promotion:', error);
      this.showErrorToast('Error al guardar la promoción');
    } finally {
      this.isLoadingPromotion = false;
    }
  }

  /**
   * Elimina la promoción del negocio
   */
  async deletePromotion() {
    if (!this.provider?._id) return;

    const alert = await this.alertController.create({
      header: 'Confirmar Eliminación',
      message: '¿Estás seguro de eliminar esta promoción?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await firstValueFrom(
                this.geofencingAnalyticsService.deletePromotion(this.provider!._id)
              );
              
              this.showSuccessToast('Promoción eliminada exitosamente');
              this.closePromotionModal();
              this.hasPromotion = false;
              this.currentPromotion = null;
              await this.loadGeofenceStats();
            } catch (error) {
              console.error('Error deleting promotion:', error);
              this.showErrorToast('Error al eliminar la promoción');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Prueba el envío de notificaciones push para la promoción actual
   */
  async testPromotionNotification() {
    if (!this.provider?._id || !this.promotionConfig.promotion_text) {
      this.showErrorToast('Primero guarda la promoción para probar las notificaciones');
      return;
    }

    try {
      this.showSuccessToast('Enviando notificación de prueba...');
      
      // Simular el envío de notificación guardando la promoción
      // (esto activará automáticamente el envío de notificaciones en el backend)
      await this.savePromotion();
      
      this.showSuccessToast('Notificación de prueba enviada. Revisa los logs del backend.');
      
    } catch (error) {
      console.error('Error testing notification:', error);
      this.showErrorToast('Error al probar la notificación');
    }
  }

  /**
   * Calcula el alcance estimado de la promoción
   */
  async calculatePromotionReach() {
    if (!this.provider?._id) return;

    try {
      // Obtener coordenadas del provider para cálculo más preciso
      const latitude = this.provider.address?.location?.coordinates?.[1];
      const longitude = this.provider.address?.location?.coordinates?.[0];
      
      const response = await firstValueFrom(
        this.geofencingAnalyticsService.getPromotionReach(
          this.provider._id,
          this.promotionConfig.promo_radius_meters,
          latitude,
          longitude
        )
      );

      if (response && response.status === 'success') {
        this.promotionAudiencePreview = response.data;
      }
    } catch (error) {
      console.error('Error calculating promotion reach:', error);
      this.promotionAudiencePreview = {
        activeUsers4h: 0,
        estimatedReach: 0
      };
    }
  }

  /**
   * Formateador para el pin del rango de radio
   */
  formatRadiusPin = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}km`;
    }
    return `${value}m`;
  };

  /**
   * 🔥 NUEVO: Navega a la página de Mis Promociones
   */
  goToMyPromotions() {
    if (!this.provider?._id) {
      this.showErrorToast('Provider no cargado');
      return;
    }

    this.router.navigate(['/my-promotions'], {
      queryParams: {
        businessID: this.provider._id,
        businessName: this.provider.name
      }
    });
  }
}
