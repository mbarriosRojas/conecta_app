import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage-angular';
import { StatusBar } from '@capacitor/status-bar';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Services
import { ApiService } from './services/api.service';
import { LocationService } from './services/location.service';
import { StorageService } from './services/storage.service';
import { UtilsService } from './services/utils.service';
import { AuthService } from './services/auth.service';
import { PermissionService } from './services/permission.service';
import { PushNotificationService } from './services/push-notification.service';

// Interceptors
import { AuthInterceptor } from './interceptors/auth.interceptor';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule, 
    IonicModule.forRoot(), 
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    IonicStorageModule.forRoot()
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    provideAnimationsAsync(), // 🚀 NUEVO: Habilitar animaciones
    ApiService,
    LocationService,
    StorageService,
    UtilsService,
    AuthService,
    PermissionService,
    PushNotificationService
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
