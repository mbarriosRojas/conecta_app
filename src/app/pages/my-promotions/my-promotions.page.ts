import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, LoadingController, ToastController, AlertController } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { firstValueFrom } from 'rxjs';

interface Promotion {
  _id: string;
  businessID: string;
  businessName: string;
  promotion_text: string;
  promotion_type: 'DISCOUNT' | 'OFFER' | 'EVENT' | 'GENERAL';
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  promo_radius_meters: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
  deliveryStats?: {
    totalSent: number;
    totalOpened: number;
    totalViews: number;
    viewSources?: {
      fromNotification: number;
      fromHomeCard: number;
      fromNearbyList: number;
      fromProviderDetail: number;
    };
  };
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-my-promotions',
  templateUrl: './my-promotions.page.html',
  styleUrls: ['./my-promotions.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class MyPromotionsPage implements OnInit {
  businessID: string = '';
  businessName: string = '';
  promotions: Promotion[] = [];
  activePromotions: Promotion[] = [];
  inactivePromotions: Promotion[] = [];
  isLoading = false;
  selectedPromotion: Promotion | null = null;
  showDetailedStats = true; // Mostrar estadísticas detalladas

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    this.businessID = this.route.snapshot.queryParamMap.get('businessID') || '';
    this.businessName = this.route.snapshot.queryParamMap.get('businessName') || '';
    
    if (this.businessID) {
      await this.loadPromotions();
    } else {
      this.showErrorToast('ID de negocio no proporcionado');
      this.router.navigate(['/tabs/services']);
    }
  }

