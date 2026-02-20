import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '../services/firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { ExpenseReport, ExpenseStatus } from '../types';
import { useProject } from './ProjectContext';
import { useNotification } from './NotificationContext';

interface ExpenseContextType {
    expenseReports: ExpenseReport[];
    addExpenseReport: (report: ExpenseReport & { receiptFile?: File }) => Promise<void>;
    updateExpenseReportStatus: (id: string, status: ExpenseStatus) => Promise<void>;
    deleteExpenseReport: (reportId: string, receiptUrl?: string) => Promise<void>;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export const ExpenseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { project } = useProject();
    const { addNotification } = useNotification();
    const [expenseReports, setExpenseReports] = useState<ExpenseReport[]>([]);

    useEffect(() => {
        const projectId = project.id;
        if (!projectId || projectId === 'default-project') return;

        const expensesRef = collection(db, 'projects', projectId, 'expenses');
        const q = query(expensesRef, orderBy('date', 'desc'), limit(50));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reports: ExpenseReport[] = [];
            snapshot.forEach((docSnap) => {
                reports.push({ id: docSnap.id, ...docSnap.data() } as ExpenseReport);
            });
            setExpenseReports(reports);
        }, (err) => {
            console.error("[ExpenseSync] Sync Error:", err);
        });

        return () => unsubscribe();
    }, [project.id]);

    const addExpenseReport = async (report: ExpenseReport & { receiptFile?: File }) => {
        try {
            const projectId = project.id;
            if (!projectId || projectId === 'default-project') return;

            const reportRef = doc(db, 'projects', projectId, 'expenses', report.id);

            const { id, receiptFile, ...reportData } = report;
            let finalReportData: any = { ...reportData };

            if (receiptFile) {
                try {
                    const storage = getStorage();
                    const storageRef = ref(storage, `projects/${projectId}/expenses/${report.id}/${receiptFile.name}`);
                    const snapshot = await uploadBytes(storageRef, receiptFile);
                    const downloadURL = await getDownloadURL(snapshot.ref);

                    finalReportData.receiptUrl = downloadURL;
                } catch (uploadErr) {
                    console.error("Error uploading receipt:", uploadErr);
                }
            }

            const sanitizeData = (data: any): any => {
                if (data === undefined) return null;
                if (data === null) return null;
                if (data instanceof Date) return data;
                if (Array.isArray(data)) return data.map(sanitizeData);
                if (typeof data === 'object') {
                    const sanitized: any = {};
                    for (const [key, value] of Object.entries(data)) {
                        sanitized[key] = sanitizeData(value);
                    }
                    return sanitized;
                }
                return data;
            };

            const sanitizedData = sanitizeData(finalReportData);
            await setDoc(reportRef, sanitizedData);

            addNotification(
                `Nouvelle note de frais de ${report.submittedBy} (${report.amountTTC.toFixed(2)}€)`,
                'INFO',
                'PRODUCTION'
            );
        } catch (err: any) {
            console.error("Error adding expense report:", err);
            throw err;
        }
    };

    const updateExpenseReportStatus = async (id: string, status: ExpenseStatus) => {
        try {
            const projectId = project.id;
            if (!projectId || projectId === 'default-project') return;

            const reportRef = doc(db, 'projects', projectId, 'expenses', id);
            await updateDoc(reportRef, { status });
        } catch (err: any) {
            console.error("Error updating expense status:", err);
            // Optional: Error notification
            // addNotification(`Erreur mise à jour status: ${err.message}`, 'ERROR');
            throw err;
        }
    };

    const deleteExpenseReport = async (reportId: string, receiptUrl?: string) => {
        try {
            const projectId = project.id;
            if (!projectId || projectId === 'default-project') return;

            const reportRef = doc(db, 'projects', projectId, 'expenses', reportId);
            await deleteDoc(reportRef);

            if (receiptUrl && receiptUrl.includes('firebase')) {
                try {
                    const storage = getStorage();
                    const imageRef = ref(storage, receiptUrl);
                    await deleteObject(imageRef);
                } catch (storageErr) {
                    console.warn("[Expenses] Failed to delete receipt from storage:", storageErr);
                }
            }

            addNotification("Note de frais supprimée", "INFO", "PRODUCTION");
        } catch (err: any) {
            console.error("Error deleting expense report:", err);
            throw err;
        }
    };

    return (
        <ExpenseContext.Provider value={{
            expenseReports,
            addExpenseReport,
            updateExpenseReportStatus,
            deleteExpenseReport
        }}>
            {children}
        </ExpenseContext.Provider>
    );
};

export const useExpenses = () => {
    const context = useContext(ExpenseContext);
    if (context === undefined) {
        throw new Error('useExpenses must be used within an ExpenseProvider');
    }
    return context;
};
