
// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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

// Enable offline persistence
// enableMultiTabIndexedDbPersistence(db).catch((err) => {
//   if (err.code == 'failed-precondition') {
//     console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.");
//   } else if (err.code == 'unimplemented') {
//     console.warn("The current browser does not support all of the features required to enable persistence.");
//   }
// });


export { app, auth, db, storage };

    