/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getFirestore, setLogLevel, enableIndexedDbPersistence } from 'firebase/firestore';
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

// **Solution 1: Only enable debug logs in development**
// This prevents console flooding in production
if (import.meta.env.DEV) {
    setLogLevel('debug');
} else {
    setLogLevel('error'); // Production: only show errors
}

// Revert to simple init to fix crash, but keep named DB
export const db = getFirestore(app, 'cinestock-db');

// **Solution 3: Version-based cache invalidation**
// Clear cache when app version changes (e.g., after domain migration)
const CACHE_VERSION = '2.0.0'; // Increment on breaking changes or domain changes
const CACHE_KEY = 'firestore-cache-version';

async function clearIndexedDB() {
    const dbName = `firestore/${firebaseConfig.projectId}/cinestock-db`;
    return new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase(dbName);
        req.onsuccess = () => {
            console.log('✅ IndexedDB cache cleared successfully');
            resolve();
        };
        req.onerror = () => {
            console.error('❌ Failed to clear IndexedDB cache');
            reject(req.error);
        };
        req.onblocked = () => {
            console.warn('⚠️ Cache clear blocked - close all tabs and retry');
            reject(new Error('blocked'));
        };
    });
}

// Check cache version and clear if needed
(async () => {
    try {
        const storedVersion = localStorage.getItem(CACHE_KEY);
        if (storedVersion !== CACHE_VERSION) {
            console.log(`🔄 Cache version mismatch (${storedVersion} → ${CACHE_VERSION}). Clearing...`);
            await clearIndexedDB();
            localStorage.setItem(CACHE_KEY, CACHE_VERSION);
        }
    } catch (err) {
        console.warn('Cache version check failed:', err);
    }
})();

// **Solution 2: Enable offline persistence with corrupted cache handling**
enableIndexedDbPersistence(db).catch(async (err) => {
    if (err.code === 'failed-precondition') {
        console.warn('⚠️ Persistence failed: Multiple tabs open. Only one tab can have persistence enabled.');
    } else if (err.code === 'unimplemented') {
        console.warn('⚠️ Persistence not available in this browser.');
    } else {
        // Unknown error - likely corrupted cache from domain migration
        console.warn('🧹 Clearing potentially corrupted Firestore cache...');
        try {
            await clearIndexedDB();
            console.log('✅ Cache cleared. Please refresh the page to resume.');
            // Show user-friendly message
            if (typeof window !== 'undefined') {
                setTimeout(() => {
                    alert('Cache cleared! Please refresh the page (F5) to continue.');
                }, 500);
            }
        } catch (clearErr) {
            console.error('❌ Failed to clear cache:', clearErr);
        }
    }
});

export const auth = getAuth(app);
export const storage = getStorage(app);

// Initialize Analytics conditionally (client-side only)
export const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);

// Initialize Messaging
import { getMessaging, isSupported as isMessagingSupported } from 'firebase/messaging';
export const messaging = isMessagingSupported().then(yes => yes ? getMessaging(app) : null);
