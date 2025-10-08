import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, ToastController, AlertController, ActionSheetController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { Category, Provider, Question } from '../../models/provider.model';
import { MapAddressComponent, AddressData } from '../../components/map-address/map-address.component';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { firstValueFrom } from 'rxjs';

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
  
  // Datos iniciales para el componente de dirección
  initialAddressData: Partial<AddressData> = {
    country: 'Colombia'
  };
  providerId: string = '';

  // Gestión de productos
  products: any[] = [];
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

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private apiService: ApiService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private actionSheetController: ActionSheetController
  ) {}

  async ngOnInit() {
    this.providerId = this.route.snapshot.paramMap.get('id') || '';
    if (this.providerId) {
      await Promise.all([
        this.loadCategories(),
        this.loadProvider()
      ]);
    }
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
      console.log('EditService - Products loaded:', this.products);
    } catch (error) {
      console.error('Error loading products:', error);
      this.showErrorToast('Error al cargar los productos');
    }
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

      const response = await this.apiService.updateUserProvider(this.providerId, formData).toPromise();
      
      if (response) {
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

      // Imágenes
      this.productFormData.images.forEach((image, index) => {
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
}
