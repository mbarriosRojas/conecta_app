import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { GeofencingAnalyticsService } from '../../services/geofencing-analytics.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-edit-promotion',
  templateUrl: './edit-promotion.page.html',
  styleUrls: ['./edit-promotion.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class EditPromotionPage implements OnInit {
  businessID: string = '';
  businessName: string = '';
  promotionID: string | null = null;
  isEditMode = false;

  promotionData = {
    businessName: '',
    promotion_text: '',
    promotion_type: 'GENERAL' as 'DISCOUNT' | 'OFFER' | 'EVENT' | 'GENERAL',
    location: {
      latitude: 0,
      longitude: 0
    },
    promo_radius_meters: 1000,
    isActive: false,
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  };

  promotionTypes = [
    { value: 'DISCOUNT', label: 'Descuento' },
    { value: 'OFFER', label: 'Oferta' },
    { value: 'EVENT', label: 'Evento' },
    { value: 'GENERAL', label: 'General' }
  ];

  audiencePreview: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private geofencingService: GeofencingAnalyticsService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    this.businessID = this.route.snapshot.queryParamMap.get('businessID') || '';
    this.businessName = this.route.snapshot.queryParamMap.get('businessName') || '';
    this.promotionID = this.route.snapshot.queryParamMap.get('promotionID') || null;

    if (!this.businessID) {
      this.showErrorToast('ID de negocio no proporcionado');
      this.router.navigate(['/tabs/services']);
      return;
    }

    this.promotionData.businessName = this.businessName;
    this.isEditMode = !!this.promotionID;

    if (this.isEditMode && this.promotionID) {
      await this.loadPromotion();
    } else {
      await this.loadProviderLocation();
    }

    await this.calculateReach();
  }

  /**
   * Carga una promoción existente para editar
   */
  async loadPromotion() {
    const loading = await this.loadingController.create({
      message: 'Cargando promoción...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const response = await firstValueFrom(
        this.apiService.getAllPromotions(this.businessID)
      );

      if (response?.status === 'success' && response.data) {
        const promotion = response.data.find((p: any) => p._id === this.promotionID);
        
        if (promotion) {
          this.promotionData = {
            businessName: promotion.businessName,
            promotion_text: promotion.promotion_text,
            promotion_type: promotion.promotion_type,
            location: {
              latitude: promotion.location.coordinates[1],
              longitude: promotion.location.coordinates[0]
            },
            promo_radius_meters: promotion.promo_radius_meters,
            isActive: promotion.isActive,
            startDate: new Date(promotion.startDate).toISOString().slice(0, 16),
            endDate: new Date(promotion.endDate).toISOString().slice(0, 16)
          };
        }
      }
    } catch (error) {
      console.error('Error loading promotion:', error);
      this.showErrorToast('Error al cargar la promoción');
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Carga la ubicación del proveedor para una nueva promoción
   */
  async loadProviderLocation() {
    try {
      const response = await firstValueFrom(
        this.apiService.getUserProviderById(this.businessID)
      );

      if (response?.data && response.data.address?.location) {
        this.promotionData.location = {
          latitude: response.data.address.location.coordinates[1],
          longitude: response.data.address.location.coordinates[0]
        };
      }
    } catch (error) {
      console.error('Error loading provider location:', error);
    }
  }

  /**
   * Calcula el alcance estimado de la promoción
   */
  async calculateReach() {
    try {
      const response = await firstValueFrom(
        this.geofencingService.getPromotionReach(
          this.businessID,
          this.promotionData.promo_radius_meters,
          this.promotionData.location.latitude,
          this.promotionData.location.longitude
        )
      );

      if (response?.status === 'success') {
        this.audiencePreview = response.data;
      }
    } catch (error) {
      console.error('Error calculating reach:', error);
      this.audiencePreview = {
        activeUsers4h: 0,
        estimatedReach: 0
      };
    }
  }

  /**
   * Recalcula el alcance cuando cambia el radio
   */
  async onRadiusChange() {
    await this.calculateReach();
  }

  /**
   * Guarda la promoción (crear o actualizar)
   */
  async savePromotion() {
    if (!this.validateForm()) {
      return;
    }

    const loading = await this.loadingController.create({
      message: this.isEditMode ? 'Actualizando promoción...' : 'Creando promoción...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const promotionPayload = {
        businessName: this.promotionData.businessName,
        promotion_text: this.promotionData.promotion_text,
        promotion_type: this.promotionData.promotion_type,
        location: this.promotionData.location,
        promo_radius_meters: this.promotionData.promo_radius_meters,
        isActive: this.promotionData.isActive,
        startDate: new Date(this.promotionData.startDate).toISOString(),
        endDate: new Date(this.promotionData.endDate).toISOString()
      };

      let response;
      if (this.isEditMode && this.promotionID) {
        response = await firstValueFrom(
          this.apiService.updatePromotion(this.businessID, this.promotionID, promotionPayload)
        );
      } else {
        response = await firstValueFrom(
          this.apiService.createPromotion(this.businessID, promotionPayload)
        );
      }

      if (response?.status === 'success') {
        this.showSuccessToast(this.isEditMode ? 'Promoción actualizada exitosamente' : 'Promoción creada exitosamente');
        this.goBack();
      }
    } catch (error) {
      console.error('Error saving promotion:', error);
      this.showErrorToast('Error al guardar la promoción');
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Valida el formulario
   */
  validateForm(): boolean {
    if (!this.promotionData.promotion_text.trim()) {
      this.showErrorToast('El texto de la promoción es requerido');
      return false;
    }

    if (this.promotionData.promo_radius_meters < 50 || this.promotionData.promo_radius_meters > 10000) {
      this.showErrorToast('El radio debe estar entre 50m y 10km');
      return false;
    }

    if (new Date(this.promotionData.endDate) <= new Date(this.promotionData.startDate)) {
      this.showErrorToast('La fecha de fin debe ser posterior a la de inicio');
      return false;
    }

    return true;
  }

  /**
   * Formatea el valor del radio para mostrar
   */
  formatRadiusPin = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}km`;
    }
    return `${value}m`;
  };

  /**
   * Toast de éxito
   */
  private async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color: 'success',
      position: 'bottom'
    });
    await toast.present();
  }

  /**
   * Toast de error
   */
  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'bottom'
    });
    await toast.present();
  }

  /**
   * Regresa a la página anterior
   */
  goBack() {
    this.router.navigate(['/my-promotions'], {
      queryParams: {
        businessID: this.businessID,
        businessName: this.businessName
      }
    });
  }
}

