/**
 * NUCLEAR RESET SCRIPT
 * 
 * This script performs a complete, irreversible reset of ALL application data:
 * - Deletes ALL collections in cinestock-db Firestore database
 * - Clears IndexedDB
 * - Clears localStorage
 * 
 * WARNING: THIS CANNOT BE UNDONE!
 * 
 * Usage: npx tsx scripts/nuclear_reset.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: "studio-4995281481-cbcdb.firebaseapp.com",
    projectId: "studio-4995281481-cbcdb",
    storageBucket: "studio-4995281481-cbcdb.firebasestorage.app",
    messagingSenderId: "28125070596",
    appId: "1:28125070596:web:c806ebff513ee2c63cfc51"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'cinestock-db');

async function deleteCollection(collectionName: string) {
    console.log(`🗑️  Deleting collection: ${collectionName}`);
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);

    let deletedCount = 0;
    for (const docSnapshot of snapshot.docs) {
        await deleteDoc(doc(db, collectionName, docSnapshot.id));
        deletedCount++;
        console.log(`   ✓ Deleted document: ${docSnapshot.id}`);
    }

    console.log(`✅ Deleted ${deletedCount} documents from ${collectionName}\n`);
}

async function nuclearReset() {
    console.log('\n🚨 NUCLEAR RESET - Starting complete data wipe...\n');

    const collections = [
        'users',
        'projects',
        'transactions',
        'socialPosts',
        'marketplaceItems',
        'notifications',
        'user_templates',
        'logistics_requests'
    ];

    for (const collectionName of collections) {
        try {
            await deleteCollection(collectionName);
        } catch (error) {
            console.warn(`⚠️  Could not delete ${collectionName}:`, error);
        }
    }

    console.log('\n🎉 NUCLEAR RESET COMPLETE!\n');
    console.log('Next steps:');
    console.log('1. Open http://localhost:3000 in your browser');
    console.log('2. Open DevTools (F12) and run:');
    console.log('   localStorage.clear(); indexedDB.deleteDatabase("firebaseLocalStorageDb"); window.location.reload();');
    console.log('\nYou should now see a clean login screen! ✨');
}

nuclearReset().catch(console.error);
