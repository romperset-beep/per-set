import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '../services/firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { LogisticsRequest } from '../types';
import { useProject } from './ProjectContext';
import { useNotification } from './NotificationContext';

interface LogisticsContextType {
    logistics: LogisticsRequest[];
    addLogisticsRequest: (request: LogisticsRequest) => Promise<void>;
    deleteLogisticsRequest: (requestId: string) => Promise<void>;
}

const LogisticsContext = createContext<LogisticsContextType | undefined>(undefined);

export const LogisticsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { project, error } = useProject();
    const { addNotification } = useNotification();
    const [logistics, setLogistics] = useState<LogisticsRequest[]>([]);

    // Sync Logistics
    useEffect(() => {
        const projectId = project.id;
        if (!projectId || projectId === 'default-project') return;

        const logisticsRef = collection(db, 'projects', projectId, 'logistics');
        const unsubLogistics = onSnapshot(logisticsRef, (snapshot) => {
            const logisticsData = snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as LogisticsRequest));
            setLogistics(prev => {
                if (JSON.stringify(prev) === JSON.stringify(logisticsData)) return prev;
                return logisticsData;
            });
        }, (err) => {
            console.error("[LogisticsSync] Error:", err);
        });

        return () => unsubLogistics();
    }, [project.id]);

    const addLogisticsRequest = async (request: LogisticsRequest) => {
        const projectId = project.id;
        if (!projectId) return;

        const id = request.id || `logistics_${Date.now()}`;
        const docRef = doc(db, 'projects', projectId, 'logistics', id);

        const sanitizedRequest = Object.fromEntries(
            Object.entries({ ...request, id }).map(([k, v]) => [k, v === undefined ? null : v])
        );

        await setDoc(docRef, sanitizedRequest);

        addNotification(
            `Demande transport (${request.type}) pour ${request.department}`,
            'INFO',
            'PRODUCTION'
        );
    };

    const deleteLogisticsRequest = async (requestId: string) => {
        const projectId = project.id;
        if (!projectId) return;
        await deleteDoc(doc(db, 'projects', projectId, 'logistics', requestId));
    };

    return (
        <LogisticsContext.Provider value={{
            logistics,
            addLogisticsRequest,
            deleteLogisticsRequest
        }}>
            {children}
        </LogisticsContext.Provider>
    );
};

export const useLogistics = () => {
    const context = useContext(LogisticsContext);
    if (context === undefined) {
        throw new Error('useLogistics must be used within a LogisticsProvider');
    }
    return context;
};
