import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import type { GeneralSettings } from '@/lib/types';
import 'dotenv/config';

function initializeAdminApp() {
    if (admin.apps.length > 0) {
        return admin.app();
    }
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        return null;
    }
    try {
        return admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(serviceAccountKey)),
        });
    } catch {
        return null;
    }
}

export async function GET() {
  let generalSettings: GeneralSettings | null = null;
  
  try {
    const app = initializeAdminApp();
    if (app) {
      const adminDB = admin.firestore();
      const settingsDoc = await adminDB.collection('settings').doc('general').get();
      generalSettings = settingsDoc.exists ? (settingsDoc.data() as GeneralSettings) : null;
    }
  } catch (error) {
    console.error('Error fetching settings for manifest:', error);
  }

  const pwaIconUrl = generalSettings?.pwaIconUrl || '/icons/icon-512x512.png';
  
  const manifest = {
    name: "YO TE LLEVO - Agencia de Viajes",
    short_name: "YO TE LLEVO",
    description: "Tu próxima aventura comienza aquí. Explora los destinos más increíbles con YO TE LLEVO.",
    start_url: "/",
    id: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#faf5f0",
    theme_color: "#e85a71",
    categories: ["travel", "tourism", "lifestyle"],
    lang: "es",
    dir: "ltr",
    prefer_related_applications: false,
    icons: [
      {
        src: "/icons/icon-72x72.png",
        sizes: "72x72",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-96x96.png",
        sizes: "96x96",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-128x128.png",
        sizes: "128x128",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-144x144.png",
        sizes: "144x144",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-152x152.png",
        sizes: "152x152",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-384x384.png",
        sizes: "384x384",
        type: "image/png",
        purpose: "any"
      },
      {
        src: pwaIconUrl,
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-maskable-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ],
    screenshots: [
      ...(generalSettings?.pwaScreenshots?.map((url, index) => ({
        src: url,
        sizes: index === 0 ? "1920x1080" : "390x844",
        type: "image/png",
        form_factor: index === 0 ? "wide" : "narrow",
        label: index === 0 ? "Vista de escritorio" : "Vista móvil"
      })) || [
        {
          src: "/screenshots/desktop-wide.png",
          sizes: "1920x1080",
          type: "image/png",
          form_factor: "wide",
          label: "Vista principal de YO TE LLEVO en escritorio"
        },
        {
          src: "/screenshots/mobile-narrow.png",
          sizes: "390x844",
          type: "image/png",
          form_factor: "narrow",
          label: "Vista principal de YO TE LLEVO en móvil"
        }
      ])
    ],
    launch_handler: {
      client_mode: "navigate-existing"
    }
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
