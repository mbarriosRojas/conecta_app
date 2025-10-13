import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { trigger, transition, style, animate } from '@angular/animations';
import { GoogleAuthService } from '../../services/google-auth.service';
import { AuthService } from '../../services/auth.service';
import { FirebaseAuthService } from '../../services/firebase-auth.service';

interface FormData {
  name?: string;
  lastname?: string;
  phone?: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class LoginPage implements OnInit {
  isLogin = true;
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  
  formData: FormData = {
    email: '',
    password: '',
    name: '',
    lastname: '',
    phone: '',
    confirmPassword: ''
  };

  constructor(
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private googleAuthService: GoogleAuthService,
    private authService: AuthService,
    private firebaseAuthService: FirebaseAuthService
  ) {}

  async ngOnInit() {
    console.log('🚀 LoginPage: Página de login/registro cargada');
    
    // Verificar si hay un resultado de Google redirect pendiente
    await this.checkGoogleRedirectResult();
  }

  /**
   * Verificar si hay un resultado de Google redirect pendiente
   */
  private async checkGoogleRedirectResult() {
    try {
      const redirectResult = await this.googleAuthService.checkRedirectResult();
      if (redirectResult) {
        console.log('✅ Resultado de Google redirect encontrado, procesando...');
        
        // Registrar en backend y navegar al home
        const backendResponse = await this.googleAuthService['registerOrLoginUser'](redirectResult.user);
        
        if (backendResponse && backendResponse.token) {
          // Guardar token usando AuthService
          await this.authService['setAuthData'](
            backendResponse.data_user,
            backendResponse.token
          );
          
          console.log('✅ Login automático exitoso después de redirect');
          this.showSuccessToast(`¡Bienvenido ${redirectResult.user.displayName || redirectResult.user.email}!`);
          this.navigateToHome();
        }
      }
    } catch (error: any) {
      console.error('❌ Error procesando redirect result:', error);
      // No mostrar error al usuario, es normal que no haya redirect result
    }
  }


  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: this.isLogin ? 'Iniciando sesión...' : 'Creando cuenta...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      if (this.isLogin) {
        await this.performLogin();
      } else {
        await this.performRegister();
      }

