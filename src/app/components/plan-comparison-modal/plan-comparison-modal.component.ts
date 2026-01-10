import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { Plan } from '../../services/subscription.service';
import { SubscriptionService } from '../../services/subscription.service';

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

  constructor(
    private modalController: ModalController,
    private subscriptionService: SubscriptionService
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

  continueToPayment() {
    if (!this.selectedPlan) {
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

