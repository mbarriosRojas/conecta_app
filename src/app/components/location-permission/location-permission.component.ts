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
      // Solo verificar el estado, no solicitar permisos automáticamente
      const permissionStatus = await this.permissionService.checkLocationPermission();
      
      if (permissionStatus === 'granted') {
        this.locationPermissionStatus = 'granted';
        this.locationGranted.emit();
      } else if (permissionStatus === 'denied') {
        this.locationPermissionStatus = 'denied';
        this.locationDenied.emit();
      } else {
        // Si no está definido, asumir que está permitido (los permisos están en el manifiesto)
        this.locationPermissionStatus = 'granted';
        this.locationGranted.emit();
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
      // En caso de error, asumir que está permitido
      this.locationPermissionStatus = 'granted';
      this.locationGranted.emit();
    }
  }

  async requestLocationPermission() {
    if (this.isRequesting) return;
    
    this.isRequesting = true;

    try {
      // Si los permisos están denegados, mostrar alert para ir a configuración
      if (this.locationPermissionStatus === 'denied') {
        await this.showPermissionDeniedAlert();
      } else {
        // Intentar solicitar permisos
        const result = await this.permissionService.requestLocationPermissionWithModal();
        
        if (result.granted) {
          this.locationPermissionStatus = 'granted';
          this.locationGranted.emit();
        } else {
          this.locationPermissionStatus = 'denied';
          this.locationDenied.emit();
        }
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
    // Solo mostrar cuando los permisos están explícitamente denegados
    return this.locationPermissionStatus === 'denied';
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
