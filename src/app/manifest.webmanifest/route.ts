import { NextResponse } from 'next/server';
import type { GeneralSettings } from '@/lib/types';
import 'dotenv/config';

async function fetchSettingsFromFirestore(): Promise<GeneralSettings | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  
  if (!projectId) {
    console.error('Firebase project ID not configured');
    return null;
  }

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/general`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 }
    });

    if (!response.ok) {
      console.error('Failed to fetch settings:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (!data.fields) {
      return null;
    }

    const settings: GeneralSettings = {
      mainWhatsappNumber: data.fields.mainWhatsappNumber?.stringValue || '',
      calendarDownloadFolder: data.fields.calendarDownloadFolder?.stringValue || '',
      reportDownloadFolder: data.fields.reportDownloadFolder?.stringValue || '',
      availableTags: data.fields.availableTags?.arrayValue?.values?.map((v: any) => v.stringValue) || [],
      pwaIconUrl: data.fields.pwaIconUrl?.stringValue,
      pwaScreenshots: data.fields.pwaScreenshots?.arrayValue?.values?.map((v: any) => v.stringValue) || [],
      logoUrl: data.fields.logoUrl?.stringValue,
    };

    return settings;
  } catch (error) {
    console.error('Error fetching settings from Firestore REST API:', error);
    return null;
  }
}

export async function GET() {
  let generalSettings: GeneralSettings | null = null;
  
  try {
    generalSettings = await fetchSettingsFromFirestore();
  } catch (error) {
    console.error('Error fetching settings for manifest:', error);
  }

  const pwaIconUrl = generalSettings?.pwaIconUrl || '/icons/icon-512x512.png';
  const pwaScreenshots = generalSettings?.pwaScreenshots || [];
  
  const defaultIcons = [
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
  ];

  const hasCustomIcon = pwaIconUrl && pwaIconUrl !== '/icons/icon-512x512.png';
  
  const customIcons = hasCustomIcon ? [
    {
      src: pwaIconUrl,
      sizes: "192x192",
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
      src: pwaIconUrl,
      sizes: "192x192",
      type: "image/png",
      purpose: "maskable"
    },
    {
      src: pwaIconUrl,
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable"
    }
  ] : [
    {
      src: "/icons/icon-512x512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any"
    }
  ];

  const defaultScreenshots = [
    {
      src: "/screenshots/desktop-wide.png",
      sizes: "1920x1080",
      type: "image/png",
      form_factor: "wide" as const,
      label: "Vista principal de YO TE LLEVO en escritorio"
    },
    {
      src: "/screenshots/mobile-narrow.png",
      sizes: "390x844",
      type: "image/png",
      form_factor: "narrow" as const,
      label: "Vista principal de YO TE LLEVO en móvil"
    }
  ];

  const screenshotsArray = pwaScreenshots.length > 0 
    ? pwaScreenshots.map((url, index) => ({
        src: url,
        sizes: index === 0 ? "1920x1080" : "390x844",
        type: "image/png",
        form_factor: (index === 0 ? "wide" : "narrow") as "wide" | "narrow",
        label: index === 0 ? "Vista de escritorio" : "Vista móvil"
      }))
    : defaultScreenshots;
  
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
    icons: [...defaultIcons, ...customIcons],
    screenshots: screenshotsArray,
    launch_handler: {
      client_mode: "navigate-existing"
    }
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
