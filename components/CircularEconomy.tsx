import React from 'react';
import { SurplusAction, ItemStatus, Transaction } from '../types';
import { Recycle, Heart, ShoppingBag, ArrowRight, Check, LayoutDashboard, RefreshCw, GraduationCap, Box, Undo2, Film, Edit2, Archive, DollarSign, Download, FileText, Mail, Printer } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
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
    const pendingItems = totalSurplusItems.filter(item => item.surplusAction === SurplusAction.NONE || !item.surplusAction);
    const marketItems = totalSurplusItems.filter(item => item.surplusAction === SurplusAction.MARKETPLACE);
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

    const handleBuyback = async (item: any) => {
        const buybackPrice = (item.originalPrice || item.price || 0) * 0.5;
        const potentialGain = buybackPrice * item.quantityCurrent;

        if (!window.confirm(`Confirmer la vente à A BETTER SET pour 50% du prix ?\nGain estimé : ${potentialGain.toFixed(2)} €`)) return;

        try {
            // Create Transaction for ABS Buyback
            const transactionData: Omit<Transaction, 'id'> = {
                sellerId: project.id,
                sellerName: project.productionCompany || project.name,
                buyerId: 'ABETTERSET_PLATFORM',
                buyerName: 'A Better Set',
                items: [{
                    id: item.id,
                    name: item.name,
                    quantity: item.quantityCurrent,
                    price: buybackPrice
                }],
                totalAmount: potentialGain,
                status: 'PENDING',
                createdAt: new Date().toISOString()
            };

            await addDoc(collection(db, 'transactions'), transactionData);
            await setAction(item.id, SurplusAction.BUYBACK);
            // addNotification("Demande de rachat A Better Set envoyée", "SUCCESS");

        } catch (error: any) {
            console.error("Buyback error", error);
            alert("Erreur: " + error.message);
        }
    };

    // ... groupItemsForDisplay (unchanged) ...

    const groupItemsForDisplay = (items: typeof project.items) => {
        const grouped: any[] = [];
        const newItemsByName: Record<string, any> = {};
        const startedItemsByName: Record<string, any> = {};

        items.forEach(item => {
            const startedQty = item.quantityStarted || 0;
            // Ensure we don't have negative new quantity
            const newQty = Math.max(0, item.quantityCurrent - startedQty);

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
            <header className="flex flex-col gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white">{getTitle()}</h2>
                    <p className="text-slate-400 mt-1">{getSubtitle()}</p>
                </div>

                <div className="flex p-1 bg-cinema-800 w-fit rounded-lg border border-cinema-700">
                    <button
                        onClick={() => setView('overview')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${view === 'overview' ? 'bg-cinema-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <LayoutDashboard className="h-4 w-4" /> À Trier ({pendingItems.length})
                    </button>
                    <button
                        onClick={() => setView('marketplace')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${view === 'marketplace' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <RefreshCw className="h-4 w-4" /> Stock Virtuel ({marketItems.length})
                    </button>
                    <button
                        onClick={() => setView('donations')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${view === 'donations' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <GraduationCap className="h-4 w-4" /> Dons Écoles ({donationItems.length})
                    </button>

                    <button
                        onClick={() => setView('storage')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${view === 'storage' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Archive className="h-4 w-4" /> Stock Futur ({storageItems.length})
                    </button>
                </div>

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

                            const emailSubject = `Export A Better Set - ${getTitle()}`;
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

            {/* OVERVIEW / MANAGEMENT VIEW */}
            {view === 'overview' && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <button onClick={() => setView('marketplace')} className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 relative overflow-hidden group hover:bg-cinema-750 transition-all text-left">
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500 blur-[50px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-blue-500/20 text-blue-400 p-3 rounded-lg">
                                    <RefreshCw className="h-6 w-6" />
                                </div>
                                <span className="text-4xl font-bold text-white">{marketItems.length}</span>
                            </div>
                            <h3 className="text-lg font-bold text-white">Stock Virtuel</h3>
                            <p className="text-sm text-slate-400 mt-2">Articles réintégrés dans l'inventaire mutualisé.</p>
                        </button>

                        <button onClick={() => setView('donations')} className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 relative overflow-hidden group hover:bg-cinema-750 transition-all text-left">
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-purple-500 blur-[50px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-purple-500/20 text-purple-400 p-3 rounded-lg">
                                    <GraduationCap className="h-6 w-6" />
                                </div>
                                <span className="text-4xl font-bold text-white">{donationItems.length}</span>
                            </div>
                            <h3 className="text-lg font-bold text-white">Don Pédagogique</h3>
                            <p className="text-sm text-slate-400 mt-2">Articles donnés aux écoles partenaires.</p>
                        </button>



                        <button onClick={() => setView('storage')} className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 relative overflow-hidden group hover:bg-cinema-750 transition-all text-left">
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-500 blur-[50px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-indigo-500/20 text-indigo-400 p-3 rounded-lg">
                                    <Archive className="h-6 w-6" />
                                </div>
                                <span className="text-4xl font-bold text-white">{storageItems.length}</span>
                            </div>
                            <h3 className="text-lg font-bold text-white">Stock Futur</h3>
                            <p className="text-sm text-slate-400 mt-2">Matériel conservé pour prochaine prod.</p>
                        </button>

                        <button onClick={() => setView('sales_abs')} className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 relative overflow-hidden group hover:bg-cinema-750 transition-all text-left">
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-emerald-500 blur-[50px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-emerald-500/20 text-emerald-400 p-3 rounded-lg">
                                    <DollarSign className="h-6 w-6" />
                                </div>
                                <span className="text-4xl font-bold text-white">{totalSurplusItems.filter(i => i.surplusAction === SurplusAction.BUYBACK).length}</span>
                            </div>
                            <h3 className="text-lg font-bold text-white">Rachats ABS</h3>
                            <p className="text-sm text-slate-400 mt-2">Articles vendus à la plateforme.</p>
                        </button>

                        <div className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-slate-700/50 text-slate-400 p-3 rounded-lg">
                                    <Box className="h-6 w-6" />
                                </div>
                                <span className="text-4xl font-bold text-white">{totalSurplusItems.length}</span>
                            </div>
                            <h3 className="text-lg font-bold text-white">Total Surplus</h3>
                            <p className="text-sm text-slate-400 mt-2">Nombre total d'articles restants.</p>
                        </div>
                    </div>

                    <div className="bg-cinema-800 rounded-xl border border-cinema-700 overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-cinema-900 text-slate-400 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Article à Trier</th>
                                        <th className="px-6 py-4">Reste</th>
                                        <th className="px-6 py-4">Département</th>
                                        <th className="px-6 py-4">Action Circulaire</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cinema-700">
                                    {pendingItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-16 text-center text-slate-500">
                                                {totalSurplusItems.length > 0
                                                    ? "Tout le surplus a été trié ! Consultez les onglets Stock Virtuel et Dons."
                                                    : "Aucun surplus détecté pour le moment."}
                                            </td>
                                        </tr>
                                    ) : (
                                        pendingItems.map(item => (
                                            <tr key={item.id} className="hover:bg-cinema-700/30 transition-colors">
                                                <td className="px-6 py-4 font-medium text-white">{item.name}</td>
                                                <td className="px-6 py-4 text-eco-400 font-bold">
                                                    {item.quantityCurrent} <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-300 text-sm">{item.department}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setAction(item.id, SurplusAction.MARKETPLACE)}
                                                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border border-cinema-600 text-slate-400 hover:border-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
                                                        >
                                                            <RefreshCw className="h-3 w-3" />
                                                            Vers Stock
                                                        </button>
                                                        {user?.department === 'PRODUCTION' && (
                                                            <button
                                                                onClick={() => handleTransferClick(item, SurplusAction.DONATION)}
                                                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border border-cinema-600 text-slate-400 hover:border-purple-500 hover:text-purple-400 hover:bg-purple-500/10"
                                                            >
                                                                <GraduationCap className="h-3 w-3" />
                                                                Vers Don
                                                            </button>
                                                        )}

                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* MARKETPLACE LIST VIEW */}
            {view === 'marketplace' && (
                <div className="bg-cinema-800 rounded-xl border border-cinema-700 overflow-hidden shadow-xl">
                    <div className="bg-blue-900/20 border-b border-blue-500/20 p-4">
                        <div className="flex items-center gap-3 text-blue-400">
                            <RefreshCw className="h-5 w-5" />
                            <span className="font-bold">Inventaire Disponible sur le Marché</span>
                        </div>
                    </div>
                    <div className="divide-y divide-cinema-700">
                        {marketItems.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                                <RefreshCw className="h-12 w-12 mb-4 opacity-20" />
                                <p>Aucun article n'a été ajouté au Stock Virtuel pour le moment.</p>
                                <button onClick={() => setView('overview')} className="mt-4 text-blue-400 hover:text-blue-300 text-sm">Retourner à la gestion</button>
                            </div>
                        ) : (
                            marketItems.map(item => (
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
                                    <div className="flex flex-wrap items-center gap-4 md:gap-6 w-full md:w-auto justify-between md:justify-end">
                                        {/* PRICE EDIT */}
                                        <div
                                            onClick={() => handleEditClick(item)}
                                            className="text-right cursor-pointer group/price hover:bg-cinema-700/50 p-2 rounded-lg transition-all"
                                            title="Modifier le prix"
                                        >
                                            <div className="text-sm text-slate-400 flex items-center justify-end gap-1">
                                                Prix
                                                <Edit2 className="h-3 w-3 opacity-0 group-hover/price:opacity-100 transition-opacity" />
                                            </div>
                                            <div className={`text-xl font-bold ${item.price ? 'text-green-400' : 'text-slate-600'}`}>
                                                {item.price ? `${item.price} €` : '-- €'}
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <span className="block text-2xl font-bold text-blue-400">{item.quantityCurrent}</span>
                                            <span className="text-xs text-slate-500 uppercase">{item.unit}</span>
                                        </div>
                                        {user?.department === 'PRODUCTION' && (
                                            <div className="flex flex-col gap-2 items-end">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleTransferClick(item, SurplusAction.DONATION)}
                                                        className="p-2 text-purple-500 hover:text-purple-300 hover:bg-purple-500/20 rounded-full transition-colors"
                                                        title="Transférer vers Dons"
                                                    >
                                                        <GraduationCap className="h-5 w-5" />
                                                    </button>

                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleBuyback(item)}
                                                        className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-600/30 rounded text-xs transition-colors"
                                                        title="Rachat à 50% du prix"
                                                    >
                                                        <DollarSign className="h-3 w-3" />
                                                        Rachat ABS (50%)
                                                    </button>
                                                    <button
                                                        onClick={() => setAction(item.id, SurplusAction.STORAGE)}
                                                        className="flex items-center gap-1.5 px-3 py-1 bg-slate-700/30 hover:bg-slate-700/50 text-slate-400 border border-slate-600/30 rounded text-xs transition-colors"
                                                        title="Garder pour production future"
                                                    >
                                                        <Archive className="h-3 w-3" />
                                                        Stocker
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => setAction(item.id, SurplusAction.NONE)}
                                            className="p-2 text-slate-500 hover:text-slate-300 hover:bg-cinema-700 rounded-full transition-colors"
                                            title="Retirer du stock virtuel"
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

