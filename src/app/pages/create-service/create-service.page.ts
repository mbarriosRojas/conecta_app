import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { CacheService } from '../../services/cache.service';
import { AuthService } from '../../services/auth.service';
import { SubscriptionService } from '../../services/subscription.service';
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
  canCreateService = true; // 🔥 NUEVO: Controla si el usuario puede crear el servicio
  
  // Control de secciones desplegables
  expandedSections = {
    basic: true,      // Información básica siempre abierta
    contact: false,
    social: false,
    location: false,
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
    private subscriptionService: SubscriptionService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    // 🔥 NUEVO: Validar límites ANTES de cargar el formulario
    await this.checkServiceLimit();
    this.loadCategories();
    // Inicializar con ubicación por defecto (Bogotá)
  }

  // 🔥 NUEVO: Verificar límites al inicio
  async checkServiceLimit() {
    try {
      const limitCheck = await this.subscriptionService.checkLimitBeforeCreate('service');
      
      if (!limitCheck.allowed) {
        this.canCreateService = false;
        
        // Mostrar alerta y redirigir
        const alert = await this.alertController.create({
          header: '🚀 ¡Actualiza tu Plan!',
          message: limitCheck.message || 'Has alcanzado el límite de servicios de tu plan actual. 💎 Actualiza tu plan para crear más servicios y hacer crecer tu negocio.',
          buttons: [
            {
              text: '✨ Ver Planes',
              handler: () => {
                this.router.navigate(['/tabs/tab3']);
              }
            },
            {
              text: 'Volver',
              handler: () => {
                this.router.navigate(['/tabs/services']);
              }
            }
          ],
          backdropDismiss: false // No permitir cerrar sin seleccionar una opción
        });
        
        await alert.present();
        return;
      }
      
      this.canCreateService = true;
    } catch (error: any) {
      console.error('Error verificando límites al inicio:', error);
      
      // Si es 404, permitir continuar (el backend validará)
      if (error.status === 404) {
        this.canCreateService = true;
        return;
      }
      
      // Si es 401, redirigir a login
      if (error.status === 401) {
        this.router.navigate(['/login']);
        return;
      }
      
      // Otros errores: permitir continuar (el backend validará)
      this.canCreateService = true;
    }
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
    
    // Validar límite de 3 imágenes
    const totalAfterAdd = this.selectedImages.length + files.length;
    if (totalAfterAdd > 3) {
      this.showErrorToast(`Máximo 3 imágenes permitidas. Ya tienes ${this.selectedImages.length}, puedes agregar ${3 - this.selectedImages.length} más.`);
      // Resetear el input
      event.target.value = '';
      return;
    }
    
    // Agregar nuevas imágenes a las existentes (no reemplazar)
    files.forEach(file => {
      // Validar tamaño (5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.showErrorToast(`La imagen ${file.name} excede el tamaño máximo de 5MB`);
        return;
      }
      
      this.selectedImages.push(file);
      
      // Crear previsualización
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagesPreviews.push(e.target.result);
      };
      reader.readAsDataURL(file);
    });
    
    // Resetear el input para permitir seleccionar más imágenes
    event.target.value = '';
  }

  // Métodos para manejar previsualización de imágenes
  triggerLogoUpload() {
    const logoInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (logoInput) {
      logoInput.click();
    }
  }

  triggerImagesUpload() {
    // Buscar el input de imágenes específicamente
    const imagesInput = document.querySelector('input[type="file"][multiple]') as HTMLInputElement;
    if (imagesInput) {
      imagesInput.click();
    }
  }

  removeLogo() {
    this.selectedLogo = null;
    this.logoPreview = null;
  }

  removeImage(index: number) {
    if (index >= 0 && index < this.selectedImages.length) {
      this.selectedImages.splice(index, 1);
      this.imagesPreviews.splice(index, 1);
    }
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

    // 🔥 NUEVO: Validar límites del plan ANTES de crear el servicio
    const loadingCheck = await this.loadingController.create({
      message: 'Verificando límites del plan...',
      spinner: 'crescent',
      backdropDismiss: false
    });
    await loadingCheck.present();

    try {
      const limitCheck = await this.subscriptionService.checkLimitBeforeCreate('service');
      
      if (!limitCheck.allowed) {
        await loadingCheck.dismiss();
        
        // Mostrar alerta con opción de cambiar plan
        const alert = await this.alertController.create({
          header: '🚀 ¡Actualiza tu Plan!',
          message: limitCheck.message || 'Has alcanzado el límite de servicios de tu plan actual. 💎 Actualiza tu plan para crear más servicios y hacer crecer tu negocio.',
          buttons: [
            {
              text: '✨ Ver Planes',
              handler: () => {
                this.router.navigate(['/tabs/tab3']);
              }
            },
            {
              text: 'Cancelar',
              role: 'cancel'
            }
          ]
        });
        await alert.present();
        return;
      }
      } catch (error: any) {
        console.error('Error verificando límites:', error);
        await loadingCheck.dismiss();
        
        // Si hay error pero no es crítico, continuar (el backend también validará)
        if (error.status === 401) {
          await this.showErrorToast('Debes estar logueado para crear un servicio');
          return;
        }
        
        // Si es 404, el endpoint no está disponible, continuar (backend validará)
        if (error.status === 404) {
          console.warn('⚠️ Endpoint de verificación de límites no disponible, continuando...');
          // Continuar con la creación, el backend validará
        }
      } finally {
        await loadingCheck.dismiss();
      }

    // 🔥 MEJORADO: Crear loading antes de validaciones adicionales
    const loading = await this.loadingController.create({
      message: 'Creando servicio...',
      spinner: 'crescent',
      backdropDismiss: false // Evitar que se cierre accidentalmente
    });
    await loading.present();

    this.isLoading = true;

    try {
      // 🔥 IMPORTANTE: Validar usuario autenticado ANTES de crear FormData
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        console.error('❌ No se encontró usuario autenticado');
        await loading.dismiss();
        this.isLoading = false;
        await this.showErrorToast('Debes estar logueado para crear un servicio');
        return;
      }

      const formData = new FormData();
      
      // Agregar userId del usuario autenticado
      formData.append('userId', currentUser.id);
      console.log('✅ Agregando userId al formulario:', currentUser.id);
      
      // Basic information
      formData.append('name', this.formData.name.trim());
      formData.append('description', this.formData.description.trim());
      formData.append('category', this.formData.categoryId);
      formData.append('phone_contact', this.formData.phone_contact.trim());
      formData.append('phone_number', this.formData.phone_number.trim() || '');
      formData.append('email', this.formData.email.trim() || '');
      formData.append('site_web', this.formData.site_web.trim() || '');
      formData.append('isHighlighted', this.formData.isHighlighted.toString());
      formData.append('isVerified', this.formData.isVerified.toString());

      // Social media
      formData.append('facebook', this.formData.facebook.trim() || '');
      formData.append('instagram', this.formData.instagram.trim() || '');
      formData.append('tiktok', this.formData.tiktok.trim() || '');
      formData.append('linkedin', this.formData.linkedin.trim() || '');

      // Schedule and questions
      formData.append('schedule', JSON.stringify(this.formData.schedule));
      formData.append('questions', JSON.stringify(this.formData.questions));

      // Address - Validar que tenga coordenadas válidas
      if (!this.formData.address.location.coordinates || 
          this.formData.address.location.coordinates[0] === 0 || 
          this.formData.address.location.coordinates[1] === 0) {
        await loading.dismiss();
        this.isLoading = false;
        await this.showErrorToast('Por favor, confirma la ubicación en el mapa');
        return;
      }
      
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

      // 🔥 MEJORADO: Agregar timeout y mejor manejo de errores
      console.log('📤 Enviando petición para crear servicio...');
      
      const response = await firstValueFrom(
        this.apiService.createProvider(formData).pipe(
          timeout(60000) // Timeout de 60 segundos
        )
      );
      
      // 🔥 MEJORADO: Validar respuesta del servidor
      if (response && response.status === 'success') {
        console.log('✅ Servicio creado exitosamente:', response);
        
        // Invalidar todos los caches relacionados con providers
        await this.cacheService.invalidateProviderCaches();
        
        console.log('✅ Cache invalidado - el servicio aparecerá inmediatamente');
        await loading.dismiss();
        await this.showSuccessToast('Servicio creado correctamente');
        
        // Navegar después de mostrar el toast
        setTimeout(() => {
          this.router.navigate(['/tabs/services']);
        }, 500);
      } else {
        // Respuesta del servidor indica error
        const errorMessage = response?.message || 'El servidor no respondió correctamente';
        console.error('❌ Error en respuesta del servidor:', response);
        await loading.dismiss();
        this.isLoading = false;
        await this.showErrorToast(errorMessage);
      }
    } catch (error: any) {
      console.error('❌ Error creating provider:', error);
      
      await loading.dismiss();
      this.isLoading = false;
      
      // 🔥 MEJORADO: Manejo específico de errores de suscripción
      if (error.error) {
        const errorCode = error.error.error || error.error.errorCode;
        const errorMessage = error.error.message || 'Error al crear el servicio';
        const subscriptionStatus = error.error.subscriptionStatus;
        
        // Mostrar mensaje de error
        await this.showErrorToast(errorMessage);
        
        // Si es un error de suscripción, mostrar alerta con acciones
        if (errorCode === 'NO_SUBSCRIPTION' || errorCode === 'SUBSCRIPTION_PENDING' || errorCode === 'SUBSCRIPTION_VERIFYING') {
          await this.showSubscriptionErrorAlert(errorCode, errorMessage);
        } else if (errorCode === 'LIMIT_EXCEEDED') {
          // Si alcanzó el límite, sugerir cambiar de plan
          await this.showLimitExceededAlert(errorMessage);
        }
      } else if (error.name === 'TimeoutError') {
        await this.showErrorToast('La solicitud tardó demasiado. Por favor, intenta de nuevo');
      } else {
        const errorMessage = error.message || 'Error al crear el servicio';
        await this.showErrorToast(errorMessage);
      }
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
      position: 'top'
    });
    await toast.present();
  }

  async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }

  // 🔥 NUEVO: Mostrar alerta cuando hay error de suscripción
  async showSubscriptionErrorAlert(errorCode: string, message: string) {
    const alert = await this.alertController.create({
      header: '🚀 ¡Activa tu Plan!',
      message: message || 'Necesitas un plan activo para crear servicios. 💎 Actualiza tu plan y comienza a hacer crecer tu negocio.',
      buttons: [
        {
          text: '✨ Ver Mi Plan',
          handler: () => {
            this.router.navigate(['/tabs/tab3']);
          }
        },
        {
          text: 'Entendido',
          role: 'cancel'
        }
      ]
    });
    await alert.present();
  }

  // 🔥 NUEVO: Mostrar alerta cuando se alcanzó el límite
  async showLimitExceededAlert(message: string) {
    const alert = await this.alertController.create({
      header: '🚀 ¡Actualiza tu Plan!',
      message: message || 'Has alcanzado el límite de tu plan actual. 💎 Actualiza tu plan para crear más servicios y hacer crecer tu negocio.',
      buttons: [
        {
          text: 'Cambiar Plan',
          handler: () => {
            this.router.navigate(['/tabs/tab3']);
          }
        },
        {
          text: 'Entendido',
          role: 'cancel'
        }
      ]
    });
    await alert.present();
  }
}
