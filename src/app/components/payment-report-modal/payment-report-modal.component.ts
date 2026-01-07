import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, LoadingController, ToastController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { SubscriptionService } from '../../services/subscription.service';

@Component({
  selector: 'app-payment-report-modal',
  templateUrl: './payment-report-modal.component.html',
  styleUrls: ['./payment-report-modal.component.scss'],
  standalone: false
})
export class PaymentReportModalComponent implements OnInit {
  @Input() subscription: any;
  @Input() paymentMethod: any;

  // Formulario
  paymentDate: string = '';
  reportedAmount: number = 0;
  reportedCurrency: string = 'USD';
  paymentProof: string | null = null;
  paymentProofPreview: string | null = null;

  // Campos específicos según método de pago
  identificationNumber: string = '';
  bank: string = '';
  lastSixDigits: string = '';
  transactionNumber: string = '';
  referenceNumber: string = '';

  isLoading = false;
  isSubmitting = false;

  constructor(
    private modalController: ModalController,
    private subscriptionService: SubscriptionService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    // Establecer fecha por defecto (hoy)
    const today = new Date();
    this.paymentDate = today.toISOString().split('T')[0];
    
    // Establecer monto por defecto desde la suscripción
    if (this.subscription?.planID?.price) {
      this.reportedAmount = this.subscription.planID.price;
      this.reportedCurrency = this.subscription.planID.currency || 'USD';
    }

    // Determinar qué campos mostrar según el método de pago
    this.setupFieldsForPaymentMethod();
  }

  setupFieldsForPaymentMethod() {
    if (!this.paymentMethod) return;

    const methodCode = this.paymentMethod.code?.toLowerCase() || '';
    
    if (methodCode.includes('pago_movil')) {
      // Pago Móvil: requiere documento, banco, últimos 6 dígitos
      // Los campos ya están definidos arriba
    } else if (methodCode.includes('transferencia') || methodCode.includes('bank_transfer')) {
      // Transferencia bancaria: requiere número de transacción
      // Los campos ya están definidos arriba
    } else if (methodCode.includes('wompi')) {
      // Wompi: puede requerir número de referencia
      // Los campos ya están definidos arriba
    }
  }

  getMaxDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  getRequiredFields(): string[] {
    if (!this.paymentMethod) return [];

    const methodCode = this.paymentMethod.code?.toLowerCase() || '';
    
    if (methodCode.includes('pago_movil')) {
      return ['identificationNumber', 'bank', 'lastSixDigits'];
    } else if (methodCode.includes('transferencia') || methodCode.includes('bank_transfer')) {
      return ['transactionNumber'];
    } else if (methodCode.includes('wompi')) {
      return ['referenceNumber'];
    }
    
    return [];
  }

  async takePhoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera
      });

      this.paymentProof = `data:image/${image.format};base64,${image.base64String}`;
      this.paymentProofPreview = this.paymentProof;
    } catch (error) {
      console.error('Error taking photo:', error);
      this.showToast('Error al tomar la foto', 'danger');
    }
  }

  async selectPhoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos
      });

      this.paymentProof = `data:image/${image.format};base64,${image.base64String}`;
      this.paymentProofPreview = this.paymentProof;
    } catch (error) {
      console.error('Error selecting photo:', error);
      this.showToast('Error al seleccionar la foto', 'danger');
    }
  }

  removePhoto() {
    this.paymentProof = null;
    this.paymentProofPreview = null;
  }

  validateForm(): boolean {
    // Validar campos requeridos comunes
    if (!this.paymentDate || !this.reportedAmount || this.reportedAmount <= 0) {
      this.showToast('Por favor completa la fecha y el monto del pago', 'danger');
      return false;
    }

    // Validar fecha no futura
    const paymentDateObj = new Date(this.paymentDate);
    if (paymentDateObj > new Date()) {
      this.showToast('La fecha del pago no puede ser futura', 'danger');
      return false;
    }

    // Validar campos específicos según método de pago
    const requiredFields = this.getRequiredFields();
    
    if (requiredFields.includes('identificationNumber') && !this.identificationNumber) {
      this.showToast('Por favor ingresa tu documento de identidad', 'danger');
      return false;
    }

    if (requiredFields.includes('bank') && !this.bank) {
      this.showToast('Por favor ingresa el banco', 'danger');
      return false;
    }

    if (requiredFields.includes('lastSixDigits')) {
      if (!this.lastSixDigits) {
        this.showToast('Por favor ingresa los últimos 6 dígitos del pago', 'danger');
        return false;
      }
      if (!/^\d{6}$/.test(this.lastSixDigits)) {
        this.showToast('Los últimos 6 dígitos deben ser exactamente 6 números', 'danger');
        return false;
      }
    }

    if (requiredFields.includes('transactionNumber') && !this.transactionNumber) {
      this.showToast('Por favor ingresa el número de transacción', 'danger');
      return false;
    }

    if (requiredFields.includes('referenceNumber') && !this.referenceNumber) {
      this.showToast('Por favor ingresa el número de referencia', 'danger');
      return false;
    }

    return true;
  }

  async submitReport() {
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;
    const loading = await this.loadingController.create({
      message: 'Reportando pago...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.subscriptionService.reportPayment(
        this.identificationNumber || undefined,
        this.bank || undefined,
        this.lastSixDigits || undefined,
        this.paymentProof || undefined,
        this.paymentDate,
        this.reportedAmount,
        this.reportedCurrency,
        this.transactionNumber || undefined,
        this.referenceNumber || undefined
      );

      await loading.dismiss();
      this.showToast('Pago reportado exitosamente', 'success');
      await this.modalController.dismiss({ success: true });
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error reporting payment:', error);
      
      let errorMessage = 'Error al reportar el pago';
      if (error.error?.message) {
        errorMessage = error.error.message;
      }
      
      this.showToast(errorMessage, 'danger');
    } finally {
      this.isSubmitting = false;
    }
  }

  close() {
    this.modalController.dismiss();
  }

  private async showToast(message: string, color: 'success' | 'danger' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}

