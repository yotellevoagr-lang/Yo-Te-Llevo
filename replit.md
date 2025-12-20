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
- 2025-12-20: Mejoras en sistema de recibos
  - Sistema de dos plantillas con tabs: Plantilla 1 (con datos de reserva) y Plantilla 2 (manual)
  - Plantilla 2 solo tiene campos "Texto Editable" para recibos completamente manuales
  - Opción "Recibo Manual" arriba de la lista de viajes para usar Plantilla 2
  - Control de ancho configurable para campos de texto editable (50-1000px)
  - Corregido drag & drop usando translate3d para seguimiento preciso del mouse
  - Guardado de ambas plantillas en un solo documento de Firestore
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
