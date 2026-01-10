import { Component, Input, Output, EventEmitter, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
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
export class MapAddressComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('addressInput', { static: false }) addressInput!: IonInput;
  
  @Input() initialAddress: Partial<AddressData> = {};
  @Input() height: string = '300px';
  @Input() showMap: boolean = true;
  @Input() hideHeader: boolean = false; // Ocultar header cuando se usa dentro de acordeón
  
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

  private googleMapsLoadCheckInterval: any = null;
  private maxLoadAttempts = 50; // Máximo 5 segundos (50 * 100ms)
  private mapInitialized = false; // Flag para evitar múltiples inicializaciones
  private checkMapVisibilityInterval: any = null;

  ngAfterViewInit() {
    console.log('🗺️ MapAddressComponent: Vista inicializada, verificando visibilidad del mapa...');
    
    // Verificar si el elemento del mapa es visible antes de inicializar
    this.checkMapVisibility();
  }

  ngOnDestroy() {
    // Limpiar todos los intervalos
    if (this.googleMapsLoadCheckInterval) {
      clearInterval(this.googleMapsLoadCheckInterval);
      this.googleMapsLoadCheckInterval = null;
    }
    if (this.checkMapVisibilityInterval) {
      clearInterval(this.checkMapVisibilityInterval);
      this.checkMapVisibilityInterval = null;
    }
    
    // Limpiar el mapa si existe
    if (this.map) {
      // Google Maps no requiere limpieza explícita, pero podemos resetear la referencia
      this.map = null;
    }
  }

  private checkMapVisibility() {
    // Verificar cada 200ms si el elemento del mapa es visible
    let attempts = 0;
    const maxAttempts = 50; // 10 segundos máximo
    
    this.checkMapVisibilityInterval = setInterval(() => {
      attempts++;
      const mapElement = document.getElementById('addressMap');
      
      if (mapElement) {
        // Verificar si el elemento es visible (no está oculto por display: none o dentro de un acordeón colapsado)
        const isVisible = mapElement.offsetWidth > 0 && mapElement.offsetHeight > 0;
        
        if (isVisible && !this.mapInitialized) {
          console.log('🗺️ MapAddressComponent: Elemento del mapa es visible, inicializando...');
          clearInterval(this.checkMapVisibilityInterval);
          this.mapInitialized = true;
          // Esperar un poco para asegurar que el DOM esté completamente renderizado
          setTimeout(() => {
            this.loadGoogleMaps();
          }, 100);
        }
      } else if (attempts >= maxAttempts) {
        console.warn('🗺️ MapAddressComponent: Elemento del mapa no encontrado después de varios intentos');
        clearInterval(this.checkMapVisibilityInterval);
        this.isMapLoading = false;
      }
    }, 200);
  }

  private loadGoogleMaps() {
    console.log('🗺️ MapAddressComponent: Cargando Google Maps...');
    
    // Verificar si Google Maps ya está disponible
    if (typeof window.google !== 'undefined' && window.google.maps && window.google.maps.places) {
      console.log('🗺️ MapAddressComponent: Google Maps ya está disponible');
      this.initializeServices();
      return;
    }

    // Verificar si ya hay un script cargándose
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]') as HTMLScriptElement;
    if (existingScript) {
      console.log('🗺️ MapAddressComponent: Script de Google Maps ya existe, esperando carga...');
      
      // Si el script ya tiene un onload, significa que ya se cargó o está en proceso
      // Esperar a que se cargue con timeout más largo
      let attempts = 0;
      const maxWaitAttempts = 100; // 10 segundos (100 * 100ms)
      
      // Limpiar intervalo anterior si existe
      if (this.googleMapsLoadCheckInterval) {
        clearInterval(this.googleMapsLoadCheckInterval);
      }
      
      this.googleMapsLoadCheckInterval = setInterval(() => {
        attempts++;
        
        // Verificar si Google Maps está disponible
        if (typeof window.google !== 'undefined' && window.google.maps && window.google.maps.places) {
          console.log('✅ MapAddressComponent: Google Maps cargado, inicializando servicios...');
          clearInterval(this.googleMapsLoadCheckInterval);
          this.googleMapsLoadCheckInterval = null;
          this.initializeServices();
        } else if (attempts >= maxWaitAttempts) {
          console.error('❌ MapAddressComponent: Timeout esperando Google Maps (10s)');
          clearInterval(this.googleMapsLoadCheckInterval);
          this.googleMapsLoadCheckInterval = null;
          this.isMapLoading = false;
          
          // Intentar cargar un nuevo script si el anterior falló
          console.log('🔄 MapAddressComponent: Intentando cargar nuevo script...');
          this.loadNewGoogleMapsScript();
        }
      }, 100);
      return;
    }

    // Cargar Google Maps API si no está disponible
    this.loadNewGoogleMapsScript();
  }

  private loadNewGoogleMapsScript() {
    const script = document.createElement('script');
    const apiKey = this.getGoogleMapsApiKey();
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('✅ MapAddressComponent: Script de Google Maps cargado (onload)');
      // Esperar un momento para asegurar que Google Maps esté completamente inicializado
      setTimeout(() => {
        if (typeof window.google !== 'undefined' && window.google.maps && window.google.maps.places) {
          this.initializeServices();
        } else {
          console.warn('⚠️ MapAddressComponent: Script cargado pero Google Maps no disponible aún, reintentando...');
          // Reintentar después de más tiempo
          setTimeout(() => {
            if (typeof window.google !== 'undefined' && window.google.maps && window.google.maps.places) {
              this.initializeServices();
            } else {
              console.error('❌ MapAddressComponent: Google Maps no disponible después de esperar');
              this.isMapLoading = false;
            }
          }, 1000);
        }
      }, 300);
    };
    
    script.onerror = () => {
      console.error('❌ MapAddressComponent: Error cargando Google Maps API');
      this.isMapLoading = false;
    };
    
    document.head.appendChild(script);
  }

  private getGoogleMapsApiKey(): string {
    return mapConfig.googleMapsApiKey;
  }

  private initializeServices() {
    console.log('🗺️ MapAddressComponent: Inicializando servicios de Google...');
    
    // Verificar múltiples veces que Google Maps esté completamente cargado
    if (!window.google || !window.google.maps) {
      console.error('🗺️ MapAddressComponent: Google Maps no está disponible');
      this.isMapLoading = false;
      return;
    }

    // Esperar un poco más para asegurar que Places esté disponible
    if (!window.google.maps.places) {
      console.warn('⚠️ MapAddressComponent: Places aún no está disponible, esperando...');
      setTimeout(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          this.initializeServices();
        } else {
          console.error('❌ MapAddressComponent: Places no disponible después de esperar');
          this.isMapLoading = false;
        }
      }, 500);
      return;
    }

    try {
      // 🔥 INICIALIZAR AUTCOMPLETE SERVICE PRIMERO (no requiere mapa)
      // Esto permite que el autocompletado funcione incluso si el mapa no está listo
      if (!this.autocompleteService) {
        this.autocompleteService = new window.google.maps.places.AutocompleteService();
        console.log('✅ AutocompleteService inicializado');
      }

      // Inicializar geocoder (tampoco requiere mapa)
      if (!this.geocoder) {
        this.geocoder = new window.google.maps.Geocoder();
        console.log('✅ Geocoder inicializado');
      }

      // Si showMap está activado, inicializar el mapa
      if (this.showMap) {
        this.initializeMap();
      } else {
        this.isMapLoading = false;
        console.log('✅ Servicios inicializados (mapa deshabilitado)');
      }
    } catch (error) {
      console.error('🗺️ MapAddressComponent: Error inicializando servicios:', error);
      this.isMapLoading = false;
    }
  }

  private initializeMap() {
    console.log('🗺️ MapAddressComponent: Inicializando mapa...');
    
    if (!window.google || !window.google.maps) {
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

    // Verificar que el elemento sea visible antes de inicializar
    const isVisible = mapElement.offsetWidth > 0 && mapElement.offsetHeight > 0;
    if (!isVisible) {
      console.warn('🗺️ MapAddressComponent: Elemento del mapa no es visible aún, reintentando en 500ms...');
      // Reintentar después de un tiempo si el mapa aún no está inicializado
      setTimeout(() => {
        if (!this.mapInitialized && this.showMap) {
          this.initializeMap();
        }
      }, 500);
      return;
    }

    console.log('🗺️ MapAddressComponent: Elemento del mapa encontrado y visible:', mapElement);

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
      
      // Inicializar PlacesService (requiere mapa)
      if (!this.placesService && this.map) {
        this.placesService = new window.google.maps.places.PlacesService(this.map);
        console.log('✅ PlacesService inicializado');
      }
      
      // Crear marcador inicial
      this.createMarker(this.addressData.coordinates);
      
      console.log('✅ Mapa inicializado correctamente');
      this.isMapLoading = false;
    } catch (error) {
      console.error('❌ Error inicializando el mapa:', error);
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

    // 🔥 VERIFICAR que autocompleteService esté disponible
    if (!this.autocompleteService) {
      // Verificar si Google Maps está completamente cargado
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        // Silenciar el error - solo mostrar una vez
        if (!this.mapInitialized) {
          console.warn('⚠️ MapAddressComponent: Google Maps aún no está disponible para búsqueda');
        }
        this.showSuggestions = false;
        return;
      }
      
      // Intentar inicializar si Google Maps está disponible
      try {
        this.autocompleteService = new window.google.maps.places.AutocompleteService();
        console.log('✅ AutocompleteService inicializado en onAddressSearch');
      } catch (error) {
        console.error('❌ Error inicializando AutocompleteService:', error);
        this.showSuggestions = false;
        return;
      }
    }

    this.isSearching = true;
    
    const request = {
      input: query,
      componentRestrictions: { country: mapConfig.countryRestrictions[0] },
      types: mapConfig.placeTypes
    };

    try {
      this.autocompleteService.getPlacePredictions(request, (predictions: any[], status: any) => {
        this.isSearching = false;
        
        if (status === window.google?.maps?.places?.PlacesServiceStatus?.OK && predictions) {
          this.searchSuggestions = predictions;
          this.showSuggestions = true;
          console.log(`✅ ${predictions.length} sugerencias encontradas`);
        } else {
          console.warn('⚠️ No se encontraron sugerencias o error:', status);
          this.showSuggestions = false;
        }
      });
    } catch (error) {
      console.error('❌ Error en getPlacePredictions:', error);
      this.isSearching = false;
      this.showSuggestions = false;
    }
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
      this.map.setZoom(16); // 🔥 Zoom más cercano cuando se selecciona una dirección
    }
    this.createMarker(coordinates);

    // Procesar componentes de dirección
    const addressComponents = this.parseAddressComponents(place.address_components);
    
    // 🔥 Asegurar que siempre tengamos un street válido
    const streetAddress = this.buildStreetAddress(addressComponents);
    const cityAddress = addressComponents.city || addressComponents.locality || addressComponents.administrative_area_level_2 || '';
    
    this.addressData = {
      ...this.addressData,
      street: streetAddress || place.formatted_address || place.name || 'Dirección sin nombre', // Fallback si no hay street
      city: cityAddress || 'Ciudad no especificada',
      department: addressComponents.administrative_area_level_1 || addressComponents.state || '',
      country: addressComponents.country || 'Colombia',
      coordinates: coordinates,
      formattedAddress: place.formatted_address || place.name || ''
    };

    // Actualizar también el input de búsqueda con la dirección formateada
    if (this.addressInput) {
      this.addressInput.value = this.addressData.formattedAddress || this.addressData.street;
    }

    // Cerrar sugerencias
    this.showSuggestions = false;

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
          
          // 🔥 Asegurar que siempre tengamos valores válidos
          const streetAddress = this.buildStreetAddress(addressComponents);
          const cityAddress = addressComponents.city || addressComponents.locality || addressComponents.administrative_area_level_2 || '';
          
          // Crear un nuevo objeto para forzar la detección de cambios
          this.addressData = {
            ...this.addressData,
            coordinates: { lat, lng },
            street: streetAddress || place.formatted_address || `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`, // Fallback
            city: cityAddress || 'Ciudad no especificada',
            department: addressComponents.administrative_area_level_1 || addressComponents.state || '',
            country: addressComponents.country || 'Colombia',
            formattedAddress: place.formatted_address || ''
          };

          console.log('Updated address data:', this.addressData);

          // Actualizar también el input de búsqueda con la dirección formateada
          if (this.addressInput) {
            this.addressInput.value = this.addressData.formattedAddress || this.addressData.street;
          }

          this.emitAddressChanged();
        } else {
          console.error('Geocoding failed:', status);
          // 🔥 Si falla el geocoding, al menos actualizar las coordenadas
          this.addressData = {
            ...this.addressData,
            coordinates: { lat, lng },
            street: this.addressData.street || `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`,
            formattedAddress: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`
          };
          this.emitAddressChanged();
        }
      });
    } else {
      // Si no hay geocoder, al menos actualizar las coordenadas
      this.addressData = {
        ...this.addressData,
        coordinates: { lat, lng },
        street: this.addressData.street || `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`,
        formattedAddress: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`
      };
      this.emitAddressChanged();
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

  // Confirmar dirección (ahora opcional, ya que se auto-confirma)
  confirmAddress() {
    // Solo confirmar si hay datos válidos
    if (this.addressData.street && this.addressData.city && this.addressData.coordinates) {
      this.addressSelected.emit(this.addressData);
    }
  }

  // Emitir cambios
  private emitAddressChanged() {
    this.addressChanged.emit(this.addressData);
    
    // 🔥 NUEVO: Auto-confirmar si la dirección es válida
    // Esto hace que la confirmación sea automática sin necesidad de botón
    if (this.addressData.street && this.addressData.city && this.addressData.coordinates) {
      // Pequeño delay para asegurar que el geocoding haya terminado
      setTimeout(() => {
        this.addressSelected.emit(this.addressData);
      }, 300);
    }
  }

  // Cerrar sugerencias
  onInputBlur() {
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }
}
