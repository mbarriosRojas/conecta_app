import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-location-modal',
  templateUrl: './location-modal.component.html',
  styleUrls: ['./location-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class LocationModalComponent implements OnInit {

  constructor(
    private modalController: ModalController,
    private permissionService: PermissionService
  ) {}

  ngOnInit() {}

  async allowLocation() {
    try {
      const result = await this.permissionService.requestLocationPermissionWithModal();
      if (result.granted) {
        await this.modalController.dismiss({ granted: true });
      } else {
        await this.modalController.dismiss({ granted: false });
      }
    } catch (error) {
      console.error('Error in allowLocation:', error);
      await this.modalController.dismiss({ granted: false });
    }
  }

  async skipLocation() {
    await this.modalController.dismiss({ granted: false, skipped: true });
  }
}
