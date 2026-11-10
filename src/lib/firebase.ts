import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD_XNPVSVrIT8yUOlt9jbk-BK9i5EYDrFo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "yo-te-llevo-1021c.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "yo-te-llevo-1021c",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "yo-te-llevo-1021c.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "757700586305",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:757700586305:web:2ed893413499c39fc50fc0",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: any;
try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
} catch (e) {
  console.warn("[Firebase] initializeApp fallback error:", e);
}

let auth: any;
try {
  auth = app ? getAuth(app) : ({} as any);
} catch (e) {
  console.warn("[Firebase] getAuth fallback error:", e);
  auth = {} as any;
}

// Use persistent cache for offline support (modern API, no deprecation warning)
let db: any;
try {
  if (app) {
    if (typeof window !== 'undefined') {
      try {
        db = initializeFirestore(app, {
          localCache: persistentLocalCache()
        });
      } catch {
        db = getFirestore(app);
      }
    } else {
      db = getFirestore(app);
    }
  } else {
    db = {} as any;
  }
} catch (e) {
  console.warn("[Firebase] getFirestore fallback error:", e);
  db = {} as any;
}

let storage: any;
try {
  storage = app ? getStorage(app) : ({} as any);
} catch (e) {
  console.warn("[Firebase] getStorage fallback error:", e);
  storage = {} as any;
}

export const hasValidFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.includes('Dummy') &&
  firebaseConfig.projectId
);

let messaging: any = null;
try {
  if (typeof window !== 'undefined' && app && hasValidFirebaseConfig) {
    messaging = getMessaging(app);
  }
} catch {
  messaging = null;
}

// Firebase Analytics — only in browser, only if real config and measurementId is configured
let analytics: Analytics | null = null;
if (typeof window !== 'undefined' && hasValidFirebaseConfig && firebaseConfig.measurementId) {
  isSupported().then(supported => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch {
        analytics = null;
      }
    }
  }).catch(() => {});
}

export { app, auth, db, storage, messaging, analytics };
export { getAnalytics, isSupported } from "firebase/analytics";
