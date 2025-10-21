### Brief integral para diseñadora: Ecosistema Infinity

Este documento resume el proyecto, su funcionamiento y los entregables esperados de diseño. Sirve como guía para crear y configurar cuentas, definir la identidad visual, preparar materiales de tiendas y redes, y producir piezas publicitarias alineadas al producto.

---

## 1) ¿De qué trata la plataforma?

Infinity es un ecosistema de servicios y marketplace con dos frentes:
- **App móvil (Android/iOS)** construida con Ionic/Angular y Capacitor.
- **Web pública (Angular)** para visibilidad, captación y conversión.

El objetivo principal es **conectar usuarios con proveedores** de servicios y comercios locales, facilitando descubrimiento, comunicación, reservas/ventas y fidelización. El sistema integra promoción de negocios, reseñas/UGC, notificaciones y analítica para crecimiento.

### 1.1 Geolocalización
- Geolocalización para descubrir negocios y proveedores cercanos, con filtros por **rubro**, **distancia** y **ciudad**.
- Integración con **Google Maps** para mostrar ubicación, rutas y horarios; posibilidad de abrir la ubicación en el mapa nativo.
- Contenidos y promociones **contextuales a la zona** (p.ej., campañas especiales por barrio/ciudad). La geolocalización inspira creatividades con énfasis local y llamados a la acción situacionales.

### 1.2 Publicidades y promoción
- Inventario de espacios para **banners**, **carruseles**, **secciones destacadas** y **promociones temporales** en app y web.
- Integración con **Meta Ads, Google Ads y TikTok Ads** para adquisición paga, y optimización con **GA4** y **GTM**.
- Estrategias ASO/SEO: fichas optimizadas en tiendas (capturas, videos, keywords) y SEO técnico en la web (meta, structured data, rendimiento, i18n, sitemap, robots).
- Creatividades recomendadas: mensajes por ciudad/barrio, testimonios, antes/después, beneficios por primera compra, urgencia/escasez y ofertas por temporada.

### 1.3 Módulos principales de producto
- **Descubrimiento y listado**: categorías, búsqueda, filtros, tarjetas de negocios/servicios, rankings y reseñas.
- **Perfil de negocio/proveedor**: descripción, fotos, tarifas/planes, horarios, ubicación, contacto (WhatsApp/teléfono), links, promociones activas.
- **Promociones y cupones**: creación, destacación, límites por tiempo/stock, seguimiento de redenciones.
- **Autenticación y perfil de usuario**: registro/login, recuperación, datos básicos, historial.
- **Carrito/checkout o solicitud de servicio**: flujo guiado, cálculo final, opciones de pago (según región), confirmación.
- **Reseñas y UGC**: calificaciones, comentarios y moderación.
- **Notificaciones y comunicaciones**: push, email y mensajes in‑app para novedades y promociones.

### 1.4 Notificaciones
- **Push en app**: campañas segmentadas por ciudad, rubro, intereses y comportamiento (p.ej., carrito abandonado, nueva promo cerca, recordatorio de reseña).
- **Email/SMS/WhatsApp (opcional)**: onboarding, newsletters, activaciones de promociones, referidos y recuperación.
- **Buenas prácticas**: frecuencia controlada, horarios adecuados por ciudad, pruebas A/B de copia y creatividades, enlaces con deep links a pantallas específicas.

---

## 2) Qué necesitas crear y configurar (checklist accionable)

### 2.1 Identidad y activos de marca
- Brand kit: logotipos (variantes y fondo oscuro/claro), paleta, tipografías, íconos y guía de uso.
- Templates: posts, stories, reels, banners web/app, piezas para anuncios, mockups de tienda.
- Tono y voz: guía breve de mensajes, claims y do/don'ts.
- Gestor de contraseñas (vault) compartido y esquema de accesos + 2FA.

### 2.2 Correos electrónicos y dominio
- Crear **correos corporativos** (p.ej., hola@, soporte@, prensa@, ads@).
- Configurar **DNS** (Cloudflare recomendado) con **SPF, DKIM y DMARC**.
- Alta en proveedor de email marketing/SMTP (SendGrid, Mailchimp o Brevo) con verificación de dominio.

