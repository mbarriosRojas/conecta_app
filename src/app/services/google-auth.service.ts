import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult,
  signOut,
  User,
  AuthError,
  UserCredential,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithCredential
} from 'firebase/auth';
import { Platform, ToastController, AlertController } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GoogleAuthService {
  private app: any;
  private auth: any;
  private googleProvider!: GoogleAuthProvider;
  private currentUser: User | null = null;

  constructor(
    private platform: Platform,
    private http: HttpClient
  ) {
    this.initializeFirebase();
  }

  // Utilitario: detecta si estamos probando desde localhost en un dispositivo móvil
  private isMobileLocalhost(): boolean {
    try {
      const host = window.location.hostname || '';
      const usingLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
      const backendLocal = environment.apiUrl?.includes('localhost');

      // Caso 1: abierto desde el navegador móvil (ionic serve abierto en el móvil) -> marcar como prueba
      if (this.platform.is('mobileweb')) {
        return usingLocalhost || backendLocal;
      }

      // Caso 2: Capacitor con livereload (la app nativa está cargando desde tu servidor dev, p. ej. http://192.168.x.y:8100)
      // Detectamos si la URL usa http(s) y tiene puerto (común en livereload)
      const isHttpProtocol = window.location.protocol.startsWith('http');
      const hasDevPort = !!window.location.port;
      if (this.platform.is('capacitor') && isHttpProtocol && hasDevPort) {
        return usingLocalhost || backendLocal || window.location.href.includes(':8100');
      }

      // Caso 3: app nativa instalada (Capacitor) -> no tratar como prueba solo porque hostname es 'localhost'
      return false;
    } catch (e) {
      return false;
    }
  }

  private initializeFirebase(): void {
    try {
      this.app = initializeApp(environment.firebase);
      this.auth = getAuth(this.app);
      
      // Configurar Google Auth Provider
      this.googleProvider = new GoogleAuthProvider();
      this.googleProvider.addScope('email');
      this.googleProvider.addScope('profile');
      
      // 🔥 IMPORTANTE: Configurar redirect URI correcto para móvil
      if (this.platform.is('capacitor')) {
        this.googleProvider.setCustomParameters({
          prompt: 'select_account',
          redirect_uri: `https://${environment.firebase.authDomain}/__/auth/handler`
        });
      } else {
        // En web, usar select_account para permitir cambiar de cuenta
        this.googleProvider.setCustomParameters({
          prompt: 'select_account'
        });
      }

    } catch (error) {
      console.error('❌ Error inicializando Firebase Auth:', error);
    }
  }

  /**
   * Iniciar sesión con Google
   * Usa popup en web y redirect en móvil
   */
  async signInWithGoogle(): Promise<any> {
    try {
      console.log('🔐 Iniciando autenticación con Google...');

      // Detectar si estamos probando en un dispositivo móvil con localhost
      if (this.isMobileLocalhost()) {
        console.warn('⚠️ Detected mobile localhost testing environment');
        // El caller (LoginPage) manejará el mensaje UI si ve testEnvironmentDetected
        return { testEnvironmentDetected: true };
      }

      let result: UserCredential;

      if (this.platform.is('capacitor')) {
        // En dispositivos móviles usar redirect (Firebase Auth nativo)
        console.log('📱 Plataforma móvil: usando Firebase Auth con redirect');
        result = await this.signInWithRedirect();
      } else {
        // En web usar popup (Firebase Auth nativo)
        console.log('🌐 Plataforma web: usando Firebase Auth con popup');
        result = await this.signInWithPopup();
      }

      this.currentUser = result.user;
      console.log('✅ Autenticación con Google exitosa:', {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL
      });

      // 🔄 Registrar automáticamente en el backend y retornar response
      const backendResponse = await this.registerOrLoginUser(result.user);
      
      // Retornar objeto personalizado con ambos resultados
      return {
        user: result.user,
        backendResponse
      };
    } catch (error: any) {
      // Si el error es REDIRECT_INITIATED, no es un error real
      if (error.message === 'REDIRECT_INITIATED') {
        console.log('🔄 Redirect iniciado, esperando que el usuario regrese...');
        // No lanzar error, solo retornar null para que el UI no muestre error
        return { redirectInitiated: true };
      }
      
      console.error('❌ Error en autenticación con Google:', error);
      throw this.handleAuthError(error as AuthError);
    }
  }

  /**
   * Autenticación con popup (para web)
   */
  private async signInWithPopup(): Promise<UserCredential> {
    return await signInWithPopup(this.auth, this.googleProvider);
  }

  /**
   * Autenticación con redirect (para móvil)
   * 🔥 MEJORADO: Usar signInWithRedirect directamente en móvil
   */
  private async signInWithRedirect(): Promise<UserCredential> {
    try {
      console.log('📱 Iniciando autenticación con redirect en móvil...');
      
      // Primero verificar si hay un resultado pendiente
      const redirectResult = await getRedirectResult(this.auth);
      
      if (redirectResult) {
        console.log('✅ Resultado de redirect encontrado:', redirectResult.user.email);
        return redirectResult;
      }
      
      // Si no hay resultado, iniciar el redirect
      console.log('🔄 Iniciando redirect a Google Sign-In...');
      console.log('ℹ️ La app abrirá el navegador y regresará automáticamente después del login');
      
      // Usar signInWithRedirect - abre Custom Chrome Tab y regresa a la app
      await signInWithRedirect(this.auth, this.googleProvider);
      
      // Este código no se ejecutará hasta que la app se reabra
      // El resultado se procesará en checkRedirectResult() cuando la app se reabra
      throw new Error('REDIRECT_INITIATED');
      
    } catch (error: any) {
      // Si el error es REDIRECT_INITIATED, es esperado
      if (error.message === 'REDIRECT_INITIATED') {
        console.log('✅ Redirect iniciado exitosamente');
        throw error;
      }
      
      console.error('❌ Error en signInWithRedirect:', error);
      throw error;
    }
  }

  /**
   * Verificar si hay un resultado de redirect pendiente
   */
  async checkRedirectResult(): Promise<UserCredential | null> {
    try {
      const redirectResult = await getRedirectResult(this.auth);
      if (redirectResult) {
        console.log('✅ Resultado de redirect encontrado:', redirectResult.user.email);
        this.currentUser = redirectResult.user;
        return redirectResult;
      }
      return null;
    } catch (error) {
      console.error('❌ Error verificando redirect result:', error);
      return null;
    }
  }

  /**
   * Cerrar sesión
   */
  async signOut(): Promise<void> {
    try {
      console.log('🚪 Cerrando sesión...');
      
      // Verificar que auth esté inicializado
      if (!this.auth) {
        console.warn('⚠️ Firebase auth no está inicializado, omitiendo signOut de Firebase');
        this.currentUser = null;
        return;
      }
      
      // Intentar cerrar sesión en Firebase con timeout para evitar que se cuelgue
      const signOutPromise = signOut(this.auth);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SignOut timeout after 5 seconds')), 5000)
      );
      
      try {
        await Promise.race([signOutPromise, timeoutPromise]);
        console.log('✅ Sesión de Firebase cerrada correctamente');
      } catch (signOutError: any) {
        // Si es timeout o cualquier otro error, solo loguear pero no fallar
        if (signOutError?.message?.includes('timeout')) {
          console.warn('⚠️ Timeout al cerrar sesión en Firebase (continuando de todas formas)');
        } else {
          console.warn('⚠️ Error al cerrar sesión en Firebase (continuando de todas formas):', signOutError);
        }
      }
      
      this.currentUser = null;
      console.log('✅ Sesión cerrada correctamente');
    } catch (error) {
      console.error('❌ Error inesperado cerrando sesión:', error);
      // No lanzar el error, solo loguearlo para que el logout continúe
      this.currentUser = null;
    }
  }

  /**
   * Obtener usuario actual
   */
  getCurrentUser(): User | null {
    return this.currentUser || this.auth?.currentUser;
  }

  /**
   * Verificar si hay usuario autenticado
   */
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  /**
   * Obtener token de acceso
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const user = this.getCurrentUser();
      if (user) {
        const tokenResult = await user.getIdTokenResult();
        return tokenResult.token;
      }
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo token:', error);
      return null;
    }
  }

  /**
   * Obtener información del usuario
   */
  getUserInfo(): any {
    const user = this.getCurrentUser();
    if (user) {
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        providerData: user.providerData
      };
    }
    return null;
  }

  /**
   * Manejar errores de autenticación
   */
  private handleAuthError(error: AuthError): Error {
    console.error('❌ Error de autenticación:', error);
    
    switch (error.code) {
      case 'auth/popup-closed-by-user':
        throw new Error('El popup fue cerrado por el usuario');
      case 'auth/popup-blocked':
        throw new Error('El popup fue bloqueado por el navegador');
      case 'auth/cancelled-popup-request':
        throw new Error('Solicitud de popup cancelada');
      case 'auth/account-exists-with-different-credential':
        throw new Error('Ya existe una cuenta con este email pero con diferente proveedor');
      case 'auth/email-already-in-use':
        throw new Error('Este email ya está en uso');
      case 'auth/operation-not-allowed':
        throw new Error('Operación no permitida');
      case 'auth/weak-password':
        throw new Error('La contraseña es muy débil');
      case 'auth/user-disabled':
        throw new Error('Esta cuenta ha sido deshabilitada');
      case 'auth/user-not-found':
        throw new Error('No se encontró una cuenta con este email');
      case 'auth/wrong-password':
        throw new Error('Contraseña incorrecta');
      case 'auth/too-many-requests':
        throw new Error('Demasiados intentos fallidos. Intenta más tarde');
      default:
        throw new Error(`Error de autenticación: ${error.message}`);
    }
  }

  /**
   * Configurar Firebase con credenciales reales
   */
  updateFirebaseConfig(config: any): void {
    console.log('🔧 Actualizando configuración de Firebase...');
    // En una implementación real, aquí actualizarías la configuración
    // Por ahora solo logueamos
    console.log('✅ Configuración actualizada:', config);
  }

  /**
   * 🔄 Registrar o hacer login automáticamente en el backend
   */
  private async registerOrLoginUser(firebaseUser: User): Promise<any> {
    try {
      console.log('🔄 Verificando/registrando usuario en backend...');
      
      // Obtener token de Firebase
      const idToken = await firebaseUser.getIdToken();
      
      // Mapear datos de Google a nuestro modelo de usuario
      const userData = this.mapGoogleUserToLocalUser(firebaseUser);
      
      // Llamar al endpoint del backend
      const response: any = await firstValueFrom(this.http.post(`${environment.apiUrl}/api/users/auth/google`, {
        idToken,
        userData
      }));

      console.log('✅ Usuario registrado/autenticado en backend:', response);

      // 🔥 RETORNAR el response para que el login.page.ts lo maneje
      return response;
      
    } catch (error: any) {
      console.error('❌ Error registrando usuario en backend:', error);
      
      // Si el endpoint no existe o falla, continuar sin error
      // El usuario ya está autenticado en Firebase
      if (error.status === 404) {
        console.log('⚠️ Endpoint de registro automático no implementado en backend');
        console.log('✅ Continuando solo con autenticación Firebase...');
      } else {
        throw error;
      }
    }
  }

  /**
   * 🗺️ Mapear datos de Google a nuestro modelo de usuario
   */
  private mapGoogleUserToLocalUser(firebaseUser: User): any {
    const displayName = firebaseUser.displayName || '';
    const nameParts = displayName.split(' ');
    
    return {
      id: firebaseUser.uid,
      name: nameParts[0] || '',
      lastname: nameParts.slice(1).join(' ') || '',
      email: firebaseUser.email || '',
      phone: '', // Campo vacío - Google no proporciona teléfono
      role: 'user', // Rol por defecto
      sessionVersion: 1, // Versión inicial
      profileImage: firebaseUser.photoURL || '',
      firebaseUid: firebaseUser.uid,
      emailVerified: firebaseUser.emailVerified
    };
  }

  /**
   * 🔧 Agregar contraseña a cuenta Google existente
   */
  async addPasswordToGoogleAccount(email: string, password: string, confirmPassword: string): Promise<any> {
    try {
      console.log('🔧 Agregando contraseña a cuenta Google...');
      
      const response: any = await firstValueFrom(this.http.post(`${environment.apiUrl}/api/users/auth/add-password`, {
        email,
        password,
        confirmPassword
      }));

      console.log('✅ Contraseña agregada exitosamente');
      return response;
      
    } catch (error: any) {
      console.error('❌ Error agregando contraseña:', error);
      throw error;
    }
  }

  /**
   * 📧 Enviar email de recuperación de contraseña
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      console.log('📧 Enviando email de recuperación...');
      
      await sendPasswordResetEmail(this.auth, email);
      
      console.log('✅ Email de recuperación enviado');
      
    } catch (error: any) {
      console.error('❌ Error enviando email de recuperación:', error);
      throw this.handleAuthError(error as AuthError);
    }
  }

  /**
   * ✉️ Enviar email de verificación
   */
  async sendEmailVerification(user: User): Promise<void> {
    try {
      console.log('✉️ Enviando email de verificación...');
      
      await sendEmailVerification(user);
      
      console.log('✅ Email de verificación enviado');
      
    } catch (error: any) {
      console.error('❌ Error enviando email de verificación:', error);
      throw this.handleAuthError(error as AuthError);
    }
  }
}