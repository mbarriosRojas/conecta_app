import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, IonModal, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { GeofencingAnalyticsService } from '../../services/geofencing-analytics.service';
import { LocationService } from '../../services/location.service';
import { firstValueFrom } from 'rxjs';
import { mapConfig } from '../../../environments/environment.maps';

declare var google: any;

interface Promotion {
  _id: string;
  businessID: string;
  businessName: string;
  text: string;
  type: 'DISCOUNT' | 'OFFER' | 'EVENT' | 'GENERAL';
  location: {
    type: string;
    coordinates: [number, number];
  };
  radius: number;
  distance: number;
  distanceFormatted: string;
  score: number;
  startDate: string;
  endDate: string;
}

@Component({
  selector: 'app-promotions-nearby',
  templateUrl: './promotions-nearby.page.html',
  styleUrls: ['./promotions-nearby.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class PromotionsNearbyPage implements OnInit {
  @ViewChild('mapModal') mapModal!: IonModal;

  promotions: Promotion[] = [];
  isLoading = false;
  currentRadius = 2000; // metros
  currentLocation: { lat: number; lng: number } | null = null;
  
  // Filtros
  selectedCategory: string = '';
  selectedType: string = '';
  
  // Estadísticas
  totalPromotions = 0;
  
  // Mapa
  map: any;
  markers: any[] = [];
  userMarker: any;
  radiusCircle: any;
  showMapModal = false;
  selectedPromotion: Promotion | null = null;

  // Tipos de promoción
  promotionTypes = [
    { value: '', label: 'Todos los tipos' },
    { value: 'DISCOUNT', label: '💰 Descuentos' },
    { value: 'OFFER', label: '🎁 Ofertas' },
    { value: 'EVENT', label: '🎉 Eventos' },
    { value: 'GENERAL', label: '📢 General' }
  ];

  constructor(
    private geofencingService: GeofencingAnalyticsService,
    private locationService: LocationService,
    private router: Router,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    await this.loadCurrentLocation();
    await this.loadPromotions();
  }

  /**
   * Carga la ubicación actual del usuario
   */
  async loadCurrentLocation() {
    try {
      const position = await this.locationService.getCurrentPosition();
      this.currentLocation = {
        lat: position.latitude,
        lng: position.longitude
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      // Ubicación por defecto (ejemplo: Bogotá)
      this.currentLocation = {
        lat: 4.60971,
        lng: -74.08175
      };
    }
  }

  /**
   * Carga las promociones cercanas
   */
  async loadPromotions() {
    if (!this.currentLocation) {
      await this.loadCurrentLocation();
    }

    if (!this.currentLocation) {
      return;
    }

    this.isLoading = true;

    try {
      const response = await firstValueFrom(
        this.geofencingService.getNearbyPromotions(
          this.currentLocation.lat,
          this.currentLocation.lng,
          this.currentRadius,
          this.selectedCategory,
          50
        )
      );

      if (response && response.status === 'success') {
        this.promotions = response.data.promotions;
        this.totalPromotions = response.data.total;
        
        // Aplicar filtro de tipo si está seleccionado
        if (this.selectedType) {
          this.promotions = this.promotions.filter(p => p.type === this.selectedType);
        }
      }
    } catch (error) {
      console.error('Error loading promotions:', error);
      this.promotions = [];
      this.totalPromotions = 0;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Maneja el cambio del radio de búsqueda
   */
  async onRadiusChange(event: any) {
    this.currentRadius = event.detail.value;
    await this.loadPromotions();
  }

  /**
   * Maneja el cambio del radio desde el mapa
   */
  async onMapRadiusChange(event: any) {
    this.currentRadius = event.detail.value;
    await this.loadPromotions();
    
    // Actualizar el círculo del mapa si existe
    if (this.map) {
      this.updateMapRadius();
    }
  }

  /**
   * Maneja el cambio de filtro de tipo
   */
  async onTypeFilterChange() {
    await this.loadPromotions();
  }

  /**
   * Refresca las promociones (pull to refresh)
   */
  async handleRefresh(event: any) {
    await this.loadCurrentLocation();
    await this.loadPromotions();
    event.target.complete();
  }

  /**
   * Formatea el radio para el slider
   */
  formatRadiusPin = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}km`;
    }
    return `${value}m`;
  };

  /**
   * Obtiene el ícono según el tipo de promoción
   */
  getPromotionIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'DISCOUNT': 'pricetag',
      'OFFER': 'gift',
      'EVENT': 'calendar',
      'GENERAL': 'megaphone'
    };
    return icons[type] || 'megaphone';
  }

  /**
   * Obtiene el color según el tipo de promoción
   */
  getPromotionColor(type: string): string {
    const colors: { [key: string]: string } = {
      'DISCOUNT': 'success',
      'OFFER': 'tertiary',
      'EVENT': 'warning',
      'GENERAL': 'primary'
    };
    return colors[type] || 'primary';
  }

  /**
   * Navega al detalle del proveedor
   */
  goToProvider(businessID: string) {
    this.router.navigate(['/provider-detail', businessID]);
  }

  /**
   * Abre el modal del mapa
   */
  async openMapModal() {
    this.showMapModal = true;
    
    // Esperar a que el modal se abra completamente
    setTimeout(async () => {
      try {
        await this.loadGoogleMaps();
        this.initializeMap();
      } catch (error) {
        console.error('Error loading map:', error);
        await this.showErrorToast('Error cargando el mapa. Intenta nuevamente.');
      }
    }, 300);
  }

  /**
   * Cierra el modal del mapa
   */
  closeMapModal() {
    this.showMapModal = false;
    this.selectedPromotion = null;
    
    // Limpiar marcadores
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];
    
    if (this.userMarker) {
      this.userMarker.setMap(null);
      this.userMarker = null;
    }
  }

  /**
   * Contacta al proveedor por WhatsApp
   */
  async contactViaWhatsApp(promo: Promotion) {
    try {
      // Aquí deberías obtener el número de teléfono del proveedor
      // Por ahora usaremos un número de ejemplo
      const phoneNumber = '+584121234567'; // Número de ejemplo
      const message = `Hola! Me interesa esta promoción: ${promo.text} en ${promo.businessName}`;
      
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      
      // Abrir WhatsApp
      window.open(whatsappUrl, '_blank');
      
      await this.showSuccessToast('Abriendo WhatsApp...');
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      await this.showErrorToast('Error abriendo WhatsApp');
    }
  }

  /**
   * Muestra un toast de éxito
   */
  private async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: 'success',
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  /**
   * Muestra un toast de error
   */
  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: 'warning',
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  /**
   * Carga la API de Google Maps
   */
  private async loadGoogleMaps(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Verificar si ya está cargada
      if (typeof google !== 'undefined' && google.maps) {
        resolve();
        return;
      }

      // Verificar si ya hay un script cargándose
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        // Esperar a que se cargue
        const checkGoogle = setInterval(() => {
          if (typeof google !== 'undefined' && google.maps) {
            clearInterval(checkGoogle);
            resolve();
          }
        }, 100);
        return;
      }

      // Crear y cargar el script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${mapConfig.googleMapsApiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('✅ Google Maps API cargada correctamente');
        resolve();
      };
      
      script.onerror = () => {
        console.error('❌ Error cargando Google Maps API');
        reject(new Error('Error cargando Google Maps API'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Inicializa el mapa de Google
   */
  initializeMap() {
    if (!this.currentLocation) return;

    const mapElement = document.getElementById('promotionsMap');
    if (!mapElement) return;

    // Verificar que Google Maps esté disponible
    if (typeof google === 'undefined' || !google.maps) {
      console.error('❌ Google Maps no está disponible');
      return;
    }

    this.map = new google.maps.Map(mapElement, {
      center: { lat: this.currentLocation.lat, lng: this.currentLocation.lng },
      zoom: 14,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true
    });

    // Marcador del usuario
    this.userMarker = new google.maps.Marker({
      position: { lat: this.currentLocation.lat, lng: this.currentLocation.lng },
      map: this.map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      },
      title: 'Tu ubicación'
    });

    // Círculo del radio de búsqueda
    this.radiusCircle = new google.maps.Circle({
      map: this.map,
      center: { lat: this.currentLocation.lat, lng: this.currentLocation.lng },
      radius: this.currentRadius,
      fillColor: '#4285F4',
      fillOpacity: 0.1,
      strokeColor: '#4285F4',
      strokeOpacity: 0.5,
      strokeWeight: 2
    });

    // Marcadores de promociones
    this.promotions.forEach((promo, index) => {
      const marker = new google.maps.Marker({
        position: {
          lat: promo.location.coordinates[1],
          lng: promo.location.coordinates[0]
        },
        map: this.map,
        title: promo.businessName,
        label: {
          text: this.truncatePromotionName(promo.businessName),
          color: 'white',
          fontWeight: 'bold',
          fontSize: '12px'
        },
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40">
              <rect x="2" y="2" width="116" height="36" rx="18" fill="${this.getMarkerColor(promo.type)}" stroke="white" stroke-width="2"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(120, 40),
          anchor: new google.maps.Point(60, 20),
          labelOrigin: new google.maps.Point(60, 20)
        }
      });

      marker.addListener('click', () => {
        this.selectedPromotion = promo;
        
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${promo.businessName}</h3>
              <p style="margin: 0 0 4px 0; font-size: 12px;">${promo.text}</p>
              <p style="margin: 0; font-size: 11px; color: #666;">📍 ${promo.distanceFormatted}</p>
            </div>
          `
        });
        
        infoWindow.open(this.map, marker);
      });

      this.markers.push(marker);
    });
  }

  /**
   * Obtiene el color del marcador según el tipo
   */
  getMarkerColor(type: string): string {
    const colors: { [key: string]: string } = {
      'DISCOUNT': '#10dc60',
      'OFFER': '#f4a942',
      'EVENT': '#ffce00',
      'GENERAL': '#3880ff'
    };
    return colors[type] || '#3880ff';
  }

  /**
   * Centra el mapa en una promoción específica
   */
  centerOnPromotion(promo: Promotion) {
    if (this.map) {
      this.map.setCenter({
        lat: promo.location.coordinates[1],
        lng: promo.location.coordinates[0]
      });
      this.map.setZoom(16);
      this.selectedPromotion = promo;
    }
  }

  /**
   * Actualiza el radio del círculo en el mapa
   */
  private updateMapRadius() {
    if (!this.map || !this.currentLocation) return;

    // Eliminar el círculo anterior si existe
    if (this.radiusCircle) {
      this.radiusCircle.setMap(null);
    }

    // Crear nuevo círculo con el radio actualizado
    this.radiusCircle = new google.maps.Circle({
      map: this.map,
      center: { lat: this.currentLocation.lat, lng: this.currentLocation.lng },
      radius: this.currentRadius,
      fillColor: '#4285F4',
      fillOpacity: 0.1,
      strokeColor: '#4285F4',
      strokeOpacity: 0.5,
      strokeWeight: 2
    });
  }

  /**
   * Trunca el nombre de la promoción a 15 caracteres
   */
  private truncatePromotionName(name: string): string {
    if (name.length <= 15) {
      return name;
    }
    return name.substring(0, 15) + '...';
  }
}

