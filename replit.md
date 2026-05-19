# YO TE LLEVO - Travel Agency App

## Overview
A Next.js-based travel agency application with Firebase integration for tours/trips booking. The app features:
- Tour listings and bookings
- Firebase authentication and Firestore database
- Internationalization (Spanish/English)
- PWA support
- Admin panel for managing tours

## Tech Stack
- **Framework**: Next.js 16.1 with Turbopack
- **Runtime**: Node.js 22
- **UI Library**: React 19.2
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Language**: TypeScript

## Project Structure
```
src/
├── app/          # Next.js App Router pages
├── components/   # React components
├── hooks/        # Custom React hooks
├── lib/          # Utilities and Firebase services
├── locales/      # i18n translation files
└── ai/           # Genkit AI integration
```

## Running the Project
- Development: `npm run dev` (runs on port 5000)
- Build: `npm run build`
- Production: `npm run start`

## Environment Variables
The project uses Firebase configuration stored in `.env`:
- `NEXT_PUBLIC_FIREBASE_*` - Client-side Firebase config
- `GEMINI_API_KEY` - For AI features (optional)
- `FIREBASE_SERVICE_ACCOUNT_KEY` - For server-side Firebase Admin

## Recent Changes

- 2026-05-19: Google OAuth, familyOwner, verificación de email bella, familiar vs acompañante
  - **Google OAuth**: Botón "Continuar con Google" en `/login`. Nuevo usuario → diálogo `GoogleProfileDialog` para completar perfil (username, nombre, DNI, teléfono). Usuario existente → login directo. `signInWithGoogle()` y `completeGoogleRegistration()` en `firestore-services.ts`
  - **familyOwner**: Nuevo campo `familyOwner?: string` en tipo `Passenger`. Al registrarse, se asigna `familyOwner = authUser.uid`. Nombre familiar único generado (ej. "Familia Godoy", "Familia Godoy 2") si hay conflicto con otro `familyOwner`
  - **Código de verificación 6 dígitos**: Al registrarse, se genera un código aleatorio y se guarda en `verification_codes/{uid}` (expira en 24h). Nueva página `/verify-email` hermosa con campo de código. Nueva API `/api/verify-email` que valida contra Firestore y marca email verificado vía Admin SDK
  - **Página auth/action bella**: Reescritura completa con logo, gradiente de fondo, animaciones (ping para loading, iconos de colores para éxito/error). Estado "ya verificado" diferenciado. Botones "Ir al Login" y "Verificar con Código"
  - **Familiar vs Acompañante en booking**: Al hacer clic "Añadir Pasajero" (usuario logueado), aparece diálogo con opciones "Familiar" (→ `familyOwner = loggedInUser.id`, se guarda en grupo) o "Acompañante" (solo para este viaje). Labels actualizados en la lista. Familia ahora filtra por `p.familyOwner === loggedInUser.id`
  - **Contraseña para usuarios Google**: En `/profile`, sección "Establecer Contraseña" visible solo si el usuario usó solo Google (`providerData.every(p => p.providerId === 'google.com')`). Usa `linkWithCredential(EmailAuthProvider.credential(...))` 
  - **Perfil familiar corregido**: `/profile` filtra `familyMembers` por `p.familyOwner === currentUserId` (en vez de por string `family`). Cada usuario ve solo el grupo que él creó
  - **Firestore rules**: `employees allow create` → requiere `isSignedIn()`. Colección `verification_codes` con `allow read: if false` (solo el servidor Admin puede leer)

