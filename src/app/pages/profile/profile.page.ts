import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { LoadingController, ToastController, AlertController, ModalController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ChangePasswordModalComponent } from '../../components/change-password-modal/change-password-modal.component';
import { SubscriptionService, UserSubscription, Plan } from '../../services/subscription.service';
import { NotificationSettingsService, NotificationSettings } from '../../services/notification-settings.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false
})
export class ProfilePage implements OnInit {
  user: any = null;
  isLoading = false;
  isEditing = false;

  // Datos editables del usuario
  editData = {
    name: '',
    lastname: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: ''
  };

  // 💳 Datos de suscripción y planes
  currentSubscription: UserSubscription | null = null;
  availablePlans: Plan[] = [];
  
  // 🔔 Configuración de notificaciones
  notificationSettings: NotificationSettings | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private modalController: ModalController,
    private subscriptionService: SubscriptionService,
    private notificationSettingsService: NotificationSettingsService
  ) {}

  ngOnInit() {
    this.checkAuthAndLoadData();
  }

  async checkAuthAndLoadData() {
    try {
      // Esperar a que la inicialización termine (con timeout)
      await this.authService.waitForInitialization();
    } catch (error) {
      console.warn('ProfilePage - Error waiting for auth initialization:', error);
    }
    
    // Verificar autenticación
    if (!this.authService.isAuthenticated()) {
      console.log('ProfilePage - User not authenticated, redirecting to login');
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }
    
    // Si está autenticado, cargar datos
    this.loadUserData();
  }

  async loadUserData() {
    try {
      this.isLoading = true;
      
      // Obtener datos del usuario desde AuthService
      const currentUser = this.authService.getCurrentUser();
      
      if (currentUser) {
        this.user = currentUser;
        
        // Cargar perfil completo desde el backend
        this.authService.getUserProfile().subscribe({
          next: (response) => {
            if (response.success && response.data_user) {
              this.user = response.data_user;
              this.populateEditData();
            }
          },
          error: (error) => {
            console.error('Error cargando perfil:', error);
            this.showErrorToast('Error cargando datos del perfil');
          }
        });
        
        // Cargar suscripción y planes
        this.loadSubscription();
        
        // Cargar preferencias de notificaciones
        this.loadNotificationSettings();
      } else {
        // Si no hay usuario, redirigir al login
        this.router.navigate(['/login'], { replaceUrl: true });
      }
      
    } catch (error) {
      console.error('Error cargando usuario:', error);
      this.router.navigate(['/login'], { replaceUrl: true });
    } finally {
      this.isLoading = false;
    }
  }

  populateEditData() {
    this.editData = {
      name: this.user.name || '',
      lastname: this.user.lastname || '',
      email: this.user.email || '',
      phone: this.user.phone || '',
      address: this.user.addressUser || '',
      city: this.user.city || '',
      state: this.user.departament || ''
    };
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (this.isEditing) {
      this.populateEditData();
    }
  }

  async saveProfile() {
    if (!this.validateForm()) {
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Guardando perfil...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Actualizar perfil en el backend
      const updateData = {
        name: this.editData.name,
        lastname: this.editData.lastname,
        phone: this.editData.phone,
        addressUser: this.editData.address,
        city: this.editData.city,
        departament: this.editData.state
      };

      this.authService.updateUserProfile(updateData).subscribe({
        next: (response) => {
          loading.dismiss();
          this.showSuccessToast('Perfil actualizado exitosamente');
          this.user = { ...this.user, ...updateData };
          this.isEditing = false;
        },
        error: (error) => {
          loading.dismiss();
          console.error('Error actualizando perfil:', error);
          this.showErrorToast('Error actualizando perfil');
        }
      });

    } catch (error) {
      loading.dismiss();
      console.error('Error guardando perfil:', error);
      this.showErrorToast('Error guardando perfil');
    }
  }

  async changeProfilePicture() {
    const alert = await this.alertController.create({
      header: 'Cambiar foto de perfil',
      message: '¿Cómo quieres cambiar tu foto de perfil?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Tomar foto',
          handler: () => this.takePicture(CameraSource.Camera)
        },
        {
          text: 'Galería',
          handler: () => this.takePicture(CameraSource.Photos)
        }
      ]
    });

    await alert.present();
  }

  async takePicture(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: source
      });

      if (image.dataUrl) {
        await this.uploadProfilePicture(image.dataUrl);
      }

    } catch (error) {
      console.error('Error tomando foto:', error);
      this.showErrorToast('Error tomando foto');
    }
  }

  async uploadProfilePicture(imageDataUrl: string) {
    const loading = await this.loadingController.create({
      message: 'Subiendo imagen...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Convertir dataUrl a File
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });

      // Crear FormData para subir la imagen
      const formData = new FormData();
      formData.append('profileImage', file);

      this.authService.updateUserProfileWithImage(formData).subscribe({
        next: (response) => {
          loading.dismiss();
          this.showSuccessToast('Foto de perfil actualizada');
          this.user.profileImage = response.data_user.profileImage;
        },
        error: (error) => {
          loading.dismiss();
          console.error('Error subiendo imagen:', error);
          this.showErrorToast('Error subiendo imagen');
        }
      });

    } catch (error) {
      loading.dismiss();
      console.error('Error procesando imagen:', error);
      this.showErrorToast('Error procesando imagen');
    }
  }

  async openChangePasswordAlert() {
    console.log('🔧 Abriendo alert de cambio de contraseña...');
    
    const alert = await this.alertController.create({
      header: 'Cambiar Contraseña',
      message: 'Ingresa tu contraseña actual y la nueva contraseña:',
      inputs: [
        {
          name: 'currentPassword',
          type: 'password',
          placeholder: 'Contraseña actual',
          attributes: {
            maxlength: 50
          }
        },
        {
          name: 'newPassword',
          type: 'password',
          placeholder: 'Nueva contraseña (mín. 6 caracteres)',
          attributes: {
            maxlength: 50
          }
        },
        {
          name: 'confirmPassword',
          type: 'password',
          placeholder: 'Confirmar nueva contraseña',
          attributes: {
            maxlength: 50
          }
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cambiar',
          handler: async (data) => {
            // Validaciones básicas
            if (!data.currentPassword || !data.newPassword || !data.confirmPassword) {
              this.showErrorToast('Por favor completa todos los campos');
              return false; // Mantener el alert abierto
            }
            
            if (data.newPassword.length < 6) {
              this.showErrorToast('La nueva contraseña debe tener al menos 6 caracteres');
              return false; // Mantener el alert abierto
            }
            
            if (data.newPassword !== data.confirmPassword) {
              this.showErrorToast('Las contraseñas nuevas no coinciden');
              return false; // Mantener el alert abierto
            }
            
            if (data.currentPassword === data.newPassword) {
              this.showErrorToast('La nueva contraseña debe ser diferente a la actual');
              return false; // Mantener el alert abierto
            }
            
            // Intentar cambiar la contraseña
            const success = await this.changePassword(data.currentPassword, data.newPassword);
            
            // ✅ Si fue exitoso, cerrar el alert
            // ❌ Si hubo error, mantener el alert abierto
            return success;
          }
        }
      ]
    });

    await alert.present();
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const loading = await this.loadingController.create({
      message: 'Cambiando contraseña...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const response: any = await this.authService.updatePassword(currentPassword, newPassword);
      console.log('✅ Contraseña cambiada:', response);

      await loading.dismiss();
      
      // Mostrar toast de éxito
      await this.showSuccessToast('Contraseña actualizada exitosamente');

      // Preguntar si cerrar sesión
      const alert = await this.alertController.create({
        header: 'Contraseña Actualizada',
        message: '¿Deseas cerrar sesión para volver a iniciar con la nueva contraseña?',
        buttons: [
          {
            text: 'Continuar',
            role: 'cancel',
            handler: () => {
              console.log('🔧 Usuario decidió continuar en la sesión');
            }
          },
          {
            text: 'Cerrar Sesión',
            handler: async () => {
              console.log('🔧 Usuario decidió cerrar sesión');
              await this.authService.logout();
              this.router.navigate(['/login'], { replaceUrl: true });
            }
          }
        ]
      });
      
      await alert.present();

      // ✅ RETORNAR true para cerrar el modal de cambio de contraseña
      return true;

    } catch (error: any) {
      await loading.dismiss();
      console.error('❌ Error cambiando contraseña:', error);
      
      let errorMessage = 'Error al cambiar la contraseña';
      
      if (error.status === 401) {
        errorMessage = 'La contraseña actual es incorrecta';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      }
      
      await this.showErrorToast(errorMessage);
      
      // ❌ RETORNAR false para mantener el modal abierto
      return false;
    }
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Cerrar sesión',
      message: '¿Estás seguro de que quieres cerrar sesión?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cerrar sesión',
          handler: async () => {
            await this.authService.logout();
            this.router.navigate(['/tabs/home'], { replaceUrl: true });
          }
        }
      ]
    });

    await alert.present();
  }

  private validateForm(): boolean {
    if (!this.editData.name.trim()) {
      this.showErrorToast('El nombre es requerido');
      return false;
    }
    if (!this.editData.lastname.trim()) {
      this.showErrorToast('El apellido es requerido');
      return false;
    }
    return true;
  }

  private async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }

  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }

  // 💳 MÉTODOS DE SUSCRIPCIÓN Y PLANES

  async loadSubscription() {
    try {
      console.log('🔄 Cargando suscripción...');
      this.currentSubscription = await this.subscriptionService.getCurrentSubscription();
      this.availablePlans = await this.subscriptionService.getPlans();
      console.log('✅ Suscripción cargada:', this.currentSubscription);
      console.log('✅ Planes disponibles:', this.availablePlans);
      
      // Si no hay suscripción, intentar crear una por defecto
      if (!this.currentSubscription) {
        console.log('⚠️ No hay suscripción, se creará una por defecto al acceder al endpoint');
      }
    } catch (error) {
      console.error('❌ Error cargando suscripción:', error);
      // Mostrar error al usuario
      this.showErrorToast('Error cargando información del plan');
    }
  }

  async openChangePlanModal() {
    if (!this.availablePlans.length) {
      this.showErrorToast('No hay planes disponibles');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Cambiar Plan',
      message: 'Selecciona el plan que deseas activar:',
      inputs: this.availablePlans.map(plan => ({
        type: 'radio',
        label: `${plan.name} - ${plan.price === 0 ? 'Gratis' : '$' + plan.price + '/' + plan.currency}`,
        value: plan.code,
        checked: this.currentSubscription?.planCode === plan.code,
        handler: () => {
          console.log('Plan seleccionado:', plan.code);
        }
      })),
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Seleccionar',
          handler: async (selectedPlanCode) => {
            if (selectedPlanCode) {
              await this.selectPlan(selectedPlanCode);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async selectPlan(planCode: string) {
    const selectedPlan = this.availablePlans.find(p => p.code === planCode);
    if (!selectedPlan) {
      this.showErrorToast('Plan no encontrado');
      return;
    }

    // Si el plan es gratis, activar directamente
    if (selectedPlan.price === 0) {
      await this.purchasePlan(planCode, 'free');
      return;
    }

    // Si es un plan de pago, pedir información de pago
    const alert = await this.alertController.create({
      header: 'Información de Pago',
      message: `Plan: ${selectedPlan.name} - $${selectedPlan.price} ${selectedPlan.currency}/mes`,
      inputs: [
        {
          name: 'paymentMethod',
          type: 'text',
          placeholder: 'Método de pago (ej: tarjeta, transferencia)',
          attributes: {
            required: true
          }
        },
        {
          name: 'transactionId',
          type: 'text',
          placeholder: 'ID de transacción (opcional)',
          attributes: {
            required: false
          }
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Confirmar',
          handler: async (data): Promise<boolean> => {
            if (!data.paymentMethod) {
              this.showErrorToast('El método de pago es requerido');
              return false;
            }
            
            try {
              await this.purchasePlan(planCode, data.paymentMethod, data.transactionId);
              return true;
            } catch (error) {
              console.error('Error purchasing plan:', error);
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async purchasePlan(planCode: string, paymentMethod: string, transactionId?: string) {
    const loading = await this.loadingController.create({
      message: 'Procesando plan...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const result = await this.subscriptionService.purchasePlan(planCode, paymentMethod, transactionId);
      await loading.dismiss();
      
      this.showSuccessToast(`Plan ${result.subscription.planID.name} activado exitosamente`);
      await this.loadSubscription(); // Recargar datos
      
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error comprando plan:', error);
      
      let errorMessage = 'Error al procesar el plan';
      if (error.error?.message) {
        errorMessage = error.error.message;
      }
      
      this.showErrorToast(errorMessage);
    }
  }

  async reportPayment() {
    if (!this.currentSubscription) {
      this.showErrorToast('No hay suscripción activa');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Reportar Pago',
      message: 'Ingresa la información de tu pago:',
      inputs: [
        {
          name: 'transactionId',
          type: 'text',
          placeholder: 'ID de transacción',
          attributes: {
            required: true
          }
        },
        {
          name: 'paymentMethod',
          type: 'text',
          placeholder: 'Método de pago',
          value: 'transferencia',
          attributes: {
            required: true
          }
        },
        {
          name: 'amount',
          type: 'number',
          placeholder: 'Monto pagado',
          attributes: {
            required: true,
            min: 0
          }
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Reportar',
          handler: async (data): Promise<boolean> => {
            if (!data.transactionId || !data.paymentMethod || !data.amount) {
              this.showErrorToast('Por favor completa todos los campos');
              return false;
            }

            try {
              await this.submitPaymentReport(
                data.transactionId,
                data.paymentMethod,
                parseFloat(data.amount)
              );
              return true;
            } catch (error) {
              console.error('Error reporting payment:', error);
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async submitPaymentReport(transactionId: string, paymentMethod: string, amount: number) {
    if (!this.currentSubscription) return;

    const loading = await this.loadingController.create({
      message: 'Reportando pago...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Intentar comprar el plan actual con la información de pago
      await this.subscriptionService.purchasePlan(
        this.currentSubscription.planCode,
        paymentMethod,
        transactionId
      );
      
      await loading.dismiss();
      this.showSuccessToast('Pago reportado exitosamente. Se verificará pronto.');
      await this.loadSubscription();
      
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error reportando pago:', error);
      
      let errorMessage = 'Error al reportar el pago';
      if (error.error?.message) {
        errorMessage = error.error.message;
      }
      
      this.showErrorToast(errorMessage);
    }
  }

  getLimitDisplay(limit: number): string {
    return limit === -1 ? 'Ilimitado' : limit.toString();
  }

  getRemainingLimit(resourceType: 'services' | 'promotions' | 'products', serviceID?: string): number {
    if (!this.currentSubscription) return 0;
    return this.subscriptionService.getRemainingLimit(this.currentSubscription, resourceType, serviceID);
  }

  hasLimitAvailable(resourceType: 'services' | 'promotions' | 'products', serviceID?: string): boolean {
    if (!this.currentSubscription) return false;
    return this.subscriptionService.hasLimitAvailable(this.currentSubscription, resourceType, serviceID);
  }

  // 🔔 MÉTODOS DE NOTIFICACIONES

  async loadNotificationSettings() {
    try {
      this.notificationSettings = await this.notificationSettingsService.getSettings();
      console.log('✅ Preferencias de notificaciones cargadas:', this.notificationSettings);
    } catch (error) {
      console.error('Error cargando preferencias de notificaciones:', error);
    }
  }

  async toggleNotifications(event: any) {
    if (!this.notificationSettings) return;
    
    // Obtener el nuevo valor del evento del toggle
    const newValue = event.detail.checked;
    const oldValue = this.notificationSettings.notificationsEnabled;
    
    console.log('🔔 Cambiando notificaciones de', oldValue, 'a:', newValue);
    
    // Actualizar localmente primero para feedback inmediato
    this.notificationSettings.notificationsEnabled = newValue;
    
    try {
      // Llamar al servicio para actualizar en backend
      const updated = await this.notificationSettingsService.toggleNotifications(newValue);
      
      // Actualizar con la respuesta del servidor
      this.notificationSettings = updated;
      
      console.log('✅ Notificaciones actualizadas:', updated);
      this.showSuccessToast(newValue ? 'Notificaciones activadas' : 'Notificaciones desactivadas');
    } catch (error) {
      console.error('❌ Error actualizando notificaciones:', error);
      // Revertir cambio local si falla
      this.notificationSettings.notificationsEnabled = oldValue;
      this.showErrorToast('Error actualizando preferencias');
    }
  }
}
