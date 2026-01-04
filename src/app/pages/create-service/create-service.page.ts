import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { firstValueFrom } from 'rxjs';
import { CacheService } from '../../services/cache.service';
import { AuthService } from '../../services/auth.service';
import { Category, Question } from '../../models/provider.model';
import { MapAddressComponent, AddressData } from '../../components/map-address/map-address.component';

@Component({
  selector: 'app-create-service',
  templateUrl: './create-service.page.html',
  styleUrls: ['./create-service.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, MapAddressComponent]
})
export class CreateServicePage implements OnInit {
  categories: Category[] = [];
  isLoading = false;
  
  // Control de secciones desplegables
  expandedSections = {
    basic: true,      // Información básica siempre abierta
    contact: false,
    social: false,
    schedule: false,
    questions: false,
    images: false
  };
  
  // Previsualización de imágenes
  logoPreview: string | null = null;
  imagesPreviews: string[] = [];
  
  // Datos iniciales para el componente de dirección
  initialAddressData: Partial<AddressData> = {
    country: 'Colombia',
    coordinates: { lat: 4.6097, lng: -74.0817 } // Bogotá por defecto
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
    facebook: '',
    instagram: '',
    tiktok: '',
    linkedin: '',
    isHighlighted: false,
    isVerified: false,
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

  constructor(
    public router: Router,
    private apiService: ApiService,
    private cacheService: CacheService,
    private authService: AuthService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.loadCategories();
    // Inicializar con ubicación por defecto (Bogotá)
  }

  // Método para controlar secciones desplegables
  toggleSection(section: string) {
    this.expandedSections[section as keyof typeof this.expandedSections] = 
      !this.expandedSections[section as keyof typeof this.expandedSections];
  }

  async loadCategories() {
    try {
      this.categories = await firstValueFrom(this.apiService.getCategories()) || [];
    } catch (error) {
      console.error('Error loading categories:', error);
      this.showErrorToast('Error al cargar las categorías');
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
    
    this.showSuccessToast('Ubicación confirmada');
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

  onLogoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedLogo = file;
      // Crear previsualización
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.logoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onImagesSelected(event: any) {
    const files = Array.from(event.target.files) as File[];
    this.selectedImages = files;
    
    // Crear previsualizaciones
    this.imagesPreviews = [];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagesPreviews.push(e.target.result);
      };
      reader.readAsDataURL(file);
    });
  }

  // Métodos para manejar previsualización de imágenes
  triggerLogoUpload() {
    const logoInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (logoInput) {
      logoInput.click();
    }
  }

  triggerImagesUpload() {
    const imagesInput = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;
    if (imagesInput) {
      imagesInput.click();
    }
  }

  removeLogo() {
    this.selectedLogo = null;
    this.logoPreview = null;
  }

  removeImage(index: number) {
    this.selectedImages.splice(index, 1);
    this.imagesPreviews.splice(index, 1);
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
      message: 'Creando servicio...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const formData = new FormData();
      
      // 🔥 IMPORTANTE: Agregar userId del usuario autenticado
      const currentUser = this.authService.getCurrentUser();
      if (currentUser) {
        formData.append('userId', currentUser.id);
        console.log('✅ Agregando userId al formulario:', currentUser.id);
      } else {
        console.error('❌ No se encontró usuario autenticado');
        this.showErrorToast('Debes estar logueado para crear un servicio');
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
      formData.append('isHighlighted', this.formData.isHighlighted.toString());
      formData.append('isVerified', this.formData.isVerified.toString());

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

      // Images
      if (this.selectedLogo) {
        formData.append('logo', this.selectedLogo);
      }
      
      if (this.selectedImages.length > 0) {
        this.selectedImages.forEach((image, index) => {
          formData.append('images', image);
        });
      }

      const response = await firstValueFrom(this.apiService.createProvider(formData));
      
      if (response) {
        // 🔥 OPTIMIZADO: Invalidar todos los caches relacionados con providers
        await this.cacheService.invalidateProviderCaches();
        
        console.log('✅ Cache invalidado - el servicio aparecerá inmediatamente');
        this.showSuccessToast('Servicio creado correctamente');
        this.router.navigate(['/tabs/services']);
      }
    } catch (error) {
      console.error('Error creating provider:', error);
      this.showErrorToast('Error al crear el servicio');
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
    
    if (!this.selectedImages || this.selectedImages.length === 0) {
      this.showErrorToast('Debe seleccionar al menos una imagen');
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
}
