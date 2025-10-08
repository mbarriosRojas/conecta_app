# Configuración de Google Maps para el Componente de Dirección

## 📍 Descripción

El componente `MapAddressComponent` permite a los usuarios seleccionar direcciones usando un mapa interactivo con autocompletado de Google Places API.

## 🔧 Configuración Requerida

### 1. Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Anota el ID del proyecto

### 2. Habilitar APIs Necesarias

En la consola de Google Cloud, habilita las siguientes APIs:

- **Maps JavaScript API** - Para mostrar el mapa
- **Places API** - Para autocompletado de direcciones
- **Geocoding API** - Para convertir direcciones en coordenadas

### 3. Crear API Key

1. Ve a "Credenciales" en el menú lateral
2. Click en "Crear credenciales" → "Clave de API"
3. Copia la API Key generada

### 4. Configurar Restricciones de Seguridad (Recomendado)

1. Click en la API Key creada
2. En "Restricciones de aplicación":
   - Selecciona "Aplicaciones web"
   - Agrega los dominios donde se usará (ej: `localhost:8100`, `tu-dominio.com`)
3. En "Restricciones de API":
   - Selecciona "Restringir clave"
   - Marca solo las APIs que habilitaste anteriormente

### 5. Configurar en la Aplicación

1. Abre el archivo `src/environments/environment.maps.ts`
2. Reemplaza `'YOUR_GOOGLE_MAPS_API_KEY_HERE'` con tu API Key real:

```typescript
export const mapConfig = {
  googleMapsApiKey: 'TU_API_KEY_AQUI',
  // ... resto de la configuración
};
```

## 🚀 Uso del Componente

### En Formularios de Servicio

El componente ya está integrado en:
- **Crear Servicio** (`/create-service`)
- **Editar Servicio** (`/edit-service/:id`)

### Características

- ✅ **Autocompletado**: Búsqueda de direcciones en tiempo real
- ✅ **Mapa interactivo**: Marcador arrastrable para ajuste fino
- ✅ **Detección automática**: Ciudad, departamento, país se detectan automáticamente
- ✅ **Ubicación actual**: Botón para usar GPS del dispositivo
- ✅ **Validación**: Solo permite confirmar si hay dirección y ciudad
- ✅ **Restricción geográfica**: Solo direcciones de Colombia

### Flujo de Usuario

1. **Buscar**: Escribir dirección en el campo de búsqueda
2. **Seleccionar**: Click en una sugerencia de la lista
3. **Ajustar**: Arrastrar el marcador si es necesario
4. **Confirmar**: Click en "Confirmar ubicación"
5. **Datos automáticos**: Los campos se llenan automáticamente

## 🔍 Solución de Problemas

### Error: "Google Maps no está disponible"
- Verifica que la API Key esté configurada correctamente
- Asegúrate de que las APIs estén habilitadas
- Revisa las restricciones de dominio

### Error: "This page can't load Google Maps correctly"
- Verifica que la API Key tenga permisos para el dominio
- Asegúrate de que Maps JavaScript API esté habilitada

### No aparecen sugerencias de autocompletado
- Verifica que Places API esté habilitada
- Revisa las restricciones de la API Key
- Asegúrate de que la API Key tenga acceso a Places API

### El mapa no se centra correctamente
- Verifica que Geocoding API esté habilitada
- Revisa la consola del navegador para errores

## 💰 Costos

Google Maps tiene un plan gratuito con límites:
- **Maps JavaScript API**: 28,000 cargas de mapa por mes
- **Places API**: 1,000 solicitudes por mes
- **Geocoding API**: 40,000 solicitudes por mes

Para uso comercial, considera configurar facturación en Google Cloud Console.

## 🔒 Seguridad

- **Nunca** expongas tu API Key en código público
- Usa restricciones de dominio y API
- Considera usar variables de entorno en producción
- Monitorea el uso de tu API Key regularmente

## 📱 Pruebas

Para probar el componente:

1. Configura la API Key
2. Ve a `/create-service` o `/edit-service/:id`
3. Busca una dirección (ej: "Calle 26, Bogotá")
4. Selecciona una sugerencia
5. Arrastra el marcador si es necesario
6. Confirma la ubicación
7. Verifica que los campos se llenen automáticamente

## 🆘 Soporte

Si tienes problemas:
1. Revisa la consola del navegador para errores
2. Verifica la configuración de Google Cloud Console
3. Asegúrate de que todas las APIs estén habilitadas
4. Revisa las restricciones de la API Key
