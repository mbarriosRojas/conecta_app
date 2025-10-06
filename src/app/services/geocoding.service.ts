import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface LocationSuggestion {
  lat: number;
  lng: number;
  name: string;
  formatted_address: string;
  place_id?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private readonly baseUrl = 'https://api.opencagedata.com/geocode/v1/json';
  private readonly apiKey = '671d886ae3bf4653a97a77fc8c2ae123'; // Reemplazar con tu API key

  // Ubicaciones populares en Venezuela para fallback
  private readonly popularLocations: LocationSuggestion[] = [
    { lat: 8.5525, lng: -71.2399, name: 'Mérida', formatted_address: 'Mérida, Venezuela' },
    { lat: 10.4806, lng: -66.9036, name: 'Caracas', formatted_address: 'Caracas, Venezuela' },
    { lat: 8.3000, lng: -62.7167, name: 'Ciudad Guayana', formatted_address: 'Ciudad Guayana, Venezuela' },
    { lat: 10.2333, lng: -67.6000, name: 'Valencia', formatted_address: 'Valencia, Venezuela' },
    { lat: 8.6000, lng: -71.1500, name: 'Ejido', formatted_address: 'Ejido, Mérida, Venezuela' },
    { lat: 8.6333, lng: -71.0167, name: 'Tabay', formatted_address: 'Tabay, Mérida, Venezuela' },
    { lat: 8.5000, lng: -71.3000, name: 'San Javier del Valle', formatted_address: 'San Javier del Valle, Mérida, Venezuela' },
    { lat: 8.5500, lng: -71.0000, name: 'Pico Bolívar', formatted_address: 'Pico Bolívar, Mérida, Venezuela' },
    { lat: 8.4000, lng: -71.2000, name: 'El Molino', formatted_address: 'El Molino, Mérida, Venezuela' },
    { lat: 8.3500, lng: -71.4000, name: 'Lagunillas', formatted_address: 'Lagunillas, Mérida, Venezuela' },
    { lat: 8.4500, lng: -71.3500, name: 'El Anís', formatted_address: 'El Anís, Mérida, Venezuela' },
    { lat: 8.7000, lng: -71.4500, name: 'La Azulita', formatted_address: 'La Azulita, Mérida, Venezuela' },
    { lat: 8.6500, lng: -71.1000, name: 'La Loma', formatted_address: 'La Loma, Mérida, Venezuela' }
  ];

  constructor(private http: HttpClient) {}

  searchLocations(query: string): Observable<LocationSuggestion[]> {
    if (!query || query.length < 2) {
      return of([]);
    }

    // Si no hay API key configurado, usar ubicaciones populares
    if (this.apiKey === '671d886ae3bf4653a97a77fc8c2ae123') {
      return of(this.searchPopularLocations(query));
    }

    const params = {
      q: query,
      key: this.apiKey,
      limit: 10,
      countrycode: 've', // Limitar a Venezuela
      no_annotations: '1'
    };

    return this.http.get<any>(this.baseUrl, { params }).pipe(
      map(response => {
        if (response.results && response.results.length > 0) {
          return response.results.map((result: any) => ({
            lat: result.geometry.lat,
            lng: result.geometry.lng,
            name: result.components.city || result.components.town || result.components.village || result.components.county,
            formatted_address: result.formatted,
            place_id: result.annotations?.geohash
          }));
        }
        return this.searchPopularLocations(query);
      }),
      catchError(() => {
        // En caso de error, usar ubicaciones populares
        return of(this.searchPopularLocations(query));
      })
    );
  }

  private searchPopularLocations(query: string): LocationSuggestion[] {
    const lowerQuery = query.toLowerCase();
    return this.popularLocations.filter(location => 
      location.name.toLowerCase().includes(lowerQuery) ||
      location.formatted_address.toLowerCase().includes(lowerQuery)
    );
  }

  reverseGeocode(lat: number, lng: number): Observable<LocationSuggestion | null> {
    if (this.apiKey === '671d886ae3bf4653a97a77fc8c2ae123') {
      // Simular reverse geocoding con ubicaciones populares
      const closest = this.findClosestLocation(lat, lng);
      return of(closest);
    }

    const params = {
      q: `${lat},${lng}`,
      key: this.apiKey,
      no_annotations: '1'
    };

    return this.http.get<any>(this.baseUrl, { params }).pipe(
      map(response => {
        if (response.results && response.results.length > 0) {
          const result = response.results[0];
          return {
            lat: result.geometry.lat,
            lng: result.geometry.lng,
            name: result.components.city || result.components.town || result.components.village || result.components.county,
            formatted_address: result.formatted,
            place_id: result.annotations?.geohash
          };
        }
        return null;
      }),
      catchError(() => {
        const closest = this.findClosestLocation(lat, lng);
        return of(closest);
      })
    );
  }

  private findClosestLocation(lat: number, lng: number): LocationSuggestion | null {
    let closest = null;
    let minDistance = Infinity;

    for (const location of this.popularLocations) {
      const distance = this.calculateDistance(lat, lng, location.lat, location.lng);
      if (distance < minDistance) {
        minDistance = distance;
        closest = location;
      }
    }

    return closest;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
}
