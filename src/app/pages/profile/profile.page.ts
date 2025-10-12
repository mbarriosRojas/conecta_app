import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false
})
export class ProfilePage implements OnInit {
  user: any = null;
  isLoading = false;
  isEditing = false;

  // Datos editables del usuario
  editData = {
    name: '',
    lastname: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: ''
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.checkAuthAndLoadData();
  }

  async checkAuthAndLoadData() {
    try {
      // Esperar a que la inicialización termine (con timeout)
      await this.authService.waitForInitialization();
    } catch (error) {
      console.warn('ProfilePage - Error waiting for auth initialization:', error);
    }
    
    // Verificar autenticación
    if (!this.authService.isAuthenticated()) {
      console.log('ProfilePage - User not authenticated, redirecting to login');
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }
    
    // Si está autenticado, cargar datos
    this.loadUserData();
  }

  async loadUserData() {
    try {
      this.isLoading = true;
      
      // Obtener datos del usuario desde AuthService
      const currentUser = this.authService.getCurrentUser();
      
      if (currentUser) {
        this.user = currentUser;
        
        // Cargar perfil completo desde el backend
        this.authService.getUserProfile().subscribe({
          next: (response) => {
            if (response.success && response.data_user) {
              this.user = response.data_user;
              this.populateEditData();
            }
          },
          error: (error) => {
            console.error('Error cargando perfil:', error);
            this.showErrorToast('Error cargando datos del perfil');
          }
        });
      } else {
        // Si no hay usuario, redirigir al login
        this.router.navigate(['/login'], { replaceUrl: true });
      }
      
    } catch (error) {
      console.error('Error cargando usuario:', error);
      this.router.navigate(['/login'], { replaceUrl: true });
    } finally {
      this.isLoading = false;
    }
  }

  populateEditData() {
    this.editData = {
      name: this.user.name || '',
      lastname: this.user.lastname || '',
      email: this.user.email || '',
      phone: this.user.phone || '',
      address: this.user.addressUser || '',
      city: this.user.city || '',
      state: this.user.departament || ''
    };
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (this.isEditing) {
      this.populateEditData();
    }
  }

  async saveProfile() {
    if (!this.validateForm()) {
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Guardando perfil...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Actualizar perfil en el backend
      const updateData = {
        name: this.editData.name,
        lastname: this.editData.lastname,
        phone: this.editData.phone,
        addressUser: this.editData.address,
        city: this.editData.city,
        departament: this.editData.state
      };

      this.authService.updateUserProfile(updateData).subscribe({
        next: (response) => {
          loading.dismiss();
          this.showSuccessToast('Perfil actualizado exitosamente');
          this.user = { ...this.user, ...updateData };
          this.isEditing = false;
        },
        error: (error) => {
          loading.dismiss();
          console.error('Error actualizando perfil:', error);
          this.showErrorToast('Error actualizando perfil');
        }
      });

    } catch (error) {
      loading.dismiss();
      console.error('Error guardando perfil:', error);
      this.showErrorToast('Error guardando perfil');
    }
  }

  async changeProfilePicture() {
    const alert = await this.alertController.create({
      header: 'Cambiar foto de perfil',
      message: '¿Cómo quieres cambiar tu foto de perfil?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Tomar foto',
          handler: () => this.takePicture(CameraSource.Camera)
        },
        {
          text: 'Galería',
          handler: () => this.takePicture(CameraSource.Photos)
        }
      ]
    });

    await alert.present();
  }

  async takePicture(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: source
      });

      if (image.dataUrl) {
        await this.uploadProfilePicture(image.dataUrl);
      }

    } catch (error) {
      console.error('Error tomando foto:', error);
      this.showErrorToast('Error tomando foto');
    }
  }

  async uploadProfilePicture(imageDataUrl: string) {
    const loading = await this.loadingController.create({
      message: 'Subiendo imagen...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Convertir dataUrl a File
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });

      // Crear FormData para subir la imagen
      const formData = new FormData();
      formData.append('profileImage', file);

      this.authService.updateUserProfileWithImage(formData).subscribe({
        next: (response) => {
          loading.dismiss();
          this.showSuccessToast('Foto de perfil actualizada');
          this.user.profileImage = response.data_user.profileImage;
        },
        error: (error) => {
          loading.dismiss();
          console.error('Error subiendo imagen:', error);
          this.showErrorToast('Error subiendo imagen');
        }
      });

    } catch (error) {
      loading.dismiss();
      console.error('Error procesando imagen:', error);
      this.showErrorToast('Error procesando imagen');
    }
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Cerrar sesión',
      message: '¿Estás seguro de que quieres cerrar sesión?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cerrar sesión',
          handler: async () => {
            await this.authService.logout();
            this.router.navigate(['/tabs/home'], { replaceUrl: true });
          }
        }
      ]
    });

    await alert.present();
  }

  private validateForm(): boolean {
    if (!this.editData.name.trim()) {
      this.showErrorToast('El nombre es requerido');
      return false;
    }
    if (!this.editData.lastname.trim()) {
      this.showErrorToast('El apellido es requerido');
      return false;
    }
    return true;
  }

  private async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }

  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
  }
}
