
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import type { GeneralSettings } from '@/lib/types';
import 'dotenv/config'; // Load environment variables

// Function to initialize Firebase Admin SDK safely
function initializeAdminApp() {
    if (admin.apps.length > 0) {
        return admin.app();
    }
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        throw new Error('Firebase Admin SDK service account key is not set in environment variables.');
    }
    return admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountKey)),
    });
}


export async function GET() {
  try {
    initializeAdminApp();
    const adminDB = admin.firestore();

    const settingsDoc = await adminDB.collection('settings').doc('general').get();
    const generalSettings = settingsDoc.exists ? (settingsDoc.data() as GeneralSettings) : null;
    
    // Fallback public icon if none is set. This must be a publicly accessible URL.
    const fallbackIconUrl = "https://firebasestorage.googleapis.com/v0/b/yo-te-llevo-1021c.appspot.com/o/brand%2Flogo-ytl.png?alt=media&token=e39572a1-e940-4170-8a2b-9280436d40c6";

    const pwaIconUrl = generalSettings?.pwaIconUrl || fallbackIconUrl;
    const pwaScreenshots = generalSettings?.pwaScreenshots?.map(url => ({
      src: url,
      sizes: "1080x1920", // Assuming a common mobile screenshot size
      type: "image/png"
    })) || [
      // Fallback screenshots if none are provided
      { src: "https://via.placeholder.com/1080x1920.png?text=App+Screenshot+1", sizes: "1080x1920", type: "image/png" },
      { src: "https://via.placeholder.com/1080x1920.png?text=App+Screenshot+2", sizes: "1080x1920", type: "image/png" }
    ];

    const manifest = {
      name: "YO TE LLEVO",
      short_name: "YoTeLlevo",
      description: "Tu próxima aventura te espera",
      id: "/",
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#FFFFFF",
      theme_color: "#E95289",
      icons: [
        {
          src: pwaIconUrl,
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: pwaIconUrl,
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ],
      screenshots: pwaScreenshots
    };

    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Error generating manifest:', error);
    // Return a default manifest in case of error
    return NextResponse.json({
        name: "YO TE LLEVO",
        short_name: "YoTeLlevo",
        description: "Tu próxima aventura te espera",
        start_url: "/",
        display: "standalone",
        icons: [{ "src": "/favicon.ico", "sizes": "48x48", "type": "image/x-icon" }]
    }, { status: 500 });
  }
}
