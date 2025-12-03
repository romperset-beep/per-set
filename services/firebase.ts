import { initializeApp } from 'firebase/app';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';

// ... (config remains same)

// Connect to 'cinestock-db' with robust settings:
// 1. Memory Cache: Avoids IndexedDB corruption/blocking
// 2. Long Polling: Avoids WebSocket blocking by firewalls/proxies
export const db = initializeFirestore(app, {
    localCache: memoryLocalCache(),
    experimentalForceLongPolling: true,
}, 'cinestock-db');
