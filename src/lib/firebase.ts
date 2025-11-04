
// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyD_XNPVSVrIT8yUOlt9jbk-BK9i5EYDrFo",
  authDomain: "yo-te-llevo-1021c.firebaseapp.com",
  projectId: "yo-te-llevo-1021c",
  storageBucket: "yo-te-llevo-1021c.appspot.com",
  messagingSenderId: "757700586305",
  appId: "1:757700586305:web:2ed893413499c39fc50fc0"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

export { app, auth, db, storage, messaging };
