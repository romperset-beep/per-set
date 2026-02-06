import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Script to manually create a user profile in Firestore
 * Run this once to restore your user profile
 */

const USER_ID = 'F1zBXzOIAye3Vvkihi5b7rWZ7jG2';

const createUserProfile = async () => {
    try {
        const userProfile = {
            id: USER_ID,
            name: 'Romain Perset',
            email: 'romperset@gmail.com',
            department: 'PRODUCTION',
            role: 'ADMIN',
            currentProjectId: 'demo-prod-demo-film',
            createdAt: new Date().toISOString(),
            phone: null,
        };

        const userRef = doc(db, 'users', USER_ID);
        await setDoc(userRef, userProfile);

        console.log('✅ User profile created successfully!');
        console.log('Profile data:', userProfile);
        console.log('\n👉 Now reload the app at http://localhost:3000');
    } catch (error) {
        console.error('❌ Error creating user profile:', error);
    }
};

createUserProfile();
