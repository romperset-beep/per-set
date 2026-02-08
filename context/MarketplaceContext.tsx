import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useProject } from './ProjectContext';
import {
    collection,
    query,
    orderBy,
    limit,
    onSnapshot,
    addDoc,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    collectionGroup,
    where,
    getDoc
} from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, auth } from '../services/firebase';
import { BuyBackItem, CatalogItem, ConsumableItem, Department, SurplusAction } from '../types';

interface MarketplaceContextType {
    // BuyBack (Internal Marketplace)
    buyBackItems: BuyBackItem[];
    addBuyBackItem: (item: BuyBackItem) => Promise<void>;
    toggleBuyBackReservation: (itemId: string, department: Department | 'PRODUCTION') => Promise<void>;
    confirmBuyBackTransaction: (itemId: string) => Promise<void>;
    deleteBuyBackItem: (itemId: string) => Promise<void>;

    // Catalog
    catalogItems: CatalogItem[];
    addToCatalog: (name: string, dept: string) => Promise<void>;

    // Global Marketplace (Surplus Tournage)
    getGlobalMarketplaceItems: () => Promise<ConsumableItem[]>;

    // Unread badge logic
    unreadMarketplaceCount: number;
    markMarketplaceAsRead: () => void;

    error: string | null;
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

export const useMarketplace = () => {
    const context = useContext(MarketplaceContext);
    if (!context) {
        throw new Error('useMarketplace must be used within a MarketplaceProvider');
    }
    return context;
};

export const MarketplaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { project, user } = useProject();

    const [buyBackItems, setBuyBackItems] = useState<BuyBackItem[]>([]);
    const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Unread State
    const [lastReadMarketplace, setLastReadMarketplace] = useState<number>(() => {
        const saved = localStorage.getItem('lastReadMarketplace');
        const parsed = saved ? Number(saved) : Date.now();
        return isNaN(parsed) ? Date.now() : parsed;
    });

    const markMarketplaceAsRead = useCallback(() => {
        const now = Date.now();
        setLastReadMarketplace(now);
        localStorage.setItem('lastReadMarketplace', String(now));
    }, []);

    const unreadMarketplaceCount = buyBackItems.filter(i => new Date(i.date).getTime() > lastReadMarketplace).length;

