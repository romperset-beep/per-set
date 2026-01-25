/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: "studio-4995281481-cbcdb.firebaseapp.com",
    projectId: "studio-4995281481-cbcdb",
    storageBucket: "studio-4995281481-cbcdb.firebasestorage.app",
    messagingSenderId: "28125070596",
    appId: "1:28125070596:web:c806ebff513ee2c63cfc51"
};

const app = initializeApp(firebaseConfig);

// Enable debug logs
setLogLevel('debug');

// Revert to simple init to fix crash, but keep named DB
export const db = getFirestore(app, 'cinestock-db');
export const auth = getAuth(app);
export const storage = getStorage(app);

// Initialize Analytics conditionally (client-side only)
export const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);

// Initialize Messaging
import { getMessaging, isSupported as isMessagingSupported } from 'firebase/messaging';
export const messaging = isMessagingSupported().then(yes => yes ? getMessaging(app) : null);
