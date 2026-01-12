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
      '/api/provider/addView',
      '/api/users/auth/google',
      '/api/users/auth/add-password',
      '/api/geofencing/promotions/nearby',
      '/api/geofencing/promotions',
      '/api/provider/provider/'
    ];

    // Verificar si es una ruta pública
    const isPublicRoute = publicRoutes.some(route => req.url.includes(route));
    
    if (isPublicRoute) {
      return next.handle(req);
    }

    // Para rutas privadas, intentar agregar token si existe
    let token: string | null = null;
    try {
      token = localStorage.getItem('auth_token');
    } catch (error) {
      // Error silencioso
    }

    if (token) {
      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      return next.handle(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401) {
            this.router.navigate(['/tabs/tab3']);
          }
          return throwError(() => error);
        })
      );
    } else {
      return next.handle(req);
    }
  }
}
