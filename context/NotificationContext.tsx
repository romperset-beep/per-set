import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Notification, Department } from '../types';
import { db } from '../services/firebase';
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    limit,
    getDocs
} from 'firebase/firestore';
import { useProject } from './ProjectContext';
import { useAuth } from './AuthContext'; // We need user to know targetDept or user-specific notifs?

interface NotificationContextType {
    notifications: Notification[];
    unreadNotificationCount: number;
    loading: boolean;

    addNotification: (message: string, type: Notification['type'], target?: Department | 'PRODUCTION', itemId?: string) => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    markAllAsRead: (notificationIds: string[]) => Promise<void>;
    markNotificationAsReadByItemId: (itemId: string) => Promise<void>;
    clearAllNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // We need project ID to scope notifications to the project
    // Circular dependency risk: ProjectContext needs notifications? 
    // Previously ProjectContext HELD notifications.
    // Now NotificationContext depends on ProjectContext for project.id?
    // OR we pass project ID as prop? useProject is safe if NotificationProvider is INSIDE ProjectProvider.
    // App.tsx structure: Auth -> Project -> Social -> Marketplace -> Notification -> AppContent
    // So we can use useProject().

    const { project } = useProject();
    const { user } = useAuth(); // If we need user info

    // Sync Notifications
    useEffect(() => {
        const projectId = project.id;
        if (!projectId || projectId === 'default-project') {
            setNotifications([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const notifsRef = collection(db, 'projects', projectId, 'notifications');
        // Limit to 50 recent notifications
        const q = query(notifsRef, orderBy('date', 'desc'), limit(50));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs: Notification[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                notifs.push({
                    id: doc.id,
                    ...data,
                    date: data.date?.toDate ? data.date.toDate() : new Date(data.date)
                } as Notification);
            });
            setNotifications(notifs);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching notifications", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [project.id]);

    const addNotification = async (message: string, type: Notification['type'], target: Department | 'PRODUCTION' = 'PRODUCTION', itemId?: string) => {
        try {
            const projectId = project.id;
            if (!projectId || projectId === 'default-project') return;

            const notifsRef = collection(db, 'projects', projectId, 'notifications');
            await addDoc(notifsRef, {
                message,
                type,
                targetDept: target,
                itemId: itemId || null,
                read: false,
                date: new Date()
            });
        } catch (err) {
            console.error("Failed to send notification:", err);
        }
    };

    const markAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

        try {
            const projectId = project.id;
            if (!projectId || projectId === 'default-project') return;

            const notifRef = doc(db, 'projects', projectId, 'notifications', id);
            await updateDoc(notifRef, { read: true });
        } catch (err) {
            console.error("Failed to mark notification as read:", err);
        }
    };

    const deleteNotification = async (id: string) => {
        // Optimistic
        setNotifications(prev => prev.filter(n => n.id !== id));

        try {
            const projectId = project.id;
            if (!projectId || projectId === 'default-project') return;

            const notifRef = doc(db, 'projects', projectId, 'notifications', id);
            await deleteDoc(notifRef);
        } catch (err) {
            console.error("Failed to delete notification:", err);
        }
    };

    const markAllAsRead = async (notificationIds: string[]) => {
        // 1. Optimistic Update
        setNotifications(prev => prev.map(n => notificationIds.includes(n.id) ? { ...n, read: true } : n));

        // 2. Batch Update
        try {
            const projectId = project.id;
            if (!projectId || projectId === 'default-project') return;

            const batchUpdates = notificationIds.map(id => {
                const notifRef = doc(db, 'projects', projectId, 'notifications', id);
                return updateDoc(notifRef, { read: true });
            });
            await Promise.all(batchUpdates);
        } catch (err) {
            console.error("Failed to mark all as read:", err);
        }
    };

    const markNotificationAsReadByItemId = async (itemId: string) => {
        // Find notifications related to this item
        const targetNotifs = notifications.filter(n => n.itemId === itemId && !n.read);

        if (targetNotifs.length === 0) return;

        // Optimistic update
        setNotifications(prev => prev.map(n => n.itemId === itemId ? { ...n, read: true } : n));

        try {
            const projectId = project.id;
            if (!projectId || projectId === 'default-project') return;

            // Update all matching notifications in Firestore
            const updatePromises = targetNotifs.map(n => {
                const notifRef = doc(db, 'projects', projectId, 'notifications', n.id);
                return updateDoc(notifRef, { read: true });
            });
            await Promise.all(updatePromises);
        } catch (err) {
            console.error("Failed to mark notifications as read by item:", err);
        }
    };

    const clearAllNotifications = async () => {
        try {
            const projectId = project.id;
            if (!projectId || projectId === 'default-project') {
                setNotifications([]);
                return;
            }

            // Collect IDs of currently loaded notifications (which are specific to user view usually, but here global project notifs?)
            const toDelete = notifications.map(n => n.id);
            if (toDelete.length === 0) return;

            const promises = toDelete.map(id => deleteDoc(doc(db, 'projects', projectId, 'notifications', id)));
            await Promise.all(promises);

            // State will update via snapshot, but we can optimistically clear
            setNotifications([]);
        } catch (err: unknown) {
            console.error("Error clearing notifications:", err);
        }
    };

    const unreadNotificationCount = notifications.filter(n => !n.read).length;

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadNotificationCount,
            loading,
            addNotification,
            markAsRead,
            deleteNotification,
            markAllAsRead,
            markNotificationAsReadByItemId,
            clearAllNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
