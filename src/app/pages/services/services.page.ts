import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { StorageService } from '../../services/storage.service';
import { CacheService } from '../../services/cache.service';
import { Provider } from '../../models/provider.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-services',
  templateUrl: './services.page.html',
  styleUrls: ['./services.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ServicesPage implements OnInit {
  providers: Provider[] = [];
  isLoading = false;

  constructor(
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService,
    private storageService: StorageService,
    private cacheService: CacheService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.loadUserProviders();
  }

  async loadUserProviders() {
    console.log('Services - loadUserProviders started');
    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Cargando servicios...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      console.log('Services - Calling getUserProviders API');
      
      // Usar Network-First con timeout corto para servicios del usuario
      const response = await this.cacheService.networkFirst(
        'user_services',
        'user_services',
        async () => {
          return await this.apiService.getUserProviders();
        },
        { timeout: 5000 }
      );
      
      console.log('Services - getUserProviders response:', response);
      
      if (response?.data) {
        this.providers = response.data;
        console.log('Services - Providers loaded:', this.providers.length);
      }
    } catch (error) {
      console.error('Services - Error loading user providers:', error);
      this.showErrorToast('Error al cargar los servicios');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
      console.log('Services - loadUserProviders completed');
    }
  }

  async refresh(event?: any) {
    // Invalidar cache para forzar carga fresca
    await this.cacheService.invalidateCache('user_services');
    await this.cacheService.invalidateCacheByPattern('providers_page');
    
    await this.loadUserProviders();
    if (event) {
      event.target.complete();
    }
  }

  createNewService() {
    this.router.navigate(['/create-service']);
  }

  editService(provider: Provider) {
    this.router.navigate(['/edit-service', provider._id]);
  }

  async deleteService(provider: Provider) {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Estás seguro de que quieres eliminar "${provider.name}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.confirmDeleteService(provider._id);
          }
        }
      ]
    });
    await alert.present();
  }

  async confirmDeleteService(providerId: string) {
    const loading = await this.loadingController.create({
      message: 'Eliminando servicio...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.apiService.deleteUserProvider(providerId).toPromise();
      this.showSuccessToast('Servicio eliminado correctamente');
      await this.loadUserProviders();
    } catch (error) {
      console.error('Error deleting provider:', error);
      this.showErrorToast('Error al eliminar el servicio');
    } finally {
      await loading.dismiss();
    }
  }

  async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'bottom'
    });
    await toast.present();
  }

  async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color: 'success',
      position: 'bottom'
    });
    await toast.present();
  }
}
