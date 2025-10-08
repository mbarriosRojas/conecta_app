import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { StorageService } from '../services/storage.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private router: Router,
    private storageService: StorageService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    console.log(`AuthInterceptor - ${req.method} ${req.url}`);
    
    // No interceptar peticiones que no son de la API
    if (!req.url.includes('/api/')) {
      return next.handle(req);
    }

    // Rutas públicas que NO necesitan token
    const publicRoutes = [
      '/api/category',
      '/api/provider/provider/filters',
      '/api/provider/cities',
      '/api/banner',
      '/api/users/login',
      '/api/users/register_user',
      '/api/provider/addView'
    ];

    // Verificar si es una ruta pública
    const isPublicRoute = publicRoutes.some(route => req.url.includes(route));
    
    if (isPublicRoute) {
      console.log(`AuthInterceptor - Public route, no token needed`);
      return next.handle(req);
    }

    // Para rutas privadas, intentar agregar token si existe
    console.log(`AuthInterceptor - Private route, checking for token`);
    
    // Obtener token de forma síncrona desde localStorage como fallback
    let token: string | null = null;
    try {
      // Intentar obtener del localStorage directamente (más rápido)
      token = localStorage.getItem('auth_token');
      console.log(`AuthInterceptor - Token from localStorage: ${token ? 'found' : 'not found'}`);
    } catch (error) {
      console.log('AuthInterceptor - Error getting token from localStorage:', error);
    }

    if (token) {
      console.log(`AuthInterceptor - Adding token to request`);
      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      return next.handle(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401) {
            console.log('AuthInterceptor - 401 error, token invalid, redirecting to login');
            this.router.navigate(['/tabs/tab3']);
          }
          return throwError(() => error);
        })
      );
    } else {
      console.log(`AuthInterceptor - No token found, redirecting to login`);
      this.router.navigate(['/tabs/tab3']);
      return throwError(() => new Error('No token available'));
    }
  }
}