      await loading.dismiss();
      this.showSuccessToast(this.isLogin ? '¡Inicio de sesión exitoso!' : '¡Cuenta creada exitosamente!');
      this.navigateToHome();
      
    } catch (error: any) {
      await loading.dismiss();
      console.error('❌ Error en autenticación:', error);
      
      // Manejar error de cuenta vinculada a Google
      if (error.error?.requiresGoogle) {
        this.showErrorToast('Esta cuenta está vinculada a Google. Usa "Continuar con Google" para iniciar sesión.');
        return;
      }
      
      this.showErrorToast(error?.message || 'Error en la autenticación');
    } finally {
      this.isLoading = false;
    }
  }

  private validateForm(): boolean {
    if (!this.formData.email || !this.formData.password) {
      this.showErrorToast('Por favor completa todos los campos');
      return false;
    }

    if (!this.isLogin) {
      if (!this.formData.name) {
        this.showErrorToast('El nombre es requerido');
        return false;
      }
      
      if (!this.formData.lastname) {
        this.showErrorToast('El apellido es requerido');
        return false;
      }
      
      if (this.formData.password !== this.formData.confirmPassword) {
        this.showErrorToast('Las contraseñas no coinciden');
        return false;
      }
      
      if (this.formData.password.length < 6) {
        this.showErrorToast('La contraseña debe tener al menos 6 caracteres');
        return false;
      }
    }

    return true;
  }

  private async performLogin() {
    console.log('🔐 Realizando login...');
    
    try {
      const response = await this.authService.login({
        email: this.formData.email,
        password: this.formData.password,
        platform: 'app'
      }).toPromise();
      
      console.log('✅ Login exitoso:', response);
      
    } catch (error: any) {
      console.error('❌ Error en login:', error);
      throw error;
    }
  }

  private async performRegister() {
    console.log('📝 Realizando registro...');
    
    try {
      // Validar que el nombre no esté vacío
      if (!this.formData.name?.trim()) {
        throw new Error('El nombre es requerido');
      }
      
      // Validar que el apellido no esté vacío
      if (!this.formData.lastname?.trim()) {
        throw new Error('El apellido es requerido');
      }
      
      // Validar teléfono si se proporciona
      const phone = this.formData.phone?.trim() || '';
      if (phone && phone.length < 10) {
        throw new Error('El número de teléfono debe tener al menos 10 caracteres');
      }
      
      const response = await this.authService.register({
        name: this.formData.name.trim(),
        lastname: this.formData.lastname.trim(),
        email: this.formData.email,
        password: this.formData.password,
        phone: phone || undefined // Enviar undefined si está vacío
      }).toPromise();
      
      console.log('✅ Registro exitoso:', response);
      
      // 🔥 IMPORTANTE: El AuthService ya maneja automáticamente el login
      // después del registro, pero necesitamos esperar a que se complete
      await this.authService.waitForInitialization();
      
      console.log('✅ Usuario autenticado automáticamente después del registro');
      
    } catch (error: any) {
      console.error('❌ Error en registro:', error);
      throw error;
    }
  }

  async loginWithGoogle() {
    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Iniciando sesión con Google...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      console.log('🔐 Iniciando login con Google...');
      
      // Autenticación con Firebase + Backend
      const result: any = await this.googleAuthService.signInWithGoogle();
      
      console.log('🔥 Resultado de Google Auth:', result);
      
      // Verificar que tengamos el token del backend
      if (result.backendResponse && result.backendResponse.token) {
        // 🔥 GUARDAR el token usando AuthService
        await this.authService['setAuthData'](
          result.backendResponse.data_user,
          result.backendResponse.token
        );
        
        console.log('✅ Token guardado exitosamente');
        
        await loading.dismiss();
        this.showSuccessToast(`¡Bienvenido ${result.user.displayName || result.user.email}!`);
        this.navigateToHome();
      } else {
        throw new Error('No se recibió el token del backend');
      }
      
    } catch (error: any) {
      await loading.dismiss();
      console.error('❌ Error en login con Google:', error);
      this.showErrorToast(error.message || 'Error al iniciar sesión con Google');
    } finally {
      this.isLoading = false;
    }
  }

  async forgotPassword() {
    const alert = await this.alertController.create({
      header: 'Recuperar Contraseña',
      message: 'Ingresa tu correo electrónico para recibir un enlace de recuperación:',
      inputs: [
        {
          name: 'email',
          type: 'email',
          placeholder: 'Correo electrónico',
          value: this.formData.email
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Enviar',
          handler: async (data) => {
            if (data.email) {
              try {
                await this.firebaseAuthService.sendPasswordResetEmail(data.email);
                this.showSuccessToast('Se ha enviado un enlace de recuperación a tu correo');
              } catch (error: any) {
                this.showErrorToast(error.message || 'Error enviando email de recuperación');
              }
            }
          }
        }
      ]
    });

    await alert.present();
  }

  private navigateToHome() {
    console.log('🏠 Navegando al home...');
    this.router.navigate(['/tabs/home'], { replaceUrl: true });
  }

  private navigateToProfile() {
    console.log('👤 Navegando al perfil...');
    this.router.navigate(['/tabs/tab3'], { replaceUrl: true });
  }

  goBackToHome() {
    console.log('🏠 Volviendo al home...');
    this.router.navigate(['/tabs/home'], { replaceUrl: true });
  }

  private async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'top',
      color: 'success',
      buttons: [
        {
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 4000,
      position: 'top',
      color: 'danger',
      buttons: [
        {
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  toggleMode() {
    this.isLogin = !this.isLogin;
    // Limpiar campos cuando cambie el modo
    this.formData = { 
      email: this.formData.email, 
      password: '', 
      name: '',
      lastname: '',
      phone: '',
      confirmPassword: '' 
    };
  }
}
