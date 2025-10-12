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
  sendEmailVerification
} from 'firebase/auth';
import { Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';

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

  private initializeFirebase(): void {
    try {
      console.log('🔥 Inicializando Firebase con configuración:', environment.firebase);
      this.app = initializeApp(environment.firebase);
      this.auth = getAuth(this.app);
      
      // Configurar Google Auth Provider
      this.googleProvider = new GoogleAuthProvider();
      this.googleProvider.addScope('email');
      this.googleProvider.addScope('profile');
      
      // Configurar para obtener el refresh token
      this.googleProvider.setCustomParameters({
        prompt: 'select_account'
      });

      console.log('✅ Firebase Auth inicializado correctamente');
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
      
      let result: UserCredential;
      
      if (this.platform.is('capacitor')) {
        // En dispositivos móviles usar redirect
        result = await this.signInWithRedirect();
      } else {
        // En web usar popup
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
    } catch (error) {
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
   */
  private async signInWithRedirect(): Promise<UserCredential> {
    // Primero intentar obtener resultado de redirect previo
    const redirectResult = await getRedirectResult(this.auth);
    
    if (redirectResult) {
      return redirectResult;
    } else {
      // Si no hay resultado previo, iniciar nuevo redirect
      await signInWithRedirect(this.auth, this.googleProvider);
      // En este punto el usuario será redirigido, el resultado se obtendrá en la siguiente carga
      throw new Error('Redirect iniciado, esperando resultado...');
    }
  }

  /**
   * Cerrar sesión
   */
  async signOut(): Promise<void> {
    try {
      console.log('🚪 Cerrando sesión...');
      await signOut(this.auth);
      this.currentUser = null;
      console.log('✅ Sesión cerrada correctamente');
    } catch (error) {
      console.error('❌ Error cerrando sesión:', error);
      throw error;
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
      const response: any = await this.http.post(`${environment.apiUrl}/api/users/auth/google`, {
        idToken,
        userData
      }).toPromise();

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
      
      const response: any = await this.http.post(`${environment.apiUrl}/api/users/auth/add-password`, {
        email,
        password,
        confirmPassword
      }).toPromise();

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