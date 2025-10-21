import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class OptionalAuthGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean> {
    
    try {
      console.log('🔓 OptionalAuthGuard: Verificando autenticación opcional para:', state.url);
      
      // Esperar a que la inicialización termine
      await this.authService.waitForInitialization();
      
      // Verificar estado de autenticación
      const isAuthenticated = this.authService.isAuthenticated();
      console.log('🔓 OptionalAuthGuard: Usuario autenticado:', isAuthenticated);
      
      // Siempre permitir acceso, pero mostrar contenido diferente según autenticación
      return true;
      
    } catch (error) {
      console.error('🔓 OptionalAuthGuard: Error verificando autenticación:', error);
      // En caso de error, permitir acceso para exploración
      return true;
    }
  }
}
