importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
// Using compat libraries for easier SW setup without bundler
firebase.initializeApp({
    apiKey: "AIzaSyCneQpw3H78fld3nk4yBElwsPgANyG5cnM",
    authDomain: "studio-4995281481-cbcdb.firebaseapp.com",
    projectId: "studio-4995281481-cbcdb",
    storageBucket: "studio-4995281481-cbcdb.firebasestorage.app",
    messagingSenderId: "28125070596",
    appId: "1:28125070596:web:c806ebff513ee2c63cfc51"
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

self.addEventListener('install', (event) => {
    console.log('[SW] Installing and skipping waiting...');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating and claiming clients...');
    event.waitUntil(self.clients.claim());
});

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Customize notification here
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo.png' // Ensure this path is correct
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