### 2.3 Redes sociales y presencia
- Meta: **Facebook Page**, **Instagram**, **Meta Business Manager** y **Meta Ads**; branding completo (avatar, bio, highlights, links).
- **TikTok** Business y **TikTok Ads Manager** con branding y enlaces.
- **YouTube**: canal con cabecera, avatar, playlists y enlaces a sitio/app.
- **LinkedIn**: página de empresa y acceso a Campaign Manager.
- **Google Business Profile** por ciudad principal; optimización de fichas y horarios.

### 2.4 Publicidad y analítica
- **Google Ads**: cuenta, conversiones, audiencias y vinculación con GA4.
- **Google Analytics 4**: propiedad web y app; eventos clave (registro, login, búsqueda, reserva/compra, checkout, redención de cupón).
- **Google Tag Manager**: contenedor web (y server‑side si aplica); etiquetas de Ads/Meta/TikTok.
- **Search Console**: propiedad del dominio y envío de sitemap.
- (Opcional) **Hotjar/Clarity**: mapas de calor y funnels de conversión.

### 2.5 Tiendas y ecosistema móvil
- **Google Play Console** (cuenta de empresa) y **App Store Connect** (Organization).
- **Apple Developer Program** (Company/Organization) activo.
- **Firebase**: proyecto, Authentication, Cloud Messaging (notificaciones), Crashlytics, Dynamic Links, Remote Config.
- **Assets de tienda**: íconos, capturas por dispositivo/idioma, videos cortos, textos ASO (título, subtítulo, palabras clave, descripción larga y corta) y política de privacidad.

### 2.6 Pagos y cumplimiento
- Pasarela: **Stripe** y/o **Mercado Pago** (cuentas business y verificación KYC).
- Políticas: **Términos y Condiciones**, **Privacidad**, **Cookies**, **Devoluciones** (enlace desde web y tiendas).

### 2.7 Hosting/DevOps (coordinación)
- Acceso a repositorios y pipelines (GitHub/Bitbucket). 
- Hosting web (Vercel/Netlify o cloud), CDN, SSL y monitoreo (UptimeRobot, Sentry).

---

## 3) Guía de inspiración creativa para piezas publicitarias

### 3.1 Enfoque por geolocalización
- Creatividades por **ciudad/barrio**, señalando cercanía y tiempo/ahorro.
- Mapas, pines y rutas como elementos visuales; resaltar disponibilidad inmediata.

### 3.2 Mensajes por módulo/beneficio
- Descubre negocios cerca de ti → tarjetas con rating y distancia.
- Promociones activas → contadores/urgencia, códigos cortos, precios antes/después.
- Perfil de negocio → carrusel de fotos + highlights (horarios, ubicación, contacto).
- Notificaciones → “no te pierdas la promo de tu zona”, “te reservamos este cupón”.

### 3.3 Formatos recomendados
- Carruseles Instagram, Reels/TikTok con testimonios rápidos, banners para app/web, stories con CTA y UTM.
- Variantes por **temporada** y **eventos locales**; tests A/B de copy/visual.

---

## 4) Entregables esperados de diseño
- Accesos a todas las cuentas con 2FA y credenciales en el vault.
- Brand kit completo y templates reutilizables.
- Perfiles optimizados en redes y fichas de Google Business.
- Paquete de **assets para tiendas** (Android/iOS) listo para revisión.
- Set de creatividades para campañas (orgánicas y pagas) por ciudad/rubro.
- Google Sheet de **base de datos de negocios** (ver siguiente sección) depurado y segmentado.

---

## 5) Investigación y base de datos de negocios (para outreach)
- Fuentes: directorios públicos (cámaras de comercio), Google Maps por rubro, marketplaces sectoriales, redes (hashtags/localidad).
- Campos mínimos: nombre, rubro, ciudad/área, web, redes, email, teléfono/WhatsApp, responsable, URL de Maps, notas.
- Formato: Google Sheets con pestañas por ciudad/rubro; validación de email; deduplicación.
- Cumplimiento: fuentes públicas, enlace a política de privacidad en mensajes, respeto de bajas/consentimiento.

