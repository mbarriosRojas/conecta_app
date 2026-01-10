import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-payment-instructions-modal',
  templateUrl: './payment-instructions-modal.component.html',
  styleUrls: ['./payment-instructions-modal.component.scss'],
  standalone: false
})
export class PaymentInstructionsModalComponent implements OnInit {
  @Input() plan: any;
  @Input() paymentData: any;

  constructor(
    private modalController: ModalController
  ) {}

  ngOnInit() {
  }

  getOtherDataKeys(paymentData: any): string[] {
    return Object.keys(paymentData).filter(key => 
      key !== 'type' && 
      typeof paymentData[key] === 'string' || 
      typeof paymentData[key] === 'number'
    );
  }

  getLabelForKey(key: string): string {
    const labels: { [key: string]: string } = {
      email: 'Correo',
      binanceId: 'ID Binance',
      bank: 'Banco',
      phoneNumber: 'Teléfono',
      identificationNumber: 'Documento',
      accountNumber: 'Número de Cuenta'
    };
    return labels[key] || key.charAt(0).toUpperCase() + key.slice(1);
  }

  async reportPayment() {
    await this.modalController.dismiss({ reportPayment: true });
  }

  close() {
    this.modalController.dismiss();
  }
}

