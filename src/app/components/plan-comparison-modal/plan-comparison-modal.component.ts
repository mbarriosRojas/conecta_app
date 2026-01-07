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

    // Si es plan gratis, activar directamente
    if (this.selectedPlan.price === 0) {
      this.requestPlanWithPayment();
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
      // Si es plan gratis, no necesita método de pago
      const paymentMethodCode = this.selectedPlan.price === 0 
        ? undefined 
        : (this.selectedPaymentMethod?.code || this.paymentMethods[0]?.code);

      console.log('🔥 Requesting plan:', {
        planCode: this.selectedPlan.code,
        paymentMethodCode,
        planPrice: this.selectedPlan.price
      });

      const result = await this.subscriptionService.purchasePlan(
        this.selectedPlan.code,
        paymentMethodCode
      );
      
      console.log('🔥 Plan purchase result:', {
        subscriptionStatus: result.subscription?.status,
        hasPaymentData: !!result.paymentData,
        paymentData: result.paymentData
      });
      
      // Si el plan quedó en estado pending, SIEMPRE cerrar modal y mostrar instrucciones
      // 🔥 MEJORADO: Usar paymentData del método seleccionado (ya viene incluido en los métodos)
      let paymentData: any = result.paymentData;
      
      // Si paymentData tiene un error, ignorarlo y usar el del método
      if (paymentData && (paymentData.error || paymentData.requiresSupport)) {
        console.warn('⚠️ Payment data from response has error, using method data:', paymentData);
        paymentData = null;
      }
      
      // Si no hay paymentData válido, usar el del método seleccionado
      if (!paymentData && this.selectedPaymentMethod?.paymentData) {
        paymentData = this.selectedPaymentMethod.paymentData;
        console.log('✅ Using payment data from selected method:', paymentData);
      }
      
      if (result.subscription?.status === 'pending') {
        console.log('🔥 Plan is pending, dismissing with payment data:', {
          hasPaymentData: !!paymentData,
          paymentData: paymentData
        });
        await this.modalController.dismiss({ 
          success: true, 
          plan: this.selectedPlan,
          subscription: result.subscription,
          paymentData: paymentData || null,
          showPaymentInstructions: true // 🔥 SIEMPRE mostrar instrucciones si está pending
        });
      } else {
        // Plan activado directamente (gratis o pago automático)
        console.log('🔥 Plan activated directly');
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

