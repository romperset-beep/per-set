import { collection, getDocs, query, doc, updateDoc, collectionGroup } from 'firebase/firestore';
import { db } from './firebase';
import { User, Project, Transaction, ConsumableItem } from '../types';

export type ProjectWithOfflineInfo = Project & { offlineMembersCount?: number };

export const fetchAllUsersAction = async (): Promise<User[]> => {
    const usersQ = query(collection(db, 'users'));
    const usersSnap = await getDocs(usersQ);
    return usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User & { id: string }));
};

export const fetchAllProjectsAction = async (): Promise<ProjectWithOfflineInfo[]> => {
    const projectsQ = query(collection(db, 'projects'));
    const projectsSnap = await getDocs(projectsQ);

    const projectsData = await Promise.all(projectsSnap.docs.map(async (docSnap) => {
        const projectData = { id: docSnap.id, ...docSnap.data() } as ProjectWithOfflineInfo;

        try {
            const offlineQ = query(collection(db, 'projects', docSnap.id, 'offlineMembers'));
            const offlineSnap = await getDocs(offlineQ);
            projectData.offlineMembersCount = offlineSnap.size;
        } catch (e) {
            console.error("Could not fetch offline members for project", docSnap.id, e);
            projectData.offlineMembersCount = 0;
        }

        return projectData;
    }));

    return projectsData;
};

export const fetchAllTransactionsAction = async (): Promise<Transaction[]> => {
    const transQ = query(collection(db, 'transactions'));
    const transSnap = await getDocs(transQ);
    return transSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
};

export const approveUserAction = async (userId: string): Promise<void> => {
    await updateDoc(doc(db, 'users', userId), { status: 'approved' });
};

export const rejectUserAction = async (userId: string): Promise<void> => {
    await updateDoc(doc(db, 'users', userId), { status: 'rejected' });
};

export const updateGenericDocumentAction = async (collectionName: 'users' | 'projects', id: string, data: Partial<User> | Partial<Project>): Promise<void> => {
    await updateDoc(doc(db, collectionName, id), data);
};

export const fetchAllGlobalItemsAction = async (): Promise<ConsumableItem[]> => {
    const itemsSnap = await getDocs(collectionGroup(db, 'items'));
    return itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConsumableItem));
};
