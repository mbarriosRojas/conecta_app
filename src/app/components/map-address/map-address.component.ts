import { Component, Input, Output, EventEmitter, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, IonInput, ModalController } from '@ionic/angular';
import { mapConfig } from '../../../environments/environment.maps';

// Los tipos de Google Maps están definidos en types/google-maps.d.ts

export interface AddressData {
  street: string;
  city: string;
  department: string;
  country: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  formattedAddress: string;
}

@Component({
  selector: 'app-map-address',
  templateUrl: './map-address.component.html',
  styleUrls: ['./map-address.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class MapAddressComponent implements OnInit, AfterViewInit {
  @ViewChild('addressInput', { static: false }) addressInput!: IonInput;
  
  @Input() initialAddress: Partial<AddressData> = {};
  @Input() height: string = '300px';
  @Input() showMap: boolean = true;
  
  @Output() addressSelected = new EventEmitter<AddressData>();
  @Output() addressChanged = new EventEmitter<Partial<AddressData>>();

  // Datos de dirección
  addressData: AddressData = {
    street: '',
    city: '',
    department: '',
    country: 'Colombia',
    coordinates: mapConfig.defaultCenter,
    formattedAddress: ''
  };

  // Estado del componente
  isMapLoading = true;
  isSearching = false;
  searchSuggestions: any[] = [];
  showSuggestions = false;
  
  // Google Maps
  map: any = null;
  marker: any = null;
  autocompleteService: any = null;
  placesService: any = null;
  geocoder: any = null;

  constructor(private modalController: ModalController) {}

  ngOnInit() {
    console.log('🗺️ MapAddressComponent: Inicializando...');
    
    // Inicializar con datos proporcionados
    if (this.initialAddress) {
      this.addressData = { ...this.addressData, ...this.initialAddress };
      console.log('🗺️ MapAddressComponent: Datos iniciales:', this.addressData);
    }
  }

  ngAfterViewInit() {
    console.log('🗺️ MapAddressComponent: Vista inicializada, cargando mapa...');
    
    // Esperar un poco para asegurar que el DOM esté completamente renderizado
    setTimeout(() => {
      this.loadGoogleMaps();
    }, 100);
  }

  private loadGoogleMaps() {
    console.log('🗺️ MapAddressComponent: Cargando Google Maps...');
    
    if (typeof window.google !== 'undefined') {
      console.log('🗺️ MapAddressComponent: Google Maps ya está disponible');
      this.initializeMap();
      return;
    }

    // Verificar si ya hay un script cargándose
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      console.log('🗺️ MapAddressComponent: Script de Google Maps ya está cargándose, esperando...');
      // Esperar a que se cargue
      const checkGoogle = setInterval(() => {
        if (typeof window.google !== 'undefined') {
          console.log('🗺️ MapAddressComponent: Google Maps cargado, inicializando mapa...');
          clearInterval(checkGoogle);
          this.initializeMap();
        }
      }, 100);
      return;
    }

    // Cargar Google Maps API si no está disponible
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${this.getGoogleMapsApiKey()}&libraries=places&callback=initMap`;
    script.async = true;
    script.defer = true;
    
    window.initMap = () => {
      this.initializeMap();
    };
    
    script.onerror = () => {
      console.error('Error cargando Google Maps API');
      this.isMapLoading = false;
    };
    
    document.head.appendChild(script);
  }

  private getGoogleMapsApiKey(): string {
    return mapConfig.googleMapsApiKey;
  }

  private initializeMap() {
    console.log('🗺️ MapAddressComponent: Inicializando mapa...');
    
    if (!window.google) {
      console.error('🗺️ MapAddressComponent: Google Maps no está disponible');
      this.isMapLoading = false;
      return;
    }

    const mapElement = document.getElementById('addressMap');
    if (!mapElement) {
      console.error('🗺️ MapAddressComponent: Elemento del mapa no encontrado');
      this.isMapLoading = false;
      return;
    }

    console.log('🗺️ MapAddressComponent: Elemento del mapa encontrado:', mapElement);

    try {
      const mapOptions = {
        center: this.addressData.coordinates,
        zoom: mapConfig.defaultZoom,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: false,
      };

      this.map = new window.google.maps.Map(mapElement, mapOptions);
      
      // Inicializar servicios de Google
      this.autocompleteService = new window.google.maps.places.AutocompleteService();
      this.placesService = new window.google.maps.places.PlacesService(this.map);
      this.geocoder = new window.google.maps.Geocoder();
      
      // Crear marcador inicial
      this.createMarker(this.addressData.coordinates);
      
      console.log('🗺️ MapAddressComponent: Mapa inicializado correctamente');
      this.isMapLoading = false;
    } catch (error) {
      console.error('🗺️ MapAddressComponent: Error inicializando el mapa:', error);
      this.isMapLoading = false;
    }
  }

  private createMarker(position: { lat: number; lng: number }) {
    if (!window.google || !this.map) return;

    if (this.marker) {
      this.marker.setMap(null);
    }

    this.marker = new window.google.maps.Marker({
      position: position,
      map: this.map,
      draggable: true,
      title: 'Arrastra para cambiar la ubicación',
      animation: window.google.maps.Animation.DROP
    });

    // Evento cuando se arrastra el marcador
    if (this.marker) {
      this.marker.addListener('dragend', () => {
        const newPosition = this.marker?.getPosition();
        if (newPosition) {
          this.updateAddressFromCoordinates(newPosition.lat(), newPosition.lng());
        }
      });
    }
  }

  // Búsqueda de direcciones
  async onAddressSearch(event: any) {
    const query = event.target.value;
    
    if (query.length < 3) {
      this.showSuggestions = false;
      return;
    }

    this.isSearching = true;
    
    const request = {
      input: query,
      componentRestrictions: { country: mapConfig.countryRestrictions[0] },
      types: mapConfig.placeTypes
    };

    this.autocompleteService?.getPlacePredictions(request, (predictions: any[], status: any) => {
      this.isSearching = false;
      
      if (status === window.google?.maps?.places?.PlacesServiceStatus?.OK && predictions) {
        this.searchSuggestions = predictions;
        this.showSuggestions = true;
      } else {
        this.showSuggestions = false;
      }
    });
  }

  // Seleccionar sugerencia
  selectSuggestion(suggestion: any) {
    this.showSuggestions = false;
    this.addressInput.value = suggestion.description;
    
    // Obtener detalles del lugar
    const request = {
      placeId: suggestion.place_id,
      fields: ['name', 'formatted_address', 'geometry', 'address_components']
    };

    this.placesService?.getDetails(request, (place: any, status: any) => {
      if (status === window.google?.maps?.places?.PlacesServiceStatus?.OK) {
        this.processPlaceDetails(place);
      }
    });
  }

  private processPlaceDetails(place: any) {
    const coordinates = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    };

    // Actualizar mapa y marcador
    if (this.map) {
      this.map.setCenter(coordinates);
    }
    this.createMarker(coordinates);

    // Procesar componentes de dirección
    const addressComponents = this.parseAddressComponents(place.address_components);
    
    this.addressData = {
      ...this.addressData,
      street: this.buildStreetAddress(addressComponents),
      city: addressComponents.city || addressComponents.locality || addressComponents.administrative_area_level_2 || '',
      department: addressComponents.administrative_area_level_1 || addressComponents.state || '',
      country: addressComponents.country || 'Colombia',
      coordinates: coordinates,
      formattedAddress: place.formatted_address
    };

    // Actualizar también el input de búsqueda con la dirección formateada
    if (this.addressInput) {
      this.addressInput.value = place.formatted_address;
    }

    this.emitAddressChanged();
  }

  private parseAddressComponents(components: any[]): any {
    const result: any = {};
    
    // Primero, recopilar todos los componentes por tipo
    components.forEach(component => {
      const types = component.types;
      
      // Número de calle
      if (types.includes('street_number')) {
        result.street_number = component.long_name;
      }
      
      // Nombre de la calle/ruta
      if (types.includes('route')) {
        result.route = component.long_name;
      }
      
      // Ciudad - múltiples opciones (prioridad: locality > administrative_area_level_2 > sublocality)
      if (types.includes('locality')) {
        result.locality = component.long_name;
        if (!result.city) result.city = component.long_name;
      }
      if (types.includes('administrative_area_level_2')) {
        result.administrative_area_level_2 = component.long_name;
        if (!result.city) result.city = component.long_name;
      }
      if (types.includes('sublocality')) {
        result.sublocality = component.long_name;
        if (!result.city) result.city = component.long_name;
      }
      
      // Departamento/Estado - múltiples opciones
      if (types.includes('administrative_area_level_1')) {
        result.administrative_area_level_1 = component.long_name;
        result.state = component.long_name;
      }
      
      // País
      if (types.includes('country')) {
        result.country = component.long_name;
      }
      
      // Código postal
      if (types.includes('postal_code')) {
        result.postal_code = component.long_name;
      }
    });
    
    // Asegurar que tenemos valores por defecto
    if (!result.city && result.locality) {
      result.city = result.locality;
    }
    if (!result.city && result.administrative_area_level_2) {
      result.city = result.administrative_area_level_2;
    }
    
    console.log('Parsed components:', result);
    return result;
  }

  private buildStreetAddress(components: any): string {
    const parts = [];
    if (components.street_number) parts.push(components.street_number);
    if (components.route) parts.push(components.route);
    return parts.join(' ');
  }

  // Actualizar dirección desde coordenadas
  private updateAddressFromCoordinates(lat: number, lng: number) {
    if (this.geocoder) {
      // Usar geocoding inverso correcto
      const request = {
        location: { lat, lng }
      };
      
      this.geocoder.geocode(request, (results: any[], status: any) => {
        console.log('Geocoding result:', results, status);
        
        if (status === 'OK' && results && results.length > 0) {
          // Buscar el resultado más específico que tenga más información
          let bestResult = results[0];
          for (const result of results) {
            if (result.address_components && result.address_components.length > bestResult.address_components.length) {
              bestResult = result;
            }
          }
          
          const place = bestResult;
          const addressComponents = this.parseAddressComponents(place.address_components);
          
          console.log('Parsed address components:', addressComponents);
          
          // Crear un nuevo objeto para forzar la detección de cambios
          this.addressData = {
            ...this.addressData,
            coordinates: { lat, lng },
            street: this.buildStreetAddress(addressComponents),
            city: addressComponents.city || addressComponents.locality || addressComponents.administrative_area_level_2 || '',
            department: addressComponents.administrative_area_level_1 || addressComponents.state || '',
            country: addressComponents.country || 'Colombia',
            formattedAddress: place.formatted_address
          };

          console.log('Updated address data:', this.addressData);

          // Actualizar también el input de búsqueda con la dirección formateada
          if (this.addressInput) {
            this.addressInput.value = place.formatted_address;
          }

          this.emitAddressChanged();
        } else {
          console.error('Geocoding failed:', status);
        }
      });
    }
  }

  // Usar ubicación actual
  async useCurrentLocation() {
    if (!navigator.geolocation) {
      console.error('Geolocation no está disponible');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        if (this.map) {
          this.map.setCenter(coordinates);
        }
        this.createMarker(coordinates);
        this.updateAddressFromCoordinates(coordinates.lat, coordinates.lng);
      },
      (error) => {
        console.error('Error obteniendo ubicación:', error);
      }
    );
  }

  // Confirmar dirección
  confirmAddress() {
    this.addressSelected.emit(this.addressData);
  }

  // Emitir cambios
  private emitAddressChanged() {
    this.addressChanged.emit(this.addressData);
  }

  // Cerrar sugerencias
  onInputBlur() {
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }
}
