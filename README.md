# AKI App

Una aplicación móvil desarrollada con Ionic y Angular para mostrar proveedores cercanos con las mejores prácticas de desarrollo y arquitectura escalable.

## 🚀 Características

- **Búsqueda de proveedores cercanos** en un radio configurable (1-50km)
- **Filtros avanzados** por categoría, ciudad y radio de búsqueda
- **Scroll infinito** con paginación de 20 elementos
- **Geolocalización** para mostrar proveedores más cercanos
- **Cache inteligente** para mejorar el rendimiento
- **Diseño responsivo** optimizado para móviles
- **Modo oscuro** compatible
- **Accesibilidad** implementada

## 🏗️ Arquitectura

### Servicios
- **ApiService**: Comunicación con el backend
- **LocationService**: Manejo de geolocalización
- **StorageService**: Cache local con Ionic Storage
- **UtilsService**: Utilidades y funciones helper

### Modelos
- **Provider**: Modelo de proveedor con todas las propiedades
- **Category**: Modelo de categoría
- **ProviderFilters**: Filtros de búsqueda

### Componentes
- **HomePage**: Pantalla principal con lista de proveedores
- **Provider Cards**: Cards optimizadas con lazy loading

## 📱 Plataformas Soportadas

- ✅ Android
- ✅ iOS
- ✅ Web (PWA)

## 🛠️ Instalación

### Prerrequisitos
- Node.js 16+ 
- npm o yarn
- Ionic CLI
- Capacitor CLI
- Android Studio (para Android)
- Xcode (para iOS)

### Pasos de instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd infinity-providers-app
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar el backend**
Editar `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://tu-backend-url.com', // Cambiar por tu URL
  // ... otras configuraciones
};
```

4. **Construir la aplicación**
```bash
ionic build
```

5. **Sincronizar con Capacitor**
```bash
ionic capacitor sync
```

## 🚀 Desarrollo

### Ejecutar en el navegador
```bash
ionic serve
```

### Ejecutar en Android
```bash
ionic capacitor run android
```

### Ejecutar en iOS
```bash
ionic capacitor run ios
```

## 📦 Build para Producción

### Android
```bash
ionic capacitor build android --prod
```

### iOS
```bash
ionic capacitor build ios --prod
```

## 🔧 Configuración

### Permisos

#### Android (android/app/src/main/AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

#### iOS (ios/App/App/Info.plist)
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Esta aplicación necesita acceso a tu ubicación para mostrar proveedores cercanos.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Esta aplicación necesita acceso a tu ubicación para mostrar proveedores cercanos.</string>
```

### Variables de Entorno

Crear archivos de configuración:
- `src/environments/environment.ts` (desarrollo)
- `src/environments/environment.prod.ts` (producción)

## 🎨 Personalización

### Colores
Editar `src/theme/variables.scss`:
```scss
:root {
  --ion-color-primary: #3880ff;
  --ion-color-primary-rgb: 56, 128, 255;
  --ion-color-primary-contrast: #ffffff;
  --ion-color-primary-contrast-rgb: 255, 255, 255;
  --ion-color-primary-shade: #3171e0;
  --ion-color-primary-tint: #4c8dff;
}
```

### Iconos
Los iconos se pueden personalizar en:
- `src/assets/icons/` (iconos personalizados)
- Usar Ionicons (incluidos por defecto)

## 📊 Rendimiento

### Optimizaciones implementadas
- **Lazy loading** de imágenes
- **Virtual scrolling** para listas grandes
- **Cache inteligente** con TTL
- **Debounce** en búsquedas
- **Throttle** en scroll events
- **TrackBy functions** para ngFor
- **OnPush** change detection strategy

### Métricas objetivo
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **Time to Interactive**: < 3.5s

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run e2e
```

## 📱 Funcionalidades

### Búsqueda
- Búsqueda en tiempo real con debounce
- Filtros por categoría, ciudad y radio
- Búsqueda por nombre y descripción

### Geolocalización
- Detección automática de ubicación
- Cálculo de distancias
- Filtrado por proximidad

### Cache
- Cache de categorías y ciudades
- Persistencia de filtros
- Cache con TTL configurable

### UI/UX
- Pull-to-refresh
- Infinite scroll
- Loading states
- Error handling
- Empty states

## 🔒 Seguridad

- Validación de inputs
- Sanitización de datos
- HTTPS en producción
- Permisos mínimos necesarios

## 📈 Monitoreo

### Analytics (opcional)
```typescript
// En environment.ts
export const environment = {
  // ...
  analytics: {
    enabled: true,
    trackingId: 'GA_TRACKING_ID'
  }
};
```

### Error Tracking
```typescript
// Implementar con Sentry o similar
import * as Sentry from '@sentry/angular';
```

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 Soporte

Para soporte técnico:
- Crear un issue en GitHub
- Contactar al equipo de desarrollo
- Revisar la documentación de Ionic

## 🔄 Actualizaciones

### Changelog
- **v1.0.0**: Versión inicial con funcionalidades básicas
- **v1.1.0**: Agregado cache inteligente y optimizaciones
- **v1.2.0**: Implementado modo oscuro y mejoras de accesibilidad

### Roadmap
- [ ] Notificaciones push
- [ ] Favoritos
- [ ] Reviews y calificaciones
- [ ] Chat con proveedores
- [ ] Integración con mapas
- [ ] Modo offline
