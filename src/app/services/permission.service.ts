import { Injectable } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { LocationService } from './location.service';

export interface PermissionResult {
  granted: boolean;
  denied: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private hasRequestedLocationPermission = false;

  constructor(
    private locationService: LocationService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  async checkLocationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    try {
      const hasPermission = await this.locationService.requestPermissions();
      return hasPermission ? 'granted' : 'denied';
    } catch (error) {
      console.error('Error checking location permission:', error);
      return 'denied';
    }
  }

  async requestLocationPermissionWithModal(): Promise<PermissionResult> {
    if (this.hasRequestedLocationPermission) {
      return { granted: false, denied: true, message: 'Ya se solicitó el permiso anteriormente' };
    }

    this.hasRequestedLocationPermission = true;

    const alert = await this.alertController.create({
      header: 'Permisos de Ubicación',
      message: 'Para mostrarte servicios cercanos a tu ubicación, necesitamos acceder a tu ubicación. ¿Permites el acceso?',
      buttons: [
        {
          text: 'No, gracias',
          role: 'cancel',
          handler: () => {
            this.showToast('Puedes cambiar esto en configuración más tarde', 'medium');
            return { granted: false, denied: true };
          }
        },
        {
          text: 'Permitir',
          handler: async () => {
            try {
              const hasPermission = await this.locationService.requestPermissions();
              if (hasPermission) {
                await this.locationService.getCurrentPosition();
                this.showToast('Ubicación obtenida correctamente', 'success');
                return { granted: true, denied: false };
              } else {
                this.showToast('Permiso de ubicación denegado', 'warning');
                return { granted: false, denied: true };
              }
            } catch (error) {
              console.error('Error requesting location permission:', error);
              this.showToast('Error al obtener ubicación', 'danger');
              return { granted: false, denied: true };
            }
          }
        }
      ]
    });

    await alert.present();
    
    // Esperar a que se resuelva el alert
    return new Promise((resolve) => {
      alert.onDidDismiss().then(async (result) => {
        if (result.role === 'cancel') {
          resolve({ granted: false, denied: true, message: 'Usuario canceló el permiso' });
        } else {
          // El permiso se maneja en el handler del botón "Permitir"
          resolve({ granted: true, denied: false });
        }
      });
    });
  }

  async requestLocationPermissionSilently(): Promise<PermissionResult> {
    try {
      const hasPermission = await this.locationService.requestPermissions();
      if (hasPermission) {
        await this.locationService.getCurrentPosition();
        return { granted: true, denied: false };
      } else {
        return { granted: false, denied: true };
      }
    } catch (error) {
      console.error('Error requesting location permission silently:', error);
      return { granted: false, denied: true };
    }
  }

  async showLocationPermissionDialog(): Promise<boolean> {
    const alert = await this.alertController.create({
      header: 'Ubicación Requerida',
      message: 'Para una mejor experiencia, necesitamos acceder a tu ubicación para mostrarte servicios cercanos.',
      buttons: [
        {
          text: 'Configurar más tarde',
          role: 'cancel'
        },
        {
          text: 'Permitir ahora',
          handler: async () => {
            const result = await this.requestLocationPermissionSilently();
            return result.granted;
          }
        }
      ]
    });

    await alert.present();
    const result = await alert.onDidDismiss();
    
    if (result.role !== 'cancel') {
      const permissionResult = await this.requestLocationPermissionSilently();
      return permissionResult.granted;
    }
    
    return false;
  }

  async checkAndRequestLocationPermission(): Promise<boolean> {
    // Verificar si ya tenemos ubicación
    if (this.locationService.isLocationAvailable()) {
      return true;
    }

    // Intentar obtener ubicación silenciosamente primero
    const silentResult = await this.requestLocationPermissionSilently();
    if (silentResult.granted) {
      return true;
    }

    // Si falla, retornar false (los permisos están en el manifiesto)
    return false;
  }

  resetLocationPermissionRequest() {
    this.hasRequestedLocationPermission = false;
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger' | 'medium') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
