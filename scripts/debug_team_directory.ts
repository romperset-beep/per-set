import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDBa-MJX_2Wy36sAz7fQrqD7_SevE3KFKM",
    authDomain: "cinestock-43b9f.firebaseapp.com",
    projectId: "cinestock-43b9f",
    storageBucket: "cinestock-43b9f.firebasestorage.app",
    messagingSenderId: "447469685527",
    appId: "1:447469685527:web:d45d4cbf8e9bb3fa3d8b1f",
    measurementId: "G-1VDVVX2TVM"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugTeamDirectory() {
    console.log('\n=== DEBUG: Team Directory Data ===\n');

    // 1. Fetch all users
    const usersSnap = await getDocs(collection(db, 'users'));
    console.log(`Total users in Firestore: ${usersSnap.size}\n`);

    usersSnap.forEach(doc => {
        const data = doc.data();
        console.log(`User: ${data.email || data.name || 'Unknown'}`);
        console.log(`  - ID: ${doc.id}`);
        console.log(`  - currentProjectId: ${data.currentProjectId || 'NONE'}`);
        console.log(`  - projectHistory: ${data.projectHistory ? JSON.stringify(data.projectHistory.map((h: any) => h.id)) : 'NONE'}`);
        console.log(`  - firstName: ${data.firstName || 'MISSING'}`);
        console.log(`  - lastName: ${data.lastName || 'MISSING'}`);
        console.log(`  - department: ${data.department || 'MISSING'}`);
        console.log('');
    });

    // 2. Fetch all projects
    const projectsSnap = await getDocs(collection(db, 'projects'));
    console.log(`\nTotal projects in Firestore: ${projectsSnap.size}\n`);

    projectsSnap.forEach(doc => {
        const data = doc.data();
        console.log(`Project: ${data.name || 'Unknown'}`);
        console.log(`  - ID: ${doc.id}`);
        console.log(`  - productionCompany: ${data.productionCompany || 'N/A'}`);
        console.log(`  - filmTitle: ${data.filmTitle || 'N/A'}`);
        console.log('');
    });

    // 3. Identify mismatches
    console.log('\n=== ANALYSIS ===\n');

    const projectIds = new Set(projectsSnap.docs.map(d => d.id));
    const orphanedUsers: any[] = [];

    usersSnap.forEach(doc => {
        const data = doc.data();
        if (data.currentProjectId && !projectIds.has(data.currentProjectId)) {
            orphanedUsers.push({
                email: data.email,
                currentProjectId: data.currentProjectId,
                issue: 'User points to non-existent project'
            });
        }
    });

    if (orphanedUsers.length > 0) {
        console.log('⚠️  ORPHANED USERS (pointing to non-existent projects):');
        orphanedUsers.forEach(u => {
            console.log(`  - ${u.email}: points to "${u.currentProjectId}" which doesn't exist`);
        });
    } else {
        console.log('✅ No orphaned users found.');
    }

    console.log('\n=== END DEBUG ===\n');
    process.exit(0);
}

debugTeamDirectory().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