    // --- BuyBack Sync ---
    useEffect(() => {
        const projectId = project?.id;
        if (!projectId || projectId === 'default-project') return;

        const itemsRef = collection(db, 'projects', projectId, 'buyBackItems');
        const q = query(itemsRef, orderBy('date', 'desc'), limit(50));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items: BuyBackItem[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                items.push({ id: doc.id, ...data } as BuyBackItem);
            });
            setBuyBackItems(items);
        }, (err) => {
            console.error("[BuyBack] Sync Error:", err);
        });

        return () => unsubscribe();
    }, [project?.id]);

    // --- Catalog Sync ---
    useEffect(() => {
        const catalogRef = collection(db, 'catalog');
        const q = query(catalogRef, orderBy('usageCount', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items: CatalogItem[] = [];
            snapshot.forEach(doc => {
                items.push({ id: doc.id, ...doc.data() } as CatalogItem);
            });
            setCatalogItems(items);
        }, (err) => {
            console.error("[Catalog] Sync Error:", err);
        });

        return () => unsubscribe();
    }, []);

    // --- Actions ---

    const addBuyBackItem = async (item: BuyBackItem) => {
        try {
            const projectId = project?.id;
            if (!projectId || projectId === 'default-project') {
                // Local fallback (should not happen in real usage)
                setBuyBackItems(prev => [item, ...prev]);
                return;
            }

            let photoUrl = item.photo;

            // Handle Base64 Image Upload to Storage
            if (item.photo && item.photo.startsWith('data:image')) {
                try {
                    const storage = getStorage();
                    const storageRef = ref(storage, `projects/${projectId}/buyback/${Date.now()}_${Math.floor(Math.random() * 1000)}`);
                    await uploadString(storageRef, item.photo, 'data_url');
                    photoUrl = await getDownloadURL(storageRef);
                    console.log("[BuyBack] Image uploaded:", photoUrl);
                } catch (uploadErr) {
                    console.error("[BuyBack] Image upload failed:", uploadErr);
                }
            }

            const itemsRef = collection(db, 'projects', projectId, 'buyBackItems');
            const { id, ...itemData } = item;
            const docRef = doc(itemsRef, id); // Use generated ID

            await setDoc(docRef, {
                ...itemData,
                photo: photoUrl || null,
                date: new Date().toISOString()
            });

        } catch (err: any) {
            console.error("[BuyBack] Add Error:", err);
            setError(`Erreur ajout vente: ${err.message}`);
            throw err;
        }
    };

    const toggleBuyBackReservation = async (itemId: string, department: Department | 'PRODUCTION') => {
        const item = buyBackItems.find(i => i.id === itemId);
        if (!item) return;

        try {
            const projectId = project?.id;
            if (!projectId) return;

            const itemRef = doc(db, 'projects', projectId, 'buyBackItems', itemId);

            const isReservedByMe = item.reservedBy === department;
            const newStatus = isReservedByMe ? 'AVAILABLE' : 'RESERVED';
            const newReservedBy = isReservedByMe ? null : department;
            const newReservedByName = isReservedByMe ? null : (user?.name || 'Inconnu');
            const newReservedByUserId = isReservedByMe ? null : (auth.currentUser?.uid || null);

            console.log(`[BuyBack] Toggling reservation. Item: ${itemId}, UserID: ${newReservedByUserId}`);

            await updateDoc(itemRef, {
                status: newStatus,
                reservedBy: newReservedBy,
                reservedByName: newReservedByName,
                reservedByUserId: newReservedByUserId
            });

        } catch (err: any) {
            console.error("[BuyBack] Reserve Error:", err);
            setError(`Erreur réservation: ${err.message}`);
        }
    };

    const confirmBuyBackTransaction = async (itemId: string) => {
        try {
            const projectId = project?.id;
            if (!projectId) return;

            const itemRef = doc(db, 'projects', projectId, 'buyBackItems', itemId);
            await updateDoc(itemRef, {
                status: 'SOLD'
            });
        } catch (err: any) {
            console.error("[BuyBack] Confirm Error:", err);
            setError(`Erreur confirmation: ${err.message}`);
            alert(`Erreur lors de la confirmation : ${err.message}`);
        }
    };

    const deleteBuyBackItem = async (itemId: string) => {
        try {
            const projectId = project?.id;
            if (!projectId) return;

            const itemRef = doc(db, 'projects', projectId, 'buyBackItems', itemId);
            await deleteDoc(itemRef);
        } catch (err: any) {
            console.error("[BuyBack] Delete Error:", err);
            setError(`Erreur suppression: ${err.message}`);
            alert(`Erreur lors de la suppression : ${err.message}`);
        }
    };

    const getGlobalMarketplaceItems = async (): Promise<ConsumableItem[]> => {
        try {
            if (!user) return [];

            try {
                // Fetch both Standard Marketplace items and Buyback items (now owned by ABS)
                const [snapMarket, snapBuyback] = await Promise.all([
                    getDocs(query(
                        collectionGroup(db, 'items'),
                        where('surplusAction', '==', SurplusAction.MARKETPLACE)
                    )),
                    getDocs(query(
                        collectionGroup(db, 'items'),
                        where('surplusAction', '==', SurplusAction.BUYBACK)
                    ))
                ]);

                const rawItems: { item: ConsumableItem, pid: string }[] = [];
                const projectIds = new Set<string>();

                const processSnap = (snap: any) => {
                    snap.forEach((itemDoc: any) => {
                        const data = itemDoc.data() as ConsumableItem;
                        if (data.quantityCurrent > 0) {
                            const pid = itemDoc.ref.parent.parent?.id;
                            if (pid) {
                                projectIds.add(pid);
                                rawItems.push({ item: { id: itemDoc.id, ...data }, pid });
                            }
                        }
                    });
                };

                processSnap(snapMarket);
                processSnap(snapBuyback);

                // Optimization: Fetch names in parallel
                const projectNames: Record<string, string> = {};
                await Promise.all(Array.from(projectIds).map(async (pid) => {
                    try {
                        const pRef = doc(db, 'projects', pid);
                        const pSnap = await getDoc(pRef);
                        if (pSnap.exists()) {
                            projectNames[pid] = pSnap.data().productionCompany || pSnap.data().name || "Production Inconnue";
                        }
                    } catch (e) {
                        console.warn(`Could not fetch project ${pid} details for marketplace`);
                    }
                }));

                const results = rawItems.map(({ item, pid }) => ({
                    ...item,
                    projectId: pid,
                    // Mask seller name for Buyback items
                    productionName: item.surplusAction === SurplusAction.BUYBACK
                        ? "PER SET"
                        : (projectNames[pid] || "Production Inconnue")
                }));

                return results;

            } catch (error: any) {
                console.error("Failed to fetch Global Surplus:", error);
                setError(`Erreur Marketplace: ${error.message}`);
                return [];
            }
        } catch (err) {
            console.error("Error fetching global marketplace:", err);
            return [];
        }
    };

    const addToCatalog = async (name: string, dept: string) => {
        if (!name) return;

        // Check if exists (case insensitive check locally first to save read)
        const normalizedName = name.trim();
        const existing = catalogItems.find(i => i.name.toLowerCase() === normalizedName.toLowerCase() && i.department === dept);

        if (existing) {
            // Update usage count
            const itemRef = doc(db, 'catalog', existing.id);
            await updateDoc(itemRef, {
                usageCount: (existing.usageCount || 0) + 1,
                lastUsed: new Date().toISOString()
            });
        } else {
            // Add new
            const catalogRef = collection(db, 'catalog');
            await addDoc(catalogRef, {
                name: normalizedName,
                department: dept,
                usageCount: 1,
                lastUsed: new Date().toISOString()
            } as Omit<CatalogItem, 'id'>);
            console.log(`[Catalog] Added new item: ${normalizedName}`);
        }
    };

    return (
        <MarketplaceContext.Provider value={{
            buyBackItems,
            addBuyBackItem,
            toggleBuyBackReservation,
            confirmBuyBackTransaction,
            deleteBuyBackItem,
            catalogItems,
            addToCatalog,
            getGlobalMarketplaceItems,
            unreadMarketplaceCount,
            markMarketplaceAsRead,
            error
        }}>
            {children}
        </MarketplaceContext.Provider>
    );
};
