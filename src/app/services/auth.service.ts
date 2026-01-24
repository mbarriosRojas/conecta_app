import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { GoogleAuthService } from './google-auth.service';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { StorageService } from './storage.service';
import { PushNotificationService } from './push-notification.service';
import { LocationService } from './location.service';

export interface LoginRequest {
  email: string;
  password: string;
  platform?: string;
}

export interface RegisterRequest {
  name: string;
  lastname: string;
  email: string;
  password: string;
  phone?: string;
  acceptedTerms?: boolean;
  acceptedPrivacy?: boolean;
}

export interface LoginResponse {
  data_user: {
    id: string;
    name: string;
    role: string;
    sessionVersion: number;
  };
  token: string;
}

export interface RegisterResponse {
  message: string;
  data_user: {
    id: string;
    name: string;
    role: string;
    sessionVersion: number;
  };
  token: string;
}

export interface User {
  id: string;
  name: string;
  lastname?: string;
  email?: string;
  phone?: string;
  role: string;
  sessionVersion: number;
  profileImage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  private initializationPromise: Promise<void> | null = null;

  constructor(
    private http: HttpClient,
    private storageService: StorageService,
    private pushNotificationService: PushNotificationService,
    private locationService: LocationService
    ,
    private googleAuthService: GoogleAuthService
  ) {
    this.initializationPromise = this.initializeAuth();
  }

  private async initializeAuth() {
    try {
      const token = await this.storageService.get('auth_token');
      const userData = await this.storageService.get('user_data');
      
      
      if (token && userData) {
        // Verificar si el token sigue siendo válido
        const isValid = await this.validateToken();
        
        if (isValid) {
          console.log('AuthService - Token is valid, setting user data');
          this.currentUserSubject.next(userData);
          this.isAuthenticatedSubject.next(true);
          
          // Cargar perfil actualizado en background
          this.loadUserProfile().catch(error => {
            console.error('Error loading user profile:', error);
          });
        } else {
          console.log('AuthService - Token is invalid, logging out');
          await this.logout();
        }
      } else {
        console.log('AuthService - No token or user data found');
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      await this.logout();
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    const loginData = {
      ...credentials,
      platform: 'app'
    };

    return this.http.post<LoginResponse>(`${this.baseUrl}/api/users/login`, loginData)
      .pipe(
        tap(async (response) => {
          await this.setAuthData(response.data_user, response.token);
        })
      );
  }

  register(userData: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.baseUrl}/api/users/register_user`, userData)
      .pipe(
        tap(async (response) => {
          await this.setAuthData(response.data_user, response.token);
        })
      );
  }

  async logout(): Promise<void> {
    console.log('🔐 AuthService.logout: Iniciando proceso de logout...');
    
    // Intentar cerrar sesión en Firebase/Google también si está disponible
    // Usar Promise.allSettled para que no falle si Firebase tiene problemas
    try {
      if (this.googleAuthService) {
        console.log('🔐 AuthService.logout: Cerrando sesión en Firebase/Google...');
        // No esperar el resultado, solo intentarlo
        this.googleAuthService.signOut().catch((error) => {
          console.warn('AuthService.logout: error closing firebase session (no crítico):', error);
        });
      }
    } catch (error) {
      console.warn('AuthService.logout: error closing firebase session (no crítico):', error);
    }

    // Limpiar datos locales (esto siempre debe ejecutarse)
    console.log('🔐 AuthService.logout: Limpiando datos locales...');
    try {
    await this.storageService.remove('auth_token');
    await this.storageService.remove('user_data');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
      console.log('✅ AuthService.logout: Logout completado exitosamente');
    } catch (error) {
      console.error('❌ AuthService.logout: Error limpiando datos locales:', error);
      // Aun así, limpiar los subjects
      this.currentUserSubject.next(null);
      this.isAuthenticatedSubject.next(false);
    }
  }

  private async setAuthData(user: User, token: string): Promise<void> {
    console.log('AuthService - setAuthData: saving token, length:', token.length);
    await this.storageService.set('auth_token', token);
    await this.storageService.set('user_data', user);
    
    // También guardar en localStorage como respaldo
    try {
      localStorage.setItem('auth_token', token);
      console.log('AuthService - setAuthData: token saved to localStorage');
    } catch (error) {
      console.error('AuthService - setAuthData: error saving to localStorage:', error);
    }
    
    // Actualizar el userID del token FCM con el usuario autenticado
    try {
      await this.pushNotificationService.updateTokenUserID(user.id);
      console.log('AuthService - setAuthData: FCM token userID updated');
    } catch (error) {
      console.error('AuthService - setAuthData: error updating FCM token userID:', error);
    }
    
    // 🔥 Actualizar el userID de las ubicaciones con el usuario autenticado
    try {
      await this.locationService.updateUserIdOnLogin(user.id, this);
      console.log('AuthService - setAuthData: Location userID updated');
    } catch (error) {
      console.error('AuthService - setAuthData: error updating Location userID:', error);
    }
    
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
    console.log('AuthService - setAuthData: auth state updated');
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  async getToken(): Promise<string | null> {
    // Esperar a que la inicialización termine antes de obtener el token (con timeout)
    if (this.initializationPromise) {
      try {
        await Promise.race([
          this.initializationPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Initialization timeout')), 3000))
        ]);
      } catch (error) {
        // Error silencioso
      }
    }
    
    const token = await this.storageService.get('auth_token');
    
    // Verificar también en localStorage como respaldo
    try {
      const localStorageToken = localStorage.getItem('auth_token');
      
      // Si no hay token en storage pero sí en localStorage, usar localStorage
      if (!token && localStorageToken) {
        return localStorageToken;
      }
    } catch (error) {
      console.error('AuthService - getToken: error checking localStorage:', error);
    }
    
    return token;
  }

  // Método para verificar si el token sigue siendo válido
  async validateToken(): Promise<boolean> {
    try {
      const token = await this.getToken();
      if (!token) {
        return false;
      }

      // Verificar si el token está expirado localmente
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (payload.exp && payload.exp < currentTime) {
          await this.logout();
          return false;
        }
        
        return true;
      } catch (parseError) {
        console.error('AuthService - Error parsing token:', parseError);
        await this.logout();
        return false;
      }
    } catch (error) {
      console.error('AuthService - Error validating token:', error);
      await this.logout();
      return false;
    }
  }

  // Método para esperar a que la inicialización termine
  async waitForInitialization(): Promise<void> {
    if (this.initializationPromise) {
      try {
        await Promise.race([
          this.initializationPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Initialization timeout')), 3000))
        ]);
      } catch (error) {
        console.warn('AuthService - waitForInitialization: timeout or error, continuing anyway:', error);
      }
    }
  }

  // Método para verificar y refrescar el estado de autenticación
  async checkAuthStatus(): Promise<boolean> {
    const isValid = await this.validateToken();
    if (!isValid) {
      this.currentUserSubject.next(null);
      this.isAuthenticatedSubject.next(false);
    }
    return isValid;
  }

  // Método para obtener el perfil completo del usuario
  getUserProfile(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/api/users/`);
  }

