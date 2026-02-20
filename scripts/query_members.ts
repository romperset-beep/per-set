import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse .env file manually
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            process.env[match[1]] = match[2];
        }
    });
}

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

async function run() {
    const pid = "crash-test-2026-crash-film";
    console.log(`Checking project: ${pid}`);

    const offlineQ = collection(db, "projects", pid, "offlineMembers");
    const offlineSnap = await getDocs(offlineQ);
    console.log(`Offline members count: ${offlineSnap.size}`);
    offlineSnap.forEach(docSnap => {
        const d = docSnap.data();
        console.log(`- ${d.firstName} ${d.lastName} (${d.role})`);
    });

    const pDoc = await getDoc(doc(db, "projects", pid));
    const pData = pDoc.data() || {};
    console.log("\nProject map members:");
    console.log(pData.members);

    const usersQ = collection(db, "users");
    const usersSnap = await getDocs(usersQ);
    console.log(`\nTotal users: ${usersSnap.size}`);
    let matched = 0;

    usersSnap.forEach(udoc => {
        const u = udoc.data();
        let match = false;

        // Log potential targets
        if (u.email?.includes("lola") || u.email?.includes("tom.camera") || u.name?.includes("Lola") || u.name?.includes("Thomas")) {
            console.log(`\nFound potential user: ${u.email}`);
            console.log(`  currentProjectId:`, u.currentProjectId);
            console.log(`  projectHistory:`, u.projectHistory?.length);
            console.log(`  in map?`, !!(pData.members && pData.members[udoc.id]));
        }

        if (u.currentProjectId === pid) match = true;
        if (u.projectHistory && Array.isArray(u.projectHistory)) {
            if (u.projectHistory.some((h: any) => h.projectId === pid || h.id === pid)) match = true;
        }
        if (pData.members && pData.members[udoc.id]) match = true;

        if (match) {
            matched++;
            console.log(`MATCHED online user: ${u.name || u.firstName} | ${u.email}`);
        }
    });

    console.log(`\nMatched online count: ${matched}`);
    console.log(`Total count (online + offline): ${matched + offlineSnap.size}`);
    process.exit(0);
}

run().catch(console.error);