- 2026-05-19: Embarques por pasajero, IA desde WhatsApp mejorada, Analytics en tiempo real
  - **Embarques por pasajero**: En el diálogo de edición de reserva, cada pasajero muestra su punto de embarque con un selector editable debajo del nombre. Al cambiar, se guarda directamente en el perfil del pasajero (colección `passengers`), sincronizando con la sección de pasajeros
  - **Crear reserva desde WhatsApp (IA)**: Botón "Crear desde WhatsApp (IA)" en el header de reservas. IA mejorada extrae: nombre, DNI, teléfono, fecha de nacimiento, email, ciudad, pasajeros adicionales (familia), cantidad, precio, punto de embarque y observaciones. Panel de "datos esperados" al abrir el diálogo. Indicador de confianza (alta/media/baja) y campos faltantes. Soporte para múltiples pasajeros en un solo texto
  - **Analítica en tiempo real**: Nueva sección "Analítica" en el panel admin con usuarios activos en tiempo real (presencia Firestore con pulso cada 90s), vistas de hoy, vistas 7 días, top páginas con barra de progreso, historial de actividad reciente. Tracking automático de presencia y page views en toda la app vía `PageTracker` component
  - **Firestore rules**: Agregadas colecciones `tickets`, `presence` y `page_views` con permisos correctos. Reglas deployadas a Firebase


- 2026-04-19: Sistema completo de Facturación Electrónica ARCA
  - Servicio `src/lib/arca-service.ts`: firma PKCS#7 con node-forge (WSAA), llamadas SOAP a WSFE, parseo XML de respuestas, caché de token en memoria
  - 4 rutas API: `/api/arca/auth`, `/api/arca/invoice`, `/api/arca/last-voucher`, `/api/arca/test-connection`
  - Página `/admin/dashboard/billing` con 3 tabs: Configuración (empresa + certificado + test), Nueva Factura (formulario completo), Historial (con descarga PDF)
  - Generación de PDF con jsPDF: formato argentino, letra del comprobante (A/B/C), CAE, vencimiento, banner homologación
  - Soporta Facturas A/B/C, Notas de Crédito, IVA discriminado o no según tipo
  - Configuración no-sensible en Firestore `settings/arca`; certificado digital como secrets `ARCA_CERT` y `ARCA_PRIVATE_KEY` (base64)
  - Facturas emitidas guardadas en colección `invoices` de Firestore
  - Nav admin con item "Facturación ARCA" controlado por `devFeatures.showBilling`
  - Tipos `ArcaSettings` y `ArcaInvoice` agregados a `src/lib/types.ts`

- 2026-04-19: Panel de Programador y mejoras de seguridad
  - Nuevo panel de programador en `/dev/panel` protegido con contraseña `@Vector2016`
  - Botón escudo (Shield) oculto al final de la página de configuración abre diálogo de contraseña
  - Comunidad y Beneficios ahora ocultos del admin por defecto; se habilitan desde el panel dev
  - Nueva sección de Facturación ARCA en el panel dev (placeholder, sin activar para admin aún)
  - Badge y Título de "Sobre Nosotros" ahora usan RichTextEditor (negrita, subrayado, color)
  - Gradiente "Sobre Nosotros" soporta 3 colores (inicio, medio opcional, final) y 8 direcciones
  - Auditoría de seguridad: proxy de imágenes restringido a dominios permitidos (Firebase Storage, etc.) para prevenir SSRF
  - Eliminados todos los console.log de debug del lado cliente que exponían mensajes de error
  - Limpieza de WhatsApp route: ya no expone respuestas IA en logs del servidor

- 2026-04-16: Mejoras visuales completas
  - Hero: gradiente con color primario cuando no hay imágenes de slideshow
  - Barra de búsqueda: etiqueta "¿A dónde querés ir?" + botón "Buscar" con mejor diseño tipo card
  - Tour cards: badge "DESTACADO" (estrella), precio overlay en imagen, chips de tags, hover mejorado
  - Sección "Sobre Nosotros": fondo personalizable (color sólido o gradiente) desde el panel admin
  - Botones flotantes: rediseñados con tooltips de etiqueta al hover, colores de marca (Instagram, FB, WhatsApp), estructura más limpia
  - Footer: 3 columnas (logo+redes, navegación, contacto), iconos de redes sociales con colores de marca, info de contacto desde Firestore
  - Esquema de colores: nuevo componente DynamicTheme que inyecta CSS custom properties (HSL) desde Firestore; admin puede cambiar color principal modo claro y oscuro con color picker
  - Nuevo campo `themeColors` y `aboutUsStyle` en GeneralSettings (types.ts)
  - Nuevos handlers en settings admin: handleSaveThemeColors, handleSaveAboutUsStyle

