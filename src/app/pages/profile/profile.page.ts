import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { LoadingController, ToastController, AlertController, ModalController } from '@ionic/angular';
import { CameraService } from '../../services/camera.service';
import { ChangePasswordModalComponent } from '../../components/change-password-modal/change-password-modal.component';
import { PlanComparisonModalComponent } from '../../components/plan-comparison-modal/plan-comparison-modal.component';
import { PaymentReportModalComponent } from '../../components/payment-report-modal/payment-report-modal.component';
import { PaymentInstructionsModalComponent } from '../../components/payment-instructions-modal/payment-instructions-modal.component';
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
  isLoggingOut = false; // Prevenir múltiples ejecuciones de logout
  isLoadingSubscription = false; // 🔥 Estado de carga de suscripción

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
  paymentMethods: any[] = [];
  userCountry: string = 'VE';
  
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
    private notificationSettingsService: NotificationSettingsService,
    private cameraService: CameraService
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
          handler: () => this.takePicture('camera')
        },
        {
          text: 'Galería',
          handler: () => this.takePicture('gallery')
        }
      ]
    });

    await alert.present();
  }

  async takePicture(source: 'camera' | 'gallery') {
    try {
      let image;
      
      if (source === 'camera') {
        image = await this.cameraService.takePhoto(90);
      } else {
        image = await this.cameraService.selectPhoto(90);
      }

      if (!image) {
        // Usuario canceló, no es un error
        return;
      }

      if (image.dataUrl) {
        await this.uploadProfilePicture(image.dataUrl);
      }

    } catch (error: any) {
      console.error('Error tomando foto:', error);
      this.showErrorToast(error.message || 'Error al tomar/seleccionar la foto');
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
    // Prevenir múltiples ejecuciones
    if (this.isLoggingOut) {
      console.log('⚠️ Logout ya en progreso, ignorando...');
      return;
    }

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
            // Prevenir múltiples ejecuciones
            if (this.isLoggingOut) {
              console.log('⚠️ Logout ya en progreso en handler, ignorando...');
              return false;
            }
            this.isLoggingOut = true;

            try {
              console.log('🚪 ProfilePage.logout: Iniciando logout...');
              
              // Ejecutar logout con timeout para evitar que se cuelgue
              const logoutPromise = this.authService.logout();
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Logout timeout after 10 seconds')), 10000)
              );
              
              try {
                await Promise.race([logoutPromise, timeoutPromise]);
                console.log('✅ ProfilePage.logout: Logout completado exitosamente');
              } catch (timeoutError: any) {
                if (timeoutError?.message?.includes('timeout')) {
                  console.warn('⚠️ ProfilePage.logout: Timeout en logout (continuando de todas formas)');
                } else {
                  console.warn('⚠️ ProfilePage.logout: Error en logout (continuando de todas formas):', timeoutError);
                }
              }
              
              // Siempre navegar al home, incluso si hubo errores
              console.log('🏠 ProfilePage.logout: Navegando al home...');
            this.router.navigate(['/tabs/home'], { replaceUrl: true });
              
              // Resetear la bandera después de un breve delay
              setTimeout(() => {
                this.isLoggingOut = false;
              }, 1000);
              
              return true;
            } catch (error) {
              console.error('❌ ProfilePage.logout: Error inesperado:', error);
              
              // Aun así, intentar navegar al home
              try {
                this.router.navigate(['/tabs/home'], { replaceUrl: true });
              } catch (navError) {
                console.error('❌ ProfilePage.logout: Error navegando al home:', navError);
              }
              
              // Resetear la bandera
              this.isLoggingOut = false;
              
              // No mostrar error al usuario, solo navegar
              return true; // Cerrar el alert de todas formas
            }
          }
        }
      ]
    });

    await alert.present();
    
    // Resetear la bandera si el usuario cancela
    alert.onDidDismiss().then((data) => {
      if (data.role === 'cancel') {
        console.log('🚪 ProfilePage.logout: Usuario canceló el logout');
        this.isLoggingOut = false;
      }
    });
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
    // 🔥 NUEVO: Mostrar loading mientras se carga la suscripción
    this.isLoadingSubscription = true;
    
    // 🔥 IMPORTANTE: Inicializar availablePlans como array vacío por defecto
    this.availablePlans = [];
    
    try {
      const plans = await this.subscriptionService.getPlans();
      
      if (Array.isArray(plans)) {
        this.availablePlans = plans;
      } else {
        this.availablePlans = [];
      }
      
    } catch (error: any) {
      console.error('❌ Error cargando planes:', error);
      console.error('❌ Error status:', error.status);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error completo:', error);
      
      // Mostrar error al usuario
      let errorMessage = 'Error cargando planes disponibles';
      if (error.status === 0) {
        errorMessage = 'Error de conexión. Verifica que el servidor esté funcionando.';
      } else if (error.status === 404) {
        errorMessage = 'Endpoint no encontrado. Verifica la configuración del servidor.';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      }
      
      this.showErrorToast(errorMessage);
      // Asegurar que availablePlans sea un array vacío
      this.availablePlans = [];
    }

    // 🔥 NUEVO: Cargar métodos de pago disponibles
    try {
      const paymentData = await this.subscriptionService.getPaymentMethods();
      this.paymentMethods = paymentData.paymentMethods || [];
      this.userCountry = paymentData.country || 'VE';
    } catch (error: any) {
      console.error('❌ Error cargando métodos de pago:', error);
      this.paymentMethods = [];
    }

    try {
      this.currentSubscription = await this.subscriptionService.getCurrentSubscription();
    } catch (error: any) {
      // Manejar 404 como caso normal (usuario sin plan)
      if (error.status === 404 || error.status === 400) {
        this.currentSubscription = null;
      } else {
        console.error('❌ Error cargando suscripción:', error);
        // Solo mostrar error si no es un 404 (usuario sin plan es normal)
        this.showErrorToast('Error cargando información del plan. Por favor, intenta de nuevo.');
        this.currentSubscription = null; // Asegurar que sea null en caso de error
      }
    } finally {
      // 🔥 NUEVO: Ocultar loading cuando termine de cargar
      this.isLoadingSubscription = false;
    }
  }

  async openChangePlanModal() {
    if (!this.availablePlans.length) {
      this.showErrorToast('No hay planes disponibles');
      return;
    }

    const modal = await this.modalController.create({
      component: PlanComparisonModalComponent,
      componentProps: {
        availablePlans: this.availablePlans,
        currentPlanCode: this.currentSubscription?.planCode || null,
        paymentMethods: this.paymentMethods
      },
      cssClass: 'plan-comparison-modal'
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data?.error) {
      this.showErrorToast(data.error);
      return;
    }

    if (data?.success) {
      console.log('🔥 Modal dismissed with success:', {
        subscriptionStatus: data.subscription?.status,
        hasPaymentData: !!data.paymentData,
        showPaymentInstructions: data.showPaymentInstructions,
        plan: data.plan
      });

      // 🔥 NUEVO: Mostrar loading durante el proceso
      const loading = await this.loadingController.create({
        message: 'Procesando solicitud...',
        spinner: 'crescent'
      });
      await loading.present();

      try {
        // Si fue exitoso, recargar suscripción primero
        await this.loadSubscription();
        
        // Si el plan está en estado pending, SIEMPRE mostrar instrucciones de pago
        if (data.subscription?.status === 'pending') {
        console.log('🔥 Subscription is pending, showing payment instructions');
        
        // 🔥 MEJORADO: Buscar datos de pago en el método seleccionado (ya vienen en paymentMethods)
        let paymentData = data.paymentData;
        
        // Si paymentData tiene un error, ignorarlo y buscar en los métodos
        if (paymentData && (paymentData.error || paymentData.requiresSupport)) {
          paymentData = null;
        }
        
        if (!paymentData) {
          // Buscar en los métodos de pago cargados
          // Primero intentar con el método de la suscripción
          let selectedPaymentMethod = this.paymentMethods.find(
            m => m.code === data.subscription?.paymentMethod
          );
          
          // Si no se encuentra, buscar en la compra pendiente
          if (!selectedPaymentMethod) {
            try {
              const purchases = await this.subscriptionService.getPurchaseHistory();
              const pendingPurchase = purchases.find(p => p.paymentStatus === 'pending');
              if (pendingPurchase?.paymentMethod) {
                selectedPaymentMethod = this.paymentMethods.find(
                  m => m.code === pendingPurchase.paymentMethod
                );
              }
            } catch (error) {
              console.error('Error getting purchase history:', error);
            }
          }
          
          if (selectedPaymentMethod?.paymentData) {
            paymentData = selectedPaymentMethod.paymentData;
          } else {
            // Si aún no hay datos, intentar con el primer método que tenga paymentData
            const methodWithData = this.paymentMethods.find(m => m.paymentData);
            if (methodWithData?.paymentData) {
              paymentData = methodWithData.paymentData;
            }
          }
        }
        
          if (paymentData && !paymentData.error && !paymentData.requiresSupport) {
            await loading.dismiss();
            await this.showPaymentInstructions(paymentData, data.plan);
          } else {
            await loading.dismiss();
            console.error('❌ No payment data available:', paymentData);
            this.showErrorToast('No se pudieron obtener los datos de pago. Por favor contacta soporte.');
          }
        } else {
          // Plan activado directamente
          await loading.dismiss();
          this.showSuccessToast(`Plan ${data.plan.name} activado exitosamente`);
        }
      } catch (error) {
        await loading.dismiss();
        console.error('Error processing plan request:', error);
        this.showErrorToast('Error procesando la solicitud del plan');
      }
      return;
    }

    if (data?.planSelected && data?.showPaymentMethods) {
      // Si el usuario seleccionó un plan de pago con múltiples métodos, mostrar selector
      await this.selectPaymentMethod(data.planSelected);
    }
  }

  async selectPaymentMethod(plan: Plan) {
    if (this.paymentMethods.length === 0) {
      this.showErrorToast('No hay métodos de pago disponibles para tu país');
      return;
    }

    if (this.paymentMethods.length === 1) {
      // Si solo hay un método, usarlo directamente
      await this.requestPlan(plan.code, this.paymentMethods[0].code);
      return;
    }

    // Crear inputs para seleccionar método de pago
    const paymentMethodInputs = this.paymentMethods.map(method => ({
      type: 'radio' as const,
      label: method.name,
      value: method.code,
      checked: this.paymentMethods.length === 1
    }));

    const alert = await this.alertController.create({
      header: 'Seleccionar Método de Pago',
      message: `Plan: ${plan.name}\nPrecio: $${plan.price} ${plan.currency}/mes\n\nSelecciona tu método de pago:`,
      inputs: paymentMethodInputs,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Solicitar Plan',
          handler: async (data): Promise<boolean> => {
            if (!data) {
              this.showErrorToast('Por favor selecciona un método de pago');
              return false;
            }

            try {
              await this.requestPlan(plan.code, data);
              return true;
            } catch (error) {
              console.error('Error requesting plan:', error);
              return false;
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
      await this.requestPlan(planCode);
      return;
    }

    // 🔥 NUEVO: Si es un plan de pago, mostrar métodos de pago disponibles
    if (this.paymentMethods.length === 0) {
      this.showErrorToast('No hay métodos de pago disponibles para tu país');
      return;
    }

    // Crear inputs para seleccionar método de pago
    const paymentMethodInputs = this.paymentMethods.map(method => ({
      type: 'radio' as const,
      label: method.name,
      value: method.code,
      checked: this.paymentMethods.length === 1 // Si solo hay uno, seleccionarlo por defecto
    }));

    const alert = await this.alertController.create({
      header: 'Seleccionar Método de Pago',
      message: `Plan: ${selectedPlan.name}\nPrecio: $${selectedPlan.price} ${selectedPlan.currency}/mes\n\nSelecciona tu método de pago:`,
      inputs: paymentMethodInputs,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Solicitar Plan',
          handler: async (data): Promise<boolean> => {
            if (!data) {
              this.showErrorToast('Por favor selecciona un método de pago');
              return false;
            }

            try {
              await this.requestPlan(planCode, data);
              return true;
            } catch (error) {
              console.error('Error requesting plan:', error);
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async requestPlan(planCode: string, paymentMethodCode?: string) {
    const loading = await this.loadingController.create({
      message: 'Procesando solicitud...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const result = await this.subscriptionService.purchasePlan(planCode, paymentMethodCode);
      
      await loading.dismiss();
      
      // Si el plan quedó en pending, mostrar datos de pago
      if (result.subscription.status === 'pending' && result.paymentData) {
        const selectedPlan = this.availablePlans.find(p => p.code === planCode);
        await this.showPaymentInstructions(result.paymentData, selectedPlan || { name: 'Plan seleccionado' });
      } else {
        this.showSuccessToast('Plan activado exitosamente');
      }
      
      await this.loadSubscription(); // Recargar datos
      
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error solicitando plan:', error);
      
      let errorMessage = 'Error al procesar la solicitud';
      if (error.error?.message) {
        errorMessage = error.error.message;
      }
      
      this.showErrorToast(errorMessage);
    }
  }

  async showPaymentInstructions(paymentData: any, plan: any) {
    const planName = plan?.name || 'Plan seleccionado';
    const planPrice = plan?.price || 0;
    const planCurrency = plan?.currency || 'USD';

    // Validar que paymentData tenga los datos necesarios
    if (!paymentData) {
      console.error('❌ Payment data is null or undefined');
      this.showErrorToast('Error: No se pudieron obtener los datos de pago. Por favor contacta soporte.');
      return;
    }

    // Si paymentData tiene un error, mostrar mensaje específico
    if (paymentData.error || paymentData.requiresSupport) {
      console.error('❌ Payment data error:', paymentData);
      const errorMessage = paymentData.error || 'No se pudieron obtener los datos de pago. Por favor contacta soporte.';
      const suggestion = paymentData.suggestion ? `\n\nSugerencia: ${paymentData.suggestion}` : '';
      this.showErrorToast(errorMessage + suggestion);
      return;
    }

    // Validar que paymentData tenga los datos necesarios
    if (!paymentData.bank || !paymentData.phoneNumber || !paymentData.identificationNumber) {
      console.error('❌ Payment data incomplete:', paymentData);
      this.showErrorToast('Error: No se pudieron obtener los datos de pago completos. Por favor contacta soporte.');
      return;
    }

    // Usar modal personalizado en lugar de alert
    const modal = await this.modalController.create({
      component: PaymentInstructionsModalComponent,
      componentProps: {
        plan: {
          name: planName,
          price: planPrice,
          currency: planCurrency
        },
        paymentData: paymentData
      },
      cssClass: 'payment-instructions-modal'
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data?.reportPayment) {
      // Si el usuario quiere reportar el pago, abrir el modal de reporte
      setTimeout(() => {
        this.reportPayment();
      }, 300);
    }
  }


  async reportPayment() {
    // 🔥 NUEVO: Mostrar loading mientras se valida la suscripción
    const loading = await this.loadingController.create({
      message: 'Preparando formulario de pago...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Validar que haya una suscripción pendiente
      let pendingSubscription: UserSubscription | null = null;
      try {
        pendingSubscription = await this.subscriptionService.getCurrentSubscription();
        
        // Verificar que la suscripción esté pendiente
        if (!pendingSubscription || pendingSubscription.status !== 'pending') {
          await loading.dismiss();
          this.showErrorToast('No tienes una solicitud de plan pendiente de pago');
          return;
        }
      } catch (error: any) {
        if (error.status === 404 || error.status === 400) {
          // No hay suscripción, esto es normal
        } else {
          console.error('Error obteniendo suscripción:', error);
        }
      }
      
      if (!pendingSubscription || pendingSubscription.status !== 'pending') {
        await loading.dismiss();
        this.showErrorToast('No tienes una solicitud de plan pendiente. Por favor solicita un plan primero.');
        return;
      }

      // 🔥 Obtener el método de pago usado en la compra pendiente
      let paymentMethod = null;
      try {
        // Buscar la compra pendiente para obtener el método de pago
        const purchases = await this.subscriptionService.getPurchaseHistory();
        const pendingPurchase = purchases.find(p => p.paymentStatus === 'pending');
        
        if (pendingPurchase && pendingPurchase.paymentMethod) {
          // Buscar el método de pago en la lista de métodos disponibles
          paymentMethod = this.paymentMethods.find(m => m.code === pendingPurchase.paymentMethod);
        }
      } catch (error) {
        console.error('Error obteniendo método de pago:', error);
      }

      // Si no se encuentra el método, usar el primero disponible (fallback)
      if (!paymentMethod && this.paymentMethods.length > 0) {
        paymentMethod = this.paymentMethods[0];
      }

      await loading.dismiss();

      // 🔥 Abrir modal de reporte de pago
      const modal = await this.modalController.create({
        component: PaymentReportModalComponent,
        componentProps: {
          subscription: pendingSubscription,
          paymentMethod: paymentMethod
        },
        cssClass: 'payment-report-modal'
      });

      await modal.present();

      const { data } = await modal.onDidDismiss();

      if (data?.success) {
        if (data?.subscription) {
          this.currentSubscription = data.subscription;
        }
        
        await this.loadSubscription();
        this.showSuccessToast('Pago reportado exitosamente. Tu pago está en verificación y el plan se activará pronto.');
      }
    } catch (error) {
      await loading.dismiss();
      console.error('Error preparing payment report:', error);
      this.showErrorToast('Error preparando el formulario de pago');
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
    } catch (error) {
      console.error('❌ Error cargando preferencias de notificaciones:', error);
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
      
      this.showSuccessToast(newValue ? 'Notificaciones activadas' : 'Notificaciones desactivadas');
    } catch (error) {
      console.error('❌ Error actualizando notificaciones:', error);
      // Revertir cambio local si falla
      this.notificationSettings.notificationsEnabled = oldValue;
      this.showErrorToast('Error actualizando preferencias');
    }
  }
}
