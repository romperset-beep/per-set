import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '../services/firebase';
import { collection, doc, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, getDocs, where } from 'firebase/firestore';
import { OfflineMember, User } from '../types';
import { useProject } from './ProjectContext';
import { useNotification } from './NotificationContext';

interface TeamContextType {
    offlineMembers: OfflineMember[];
    addMember: (email: string, role?: 'ADMIN' | 'USER') => Promise<void>;
    removeMember: (userId: string) => Promise<void>;
    addOfflineMember: (member: Omit<OfflineMember, 'id' | 'createdAt'>) => Promise<void>;
    updateOfflineMember: (id: string, updates: Partial<OfflineMember>) => Promise<void>;
    deleteOfflineMember: (memberId: string) => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const TeamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { project } = useProject();
    const { addNotification } = useNotification();
    const [offlineMembers, setOfflineMembers] = useState<OfflineMember[]>([]);

    // SYNC OFFLINE MEMBERS
    useEffect(() => {
        const projectId = project.id;
        if (!projectId || projectId === 'default-project') return;

        const q = query(collection(db, 'projects', projectId, 'offlineMembers'), orderBy('firstName'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const members = snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            })) as OfflineMember[];
            setOfflineMembers(members);
        });
        return () => unsubscribe();
    }, [project.id]);

    // --- MEMBER MANAGEMENT (RBAC) ---
    const addMember = async (email: string, role: 'ADMIN' | 'USER' = 'USER') => {
        const projectId = project.id;
        if (!projectId || projectId === 'default-project') return;

        // 1. Find User ID by Email
        const q = query(collection(db, 'users'), where('email', '==', email));
        const snap = await getDocs(q);

        if (snap.empty) {
            addNotification("Utilisateur introuvable avec cet email.", "ERROR");
            return;
        }

        const targetUser = snap.docs[0].data() as User;
        const userId = snap.docs[0].id; // Use Doc ID as User ID

        // 2. Add to Members with explicit ID
        const newMemberEntry = {
            role,
            joinedAt: new Date().toISOString(),
            email: targetUser.email,
            name: targetUser.name
        };

        const projectRef = doc(db, 'projects', projectId);
        await updateDoc(projectRef, {
            [`members.${userId}`]: newMemberEntry
        });

        addNotification(`${targetUser.name} ajouté au projet !`, "SUCCESS");
    };

    const removeMember = async (userId: string) => {
        const projectId = project.id;
        if (!projectId || projectId === 'default-project') return;

        const { deleteField } = await import('firebase/firestore');

        const projectRef = doc(db, 'projects', projectId);
        await updateDoc(projectRef, {
            [`members.${userId}`]: deleteField()
        });

        addNotification("Membre retiré du projet.", "INFO");
    };

    // --- OFFLINE MEMBERS CRUD ---
    const addOfflineMember = async (member: Omit<OfflineMember, 'id' | 'createdAt'>) => {
        const projectId = project.id;
        if (!projectId || projectId === 'default-project') return;

        await addDoc(collection(db, 'projects', projectId, 'offlineMembers'), {
            ...member,
            createdAt: new Date().toISOString()
        });
        addNotification(`${member.firstName} ajouté (Hors Ligne)`, "SUCCESS");
    };

    const updateOfflineMember = async (id: string, updates: Partial<OfflineMember>) => {
        const projectId = project.id;
        if (!projectId || projectId === 'default-project') return;

        await updateDoc(doc(db, 'projects', projectId, 'offlineMembers', id), updates);
        addNotification("Fiche membre mise à jour", "SUCCESS");
    };

    const deleteOfflineMember = async (memberId: string) => {
        const projectId = project.id;
        if (!projectId || projectId === 'default-project') return;

        await deleteDoc(doc(db, 'projects', projectId, 'offlineMembers', memberId));
        addNotification("Membre supprimé", "INFO");
    };

    return (
        <TeamContext.Provider value={{
            offlineMembers,
            addMember,
            removeMember,
            addOfflineMember,
            updateOfflineMember,
            deleteOfflineMember
        }}>
            {children}
        </TeamContext.Provider>
    );
};

export const useTeam = () => {
    const context = useContext(TeamContext);
    if (context === undefined) {
        throw new Error('useTeam must be used within a TeamProvider');
    }
    return context;
};
