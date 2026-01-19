import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, AlertController, LoadingController } from '@ionic/angular';
import { Plan } from '../../services/subscription.service';
import { SubscriptionService } from '../../services/subscription.service';
import { ApiService } from '../../services/api.service';
import { Provider } from '../../models/provider.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-plan-comparison-modal',
  templateUrl: './plan-comparison-modal.component.html',
  styleUrls: ['./plan-comparison-modal.component.scss'],
  standalone: false
})
export class PlanComparisonModalComponent implements OnInit {
  @Input() availablePlans: Plan[] = [];
  @Input() currentPlanCode: string | null = null;
  @Input() paymentMethods: any[] = [];

  selectedPlan: Plan | null = null;
  selectedPaymentMethod: any = null;
  showPaymentMethods = false;
  isLoading = false;
  
  // Variables para gestión de servicios
  userProviders: Provider[] = [];
  showServicesManagement = false;
  servicesToDelete: string[] = []; // IDs de servicios seleccionados para eliminar
  requiredDeletions = 0; // Cantidad de servicios que se deben eliminar

  constructor(
    private modalController: ModalController,
    private subscriptionService: SubscriptionService,
    private apiService: ApiService,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    // Ordenar planes por precio
    this.availablePlans = [...this.availablePlans].sort((a, b) => a.price - b.price);
  }

  selectPlan(plan: Plan) {
    this.selectedPlan = plan;
  }

  isPlanSelected(planCode: string): boolean {
    return this.selectedPlan?.code === planCode;
  }

  isCurrentPlan(planCode: string): boolean {
    return this.currentPlanCode === planCode;
  }

  async continueToPayment() {
    if (!this.selectedPlan) {
      return;
    }

    // Validar límite de servicios antes de continuar
    const servicesValidation = await this.validateServicesLimit();
    if (!servicesValidation.canContinue) {
      // Mostrar interfaz para eliminar servicios
      this.showServicesManagement = true;
      return;
    }

    // 🔥 MEJORADO: Si es plan gratis, activar directamente sin método de pago
    if (this.selectedPlan.price === 0) {
      console.log('🔥 Plan gratuito seleccionado, activando directamente...');
      this.requestPlanWithPayment(); // Esto llamará con paymentMethodCode = undefined
      return;
    }

    // Si es plan de pago, mostrar métodos de pago
    if (this.paymentMethods.length === 0) {
      this.modalController.dismiss({ 
        error: 'No hay métodos de pago disponibles para tu país' 
      });
      return;
    }

    // Si solo hay un método de pago, seleccionarlo automáticamente
    if (this.paymentMethods.length === 1) {
      this.selectedPaymentMethod = this.paymentMethods[0];
      this.requestPlanWithPayment();
      return;
    }

    // Mostrar selección de métodos de pago
    this.showPaymentMethods = true;
  }

  /**
   * Validar si el nuevo plan tiene suficiente límite de servicios
   */
  async validateServicesLimit(): Promise<{ canContinue: boolean; requiredDeletions: number }> {
    try {
      // Obtener servicios del usuario
      if (this.userProviders.length === 0) {
        const response = await this.apiService.getUserProviders();
        this.userProviders = response.data || [];
      }

      const currentServicesCount = this.userProviders.length;
      const newPlanLimit = this.selectedPlan?.limits?.services || 0;

      // Si el límite es -1, es ilimitado
      if (newPlanLimit === -1) {
        return { canContinue: true, requiredDeletions: 0 };
      }

      // Si el usuario tiene menos o igual servicios que el límite, puede continuar
      if (currentServicesCount <= newPlanLimit) {
        return { canContinue: true, requiredDeletions: 0 };
      }

      // Calcular cuántos servicios se deben eliminar
      const requiredDeletions = currentServicesCount - newPlanLimit;
      this.requiredDeletions = requiredDeletions;

      return { canContinue: false, requiredDeletions };
    } catch (error) {
      console.error('Error validating services limit:', error);
      // En caso de error, permitir continuar (para no bloquear al usuario)
      return { canContinue: true, requiredDeletions: 0 };
    }
  }

  /**
   * Alternar selección de servicio para eliminar
   */
  toggleServiceSelection(providerId: string) {
    const index = this.servicesToDelete.indexOf(providerId);
    if (index > -1) {
      this.servicesToDelete.splice(index, 1);
    } else {
      // Solo permitir seleccionar si no excede el límite necesario
      if (this.servicesToDelete.length < this.requiredDeletions) {
        this.servicesToDelete.push(providerId);
      }
    }
  }

  /**
   * Verificar si un servicio está seleccionado para eliminar
   */
  isServiceSelectedForDeletion(providerId: string): boolean {
    return this.servicesToDelete.includes(providerId);
  }

