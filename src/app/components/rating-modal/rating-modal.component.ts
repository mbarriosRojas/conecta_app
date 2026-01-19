import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, LoadingController, ToastController } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-rating-modal',
  templateUrl: './rating-modal.component.html',
  styleUrls: ['./rating-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class RatingModalComponent implements OnInit {
  @Input() providerId!: string;
  @Input() providerName?: string;

  selectedRating: number = 0;
  hoverRating: number = 0;
  comment: string = '';
  maxRating: number = 5;

  constructor(
    private modalController: ModalController,
    private apiService: ApiService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Inicializar rating en 0
    this.selectedRating = 0;
    this.hoverRating = 0;
  }

  setRating(rating: number) {
    this.selectedRating = rating;
  }

  setHoverRating(rating: number) {
    this.hoverRating = rating;
  }

  clearHover() {
    this.hoverRating = 0;
  }

  getStarIcon(index: number): string {
    const rating = this.hoverRating || this.selectedRating;
    if (index <= rating) {
      return 'star';
    }
    return 'star-outline';
  }

  async submitRating() {
    if (this.selectedRating === 0) {
      const toast = await this.toastController.create({
        message: 'Por favor selecciona una calificación',
        duration: 2000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Enviando calificación...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Obtener foto de perfil del usuario actual
      let userProfileImage = '';
      try {
        const currentUser = await firstValueFrom(this.authService.currentUser$);
        userProfileImage = currentUser?.profileImage || '';
        console.log('📸 Foto de perfil del usuario:', userProfileImage ? 'Encontrada' : 'No disponible');
      } catch (error) {
        console.error('Error obteniendo foto de perfil:', error);
      }
      
      await this.apiService.createReview({
        providerId: this.providerId,
        rating: this.selectedRating,
        comment: this.comment.trim() || undefined,
        userProfileImage: userProfileImage || undefined // 🔥 Incluir foto de perfil
      });

      await loading.dismiss();

      const toast = await this.toastController.create({
        message: '¡Calificación enviada exitosamente!',
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      await toast.present();

      await this.modalController.dismiss({ success: true });
    } catch (error: any) {
      await loading.dismiss();
      
      const errorMessage = error?.error?.error || 'Error al enviar la calificación';
      const toast = await this.toastController.create({
        message: errorMessage,
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    }
  }

  async cancel() {
    await this.modalController.dismiss({ success: false });
  }
}