  // Método para actualizar el perfil del usuario
  updateUserProfile(userData: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/api/users/`, userData)
      .pipe(
        tap((response) => {
          // Actualizar los datos del usuario en el estado local
          if (response.success && response.data_user) {
            const updatedUser = { ...this.currentUserSubject.value, ...response.data_user };
            this.currentUserSubject.next(updatedUser);
            this.storageService.set('user_data', updatedUser);
          }
        })
      );
  }

  // Método para actualizar el perfil con imagen
  updateUserProfileWithImage(formData: FormData): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/api/users/profileImage`, formData)
      .pipe(
        tap((response) => {
          // Actualizar los datos del usuario en el estado local
          if (response.success && response.data_user) {
            const updatedUser = { ...this.currentUserSubject.value, ...response.data_user };
            this.currentUserSubject.next(updatedUser);
            this.storageService.set('user_data', updatedUser);
          }
        })
      );
  }

  // Método para cargar datos completos del usuario al inicializar
  async loadUserProfile(): Promise<void> {
    try {
      const isValid = await this.validateToken();
      if (isValid) {
        this.getUserProfile().subscribe({
          next: (response) => {
            if (response.data_user) {
              this.currentUserSubject.next(response.data_user);
              this.storageService.set('user_data', response.data_user);
            }
          },
          error: (error) => {
            console.error('Error loading user profile:', error);
            // Si hay error al cargar el perfil, mantener la sesión pero con datos básicos
          }
        });
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
    }
  }

  // Método para cambiar contraseña
  async updatePassword(currentPassword: string, newPassword: string): Promise<any> {
    return await firstValueFrom(this.http.post<any>(`${this.baseUrl}/api/users/changePasswordUser/user/new`, {
      lastpassword: currentPassword,
      newpassword: newPassword
    }));
  }
}