- 2026-04-16: Editor de texto enriquecido en sección "Sobre Nosotros"
  - Instalado Tiptap (@tiptap/react, starter-kit, extension-text-style, extension-underline)
  - Nuevo componente RichTextEditor con barra de herramientas (negrita, subrayado, color de texto, quitar formato)
  - Ctrl+B para negrita, Ctrl+U para subrayado funcionan dentro del editor
  - Nuevo tipo de bloque "subtítulo" (se renderiza como h3 en la página de inicio)
  - Color de bloque completo (selector nativo) + color de palabras individuales (paleta en el editor)
  - Bloques de íconos también usan el editor enriquecido para el texto
  - Los bloques se guardan como HTML en Firestore y se renderizan con dangerouslySetInnerHTML
  - Agregado localPatterns en next.config.ts para permitir imágenes locales con query strings


- 2025-12-22: Sistema de Comunidad y Beneficios
  - Nueva sección "Comunidad" para publicaciones sociales con feed, reacciones (like/love) y comentarios
  - Soporte multimedia (fotos/videos) en publicaciones
  - Sistema de Beneficios/Cupones: creación de cupones con códigos, descuentos (% o fijo), límites de uso
  - Diseño visual personalizable de cupones con vista previa
  - Beneficios pueden publicarse automáticamente en la comunidad
  - Sección "Mis Beneficios" para clientes: ver disponibles/usados/expirados, canjear por código
  - Panel de admin para gestionar comunidad y beneficios
  - Panel de empleados para gestionar comunidad
  - Navegación actualizada en todos los paneles
- 2025-12-22: Asistente virtual con IA (Gemini)
  - Nuevo componente AIChatbot reemplaza el chatbot basado en reglas
  - API /api/chat conecta con Google Gemini 1.5 Flash
  - Respuestas inteligentes sobre viajes, reservas, pagos y la empresa
  - Historial de conversación para contexto
  - Botón de reiniciar conversación
- 2025-12-22: Mejoras en PWA
  - Manifest ahora usa archivos locales (mejor rendimiento)
  - Agregados shortcuts para acceso rápido (Ver Viajes, Ver Flyers, Login)
  - Corregido problema de velocidad de carga
- 2025-12-20: Sistema de iconos y screenshots PWA desde configuración
  - API /api/pwa/icons: Sube un ícono grande (>=512x512) y genera automáticamente todos los tamaños (72, 96, 128, 144, 152, 192, 384, 512) + maskable + SVG
  - API /api/pwa/screenshots: Sube múltiples screenshots que reemplazan los existentes y actualizan manifest.json
  - Los archivos se guardan directamente en public/icons y public/screenshots
  - Procesamiento con Sharp para redimensionar imágenes
  - UI en configuración del admin para cargar iconos y capturas
- 2025-12-20: Mejoras en sistema de recibos
  - Sistema de dos plantillas con tabs: Plantilla 1 (con datos de reserva) y Plantilla 2 (manual)
  - Plantilla 2 solo tiene campos "Texto Editable" para recibos completamente manuales
  - Opción "Recibo Manual" arriba de la lista de viajes para usar Plantilla 2
  - Redimensionamiento visual: arrastra los handles (bordes/esquinas) del campo para ajustar ancho y alto
  - Control numérico de ancho (50-1000px) y alto (20-500px) en el panel lateral
  - Corregido drag & drop usando translate3d para seguimiento preciso del mouse
  - Guardado de ambas plantillas en un solo documento de Firestore
- 2025-12-20: Botones flotantes colapsables en móvil
  - Botón toggle para plegar/desplegar los botones de redes sociales y PWA en pantallas pequeñas
  - Solo visible en dispositivos móviles (ancho < 768px)
  - Animación suave de transición al expandir/colapsar
  - Accesibilidad con aria-expanded
