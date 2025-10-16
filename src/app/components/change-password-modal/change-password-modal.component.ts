import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-change-password-modal',
  templateUrl: './change-password-modal.component.html',
  styleUrls: ['./change-password-modal.component.scss'],
  standalone: false
})
export class ChangePasswordModalComponent implements OnInit {
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  
  isLoading = false;

  constructor(
    private modalController: ModalController,
    private toastController: ToastController,
    private http: HttpClient
  ) {
    console.log('🔧 ChangePasswordModalComponent constructor ejecutado');
  }

  ngOnInit() {
    console.log('🔧 ChangePasswordModalComponent ngOnInit ejecutado');
  }

  dismiss() {
    this.modalController.dismiss();
  }

  async changePassword() {
    // Validaciones
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;

    try {
      const response: any = await this.http.post(
        `${environment.apiUrl}/api/users/changePasswordUser/user/new`,
        {
          lastpassword: this.currentPassword,
          newpassword: this.newPassword
        }
      ).toPromise();

      console.log('✅ Contraseña cambiada:', response);

      await this.showSuccessToast('Contraseña actualizada exitosamente');
      this.modalController.dismiss({ success: true });

    } catch (error: any) {
      console.error('❌ Error cambiando contraseña:', error);
      
      let errorMessage = 'Error al cambiar la contraseña';
      
      if (error.status === 401) {
        errorMessage = 'La contraseña actual es incorrecta';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      }
      
      await this.showErrorToast(errorMessage);
    } finally {
      this.isLoading = false;
    }
  }

  private validateForm(): boolean {
    // Validar que todos los campos estén llenos
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.showErrorToast('Por favor completa todos los campos');
      return false;
    }

    // Validar longitud mínima de nueva contraseña
    if (this.newPassword.length < 6) {
      this.showErrorToast('La nueva contraseña debe tener al menos 6 caracteres');
      return false;
    }

    // Validar que las contraseñas coincidan
    if (this.newPassword !== this.confirmPassword) {
      this.showErrorToast('Las contraseñas nuevas no coinciden');
      return false;
    }

    // Validar que la nueva contraseña sea diferente
    if (this.currentPassword === this.newPassword) {
      this.showErrorToast('La nueva contraseña debe ser diferente a la actual');
      return false;
    }

    return true;
  }

  toggleCurrentPassword() {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  toggleNewPassword() {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  private async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: 'success',
      position: 'top',
      icon: 'checkmark-circle-outline'
    });
    await toast.present();
  }

  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 4000,
      color: 'danger',
      position: 'top',
      icon: 'alert-circle-outline'
    });
    await toast.present();
  }
}

