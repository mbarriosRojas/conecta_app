import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, IonModal, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { GeofencingAnalyticsService } from '../../services/geofencing-analytics.service';
import { LocationService } from '../../services/location.service';
import { PromotionTrackingService } from '../../services/promotion-tracking.service';
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
  // Información del servicio
  service?: {
    _id: string;
    name: string;
    images?: string[];
    category?: {
      _id: string;
      name: string;
    };
  };
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
  directionsRenderer: any;
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
    private promotionTrackingService: PromotionTrackingService,
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
    
    // 🔄 Sincronizar con el rango del mapa si está abierto
    if (this.showMapModal && this.map) {
      setTimeout(() => {
        const mapRange = document.querySelector('ion-modal ion-range') as any;
        if (mapRange && mapRange.value !== this.currentRadius) {
          mapRange.value = this.currentRadius;
        }
        // Actualizar el círculo del mapa
        this.updateMapRadius();
        this.adjustMapZoom();
      }, 100);
    }
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
      // 🔥 Ajustar zoom del mapa según el radio para mostrar el área completa
      this.adjustMapZoom();
    }
    
    // 🔄 Sincronizar con el rango de la página principal
    // Esto asegura que ambos rangos estén sincronizados
    setTimeout(() => {
      const mainRange = document.querySelector('ion-range:not([slot])') as any;
      if (mainRange && mainRange.value !== this.currentRadius) {
        mainRange.value = this.currentRadius;
      }
    }, 100);
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
   * Obtiene la primera imagen del servicio
   */
  getServiceImage(promo: Promotion): string | null {
    if (promo.service?.images && promo.service.images.length > 0) {
      return promo.service.images[0];
    }
    // Retornar null para mostrar ícono por defecto
    return null;
  }

  /**
   * Verifica si la promoción tiene imagen del servicio
   */
  hasServiceImage(promo: Promotion): boolean {
    return !!(promo.service?.images && promo.service.images.length > 0);
  }

  /**
   * Obtiene el color de fondo según el tipo de promoción
   */
  getPromotionBackgroundColor(type: string): string {
    switch (type) {
      case 'DISCOUNT':
        return '#e8f5e8'; // Verde claro
      case 'OFFER':
        return '#fff3e0'; // Naranja claro
      case 'EVENT':
        return '#f3e5f5'; // Morado claro
      case 'GENERAL':
        return '#e3f2fd'; // Azul claro
      default:
        return '#f5f5f5'; // Gris claro
    }
  }

  /**
   * Obtiene el color del borde según el tipo de promoción
   */
  getPromotionBorderColor(type: string): string {
    switch (type) {
      case 'DISCOUNT':
        return '#4caf50'; // Verde
      case 'OFFER':
        return '#ff9800'; // Naranja
      case 'EVENT':
        return '#9c27b0'; // Morado
      case 'GENERAL':
        return '#2196f3'; // Azul
      default:
        return '#9e9e9e'; // Gris
    }
  }

  /**
   * Navega al detalle del proveedor y trackea la vista
   */
  async goToProvider(businessID: string) {
    // 🔥 Trackear vista desde lista de promociones cercanas
    try {
      await this.promotionTrackingService.trackPromotionView(businessID, 'nearby');
    } catch (error) {
      console.error('Error tracking promotion view from nearby list:', error);
    }
    
    // Navegar al detalle del proveedor con tab de promociones activo
    this.router.navigate(['/provider-detail', businessID], {
      queryParams: { tab: 'promo' }
    });
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
    
    if (this.radiusCircle) {
      this.radiusCircle.setMap(null);
      this.radiusCircle = null;
    }
    
    if (this.directionsRenderer) {
      this.directionsRenderer.setMap(null);
      this.directionsRenderer = null;
    }
  }

  /**
   * Contacta al proveedor por WhatsApp
   */
  async contactViaWhatsApp(promo: Promotion) {
    try {
      // Cerrar el modal del mapa si está abierto
      if (this.showMapModal) {
        this.closeMapModal();
      }
      
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
      zoom: 14, // Zoom inicial, se ajustará automáticamente
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true
    });

    // 🔥 Ajustar zoom inicial según el radio actual
    setTimeout(() => {
      this.adjustMapZoom();
    }, 100); // Pequeño delay para asegurar que el mapa esté completamente cargado

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
      // Crear ícono personalizado con imagen del servicio o ícono por defecto
      let markerIcon;
      
      if (this.hasServiceImage(promo)) {
        // 🔥 Marcador con imagen del servicio
        const imageUrl = this.getServiceImage(promo);
        markerIcon = {
          url: imageUrl,
          scaledSize: new google.maps.Size(45, 45), // Tamaño moderado
          anchor: new google.maps.Point(22, 22) // Centro del marcador
        };
      } else {
        // Marcador circular simple con color según tipo
        markerIcon = {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 16, // Más grande para mejor visibilidad
          fillColor: this.getMarkerColor(promo.type),
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 3
        };
      }

      const marker = new google.maps.Marker({
        position: {
          lat: promo.location.coordinates[1],
          lng: promo.location.coordinates[0]
        },
        map: this.map,
        title: `${promo.businessName} - ${promo.type}`,
        icon: markerIcon,
        optimized: false // Permite mejor renderizado de imágenes personalizadas
      });

      marker.addListener('click', () => {
        // Resetear todos los marcadores al color original
        this.resetAllMarkers();
        
        // Cambiar el marcador seleccionado a color destacado
        this.highlightMarker(marker, promo);
        
        this.selectedPromotion = promo;
        
        // Limpiar ruta anterior si existe
        if (this.directionsRenderer) {
          this.directionsRenderer.setMap(null);
        }
        
        // Dibujar ruta desde ubicación actual hasta la promoción
        this.drawRouteToPromotion(promo);
      });

      // Guardar información del marcador para poder restaurarlo
      (marker as any).originalIcon = markerIcon;
      (marker as any).promotion = promo;
      
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
   * Resetea todos los marcadores a su estado original
   */
  resetAllMarkers() {
    this.markers.forEach(marker => {
      const originalIcon = (marker as any).originalIcon;
      if (originalIcon) {
        marker.setIcon(originalIcon);
      }
    });
  }

  /**
   * Destaca un marcador específico cambiando su apariencia
   */
  highlightMarker(marker: any, promo: Promotion) {
    // Crear ícono destacado (más grande y con borde especial)
    let highlightedIcon;
    
    if (this.hasServiceImage(promo)) {
      // 🔥 Marcador con imagen del servicio más grande al seleccionar
      const imageUrl = this.getServiceImage(promo);
      highlightedIcon = {
        url: imageUrl,
        scaledSize: new google.maps.Size(55, 55), // Más grande al seleccionar
        anchor: new google.maps.Point(27, 27) // Centro ajustado
      };
    } else {
      // Marcador circular destacado
      highlightedIcon = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 20, // Más grande
        fillColor: this.getMarkerColor(promo.type),
        fillOpacity: 1,
        strokeColor: '#FFD700', // Borde dorado para destacar
        strokeWeight: 4 // Borde más grueso
      };
    }
    
    marker.setIcon(highlightedIcon);
  }

  /**
   * Dibuja la ruta desde la ubicación actual hasta la promoción seleccionada
   */
  drawRouteToPromotion(promo: Promotion) {
    if (!this.currentLocation || !this.map) return;

    const directionsService = new google.maps.DirectionsService();
    this.directionsRenderer = new google.maps.DirectionsRenderer({
      suppressMarkers: true, // No mostrar marcadores adicionales
      polylineOptions: {
        strokeColor: '#4285F4',
        strokeWeight: 4,
        strokeOpacity: 0.8
      }
    });

    this.directionsRenderer.setMap(this.map);

    const request = {
      origin: new google.maps.LatLng(this.currentLocation.lat, this.currentLocation.lng),
      destination: new google.maps.LatLng(promo.location.coordinates[1], promo.location.coordinates[0]),
      travelMode: google.maps.TravelMode.DRIVING
    };

    directionsService.route(request, (result: any, status: any) => {
      if (status === 'OK') {
        this.directionsRenderer.setDirections(result);
      } else {
        console.error('Error al calcular la ruta:', status);
      }
    });
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
   * 🔥 Ajusta el zoom del mapa según el radio para mostrar el área completa
   */
  private adjustMapZoom() {
    if (!this.map || !this.currentLocation) return;

    // Calcular el nivel de zoom basado en el radio en metros
    const radiusMeters = this.currentRadius;
    
    // Tabla de zoom levels predefinidos para mejor experiencia visual
    let targetZoom: number;
    
    if (radiusMeters <= 500) {
      targetZoom = 18; // Muy cercano - nivel de calle
    } else if (radiusMeters <= 1000) {
      targetZoom = 17; // Cercano - barrio
    } else if (radiusMeters <= 2000) {
      targetZoom = 16; // Medio-cercano - distrito
    } else if (radiusMeters <= 5000) {
      targetZoom = 14; // Medio - ciudad pequeña
    } else if (radiusMeters <= 8000) {
      targetZoom = 13; // Lejano - ciudad mediana
    } else if (radiusMeters <= 10000) {
      targetZoom = 12; // Muy lejano - ciudad grande
    } else {
      targetZoom = 11; // Extremo - región
    }
    
    console.log(`🗺️ Ajustando zoom: Radio=${radiusMeters}m, Zoom=${targetZoom}`);
    
    // Aplicar el nuevo zoom con animación suave
    this.map.setZoom(targetZoom);
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

