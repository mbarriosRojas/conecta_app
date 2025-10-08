import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { LocationService } from '../../services/location.service';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-location-permission',
  templateUrl: './location-permission.component.html',
  styleUrls: ['./location-permission.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class LocationPermissionComponent implements OnInit {
  @Input() showOnlyIfDenied: boolean = false;
  @Output() locationGranted = new EventEmitter<void>();
  @Output() locationDenied = new EventEmitter<void>();

  locationPermissionStatus: 'granted' | 'denied' | 'prompt' | 'unknown' = 'unknown';
  isRequesting: boolean = false;

  constructor(
    private locationService: LocationService,
    private permissionService: PermissionService,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.checkLocationPermission();
  }

  async checkLocationPermission() {
    try {
      const hasPermission = await this.locationService.requestPermissions();
      this.locationPermissionStatus = hasPermission ? 'granted' : 'denied';
      
      if (hasPermission) {
        this.locationGranted.emit();
      } else {
        this.locationDenied.emit();
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
      this.locationPermissionStatus = 'denied';
      this.locationDenied.emit();
    }
  }

  async requestLocationPermission() {
    if (this.isRequesting) return;
    
    this.isRequesting = true;

    try {
      const result = await this.permissionService.requestLocationPermissionWithModal();
      
      if (result.granted) {
        this.locationPermissionStatus = 'granted';
        this.locationGranted.emit();
      } else {
        this.locationPermissionStatus = 'denied';
        this.locationDenied.emit();
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      this.locationPermissionStatus = 'denied';
      this.locationDenied.emit();
    } finally {
      this.isRequesting = false;
    }
  }

  private async showPermissionDeniedAlert() {
    const alert = await this.alertController.create({
      header: 'Permisos de Ubicación',
      message: 'Para obtener mejores resultados, necesitamos acceder a tu ubicación. Puedes habilitar los permisos en la configuración de tu dispositivo.',
      buttons: [
        {
          text: 'Configuración',
          handler: () => {
            // En dispositivos móviles, esto abrirá la configuración
            // En web, no se puede abrir directamente
            console.log('Open device settings');
          }
        },
        {
          text: 'Continuar sin ubicación',
          handler: () => {
            this.locationDenied.emit();
          }
        }
      ]
    });

    await alert.present();
  }

  get shouldShowComponent(): boolean {
    if (this.showOnlyIfDenied) {
      return this.locationPermissionStatus === 'denied';
    }
    return this.locationPermissionStatus !== 'granted';
  }

  get permissionMessage(): string {
    switch (this.locationPermissionStatus) {
      case 'granted':
        return 'Ubicación permitida';
      case 'denied':
        return 'Ubicación denegada';
      case 'prompt':
        return 'Solicitar ubicación';
      default:
        return 'Configurar ubicación';
    }
  }
}
