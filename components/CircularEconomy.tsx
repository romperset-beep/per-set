import React from 'react';
import { SurplusAction, ItemStatus, Transaction } from '../types';
import { Recycle, Heart, ShoppingBag, ArrowRight, Check, LayoutDashboard, RefreshCw, GraduationCap, Box, Undo2, Film, Edit2, Archive, DollarSign, Download, FileText, Mail, Printer, Gift } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { db } from '../services/firebase';
import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import { generateInvoice } from '../utils/invoiceGenerator';

export const CircularEconomy: React.FC = () => {
    const { project, setProject, circularView: view, setCircularView: setView, addNotification, user, updateItem, addItem } = useProject();
    const [transferModal, setTransferModal] = React.useState<{ item: any, quantity: number, targetAction: SurplusAction } | null>(null);

    // All items that have leftover quantity (filtered by department)
    const totalSurplusItems = project.items.filter(item => {
        const hasQuantity = item.quantityCurrent > 0;
        const isMyDept = user?.department === 'PRODUCTION' || item.department === user?.department;
        return hasQuantity && isMyDept;
    });

    // Filtered lists
    // MERGED LIST: Pending (Released) + Marketplace (In Stock)
    const surplusItems = totalSurplusItems.filter(item =>
        item.surplusAction === SurplusAction.RELEASED_TO_PROD ||
        item.surplusAction === SurplusAction.MARKETPLACE
    );

    // Legacy references if needed, mapped to surplusItems or kept for specific logic if any (but avoiding split)
    const pendingItems = []; // Unused in new logic
    const marketItems = []; // Unused in new logic
    // Merge Short Film into Donations for display
    const donationItems = totalSurplusItems.filter(item => item.surplusAction === SurplusAction.DONATION || item.surplusAction === SurplusAction.SHORT_FILM);
    // const shortFilmItems = ... Removed
    const storageItems = totalSurplusItems.filter(item => item.surplusAction === SurplusAction.STORAGE);

    const setAction = async (id: string, action: SurplusAction) => {
        // Optimistic Update
        setProject(prev => {
            const item = prev.items.find(i => i.id === id);
            if (item && action !== SurplusAction.NONE) {
                const actionName = action === SurplusAction.MARKETPLACE ? 'Stock Virtuel' : 'Dons';
                /*
                addNotification(
                    `♻️ Surplus : ${item.name} (${item.department}) déplacé vers ${actionName} par ${user?.name}`,
                    'STOCK_MOVE',
                    'PRODUCTION'
                );
                */
            }
            return {
                ...prev,
                items: prev.items.map(item => item.id === id ? { ...item, surplusAction: action } : item)
            };
        });

        // Persistence
        try {
            const item = project.items.find(i => i.id === id);
            if (item && updateItem) {
                const changes: any = { surplusAction: action };
                // Fix for undefined price when moving to Marketplace
                if (action === SurplusAction.MARKETPLACE) {
                    // Start with 0 if undefined
                    if (!item.originalPrice) changes.originalPrice = item.price ?? 0;
                    if (item.price === undefined) changes.price = 0;
                }
                await updateItem({ id, ...changes });
            }
        } catch (err: any) {
            console.error("Error updating surplus action:", err);
            alert(`Erreur sauvegarde : ${err.message}`);
        }
    };

    const [buybackConfirmation, setBuybackConfirmation] = React.useState<{ item: any, quantity: number } | null>(null);

    const handleBuyback = (e: React.MouseEvent, item: any) => {
        e.preventDefault();
        e.stopPropagation();
        setBuybackConfirmation({ item, quantity: item.quantityCurrent });
    };

    const executeBuyback = async () => {
        if (!buybackConfirmation) return;
        const { item, quantity } = buybackConfirmation;
        const buybackPrice = (item.originalPrice || item.price || 0) * 0.6;
        const potentialGain = buybackPrice * quantity;

        try {
            // Create Transaction for ABS Buyback
            const transactionData: Omit<Transaction, 'id'> = {
                sellerId: project.id,
                sellerName: project.productionCompany || project.name,
                buyerId: 'ABETTERSET_PLATFORM',
                buyerName: 'Per-Set',
                items: [{
                    id: item.id,
                    name: item.name,
                    quantity: quantity,
                    price: buybackPrice
                }],
                totalAmount: potentialGain,
                status: 'PENDING',
                createdAt: new Date().toISOString()
            };

            await addDoc(collection(db, 'transactions'), transactionData);

            if (quantity >= item.quantityCurrent) {
                // Full Buyback
                await setAction(item.id, SurplusAction.BUYBACK);
            } else {
                // Partial Buyback (Split)
                const newItemId = `${item.id}_buyback_${Date.now()}`;
                const remainingQty = item.quantityCurrent - quantity;

                // 1. Update Original Item (Remaining)
                if (updateItem) await updateItem({ id: item.id, quantityCurrent: remainingQty });

                // 2. Create New Item (Sold)
                if (addItem) {
                    await addItem({
                        ...item,
                        id: newItemId,
                        quantityCurrent: quantity,
                        quantityInitial: quantity,
                        quantityStarted: 0, // Assume sold portion is generic or we'd need complex split logic for started
                        surplusAction: SurplusAction.BUYBACK,
                        purchased: true,
                        isBought: false,
                        originalPrice: item.originalPrice ?? item.price ?? 0,
                        price: item.price ?? 0
                    });
                }

                // Optimistic Local Update
                setProject(prev => {
                    const updatedItems = prev.items.map(i => i.id === item.id ? { ...i, quantityCurrent: remainingQty } : i);
                    const newItem = {
                        ...item,
                        id: newItemId,
                        quantityCurrent: quantity,
                        quantityInitial: quantity,
                        surplusAction: SurplusAction.BUYBACK
                    };
                    return { ...prev, items: [...updatedItems, newItem] };
                });
            }

            setBuybackConfirmation(null);

        } catch (error: any) {
            console.error("Buyback error", error);
            alert("Erreur: " + error.message);
        }
    };

    // BULK ACTIONS LOGIC WITH REACT MODAL
    const [bulkConfirmation, setBulkConfirmation] = React.useState<{
        type: 'ACTION' | 'BUYBACK';
        targetAction?: SurplusAction;
        count: number;
    } | null>(null);

    const handleBulkAction = (targetAction: SurplusAction) => {
        if (surplusItems.length === 0) return;
        setBulkConfirmation({
            type: 'ACTION',
            targetAction,
            count: surplusItems.length
        });
    };

    const handleBulkBuyback = () => {
        if (surplusItems.length === 0) return;
        setBulkConfirmation({
            type: 'BUYBACK',
            count: surplusItems.length
        });
    };

    const processBulkAction = async () => {
        if (!bulkConfirmation) return;

        try {
            console.log("Processing Bulk Action:", bulkConfirmation.type);
            const batch = writeBatch(db);
            const projectId = project.id;

            if (!projectId) throw new Error("ID Projet manquant");

            if (bulkConfirmation.type === 'ACTION') {
                const targetAction = bulkConfirmation.targetAction!;
                let updateCount = 0;

                surplusItems.forEach(item => {
                    if (!item.id) return;
                    const itemRef = doc(db, 'projects', projectId, 'items', item.id);
                    const changes: any = { surplusAction: targetAction };

                    if (targetAction === SurplusAction.MARKETPLACE) {
                        const originalPrice = Number(item.originalPrice) || Number(item.price) || 0;
                        const price = Number(item.price) || 0;
                        if (!item.originalPrice) changes.originalPrice = originalPrice;
                        if (item.price === undefined || item.price === null) changes.price = price;
                    }

                    batch.update(itemRef, changes);
                    updateCount++;
                });

                if (updateCount > 0) {
                    await batch.commit();
                    addNotification(`${updateCount} articles déplacés avec succès.`, 'SUCCESS', 'PRODUCTION');
                }

            } else if (bulkConfirmation.type === 'BUYBACK') {
                const itemsToSell = surplusItems.map(item => {
                    const priceRaw = (Number(item.originalPrice) || Number(item.price) || 0);
                    const safePrice = isNaN(priceRaw) ? 0 : priceRaw;
                    const safeQty = Number(item.quantityCurrent) || 0;

                    return {
                        id: item.id,
                        name: item.name || "Article Inconnu",
                        quantity: safeQty,
                        price: safePrice * 0.5
                    };
                });

                const totalAmount = itemsToSell.reduce((sum, i) => sum + (i.price * i.quantity), 0);

                const transactionData: Omit<Transaction, 'id'> = {
                    sellerId: project.id,
                    sellerName: project.productionCompany || project.name || "Production",
                    buyerId: 'ABETTERSET_PLATFORM',
                    buyerName: 'Per-Set',
                    items: itemsToSell,
                    totalAmount: totalAmount,
                    status: 'PENDING',
                    createdAt: new Date().toISOString()
                };

                await addDoc(collection(db, 'transactions'), transactionData);

                surplusItems.forEach(item => {
                    const itemRef = doc(db, 'projects', projectId, 'items', item.id);
                    batch.update(itemRef, { surplusAction: SurplusAction.BUYBACK });
                });

                await batch.commit();
                addNotification(`Vente en gros validée ! Transaction de ${totalAmount.toFixed(2)}€ créée.`, 'SUCCESS', 'PRODUCTION');
            }

        } catch (e: any) {
            console.error("Bulk Item Error CRITICAL:", e);
            alert("Erreur lors du traitement en masse : " + e.message);
        } finally {
            setBulkConfirmation(null);
        }
    };

    const groupItemsForDisplay = (items: typeof project.items) => {
        const grouped: any[] = [];
        const newItemsByName: Record<string, any> = {};
        const startedItemsByName: Record<string, any> = {};

        items.forEach(item => {
            const startedQty = Number(item.quantityStarted) || 0;
            const currentQty = Number(item.quantityCurrent) || 0;
            // Ensure we don't have negative new quantity
            const newQty = Math.max(0, currentQty - startedQty);

            // Handle New Portion
            if (newQty > 0) {
                if (!newItemsByName[item.name]) {
                    newItemsByName[item.name] = {
                        ...item,
                        quantityCurrent: 0,
                        quantityStarted: 0, // Force 0 for new
                        items: []
                    };
                }
                newItemsByName[item.name].quantityCurrent += newQty;
                newItemsByName[item.name].items.push(item);
            }

            // Handle Started Portion
            if (startedQty > 0) {
                if (!startedItemsByName[item.name]) {
                    startedItemsByName[item.name] = {
                        ...item,
                        quantityCurrent: 0,
                        quantityStarted: 0,
                        items: []
                    };
                }
                startedItemsByName[item.name].quantityCurrent += startedQty;
                // Accumulate started quantity so it remains > 0
                startedItemsByName[item.name].quantityStarted += startedQty;
                startedItemsByName[item.name].items.push(item);
            }
        });

        // Add aggregated items
        Object.values(newItemsByName).forEach(agg => grouped.push(agg));
        Object.values(startedItemsByName).forEach(agg => grouped.push(agg));

        return grouped.sort((a, b) => {
            // Sort by name, then by status (New first)
            if (a.name !== b.name) return a.name.localeCompare(b.name);
            const aIsNew = !a.quantityStarted || a.quantityStarted === 0;
            const bIsNew = !b.quantityStarted || b.quantityStarted === 0;
            if (aIsNew && !bIsNew) return -1;
            if (!aIsNew && bIsNew) return 1;
            return 0;
        });
    };
    const handleTransferClick = (item: any, targetAction: SurplusAction) => {
        setTransferModal({ item, quantity: 1, targetAction });
    };

    const confirmTransfer = async () => {
        if (!transferModal) return;
        const { item, quantity, targetAction } = transferModal;

        if (quantity >= item.quantityCurrent) {
            // Move everything
            setAction(item.id, targetAction);
        } else {
            // Split logic
            const newItemId = `${item.id}_donation_${Date.now()}`;
            const remainingQty = item.quantityCurrent - quantity;
            const actionName = 'Dons';

            // Optimistic
            setProject(prev => {
                const updatedItems = prev.items.map(i =>
                    i.id === item.id
                        ? { ...i, quantityCurrent: remainingQty }
                        : i
                );

                const newItem = {
                    ...item,
                    id: newItemId,
                    quantityCurrent: quantity,
                    quantityInitial: quantity,
                    surplusAction: targetAction
                };

                /*
                addNotification(
                    `♻️ Transfert Partiel : ${item.name} (${quantity} unités) vers ${actionName}`,
                    'STOCK_MOVE',
                    'PRODUCTION'
                );
                */

                return { ...prev, items: [...updatedItems, newItem] };
            });

            // Persistence
            try {
                if (updateItem) await updateItem({ id: item.id, quantityCurrent: remainingQty });
                if (addItem) {
                    await addItem({
                        ...item,
                        id: newItemId,
                        quantityCurrent: quantity,
                        quantityInitial: quantity,
                        // Ensure required fields
                        quantityStarted: item.quantityStarted ? Math.min(item.quantityStarted, quantity) : 0,
                        surplusAction: targetAction,
                        purchased: true,
                        isBought: false,
                        originalPrice: item.originalPrice ?? item.price ?? 0,
                        price: item.price ?? 0
                    });
                }
            } catch (err: any) {
                console.error("Error splitting item:", err);
                alert(`Erreur split : ${err.message}`);
            }
        }
        setTransferModal(null);
    };

    const getTitle = () => {
        switch (view) {
            case 'marketplace': return 'Stock Virtuel';
            case 'donations': return 'Dons Pédagogiques';
            default: return 'Gestion du Surplus';
        }
    };

    const getSubtitle = () => {
        switch (view) {
            case 'marketplace': return 'Liste des équipements disponibles pour le réemploi (Inter-productions).';
            case 'donations': return 'Liste des équipements destinés aux écoles de cinéma partenaires.';
            default: return 'Identifiez et répartissez les surplus de fin de production.';
        }
    };


    // Simplified View for Non-Production Departments
    if (user?.department !== 'PRODUCTION') {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <header className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-blue-500/20 rounded-xl">
                        <RefreshCw className="h-8 w-8 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white">Mon Stock Virtuel</h2>
                        <p className="text-slate-400">
                            Récapitulatif des articles envoyés au stock de la production.
                        </p>
                    </div>
                </header>

                <div className="bg-cinema-800 rounded-xl border border-cinema-700 overflow-hidden shadow-xl">
                    <div className="bg-blue-900/20 border-b border-blue-500/20 p-4">
                        <div className="flex items-center gap-3 text-blue-400">
                            <Box className="h-5 w-5" />
                            <span className="font-bold">Articles en Stock Virtuel</span>
                        </div>
                    </div>

                    <div className="divide-y divide-cinema-700">
                        {marketItems.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                                <Box className="h-12 w-12 mb-4 opacity-20" />
                                <p>Aucun article envoyé au stock virtuel pour le moment.</p>
                            </div>
                        ) : (
                            groupItemsForDisplay(marketItems).map(item => (
                                <div key={item.id} className="p-4 flex justify-between items-center hover:bg-cinema-700/20 transition-colors">
                                    <div>
                                        <h4 className="text-white font-medium text-lg">
                                            {item.name}
                                            {item.items.length > 1 && (
                                                <span className="ml-2 text-xs text-slate-500 bg-cinema-900 px-2 py-0.5 rounded-full">
                                                    x{item.items.length}
                                                </span>
                                            )}
                                        </h4>
                                        <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                                            <span className="bg-cinema-900 px-2 py-0.5 rounded border border-cinema-700 text-xs">{item.department}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${item.quantityStarted > 0 ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                                                {item.quantityStarted > 0 ? 'Entamé' : 'Neuf'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <span className="block text-2xl font-bold text-blue-400">{item.quantityCurrent}</span>
                                            <span className="text-xs text-slate-500 uppercase">{item.unit}</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const target = item.items[0];
                                                if (target) setAction(target.id, SurplusAction.NONE);
                                            }}
                                            className="p-2 text-slate-500 hover:text-slate-300 hover:bg-cinema-700 rounded-full transition-colors"
                                            title="Retirer du stock (Annuler)"
                                        >
                                            <Undo2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const [editingItem, setEditingItem] = React.useState<any | null>(null);
    const [editForm, setEditForm] = React.useState({ price: 0 });

    const handleEditClick = (item: any) => {
        setEditingItem(item);
        setEditForm({ price: item.price || 0 });
    };

    const handleSavePrice = async () => {
        if (!editingItem) return;

        // Optimistic update
        setProject(prev => ({
            ...prev,
            items: prev.items.map(i => i.id === editingItem.id ? { ...i, price: editForm.price } : i)
        }));

        // Persist
        if (updateItem) {
            await updateItem({
                id: editingItem.id,
                price: editForm.price
            });
        }
        setEditingItem(null);
    };

    return (
        <div className="space-y-6">
            {/* BULK CONFIRMATION MODAL */}
            {bulkConfirmation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-cinema-900 border border-cinema-700 rounded-xl max-w-md w-full p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`p-3 rounded-full ${bulkConfirmation.type === 'BUYBACK' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                {bulkConfirmation.type === 'BUYBACK' ? <DollarSign className="h-6 w-6" /> : <RefreshCw className="h-6 w-6" />}
                            </div>
                            <h3 className="text-xl font-bold text-white">Confirmer l'action</h3>
                        </div>

                        <p className="text-slate-300 mb-6">
                            {bulkConfirmation.type === 'BUYBACK'
                                ? `Voulez-vous vraiment revendre ${bulkConfirmation.count} articles à Per-Set ? Une transaction unique sera générée.`
                                : `Voulez-vous vraiment déplacer ${bulkConfirmation.count} articles vers ${bulkConfirmation.targetAction} ?`
                            }
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setBulkConfirmation(null)}
                                className="px-4 py-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={processBulkAction}
                                className={`px-4 py-2 rounded-lg font-bold text-white transition-colors ${bulkConfirmation.type === 'BUYBACK' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'
                                    }`}
                            >
                                Confirmer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <header className="flex flex-col gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white">{getTitle()}</h2>
                    <p className="text-slate-400 mt-1">{getSubtitle()}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setView('overview')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${view === 'overview' ? 'bg-cinema-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <RefreshCw className="h-4 w-4" /> Surplus Tournage ({surplusItems.length})
                    </button>
                    <button
                        onClick={() => setView('donations')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${view === 'donations' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <GraduationCap className="h-4 w-4" /> Dons Écoles ({donationItems.length})
                    </button>

                    <button
                        onClick={() => setView('sales_abs')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${view === 'sales_abs' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <DollarSign className="h-4 w-4" /> Rachats Per-Set
                    </button>
                </div>

                {/* BULK ACTIONS (Visible only in Overview) */}
                {view === 'overview' && surplusItems.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-cinema-800 border border-cinema-700 rounded-xl animate-in fade-in slide-in-from-top-2">
                        <span className="text-xs font-bold text-slate-500 uppercase flex items-center mr-2">Actions en masse :</span>

                        <button
                            type="button"
                            onClick={() => handleBulkBuyback()}
                            className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-500/30 flex items-center gap-2 transition-colors"
                        >
                            <DollarSign className="h-3 w-3" />
                            Tout Revendre à Per-Set
                        </button>

                        <button
                            type="button"
                            onClick={() => handleBulkAction(SurplusAction.DONATION)}
                            className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 px-3 py-1.5 rounded-lg text-xs font-bold border border-purple-500/30 flex items-center gap-2 transition-colors"
                        >
                            <Gift className="h-3 w-3" />
                            Tout Donner
                        </button>
                    </div>
                )}

                {/* EXPORT ACTIONS */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            const getCurrentItems = () => {
                                switch (view) {
                                    case 'marketplace': return marketItems;
                                    case 'donations': return donationItems;
                                    case 'storage': return storageItems;
                                    case 'sales_abs': return totalSurplusItems.filter(i => i.surplusAction === SurplusAction.BUYBACK);
                                    default: return pendingItems;
                                }
                            };
                            const items = getCurrentItems();
                            if (items.length === 0) return alert("Aucun article à exporter dans cette vue.");

                            const emailSubject = `Export Per-Set - ${getTitle()}`;
                            const emailBody = items.map(i => `- ${i.name}: ${i.quantityCurrent} ${i.unit} (${i.department})`).join('%0D%0A');
                            window.location.href = `mailto:?subject=${emailSubject}&body=Voici la liste :%0D%0A%0D%0A${emailBody}`;
                        }}
                        className="p-2 text-slate-400 hover:text-white bg-cinema-800 border border-cinema-700 rounded-lg transition-colors"
                        title="Envoyer par Email"
                    >
                        <Mail className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => {
                            const getCurrentItems = () => {
                                switch (view) {
                                    case 'marketplace': return marketItems;
                                    case 'donations': return donationItems;
                                    case 'storage': return storageItems;
                                    case 'sales_abs': return totalSurplusItems.filter(i => i.surplusAction === SurplusAction.BUYBACK);
                                    default: return pendingItems;
                                }
                            };
                            const items = getCurrentItems();
                            if (items.length === 0) return alert("Aucun article à imprimer.");

                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                                printWindow.document.write(`
                                    <html>
                                    <head>
                                        <title>Export - ${getTitle()}</title>
                                        <style>
                                            body { font-family: sans-serif; padding: 20px; }
                                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                                            th { background-color: #f2f2f2; }
                                            h1 { color: #333; }
                                        </style>
                                    </head>
                                    <body>
                                        <h1>${getTitle()}</h1>
                                        <p>${getSubtitle()}</p>
                                        <p>Date: ${new Date().toLocaleDateString()}</p>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Article</th>
                                                    <th>Quantité</th>
                                                    <th>Département</th>
                                                    <th>Statut</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${items.map(i => `
                                                    <tr>
                                                        <td>${i.name}</td>
                                                        <td>${i.quantityCurrent} ${i.unit}</td>
                                                        <td>${i.department || '-'}</td>
                                                        <td>${i.status || '-'}</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </body>
                                    </html>
                                `);
                                printWindow.document.close();
                                printWindow.print();
                            }
                        }}
                        className="p-2 text-slate-400 hover:text-white bg-cinema-800 border border-cinema-700 rounded-lg transition-colors"
                        title="Imprimer"
                    >
                        <Printer className="h-5 w-5" />
                    </button>
                </div>
            </header>

            {/* Transfer Modal */}
            {transferModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-cinema-800 border border-cinema-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">
                            Donner aux Écoles, Courts-Métrages & Asso
                        </h3>
                        <p className="text-slate-300 mb-6">
                            Combien d'unités de <strong>{transferModal.item.name}</strong> souhaitez-vous donner ?
                        </p>

                        <div className="flex items-center gap-4 mb-6">
                            <button
                                onClick={() => setTransferModal(prev => prev ? { ...prev, quantity: Math.max(1, prev.quantity - 1) } : null)}
                                className="p-2 rounded-lg bg-cinema-700 text-white hover:bg-cinema-600"
                            >
                                -
                            </button>
                            <div className="flex-1 text-center">
                                <span className="text-3xl font-bold text-white">{transferModal.quantity}</span>
                                <span className="text-sm text-slate-500 block">sur {transferModal.item.quantityCurrent} disponibles</span>
                            </div>
                            <button
                                onClick={() => setTransferModal(prev => prev ? { ...prev, quantity: Math.min(prev.item.quantityCurrent, prev.quantity + 1) } : null)}
                                className="p-2 rounded-lg bg-cinema-700 text-white hover:bg-cinema-600"
                            >
                                +
                            </button>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setTransferModal(null)}
                                className="flex-1 py-3 rounded-lg border border-cinema-600 text-slate-400 hover:text-white hover:bg-cinema-700 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={confirmTransfer}
                                className="flex-1 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-900/20 transition-all"
                            >
                                Valider le Don
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Buyback Confirmation Modal */}
            {buybackConfirmation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-cinema-800 border border-cinema-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-900/30 mb-4 border border-emerald-500/30">
                                <DollarSign className="h-6 w-6 text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Vente à Per-Set</h3>
                            <p className="text-slate-400 mt-2 text-sm">
                                Combien d'unités de <strong>{buybackConfirmation.item.name}</strong> souhaitez-vous vendre ?
                            </p>

                            <div className="flex items-center gap-4 my-6 justify-center">
                                <button
                                    onClick={() => setBuybackConfirmation(prev => prev ? { ...prev, quantity: Math.max(1, prev.quantity - 1) } : null)}
                                    className="p-2 rounded-lg bg-emerald-700/50 text-emerald-400 border border-emerald-600/30 hover:bg-emerald-600/50 transition-colors"
                                >
                                    -
                                </button>
                                <div className="text-center min-w-[3rem]">
                                    <span className="text-3xl font-bold text-white">{buybackConfirmation.quantity}</span>
                                    <span className="text-xs text-slate-500 block">sur {buybackConfirmation.item.quantityCurrent}</span>
                                </div>
                                <button
                                    onClick={() => setBuybackConfirmation(prev => prev ? { ...prev, quantity: Math.min(prev.item.quantityCurrent, prev.quantity + 1) } : null)}
                                    className="p-2 rounded-lg bg-emerald-700/50 text-emerald-400 border border-emerald-600/30 hover:bg-emerald-600/50 transition-colors"
                                >
                                    +
                                </button>
                            </div>

                            <div className="p-4 bg-emerald-900/20 rounded-lg border border-emerald-500/20">
                                <p className="text-sm text-slate-300">Gain estimé (50% du prix)</p>
                                <p className="text-2xl font-bold text-emerald-400">
                                    {((buybackConfirmation.item.originalPrice || buybackConfirmation.item.price || 0) * 0.5 * buybackConfirmation.quantity).toFixed(2)} €
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setBuybackConfirmation(null)}
                                className="flex-1 py-3 rounded-lg border border-cinema-600 text-slate-400 hover:text-white hover:bg-cinema-700 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={executeBuyback}
                                className="flex-1 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20 transition-all"
                            >
                                Confirmer la Vente
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Price Edit Modal */}
            {editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-cinema-800 border border-cinema-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">Définir un prix de vente</h3>
                        <div className="mb-6">
                            <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Prix Unitaire (€)</label>
                            <input
                                type="number"
                                min="0"
                                value={editForm.price}
                                onChange={(e) => setEditForm({ price: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-lg font-bold"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setEditingItem(null)}
                                className="flex-1 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-cinema-700 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSavePrice}
                                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors"
                            >
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SURPLUS TOURNAGE VIEW (Replaces A Trier & Stock Virtuel) */}
            {view === 'overview' && (
                <div className="bg-cinema-800 rounded-xl border border-cinema-700 overflow-hidden shadow-xl">
                    <div className="bg-blue-900/20 border-b border-blue-500/20 p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3 text-blue-400">
                            <LayoutDashboard className="h-5 w-5" />
                            <span className="font-bold">Surplus en cours (À Trier & En Vente)</span>
                        </div>
                    </div>
                    <div className="divide-y divide-cinema-700">
                        {surplusItems.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">
                                <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>Aucun surplus à gérer.</p>
                            </div>
                        ) : (
                            groupItemsForDisplay(surplusItems).map(item => (
                                <div key={item.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-cinema-700/20 transition-colors">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-white font-medium text-lg">{item.name}</h4>
                                            {/* Badge differentiating status */}
                                            {item.surplusAction === SurplusAction.RELEASED_TO_PROD ? (
                                                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30 font-bold flex items-center gap-1">
                                                    🆕 À Trier
                                                </span>
                                            ) : (
                                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30 font-bold flex items-center gap-1">
                                                    ✅ En Vente
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 text-sm text-slate-400">
                                            <span className="bg-cinema-900 px-2 py-0.5 rounded border border-cinema-700 text-xs">{item.department}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${item.quantityStarted > 0 ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                                                {item.quantityStarted > 0 ? 'Entamé' : 'Neuf'}
                                            </span>
                                            {(item.quantityStarted > 0) && <span className="text-xs text-orange-400">({item.quantityCurrent} restants)</span>}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap items-center gap-2 justify-end w-full md:w-auto">

                                        {item.surplusAction === SurplusAction.RELEASED_TO_PROD && (
                                            <>

                                                <button
                                                    type="button"
                                                    onClick={(e) => handleBuyback(e, item)}
                                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-900/20 flex items-center gap-2 transition-all flex-1 md:flex-none justify-center"
                                                    title="Revendre à P-S"
                                                >
                                                    <DollarSign className="h-3.5 w-3.5" />
                                                    Revendre à P-S
                                                </button>
                                                <button
                                                    onClick={() => handleTransferClick(item, SurplusAction.DONATION)}
                                                    className="p-2 text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors border border-purple-500/20"
                                                    title="Donner"
                                                >
                                                    <GraduationCap className="h-4 w-4" />
                                                </button>
                                            </>
                                        )}

                                        {item.surplusAction === SurplusAction.MARKETPLACE && (
                                            <>
                                                <div className="flex items-center gap-2 mr-2 bg-cinema-900 px-2 py-1 rounded-lg border border-cinema-700">
                                                    <span className="text-green-400 text-sm font-bold">{item.price} €</span>
                                                    <button onClick={() => handleEditClick(item)} className="p-1 hover:bg-cinema-700 rounded text-slate-400">
                                                        <Edit2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => setAction(item.id, SurplusAction.RELEASED_TO_PROD)}
                                                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-all flex items-center gap-2"
                                                    title="Retirer de la vente"
                                                >
                                                    <Undo2 className="h-3.5 w-3.5" />
                                                    Retirer
                                                </button>

                                                {/* Allow Moving from Marketplace to Donation/Buyback/Storage */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleBuyback(e, item)}
                                                    className="p-1 px-2 text-xs bg-emerald-700/50 text-emerald-300 rounded border border-emerald-600/30 hover:bg-emerald-600/50 transition-colors"
                                                    title="Revendre à P-S"
                                                >
                                                    <ShoppingBag className="h-3 w-3" />
                                                </button>
                                                <button
                                                    onClick={() => handleTransferClick(item, SurplusAction.DONATION)}
                                                    className="p-1 px-2 text-xs bg-purple-900/50 text-purple-300 rounded border border-purple-500/30 hover:bg-purple-800/50 transition-colors"
                                                    title="Donner"
                                                >
                                                    <GraduationCap className="h-3 w-3" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* SALES TO ABS VIEW */}
            {view === 'sales_abs' && (
                <ViewSalesToABS items={totalSurplusItems.filter(i => i.surplusAction === SurplusAction.BUYBACK)} project={project} />
            )}


            {/* DONATIONS LIST VIEW */}
            {view === 'donations' && (
                <div className="bg-cinema-800 rounded-xl border border-cinema-700 overflow-hidden shadow-xl">
                    <div className="bg-purple-900/20 border-b border-purple-500/20 p-4">
                        <div className="flex items-center gap-3 text-purple-400">
                            <GraduationCap className="h-5 w-5" />
                            <span className="font-bold">Colis pour Écoles Partenaires</span>
                        </div>
                    </div>
                    <div className="divide-y divide-cinema-700">
                        {donationItems.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                                <GraduationCap className="h-12 w-12 mb-4 opacity-20" />
                                <p>Aucun article n'a été attribué aux dons pour le moment.</p>
                                <button onClick={() => setView('overview')} className="mt-4 text-purple-400 hover:text-purple-300 text-sm">Retourner à la gestion</button>
                            </div>
                        ) : (
                            donationItems.map(item => (
                                <div key={item.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-cinema-700/20 transition-colors">
                                    <div>
                                        <h4 className="text-white font-medium text-lg">{item.name}</h4>
                                        <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                                            <span className="bg-cinema-900 px-2 py-0.5 rounded border border-cinema-700 text-xs">{item.department}</span>
                                            <span>{item.status}</span>
                                            <span className="text-xs font-mono text-slate-500 border border-cinema-800 px-2 py-0.5 rounded ml-2">
                                                {item.price !== undefined ? `${item.price} €` : '0 €'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <span className="block text-2xl font-bold text-purple-400">{item.quantityCurrent}</span>
                                            <span className="text-xs text-slate-500 uppercase">{item.unit}</span>
                                        </div>
                                        <button
                                            onClick={() => setAction(item.id, SurplusAction.MARKETPLACE)}
                                            className="p-2 text-blue-500 hover:text-blue-300 hover:bg-blue-500/20 rounded-full transition-colors"
                                            title="Transférer vers Stock Virtuel"
                                        >
                                            <RefreshCw className="h-5 w-5" />
                                        </button>

                                        <button
                                            onClick={() => setAction(item.id, SurplusAction.NONE)}
                                            className="p-2 text-slate-500 hover:text-slate-300 hover:bg-cinema-700 rounded-full transition-colors"
                                            title="Retirer des dons"
                                        >
                                            <Undo2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}




            {/* STORAGE LIST VIEW */}
            {
                view === 'storage' && (
                    <div className="bg-cinema-800 rounded-xl border border-cinema-700 overflow-hidden shadow-xl">
                        <div className="bg-indigo-900/20 border-b border-indigo-500/20 p-4">
                            <div className="flex items-center gap-3 text-indigo-400">
                                <Archive className="h-5 w-5" />
                                <span className="font-bold">Stock Pour Production Future</span>
                            </div>
                        </div>
                        <div className="divide-y divide-cinema-700">
                            {storageItems.length === 0 ? (
                                <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                                    <Archive className="h-12 w-12 mb-4 opacity-20" />
                                    <p>Aucun article n'est stocké pour une production future.</p>
                                    <button onClick={() => setView('overview')} className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm">Retourner à la gestion</button>
                                </div>
                            ) : (
                                storageItems.map(item => (
                                    <div key={item.id} className="p-4 flex justify-between items-center hover:bg-cinema-700/20 transition-colors">
                                        <div>
                                            <h4 className="text-white font-medium text-lg">{item.name}</h4>
                                            <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                                                <span className="bg-cinema-900 px-2 py-0.5 rounded border border-cinema-700 text-xs">{item.department}</span>
                                                <span>{item.status}</span>
                                                <span className="text-xs font-mono text-slate-500 border border-cinema-800 px-2 py-0.5 rounded ml-2">
                                                    {item.price !== undefined ? `${item.price} €` : '0 €'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <span className="block text-2xl font-bold text-indigo-400">{item.quantityCurrent}</span>
                                                <span className="text-xs text-slate-500 uppercase">{item.unit}</span>
                                            </div>
                                            <button
                                                onClick={() => setAction(item.id, SurplusAction.MARKETPLACE)}
                                                className="p-2 text-blue-500 hover:text-blue-300 hover:bg-blue-500/20 rounded-full transition-colors"
                                                title="Transférer vers Stock Virtuel"
                                            >
                                                <RefreshCw className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => setAction(item.id, SurplusAction.NONE)}
                                                className="p-2 text-slate-500 hover:text-slate-300 hover:bg-cinema-700 rounded-full transition-colors"
                                                title="Retirer du stockage"
                                            >
                                                <Undo2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )
            }
        </div >
    );
};



export const ViewSalesToABS = ({ items, project }: { items: any[], project: any }) => {
    const buybackItems = items;
    const totalAmount = buybackItems.reduce((sum, item) => {
        const price = (item.originalPrice || item.price || 0) * 0.5;
        return sum + (price * item.quantityCurrent);
    }, 0);

    return (
        <div className="bg-cinema-800 rounded-xl border border-cinema-700 overflow-hidden shadow-xl">
            <div className="bg-emerald-900/20 border-b border-emerald-500/20 p-4">
                <div className="flex items-center gap-3 text-emerald-400">
                    <DollarSign className="h-5 w-5" />
                    <span className="font-bold">Ventes à A Better Set</span>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-slate-400 text-sm">
                    <thead>
                        <tr className="border-b border-cinema-700 bg-cinema-900/50 uppercase text-xs">
                            <th className="px-6 py-4 font-bold">Article</th>
                            <th className="px-6 py-4 font-bold text-center">Qté</th>
                            <th className="px-6 py-4 font-bold text-right">Prix Unitaire (50%)</th>
                            <th className="px-6 py-4 font-bold text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-cinema-700">
                        {buybackItems.map((item: any) => (
                            <tr key={item.id} className="hover:bg-cinema-700/30 transition-colors">
                                <td className="px-6 py-4 font-medium text-white">
                                    {item.name}
                                    <span className="ml-2 px-2 py-0.5 rounded bg-cinema-900 border border-cinema-700 text-xs text-slate-500">{item.department}</span>
                                </td>
                                <td className="px-6 py-4 text-center font-mono">{item.quantityCurrent} {item.unit}</td>
                                <td className="px-6 py-4 text-right font-mono text-emerald-400 font-bold">
                                    {((item.originalPrice || item.price || 0) * 0.5).toFixed(2)} €
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-white font-bold">
                                    {((item.originalPrice || item.price || 0) * 0.5 * item.quantityCurrent).toFixed(2)} €
                                </td>
                            </tr>
                        ))}
                        {buybackItems.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                    Aucun article vendu à A Better Set pour le moment.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot className="bg-cinema-900/80 font-bold text-white border-t-2 border-cinema-600">
                        <tr>
                            <td colSpan={3} className="px-6 py-4 text-right uppercase text-xs tracking-wider text-slate-400">Total Récupéré</td>
                            <td className="px-6 py-4 text-right text-emerald-400 text-lg">{totalAmount.toFixed(2)} €</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};
