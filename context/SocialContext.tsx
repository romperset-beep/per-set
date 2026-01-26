import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
    SocialPost,
    Department,
    User
} from '../types';
import { db } from '../services/firebase';
import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    orderBy,
    limit
} from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { useProject } from './ProjectContext';

interface SocialContextType {
    socialPosts: SocialPost[];
    addSocialPost: (post: SocialPost) => Promise<void>;
    deleteSocialPost: (postId: string, photoUrl?: string) => Promise<void>;
    unreadSocialCount: number;
    markSocialAsRead: () => void;

    // Navigation / Filter State
    socialAudience: 'GLOBAL' | 'DEPARTMENT' | 'USER';
    setSocialAudience: (aud: 'GLOBAL' | 'DEPARTMENT' | 'USER') => void;
    socialTargetDept: Department | 'PRODUCTION';
    setSocialTargetDept: (dept: Department | 'PRODUCTION') => void;
    socialTargetUserId: string;
    setSocialTargetUserId: (id: string) => void;

    error: string | null;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

export const SocialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { project, user, userProfiles, addNotification } = useProject(); // Dependency on Core Project/User

    const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Filter State
    const [socialAudience, setSocialAudience] = useState<'GLOBAL' | 'DEPARTMENT' | 'USER'>('GLOBAL');
    const [socialTargetDept, setSocialTargetDept] = useState<Department | 'PRODUCTION'>('PRODUCTION');
    const [socialTargetUserId, setSocialTargetUserId] = useState<string>('');

    // Unread Logic
    const [lastReadSocial, setLastReadSocial] = useState<number>(() => {
        try {
            const saved = localStorage.getItem('lastReadSocial');
            const parsed = saved ? Number(saved) : Date.now();
            return isNaN(parsed) ? Date.now() : parsed;
        } catch {
            return Date.now();
        }
    });

    const markSocialAsRead = useCallback(() => {
        const now = Date.now();
        setLastReadSocial(now);
        localStorage.setItem('lastReadSocial', String(now));
    }, []);

    // Sync Social Posts
    useEffect(() => {
        const projectId = project.id;
        if (!projectId || projectId === 'default-project') {
            setSocialPosts([]);
            return;
        }

        // Limit to 50 for performance
        const postsRef = collection(db, 'projects', projectId, 'socialPosts');
        const q = query(postsRef, orderBy('date', 'desc'), limit(50));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const posts: SocialPost[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                posts.push({
                    id: doc.id,
                    ...data,
                    date: data.date?.toDate ? data.date.toDate() : new Date(data.date)
                } as SocialPost);
            });
            setSocialPosts(posts);
        }, (err) => {
            console.error("[SocialContext] Sync Error:", err);
            setError(`Erreur Social Sync: ${err.message}`);
        });

        return () => unsubscribe();
    }, [project.id]);

    // Derived Unread Count
    const unreadSocialCount = React.useMemo(() => {
        return socialPosts.filter(p => {
            if (!user) return false;
            // 1. Check Date
            if (new Date(p.date).getTime() <= lastReadSocial) return false;

            // 2. Exclude my own posts
            // Resolve my ID
            const myProfile = userProfiles.find(up => up.email === user.email);
            const myId = myProfile?.id;
            if (myId && p.authorId === myId) return false;
            if (!myId && p.authorName === user.name) return false;

            // 3. Relevance Check
            if (!p.targetAudience || p.targetAudience === 'GLOBAL') return true;
            if (p.targetAudience === 'DEPARTMENT') return p.targetDept === user.department;
            if (p.targetAudience === 'USER') return p.targetUserId === myId;

            return false;
        }).length;
    }, [socialPosts, user, userProfiles, lastReadSocial]);

    // Actions
    const addSocialPost = async (post: SocialPost) => {
        try {
            const projectId = project.id;
            if (!projectId || projectId === 'default-project') return;

            const postsRef = collection(db, 'projects', projectId, 'socialPosts');
            const { id, ...postData } = post;

            const sanitizedData = Object.fromEntries(
                Object.entries(postData).map(([k, v]) => [k, v === undefined ? null : v])
            );

            await addDoc(postsRef, {
                ...sanitizedData,
                date: new Date()
            });

            // Optional: Local notification or rely on snapshot
            // addNotification(...) is handled by the component or another listener usually, 
            // but we can trigger a success log.
        } catch (err: any) {
            console.error("[SocialContext] Add Error:", err);
            setError(`Erreur d'envoi: ${err.message}`);
            throw err;
        }
    };

    const deleteSocialPost = async (postId: string, photoUrl?: string) => {
        try {
            const projectId = project.id;
            if (!projectId || projectId === 'default-project') return;

            // 1. Delete Firestore Document
            const postRef = doc(db, 'projects', projectId, 'socialPosts', postId);
            await deleteDoc(postRef);

            // 2. Delete Photo from Storage if exists
            if (photoUrl && photoUrl.includes('firebase')) {
                try {
                    const photoRef = ref(getStorage(), photoUrl);
                    await deleteObject(photoRef);
                } catch (storageErr) {
                    console.warn("[SocialContext] Failed to delete photo:", storageErr);
                }
            }
        } catch (err: any) {
            console.error("[SocialContext] Delete Error:", err);
            setError(`Erreur de suppression: ${err.message}`);
            throw err;
        }
    };

    const value = React.useMemo(() => ({
        socialPosts,
        addSocialPost,
        deleteSocialPost,
        unreadSocialCount,
        markSocialAsRead,
        socialAudience, setSocialAudience,
        socialTargetDept, setSocialTargetDept,
        socialTargetUserId, setSocialTargetUserId,
        error
    }), [
        socialPosts,
        unreadSocialCount,
        socialAudience,
        socialTargetDept,
        socialTargetUserId,
        error
        // Functions assumed stable or not causing expensive re-renders on their own
    ]);

    return (
        <SocialContext.Provider value={value}>
            {children}
        </SocialContext.Provider>
    );
};

export const useSocial = () => {
    const context = useContext(SocialContext);
    if (context === undefined) {
        throw new Error('useSocial must be used within a SocialProvider');
    }
    return context;
};
