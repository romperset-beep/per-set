import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Firebase config (use your actual config)
const firebaseConfig = {
    apiKey: "AIzaSyDMlVAqJn5PdRKzz_zW5DomYKN-K_nIgX0",
    authDomain: "a-better-set.firebaseapp.com",
    projectId: "a-better-set",
    storageBucket: "a-better-set.firebasestorage.app",
    messagingSenderId: "614562354086",
    appId: "1:614562354086:web:c1a23f1e69c6a5c7e59d79"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface ProfileHealth {
    docId: string;
    email?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    department?: string;
    currentProjectId?: string | null;
    status?: string;
    isGhost: boolean;
    issues: string[];
}

async function checkProfileHealth() {
    console.log('\n🔍 PROFILE HEALTH CHECK\n');
    console.log('=' + '='.repeat(79));

    try {
        // Fetch all users
        const usersSnap = await getDocs(collection(db, 'users'));
        console.log(`\n📊 Total profiles in database: ${usersSnap.size}\n`);

        const profiles: ProfileHealth[] = [];
        const emailMap = new Map<string, string[]>(); // email -> [docIds]

        // Analyze each profile
        usersSnap.forEach(doc => {
            const data = doc.data();
            const issues: string[] = [];

            // Check for ghost indicators
            if (!data.firstName) issues.push('Missing firstName');
            if (!data.lastName) issues.push('Missing lastName');
            if (!data.phone) issues.push('Missing phone');
            if (!data.email) issues.push('Missing email');

            // Check for email-based document ID (BUG!)
            if (doc.id.includes('@')) {
                issues.push('⚠️ CRITICAL: Document ID is email (should be UID)');
            }

            const isGhost = !data.firstName || !data.lastName;

            const profile: ProfileHealth = {
                docId: doc.id,
                email: data.email,
                name: data.name,
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone,
                department: data.department,
                currentProjectId: data.currentProjectId,
                status: data.status,
                isGhost,
                issues
            };

            profiles.push(profile);

            // Track duplicate emails
            if (data.email) {
                const existing = emailMap.get(data.email) || [];
                existing.push(doc.id);
                emailMap.set(data.email, existing);
            }
        });

        // Sort: ghosts first, then by email
        profiles.sort((a, b) => {
            if (a.isGhost !== b.isGhost) return a.isGhost ? -1 : 1;
            return (a.email || '').localeCompare(b.email || '');
        });

        // Display profiles
        profiles.forEach((p, idx) => {
            console.log(`\n[${idx + 1}] ${p.isGhost ? '👻 GHOST PROFILE' : '✅ Complete Profile'}`);
            console.log(`    Doc ID: ${p.docId}`);
            console.log(`    Email: ${p.email || '❌ MISSING'}`);
            console.log(`    Name: ${p.name || '❌ MISSING'}`);
            console.log(`    First/Last: ${p.firstName || '?'} ${p.lastName || '?'}`);
            console.log(`    Phone: ${p.phone || '❌ MISSING'}`);
            console.log(`    Department: ${p.department || 'N/A'}`);
            console.log(`    Status: ${p.status || 'N/A'}`);
            console.log(`    Current Project: ${p.currentProjectId || 'None'}`);

            if (p.issues.length > 0) {
                console.log(`    ⚠️ Issues (${p.issues.length}):`);
                p.issues.forEach(issue => console.log(`       - ${issue}`));
            }
        });

        // Summary
        console.log('\n' + '='.repeat(80));
        console.log('\n📋 SUMMARY:\n');
        console.log(`   Total profiles: ${profiles.length}`);
        console.log(`   👻 Ghost profiles: ${profiles.filter(p => p.isGhost).length}`);
        console.log(`   ✅ Complete profiles: ${profiles.filter(p => !p.isGhost).length}`);
        console.log(`   ❌ Profiles without email: ${profiles.filter(p => !p.email).length}`);
        console.log(`   ⚠️ Email-based IDs: ${profiles.filter(p => p.docId.includes('@')).length}`);

        // Check for duplicate emails
        const duplicates = Array.from(emailMap.entries()).filter(([_, ids]) => ids.length > 1);
        if (duplicates.length > 0) {
            console.log(`\n   🚨 DUPLICATE EMAILS FOUND (${duplicates.length}):\n`);
            duplicates.forEach(([email, ids]) => {
                console.log(`      ${email}:`);
                ids.forEach(id => console.log(`         - ${id}`));
            });
        } else {
            console.log(`\n   ✅ No duplicate emails found`);
        }

        // Check projects for orphaned members
        console.log('\n' + '='.repeat(80));
        console.log('\n🎬 CHECKING PROJECT MEMBERS:\n');

        const projectsSnap = await getDocs(collection(db, 'projects'));
        let orphanCount = 0;

        projectsSnap.forEach(doc => {
            const data = doc.data();
            if (data.members) {
                const memberIds = Object.keys(data.members);
                const orphans = memberIds.filter(id => !profiles.find(p => p.docId === id));

                if (orphans.length > 0) {
                    console.log(`   Project: ${data.filmTitle || data.productionName || doc.id}`);
                    console.log(`      👻 Orphaned members (${orphans.length}):`);
                    orphans.forEach(id => console.log(`         - ${id}`));
                    orphanCount += orphans.length;
                }
            }
        });

        if (orphanCount === 0) {
            console.log(`   ✅ No orphaned project members found`);
        } else {
            console.log(`\n   ⚠️ Total orphaned members: ${orphanCount}`);
        }

        console.log('\n' + '='.repeat(80));
        console.log('\n✅ Health check complete!\n');

    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    }

    process.exit(0);
}

// Run the check
checkProfileHealth();
