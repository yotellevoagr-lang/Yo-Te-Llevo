
// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
// "Default" Firebase app is used for initialization
const firebaseConfig = {
  apiKey: "AIzaSyD_XNPVSVrIT8yUOlt9jbk-BK9i5EYDrFo",
  authDomain: "yo-te-llevo-1021c.firebaseapp.com",
  projectId: "yo-te-llevo-1021c",
  storageBucket: "yo-te-llevo-1021c.appspot.com",
  messagingSenderId: "757700586305",
  appId: "1:757700586305:web:2ed893413499c39fc50fc0"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/logo-ytl.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
