import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword,
  User,
  AuthError,
  UserCredential
} from 'firebase/auth';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthService {
  private app: any;
  private auth: any;

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      console.log('🔥 Inicializando Firebase Auth...');
      
      if (environment.firebase.apiKey === 'TU_API_KEY_AQUI') {
        console.warn('⚠️ Firebase no configurado en environment.ts');
        return;
      }

      this.app = initializeApp(environment.firebase);
      this.auth = getAuth(this.app);
      
      console.log('✅ Firebase Auth inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando Firebase Auth:', error);
    }
  }

  /**
   * 📧 Enviar email de recuperación de contraseña
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      console.log('📧 Enviando email de recuperación a:', email);
      
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

  /**
   * 🔐 Crear usuario con email y contraseña
   */
  async createUserWithEmailAndPassword(email: string, password: string): Promise<UserCredential> {
    try {
      console.log('🔐 Creando usuario con email y contraseña...');
      
      const result = await createUserWithEmailAndPassword(this.auth, email, password);
      
      console.log('✅ Usuario creado exitosamente');
      
      // Enviar email de verificación automáticamente
      await this.sendEmailVerification(result.user);
      
      return result;
      
    } catch (error: any) {
      console.error('❌ Error creando usuario:', error);
      throw this.handleAuthError(error as AuthError);
    }
  }

  /**
   * 🔑 Login con email y contraseña
   */
  async signInWithEmailAndPassword(email: string, password: string): Promise<UserCredential> {
    try {
      console.log('🔑 Iniciando sesión con email y contraseña...');
      
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      
      console.log('✅ Login exitoso');
      
      return result;
      
    } catch (error: any) {
      console.error('❌ Error en login:', error);
      throw this.handleAuthError(error as AuthError);
    }
  }

  /**
   * 🔄 Cambiar contraseña (usuario autenticado)
   */
  async updatePassword(user: User, newPassword: string): Promise<void> {
    try {
      console.log('🔄 Cambiando contraseña...');
      
      await updatePassword(user, newPassword);
      
      console.log('✅ Contraseña actualizada exitosamente');
      
    } catch (error: any) {
      console.error('❌ Error cambiando contraseña:', error);
      throw this.handleAuthError(error as AuthError);
    }
  }

  /**
   * Manejar errores de autenticación
   */
  private handleAuthError(error: AuthError): Error {
    console.error('❌ Error de autenticación:', error);
    
    switch (error.code) {
      case 'auth/user-not-found':
        throw new Error('No existe una cuenta con este correo electrónico');
      case 'auth/wrong-password':
        throw new Error('La contraseña es incorrecta');
      case 'auth/email-already-in-use':
        throw new Error('Ya existe una cuenta con este correo electrónico');
      case 'auth/weak-password':
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      case 'auth/invalid-email':
        throw new Error('El correo electrónico no es válido');
      case 'auth/too-many-requests':
        throw new Error('Demasiados intentos fallidos. Intenta más tarde');
      case 'auth/network-request-failed':
        throw new Error('Error de conexión. Verifica tu internet');
      case 'auth/user-disabled':
        throw new Error('Esta cuenta ha sido deshabilitada');
      default:
        throw new Error(`Error de autenticación: ${error.message}`);
    }
  }
}
