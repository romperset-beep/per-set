/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: "studio-4995281481-cbcdb.firebaseapp.com",
    projectId: "studio-4995281481-cbcdb",
    storageBucket: "studio-4995281481-cbcdb.firebasestorage.app",
    messagingSenderId: "28125070596",
    appId: "1:28125070596:web:c806ebff513ee2c63cfc51"
};

};

// DEBUG: helps identify if Vercel is picking up the key
console.log("[Firebase Init] Config:", {
    ...firebaseConfig,
    apiKey: firebaseConfig.apiKey ? `...${firebaseConfig.apiKey.slice(-5)}` : "UNDEFINED",
    projectId: firebaseConfig.projectId
});

const app = initializeApp(firebaseConfig);

// Enable debug logs
setLogLevel('debug');

// Revert to simple init to fix crash, but keep named DB
export const db = getFirestore(app, 'cinestock-db');
export const auth = getAuth(app);
