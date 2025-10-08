export const mapConfig = {
  // Reemplazar con tu Google Maps API Key
  // Para obtener una API Key:
  // 1. Ve a https://console.cloud.google.com/
  // 2. Crea un nuevo proyecto o selecciona uno existente
  // 3. Habilita las siguientes APIs:
  //    - Maps JavaScript API
  //    - Places API
  //    - Geocoding API
  // 4. Ve a "Credenciales" y crea una API Key
  // 5. Configura las restricciones de la API Key para mayor seguridad
  
  googleMapsApiKey: 'AIzaSyAIDSFRWmo4yNVf9hE4Yhk4C93SeBTsqwo',
  
  // Configuraciones del mapa
  defaultCenter: {
    lat: 10.4806, // Caracas, Venezuela (usando una aproximación común)
    lng: -66.9036
  },
  
  defaultZoom: 15,
  
  // Restricciones de país para autocompletado
  countryRestrictions: ['ve'], // Colombia
  
  // Tipos de lugares para autocompletado
  placeTypes: ['address']
};
