import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';
import { Transaction } from '../types';

export const validateTransactionAction = async (transaction: Transaction): Promise<void> => {
    if (transaction.status !== 'PENDING') return;
    await updateDoc(doc(db, 'transactions', transaction.id), {
        status: 'VALIDATED',
        invoicedAt: new Date().toISOString()
    });
};

export const rejectTransactionAction = async (transaction: Transaction): Promise<void> => {
    // 1. Update Transaction Status
    await updateDoc(doc(db, 'transactions', transaction.id), {
        status: 'CANCELLED'
    });

    // 2. Restore Stock
    await Promise.all(transaction.items.map(async (item) => {
        try {
            const itemRef = doc(db, 'projects', transaction.sellerId, 'items', item.id);
            await updateDoc(itemRef, {
                quantityCurrent: increment(item.quantity),
                surplusAction: 'RELEASED_TO_PROD'
            });
        } catch (e) {
            console.error("Error restoring stock for item", item.id, e);
        }
    }));
};

export const createMarketplaceTransactionAction = async (transactionData: Omit<Transaction, 'id'>, itemsToDecrement: { projectId?: string; itemId: string; qty: number }[]): Promise<void> => {
    // 1. Create Transaction
    await addDoc(collection(db, 'transactions'), transactionData);

    // 2. Decrement Stock
    await Promise.all(itemsToDecrement.map(async (i) => {
        if (i.projectId) {
            const itemRef = doc(db, 'projects', i.projectId, 'items', i.itemId);
            await updateDoc(itemRef, {
                quantityCurrent: increment(-i.qty)
            });
        }
    }));
};
