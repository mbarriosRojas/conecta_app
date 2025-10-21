import { Component, OnInit } from '@angular/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';
import { SplashService } from '../../services/splash.service';

@Component({
  selector: 'app-animated-splash',
  templateUrl: './animated-splash.component.html',
  styleUrls: ['./animated-splash.component.scss'],
  standalone: false
})
export class AnimatedSplashComponent implements OnInit {

  constructor(private splashService: SplashService) { }

  ngOnInit() {
    this.hideNativeSplash();
  }

  private async hideNativeSplash() {
    // Ocultar el splash screen nativo después de un breve delay
    setTimeout(async () => {
      if (Capacitor.isNativePlatform()) {
        await SplashScreen.hide();
      }
    }, 500);
    
    // En desarrollo web, asegurar que el splash se muestre por al menos 3 segundos
    if (!Capacitor.isNativePlatform()) {
      setTimeout(() => {
        this.onVideoEnded();
      }, 3000);
    }
  }

  onVideoEnded() {
    // Cuando el video termine, ocultar el componente y notificar al servicio
    const splashElement = document.getElementById('animated-splash');
    if (splashElement) {
      splashElement.style.opacity = '0';
      splashElement.style.transition = 'opacity 0.5s ease-out';
      
      setTimeout(() => {
        splashElement.style.display = 'none';
        // Notificar que el splash ha terminado
        this.splashService.hideSplash();
      }, 500);
    }
  }

  onVideoError(event: any) {
    console.error('Error loading video:', event);
    // Si hay error con el video, ocultar el splash después de un tiempo
    setTimeout(() => {
      this.onVideoEnded();
    }, 2000);
  }
}
