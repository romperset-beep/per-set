import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase config
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
const auth = getAuth(app);

async function investigateGhostProfile() {
    console.log('🔍 Investigating Ghost Profile Issue\n');

    try {
        // 1. Get all users
        const usersSnap = await getDocs(collection(db, 'users'));
        console.log(`📊 Total users in database: ${usersSnap.size}\n`);

        console.log('👥 USER PROFILES:');
        console.log('='.repeat(80));

        const profiles: any[] = [];
        usersSnap.forEach(doc => {
            const data = doc.data();
            profiles.push({
                docId: doc.id,
                email: data.email,
                name: data.name,
                department: data.department,
                role: data.role,
                status: data.status,
                currentProjectId: data.currentProjectId,
                hasFirstName: !!data.firstName,
                hasLastName: !!data.lastName,
                hasPhone: !!data.phone,
            });
        });

        // Sort by email for readability
        profiles.sort((a, b) => (a.email || '').localeCompare(b.email || ''));

        profiles.forEach((p, idx) => {
            console.log(`\n[${idx + 1}] Document ID: ${p.docId}`);
            console.log(`    Email: ${p.email || '❌ MISSING'}`);
            console.log(`    Name: ${p.name || '❌ MISSING'}`);
            console.log(`    Department: ${p.department}`);
            console.log(`    Role: ${p.role}`);
            console.log(`    Status: ${p.status}`);
            console.log(`    Current Project: ${p.currentProjectId || 'None'}`);
            console.log(`    Profile Complete: ${p.hasFirstName && p.hasLastName && p.hasPhone ? '✅' : '⚠️ Incomplete'}`);

            // Check for potential duplicates
            const duplicates = profiles.filter(other =>
                other !== p && other.email === p.email
            );
            if (duplicates.length > 0) {
                console.log(`    🚨 DUPLICATE DETECTED! ${duplicates.length} other profile(s) with same email`);
            }

            // Check if docId matches email pattern (potential bug)
            if (p.docId === p.email) {
                console.log(`    ⚠️ WARNING: Document ID is email (should be Firebase UID)`);
            }

            // Check for ghost indicators
            if (!p.email || !p.hasFirstName || !p.hasLastName) {
                console.log(`    👻 POTENTIAL GHOST: Missing critical data`);
            }
        });

        console.log('\n' + '='.repeat(80));
        console.log('\n📋 SUMMARY:');
        console.log(`   Total profiles: ${profiles.length}`);
        console.log(`   Complete profiles: ${profiles.filter(p => p.hasFirstName && p.hasLastName && p.hasPhone).length}`);
        console.log(`   Incomplete profiles: ${profiles.filter(p => !p.hasFirstName || !p.hasLastName || !p.hasPhone).length}`);
        console.log(`   Profiles with email: ${profiles.filter(p => p.email).length}`);
        console.log(`   Profiles WITHOUT email: ${profiles.filter(p => !p.email).length}`);

        // Check for email-based IDs
        const emailBasedIds = profiles.filter(p => p.docId.includes('@'));
        if (emailBasedIds.length > 0) {
            console.log(`\n   🚨 CRITICAL: ${emailBasedIds.length} profile(s) using EMAIL as document ID`);
            console.log(`   This is a BUG - should use Firebase UID instead!`);
        }

        // Check for duplicates
        const emailCounts: Record<string, number> = {};
        profiles.forEach(p => {
            if (p.email) {
                emailCounts[p.email] = (emailCounts[p.email] || 0) + 1;
            }
        });
        const duplicateEmails = Object.entries(emailCounts).filter(([_, count]) => count > 1);
        if (duplicateEmails.length > 0) {
            console.log(`\n   🚨 DUPLICATES FOUND:`);
            duplicateEmails.forEach(([email, count]) => {
                console.log(`      ${email}: ${count} profiles`);
            });
        }

        // Get all projects and check members
        console.log('\n' + '='.repeat(80));
        console.log('\n🎬 PROJECT MEMBERS:');
        const projectsSnap = await getDocs(collection(db, 'projects'));
        console.log(`Total projects: ${projectsSnap.size}\n`);

        projectsSnap.forEach(doc => {
            const data = doc.data();
            if (data.members) {
                const memberCount = Object.keys(data.members).length;
                console.log(`Project: ${data.filmTitle || data.productionName || doc.id}`);
                console.log(`  Members (${memberCount}):`);
                Object.keys(data.members).forEach(memberId => {
                    const profile = profiles.find(p => p.docId === memberId);
                    console.log(`    - ${memberId}`);
                    if (profile) {
                        console.log(`      → ${profile.email} (${profile.name})`);
                    } else {
                        console.log(`      → 👻 GHOST! No matching profile found`);
                    }
                });
            }
        });

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run the investigation
investigateGhostProfile().then(() => {
    console.log('\n✅ Investigation complete');
    process.exit(0);
}).catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
