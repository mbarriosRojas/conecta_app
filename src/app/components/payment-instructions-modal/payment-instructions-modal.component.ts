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

  async reportPayment() {
    await this.modalController.dismiss({ reportPayment: true });
  }

  close() {
    this.modalController.dismiss();
  }
}

