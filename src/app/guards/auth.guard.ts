import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean> {
    
    try {
      
      // Esperar a que la inicialización termine con timeout más largo
      await this.authService.waitForInitialization();
      
      // Verificar estado de autenticación
      const isAuthenticated = this.authService.isAuthenticated();
      console.log('🔐 AuthGuard: Usuario autenticado:', isAuthenticated);
      
      if (!isAuthenticated) {
        console.log('🔐 AuthGuard: No autenticado, redirigiendo al login');
        // Si no está autenticado, redirigir al login
        this.router.navigate(['/login'], { 
          queryParams: { returnUrl: state.url },
          replaceUrl: true 
        });
        return false;
      }
      
      console.log('🔐 AuthGuard: Acceso permitido');
      return true;
      
    } catch (error) {
      console.error('🔐 AuthGuard: Error verificando autenticación:', error);
      // En caso de error, redirigir al login
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: state.url },
        replaceUrl: true 
      });
      return false;
    }
  }
}