  /**
   * Carga todas las promociones del negocio
   */
  async loadPromotions() {
    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Cargando promociones...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const response = await firstValueFrom(
        this.apiService.getAllPromotions(this.businessID)
      );

      if (response?.status === 'success' && response.data) {
        this.promotions = response.data;
        
        // Separar promociones activas e inactivas
        this.activePromotions = this.promotions.filter(p => p.isActive);
        this.inactivePromotions = this.promotions.filter(p => !p.isActive);

        console.log(`✅ Cargadas ${this.promotions.length} promociones`);
      }
    } catch (error) {
      console.error('Error loading promotions:', error);
      this.showErrorToast('Error al cargar las promociones');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

  /**
   * Navega a la creación de nueva promoción
   */
  createNewPromotion() {
    this.router.navigate(['/edit-promotion'], {
      queryParams: {
        businessID: this.businessID,
        businessName: this.businessName
      }
    });
  }

  /**
   * Navega a la edición de una promoción
   */
  editPromotion(promotion: Promotion) {
    this.router.navigate(['/edit-promotion'], {
      queryParams: {
        businessID: this.businessID,
        businessName: this.businessName,
        promotionID: promotion._id
      }
    });
  }

  /**
   * Activa/desactiva una promoción
   */
  async togglePromotionStatus(promotion: Promotion) {
    const action = promotion.isActive ? 'desactivar' : 'activar';
    
    // Si se va a activar, advertir sobre la desactivación de otras
    if (!promotion.isActive) {
      const alert = await this.alertController.create({
        header: 'Activar Promoción',
        message: 'Solo puedes tener 1 promoción activa a la vez. Si activas esta, se desactivará la promoción actual.',
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel'
          },
          {
            text: 'Activar',
            role: 'confirm',
            handler: async () => {
              await this.performToggle(promotion);
            }
          }
        ]
      });
      await alert.present();
    } else {
      await this.performToggle(promotion);
    }
  }

  /**
   * Ejecuta el toggle de estado de la promoción
   */
  private async performToggle(promotion: Promotion) {
    const loading = await this.loadingController.create({
      message: promotion.isActive ? 'Desactivando...' : 'Activando...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const response = await firstValueFrom(
        this.apiService.togglePromotionStatus(this.businessID, promotion._id)
      );

      if (response?.status === 'success') {
        this.showSuccessToast(`Promoción ${promotion.isActive ? 'desactivada' : 'activada'} exitosamente`);
        await this.loadPromotions(); // Recargar lista
      }
    } catch (error) {
      console.error('Error toggling promotion:', error);
      this.showErrorToast('Error al cambiar el estado de la promoción');
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Duplica una promoción existente
   */
  async duplicatePromotion(promotion: Promotion) {
    const alert = await this.alertController.create({
      header: 'Duplicar Promoción',
      message: '¿Deseas crear una copia de esta promoción? La copia estará inactiva por defecto.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Duplicar',
          role: 'confirm',
          handler: async () => {
            await this.performDuplicate(promotion);
          }
        }
      ]
    });
    await alert.present();
  }

  /**
   * Ejecuta la duplicación de la promoción
   */
  private async performDuplicate(promotion: Promotion) {
    const loading = await this.loadingController.create({
      message: 'Duplicando promoción...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const response = await firstValueFrom(
        this.apiService.duplicatePromotion(this.businessID, promotion._id)
      );

      if (response?.status === 'success') {
        this.showSuccessToast('Promoción duplicada exitosamente');
        await this.loadPromotions(); // Recargar lista
      }
    } catch (error) {
      console.error('Error duplicating promotion:', error);
      this.showErrorToast('Error al duplicar la promoción');
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Elimina una promoción
   */
  async deletePromotion(promotion: Promotion) {
    const alert = await this.alertController.create({
      header: 'Eliminar Promoción',
      message: '¿Estás seguro de eliminar esta promoción? Esta acción no se puede deshacer.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.performDelete(promotion);
          }
        }
      ]
    });
    await alert.present();
  }

  /**
   * Ejecuta la eliminación de la promoción
   */
  private async performDelete(promotion: Promotion) {
    const loading = await this.loadingController.create({
      message: 'Eliminando promoción...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const response = await firstValueFrom(
        this.apiService.deletePromotionById(this.businessID, promotion._id)
      );

      if (response?.status === 'success') {
        this.showSuccessToast('Promoción eliminada exitosamente');
        await this.loadPromotions(); // Recargar lista
      }
    } catch (error) {
      console.error('Error deleting promotion:', error);
      this.showErrorToast('Error al eliminar la promoción');
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Muestra el detalle de estadísticas de una promoción
   */
  showPromotionStats(promotion: Promotion) {
    this.selectedPromotion = promotion;
  }

  /**
   * Cierra el detalle de estadísticas
   */
  closePromotionStats() {
    this.selectedPromotion = null;
  }

  /**
   * Determina si una promoción está expirada
   */
  isExpired(promotion: Promotion): boolean {
    return new Date(promotion.endDate) < new Date();
  }

  /**
   * Calcula la tasa de apertura de una promoción
   */
  getOpenRate(promotion: Promotion): number {
    if (!promotion.deliveryStats || promotion.deliveryStats.totalSent === 0) {
      return 0;
    }
    return Math.round((promotion.deliveryStats.totalOpened / promotion.deliveryStats.totalSent) * 100);
  }

  /**
   * Formatea el tipo de promoción para mostrar
   */
  getPromotionTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'DISCOUNT': 'Descuento',
      'OFFER': 'Oferta',
      'EVENT': 'Evento',
      'GENERAL': 'General'
    };
    return labels[type] || 'General';
  }

  /**
   * Obtiene el color del chip según el tipo de promoción
   */
  getPromotionTypeColor(type: string): string {
    const colors: { [key: string]: string } = {
      'DISCOUNT': 'success',
      'OFFER': 'warning',
      'EVENT': 'tertiary',
      'GENERAL': 'medium'
    };
    return colors[type] || 'medium';
  }

  /**
   * Muestra un toast de éxito
   */
  private async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }

  /**
   * Muestra un toast de error
   */
  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }

  /**
   * Regresa a la página anterior
   */
  goBack() {
    this.router.navigate(['/edit-service', this.businessID]);
  }
}

