# Configuración de Geocoding para Filtro de Ubicación

## Descripción

El filtro de ubicación con radar/cobertura utiliza un servicio de geocoding para buscar ubicaciones y obtener nombres de lugares. Actualmente está configurado para usar OpenCage Geocoding API, pero también incluye ubicaciones populares de Venezuela como fallback.

## Configuración de OpenCage API

### 1. Obtener API Key

1. Ve a [OpenCage Geocoding API](https://opencagedata.com/api)
2. Regístrate para obtener una cuenta gratuita
3. Obtén tu API key desde el dashboard

### 2. Configurar la API Key

Edita el archivo `src/app/services/geocoding.service.ts`:

```typescript
private readonly apiKey = 'TU_API_KEY_AQUI'; // Reemplazar con tu API key real
```

### 3. Límites de la API Gratuita

- **2,500 requests por día** (plan gratuito)
- **1 request por segundo**
- Ideal para desarrollo y testing

## Ubicaciones de Fallback

Si no tienes API key o hay problemas de conectividad, el sistema usa ubicaciones populares de Venezuela:

- Mérida
- Caracas
- Ciudad Guayana
- Valencia
- Ejido
- Tabay
- San Javier del Valle
- Pico Bolívar
- El Molino
- Lagunillas
- El Anís
- La Azulita
- La Loma

## Funcionalidades

### ✅ Implementadas

- **Búsqueda de ubicaciones** con autocompletado
- **Sugerencias en tiempo real** mientras escribes
- **Reverse geocoding** para obtener nombres de ubicaciones
- **Mapa interactivo** con zoom automático basado en radio
- **Radar visual** mostrando área de cobertura
- **Integración completa** con el sistema de filtros existente

### 🎯 Características del Radar

- **Zoom automático** basado en el radio seleccionado
- **Overlay informativo** mostrando el radio actual
- **Mapa embebido** de Google Maps
- **Actualización en tiempo real** al cambiar el radio

## Uso

1. **Abrir filtros** en la pantalla home
2. **Hacer clic** en "Ubicación"
3. **Buscar** una ciudad o localidad
4. **Seleccionar** de las sugerencias
5. **Ajustar** el radio de búsqueda
6. **Ver** el área de cobertura en el mapa
7. **Aplicar** el filtro

## Alternativas de API

Si prefieres usar otra API de geocoding:

### Google Maps Geocoding API
```typescript
private readonly baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
```

### Mapbox Geocoding API
```typescript
private readonly baseUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
```

### Nominatim (OpenStreetMap)
```typescript
private readonly baseUrl = 'https://nominatim.openstreetmap.org/search';
```

## Personalización

### Agregar más ubicaciones de fallback

Edita el array `popularLocations` en `geocoding.service.ts`:

```typescript
private readonly popularLocations: LocationSuggestion[] = [
  // Agregar nuevas ubicaciones aquí
  { lat: 8.1234, lng: -71.5678, name: 'Nueva Ciudad', formatted_address: 'Nueva Ciudad, Venezuela' }
];
```

### Cambiar el país de búsqueda

Modifica el parámetro `countrycode` en la búsqueda:

```typescript
const params = {
  q: query,
  key: this.apiKey,
  limit: 10,
  countrycode: 'co', // Cambiar a Colombia, por ejemplo
  no_annotations: '1'
};
```

## Troubleshooting

### Error: "API key not configured"
- Asegúrate de haber configurado tu API key en `geocoding.service.ts`

### No aparecen sugerencias
- Verifica tu conexión a internet
- Revisa que la API key sea válida
- El sistema usará ubicaciones de fallback automáticamente

### Mapa no se carga
- Verifica que Google Maps esté disponible en tu región
- Asegúrate de tener conexión a internet

## Costos

- **OpenCage**: Gratis hasta 2,500 requests/día
- **Google Maps**: $5 por 1,000 requests
- **Mapbox**: Gratis hasta 100,000 requests/mes
- **Nominatim**: Completamente gratis (sin garantías de disponibilidad)
