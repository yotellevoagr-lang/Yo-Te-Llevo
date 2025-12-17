# YO TE LLEVO - Travel Agency App

## Overview
A Next.js-based travel agency application with Firebase integration for tours/trips booking. The app features:
- Tour listings and bookings
- Firebase authentication and Firestore database
- Internationalization (Spanish/English)
- PWA support
- Admin panel for managing tours

## Tech Stack
- **Framework**: Next.js 15 with Turbopack
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
- 2025-12-17: Initial Replit import
  - Downgraded Next.js from 16 to 15 for compatibility
  - Configured dev server to bind to 0.0.0.0:5000
  - Added allowedDevOrigins for Replit proxy support