- 2025-12-20: Mejoras en PWA para soporte en PC
  - Manifest.json completo con todos los campos requeridos
  - Iconos generados en múltiples tamaños (72x72 a 512x512)
  - Iconos maskable para Android
  - Screenshots para instalación en desktop y móvil
  - display_override con window-controls-overlay para mejor experiencia en desktop
- 2025-12-19: Correcciones en página de booking
  - Hook useGeoAccess ahora retorna manualLocation correctamente
  - Corregido error de tipos: user?.province/city solo se accede si es Passenger
  - Mejorada lógica de addPassenger para verificar asientos disponibles
- 2025-12-19: Mejoras en página de Flyers para clientes
  - Etiquetas renombradas: "Otros Flyers" → "Viajes", "Promociones Generales" → "PROMO"
  - Flyers con viaje + promoción aparecen primero en su sección con badge "PROMO"
  - Nombre del flyer solo se muestra si existe (arriba del flyer)
  - Eliminado event listener 'storage' que causaba recargas infinitas
- 2025-12-19: Eliminación completa de archivos de Firebase Storage
  - Al eliminar un viaje completo, se eliminan todos sus archivos (fondo + galería) de Storage
  - Al eliminar un flyer, se elimina su imagen/video de Storage
  - La lógica ya existía para configuración y edición de galería
- 2025-12-19: Mejoras en vista de clientes
  - Videos en flyers se reproducen automáticamente (autoPlay, muted, loop, playsInline)
  - Actualizado syntax de imágenes Next.js a versión 15 (fill en lugar de layout="fill")
  - Videos en galería de booking también se reproducen automáticamente
- 2025-12-19: Mejoras en gestión de archivos de Firebase Storage
  - Al eliminar imágenes/videos de la galería, se eliminan de Firebase Storage al guardar
  - Botones "Guardar" y "Cancelar" se bloquean mientras se guarda para evitar duplicados
  - Dialogs no se pueden cerrar mientras se guarda
  - Al reemplazar archivos (logo, ícono, flyers), el archivo anterior se elimina del Storage
  - Rollback automático: si falla el guardado, el archivo recién subido se elimina
- 2025-12-19: Migración a Firebase Storage para medios
  - Imágenes y videos ahora se suben a Firebase Storage (no más límite de 1MB de Firestore)
  - Viajes: imagen de fondo y galería ahora usan Storage
  - Flyers: imágenes y videos usan Storage
  - Configuración: logo, ícono PWA, capturas PWA y "Sobre Nosotros" usan Storage
  - Nuevo servicio storage-service.ts para subir/eliminar archivos
  - CORS configurado para permitir subidas desde dominios externos
- 2025-12-19: Tickets y sincronización de panel de empleados
  - Tickets ahora generan solo UN ticket por reserva (del pasajero principal/titular)
  - El componente TravelTicket muestra el titular diferenciado de los integrantes (solo nombre y DNI)
  - Panel de empleados sincronizado con admin: trips ahora incluye Destacado, Popup y eliminación en cascada
  - Eliminación de viajes ahora borra también reservas y transacciones asociadas
- 2025-12-17: Bug fixes and improvements
  - Fixed passenger deletion dialog (AlertDialog was nested inside DropdownMenu causing intermittent failures)
  - Added graceful error handling when Firebase Admin is not configured
  - Fixed runtime error in employee passengers page (undefined variable)
  - Updated legacy image props (layout="fill") to modern Next.js 15 syntax (fill)
- 2025-12-17: Initial Replit import
  - Downgraded Next.js from 16 to 15 for compatibility
  - Configured dev server to bind to 0.0.0.0:5000
  - Added allowedDevOrigins for Replit proxy support

## Known Issues
- FIREBASE_SERVICE_ACCOUNT_KEY needs to be configured in Replit Secrets for user deletion from Firebase Auth to work (currently only removes from Firestore)