---

## 6) Prompt para Gemini: despliegue y growth

```text
Actúa como arquitecto de DevOps, ASO/SEO y growth. Diseña un plan de despliegue y crecimiento para un ecosistema con:
- App móvil construida con Ionic/Angular y Capacitor (Android/iOS).
- Web pública en Angular.
- Objetivo: captar usuarios y proveedores, publicar servicios, reseñas y promociones.

Contexto:
- Necesitamos CI/CD para web y apps móviles, con entornos develop/staging/production.
- Publicación en Google Play y App Store con buenas prácticas de ASO.
- Web con SEO técnico, rendimiento alto y analítica avanzada.
- Instrumentación GA4 (web y app), Google Ads, Meta Ads, TikTok Ads.
- Privacidad: GDPR/CCPA, consent mode, políticas y cookies.
- Pagos: Stripe/Mercado Pago (según región).
- Infra sugerida: Vercel/Netlify o contenedores en cloud para la web; Firebase para notificaciones/Crashlytics; Sentry opcional.
- Monitoreo: uptime, alertas, errores, performance.

Entregables esperados (estructura con bullets y checklists):
1) Arquitectura de despliegue
- Elección de hosting web (comparativa), CDN, SSL, dominios y DNS.
- Pipeline CI/CD por entorno (branches, PR checks, build, test, lint, preview deploy, promoción a producción).
- Estrategia de firma y entrega para Android (App Bundle, tracks: internal/closed/open/production) y iOS (TestFlight, phased release).
- Gestión de secretos y variables (por entorno).

2) Observabilidad y calidad
- GA4 (web/app) con eventos clave (login, registro, búsqueda, reserva/compra, checkout) y dimensiones personalizadas.
- Tag Manager (web) + medición de conversiones (Ads/Meta/TikTok).
- Sentry/Crashlytics, Core Web Vitals, alertas y umbrales.
- Pruebas E2E smoke en cada release.

3) SEO/ASO
- Web: prerendering/SSR recomendado, sitemap, structured data, robots, meta, i18n, rendimiento, accesibilidad, link building.
- Apps: keywords, capturas, videos, descripciones por mercado, pruebas A/B en fichas, rating prompts y deep links.

4) Seguridad y cumplimiento
- CSP, seguridad de cabeceras, dependabot, escaneo SAST/DAST básico.
- Consent mode v2, banner de cookies, políticas y retención de datos.

5) Growth y experimentación
- Lanzamiento por oleadas (ciudades/rubros), referidos, promociones para primeras compras, UGC y reseñas.
- CRM: segmentos y journeys en email/SMS/WhatsApp (definir triggers).
- Experimentos A/B prioritarios (home, onboarding, pricing, copy de tienda).
- KPI y metas trimestrales con tablero de control.

Incluye:
- Roadmap de 90 días con hitos por semana.
- Matriz RACI para equipo (diseño, marketing, dev, ops).
- Lista de riesgos y mitigaciones.
- Estimación de esfuerzo (alto/medio/bajo) por bloque.
- Checklists operativos por lanzamiento (web y apps).
```

---

## 7) Lista rápida (TL;DR) para iniciar
- Crear correos corporativos y configurar SPF/DKIM/DMARC.
- Abrir y configurar todas las redes (Meta/IG, TikTok, YouTube, LinkedIn) con branding.
- Configurar Google Ads, GA4, GTM y Search Console.
- Crear cuentas en Google Play Console, App Store Connect y Apple Developer.
- Configurar Firebase (Messaging, Crashlytics, Dynamic Links, Remote Config).
- Preparar assets de tiendas (íconos, capturas, videos y copys ASO).
- Armar Google Sheet de base de datos de negocios por ciudad/rubro.
- Entregar brand kit, templates y calendario de contenidos de 4–6 semanas.