  /**
   * Verificar si se pueden eliminar más servicios
   */
  canSelectMoreServices(): boolean {
    return this.servicesToDelete.length < this.requiredDeletions;
  }

  /**
   * Eliminar servicios seleccionados y continuar
   */
  async deleteServicesAndContinue() {
    if (this.servicesToDelete.length !== this.requiredDeletions) {
      const alert = await this.alertController.create({
        header: 'Error',
        message: `Debes eliminar exactamente ${this.requiredDeletions} servicio(s) para continuar con este plan.`,
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Eliminando servicios...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Eliminar cada servicio seleccionado
      for (const providerId of this.servicesToDelete) {
        await firstValueFrom(this.apiService.deleteUserProvider(providerId));
      }

      // Remover servicios eliminados de la lista local
      this.userProviders = this.userProviders.filter(
        provider => !this.servicesToDelete.includes(provider._id)
      );
      this.servicesToDelete = [];
      this.showServicesManagement = false;

      await loading.dismiss();

      // Continuar con el proceso de cambio de plan
      await this.continueToPayment();
    } catch (error) {
      console.error('Error deleting services:', error);
      await loading.dismiss();
      
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'Hubo un error al eliminar los servicios. Por favor, intenta nuevamente.',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  /**
   * Volver a la selección de planes
   */
  goBackToPlansFromServices() {
    this.showServicesManagement = false;
    this.servicesToDelete = [];
    this.requiredDeletions = 0;
  }

  selectPaymentMethod(method: any) {
    this.selectedPaymentMethod = method;
  }

  goBackToPlans() {
    this.showPaymentMethods = false;
    this.selectedPaymentMethod = null;
  }

  async requestPlanWithPayment() {
    if (!this.selectedPlan) {
      return;
    }

    this.isLoading = true;

    try {
      // 🔥 MEJORADO: Si es plan gratis, no necesita método de pago (undefined)
      // Solo enviar paymentMethodCode si es plan de pago
      const isFreePlan = this.selectedPlan.price === 0;
      const paymentMethodCode = isFreePlan 
        ? undefined // Plan gratis no necesita método de pago
        : (this.selectedPaymentMethod?.code || this.paymentMethods[0]?.code);

      console.log('🔥 Requesting plan:', {
        planCode: this.selectedPlan.code,
        planName: this.selectedPlan.name,
        planPrice: this.selectedPlan.price,
        isFreePlan: isFreePlan,
        paymentMethodCode: paymentMethodCode
      });

      const result = await this.subscriptionService.purchasePlan(
        this.selectedPlan.code,
        paymentMethodCode
      );
      
      console.log('🔥 Plan purchase result:', {
        subscriptionStatus: result.subscription?.status,
        hasPaymentData: !!result.paymentData,
        paymentData: result.paymentData,
        planCode: result.subscription?.planCode
      });
      
      // 🔥 MEJORADO: Plan gratis siempre debe estar 'active', nunca 'pending'
      if (isFreePlan && result.subscription?.status !== 'active') {
        console.error('❌ ERROR: Plan gratuito no debería estar en estado:', result.subscription?.status);
        console.error('❌ Subscription:', result.subscription);
      }
      
      // Si el plan quedó en estado pending, mostrar instrucciones de pago
      // Esto solo debería pasar con planes de pago que requieren verificación manual
      if (result.subscription?.status === 'pending') {
        console.log('🔥 Plan is pending, dismissing with payment data:', {
          hasPaymentData: !!result.paymentData,
          paymentData: result.paymentData
        });
        
        // 🔥 MEJORADO: Usar paymentData del método seleccionado si no viene en la respuesta
        let paymentData: any = result.paymentData;
        if (!paymentData && this.selectedPaymentMethod?.paymentData) {
          paymentData = this.selectedPaymentMethod.paymentData;
          console.log('✅ Using payment data from selected method:', paymentData);
        }
        
        await this.modalController.dismiss({ 
          success: true, 
          plan: this.selectedPlan,
          subscription: result.subscription,
          paymentData: paymentData || null,
          showPaymentInstructions: true
        });
      } else {
        // Plan activado directamente (gratis o pago automático)
        console.log('✅ Plan activated directly with status:', result.subscription?.status);
        await this.modalController.dismiss({ 
          success: true, 
          plan: this.selectedPlan,
          subscription: result.subscription,
          paymentData: null,
          showPaymentInstructions: false
        });
      }

    } catch (error: any) {
      console.error('❌ Error requesting plan:', error);
      await this.modalController.dismiss({ 
        error: error.error?.message || 'Error al procesar la solicitud'
      });
    } finally {
      this.isLoading = false;
    }
  }

  close() {
    this.modalController.dismiss();
  }

  getLimitDisplay(limit: number): string {
    return limit === -1 ? 'Ilimitado' : limit.toString();
  }

}

