import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile, UserPrivateInfo } from '../types';

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

export const getUserPrivateInfoAction = async (uid: string): Promise<UserPrivateInfo | null> => {
    const docRef = doc(db, 'users', uid, 'private_info', 'hr_data');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as UserPrivateInfo;
    }
    return null;
};

export const updateUserPrivateInfoAction = async (uid: string, data: Partial<UserPrivateInfo>): Promise<void> => {
    const userRef = doc(db, 'users', uid, 'private_info', 'hr_data');
    await setDoc(userRef, data, { merge: true });
};
