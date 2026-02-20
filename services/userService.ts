import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from '../types';

export const getUserProfileAction = async (uid: string): Promise<UserProfile | null> => {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as UserProfile;
    }
    return null;
};

export const updateUserProfileAction = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, data, { merge: true });
};
