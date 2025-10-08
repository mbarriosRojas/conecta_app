import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AuthService, LoginRequest, RegisterRequest, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { firstValueFrom } from 'rxjs';

// Extender RegisterRequest para incluir campos adicionales del formulario
interface RegisterFormData extends RegisterRequest {
  confirmPassword: string;
  acceptTerms: boolean;
}

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class Tab3Page implements OnInit {
  user: User | null = null;
  
  // Propiedades para autenticación
  authMode: 'login' | 'register' = 'login';
  isLoading = false;
  loginData: LoginRequest = {
    email: '',
    password: ''
  };
  registerData: RegisterFormData = {
    name: '',
    lastname: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  };
  showLoginPassword = false;
  showRegisterPassword = false;
  showConfirmPassword = false;

  // Propiedades para edición de perfil
  isEditProfileModalOpen = false;
  isUpdatingProfile = false;
  editProfileData = {
    name: '',
    lastname: '',
    email: '',
    phone: ''
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    console.log('Tab3 - ngOnInit started');
    // Verificar estado inicial de autenticación
    this.checkAuthStatus();
    
    // Suscribirse a cambios en el estado de autenticación
    this.authService.currentUser$.subscribe(user => {
      console.log('Tab3 - User state changed:', user);
      this.user = user;
    });
    
    // También verificar el estado de autenticación
    this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      console.log('Tab3 - Auth state changed:', isAuthenticated);
      if (!isAuthenticated) {
        this.user = null;
      }
    });
  }

  private async checkAuthStatus() {
    try {
      const isAuthenticated = await this.authService.checkAuthStatus();
      console.log('Tab3 - Initial auth check:', isAuthenticated);
      
      if (isAuthenticated) {
        this.user = this.authService.getCurrentUser();
        console.log('Tab3 - Current user:', this.user);
      } else {
        this.user = null;
        console.log('Tab3 - No user authenticated');
      }
    } catch (error) {
      console.error('Tab3 - Error checking auth status:', error);
      this.user = null;
    }
  }

  // Método que se ejecuta cada vez que se entra a la página
  ionViewWillEnter() {
    console.log('Tab3 - View will enter, checking auth status...');
    this.checkAuthStatus();
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que quieres cerrar sesión?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Cerrar Sesión',
          handler: async () => {
            await this.authService.logout();
            this.showSuccessToast('Sesión cerrada');
            this.router.navigate(['/tabs/home']); // Redirigir al home después de cerrar sesión
          },
        },
      ],
    });
    await alert.present();
  }

  onAuthModeChange() {
    console.log('Auth mode changed to:', this.authMode);
  }

  toggleLoginPassword() {
    this.showLoginPassword = !this.showLoginPassword;
  }

  toggleRegisterPassword() {
    this.showRegisterPassword = !this.showRegisterPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // Método de login
  async onLogin() {
    console.log('Tab3 - onLogin() llamado');
    console.log('Tab3 - isLoading:', this.isLoading);
    console.log('Tab3 - loginData:', this.loginData);
    
    if (this.isLoading) {
      console.log('Tab3 - Ya está cargando, saliendo...');
      return;
    }
    
    console.log('Tab3 - Iniciando login con datos:', this.loginData);
    this.isLoading = true;
    
    try {
      console.log('Tab3 - Llamando a authService.login...');
      await firstValueFrom(this.authService.login(this.loginData));
      console.log('Tab3 - Login exitoso');
      this.showSuccessToast('¡Bienvenido!');
      // Redirigir al home después del login exitoso
      this.router.navigate(['/tabs/home']);
    } catch (error: any) {
      console.error('Tab3 - Error en login:', error);
      const errorMessage = error?.error?.message || 'Error al iniciar sesión';
      this.showErrorToast(errorMessage);
    } finally {
      this.isLoading = false;
      console.log('Tab3 - Login finalizado');
    }
  }

  // Método de registro
  async onRegister() {
    if (this.isLoading) return;
    
    // Validaciones adicionales
    if (this.registerData.password !== this.registerData.confirmPassword) {
      this.showErrorToast('Las contraseñas no coinciden');
      return;
    }
    
    if (!this.registerData.acceptTerms) {
      this.showErrorToast('Debes aceptar los términos y condiciones');
      return;
    }
    
    this.isLoading = true;
    
    try {
      const { confirmPassword, acceptTerms, ...registerPayload } = this.registerData;
      await firstValueFrom(this.authService.register(registerPayload));
      this.showSuccessToast('¡Cuenta creada exitosamente!');
      // Redirigir al home después del registro exitoso
      this.router.navigate(['/tabs/home']);
    } catch (error: any) {
      console.error('Error en registro:', error);
      const errorMessage = error?.error?.message || 'Error al crear la cuenta';
      this.showErrorToast(errorMessage);
    } finally {
      this.isLoading = false;
    }
  }

  // Métodos para gestión de perfil
  editProfile() {
    // Cargar datos actuales del usuario en el formulario
    this.editProfileData = {
      name: this.user?.name || '',
      lastname: this.user?.lastname || '',
      email: this.user?.email || '',
      phone: this.user?.phone || ''
    };
    this.isEditProfileModalOpen = true;
  }

  closeEditProfileModal() {
    this.isEditProfileModalOpen = false;
  }

  async onUpdateProfile() {
    if (this.isUpdatingProfile) return;
    this.isUpdatingProfile = true;

    try {
      const response = await this.authService.updateUserProfile(this.editProfileData).toPromise();
      if (response.status === 'success') {
        this.showSuccessToast('Perfil actualizado correctamente');
        this.closeEditProfileModal();
      } else {
        this.showErrorToast(response.message || 'Error al actualizar el perfil');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      this.showErrorToast(error?.error?.message || 'Error al actualizar el perfil');
    } finally {
      this.isUpdatingProfile = false;
    }
  }

  async changeProfileImage() {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt, // Permite al usuario elegir entre galería o cámara
      webUseInput: true // Importante para web
    });

    if (image.dataUrl && this.user) {
      const formData = new FormData();
      formData.append('profileImage', this.dataURLtoFile(image.dataUrl, 'profile.jpeg'));
      
      // También puedes enviar otros datos del perfil si es necesario
      formData.append('name', this.user.name);
      formData.append('lastname', this.user.lastname || '');
      formData.append('email', this.user.email || '');
      formData.append('phone', this.user.phone || '');

      try {
        const response = await this.authService.updateUserProfileWithImage(formData).toPromise();
        if (response.status === 'success') {
          this.showSuccessToast('Foto de perfil actualizada');
          // El AuthService ya actualiza el currentUserSubject
        } else {
          this.showErrorToast(response.message || 'Error al actualizar la foto de perfil');
        }
      } catch (error: any) {
        console.error('Error updating profile image:', error);
        this.showErrorToast(error?.error?.message || 'Error al actualizar la foto de perfil');
      }
    }
  }

  // Helper para convertir Data URL a File
  dataURLtoFile(dataurl: string, filename: string): File {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  goToCreateService() {
    this.router.navigate(['/create-service']);
  }

  goToServices() {
    this.router.navigate(['/tabs/services']);
  }

  async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: 'success',
      position: 'bottom'
    });
    toast.present();
  }

  async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: 'danger',
      position: 'bottom'
    });
    toast.present();
  }
}
