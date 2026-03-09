import { collection, getDocs, query, doc, updateDoc, collectionGroup, setDoc, deleteField } from 'firebase/firestore';
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

export const migrateSensitiveDataAction = async (): Promise<string> => {
    try {
        console.log("Migration started...");
        const usersQ = query(collection(db, 'users'));
        const usersSnap = await getDocs(usersQ);
        console.log(`Found ${usersSnap.size} total users in 'users' collection.`);

        const privateKeys = ['ssn', 'birthPlace', 'birthDate', 'birthDepartment', 'birthCountry', 'nationality', 'socialSecurityCenterAddress', 'taxRate', 'congeSpectacleNumber'];
        let migratedCount = 0;

        for (const userDoc of usersSnap.docs) {
            const data = userDoc.data();
            const privateDataToSave: Record<string, any> = {};
            const keysToDelete: Record<string, any> = {};
            let hasPrivateData = false;

            privateKeys.forEach(key => {
                if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
                    // Check if it's not an empty string so we don't migrate empty data
                    privateDataToSave[key] = data[key];
                    keysToDelete[key] = deleteField();
                    hasPrivateData = true;
                }
            });

            if (hasPrivateData) {
                console.log(`Migrating data for user ${userDoc.id}:`, privateDataToSave);
                // 1. Save to private_info/hr_data
                const privateInfoRef = doc(db, 'users', userDoc.id, 'private_info', 'hr_data');
                await setDoc(privateInfoRef, privateDataToSave, { merge: true });

                // 2. Delete from root document
                const userRef = doc(db, 'users', userDoc.id);
                await updateDoc(userRef, keysToDelete);
                migratedCount++;
                console.log(`Successfully migrated user ${userDoc.id}`);
            } else {
                console.log(`User ${userDoc.id} has no private data to migrate or it is already migrated.`);
            }
        }

        console.log(`Migration finished. Migrated ${migratedCount} profiles.`);
        return `${migratedCount} profils migrés avec succès.`;
    } catch (err) {
        console.error("Migration Error:", err);
        throw err;
    }
};
