import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

async function getLocalManifest() {
  try {
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    const manifestContent = await readFile(manifestPath, 'utf-8');
    return JSON.parse(manifestContent);
  } catch (error) {
    console.error('Error reading local manifest:', error);
    return null;
  }
}

export async function GET() {
  const localManifest = await getLocalManifest();
  
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
    icons: localManifest?.icons || [
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
        src: "/icons/icon-512x512.png",
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
      },
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ],
    screenshots: localManifest?.screenshots || [
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
    ],
    launch_handler: {
      client_mode: "navigate-existing"
    },
    edge_side_panel: {
      preferred_width: 400
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
