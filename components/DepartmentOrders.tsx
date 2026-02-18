import React, { useState, useEffect } from 'react';
import { Department, SurplusAction, Transaction } from '../types';
import { ShoppingCart, CheckCircle2, RefreshCw, Undo2, PackageCheck, Mail, ArrowRight, Clock } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { db } from '../services/firebase';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { useMarketplace } from '../context/MarketplaceContext';

export const DepartmentOrders: React.FC = () => {
    const { project, setProject, currentDept, addNotification, user, markNotificationAsReadByItemId, updateItem, addItem } = useProject();
    const { getGlobalMarketplaceItems } = useMarketplace();

    // State
    const [selectedRequestDept, setSelectedRequestDept] = useState<string>('ALL');
    const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
    const [selectedForEmail, setSelectedForEmail] = useState<Set<string>>(new Set());

    // Price Modal State
    const [priceModal, setPriceModal] = useState<{ item: any, action: SurplusAction, suggestedPrice: number, onConfirm?: (p: number) => void } | null>(null);

    const toggleDeptExpansion = (dept: string) => {
        setExpandedDepts(prev => {
            const next = new Set(prev);
            if (next.has(dept)) next.delete(dept);
            else next.add(dept);
            return next;
        });
    };

    const toggleEmailSelection = (id: string) => {
        const newSelection = new Set(selectedForEmail);
        if (newSelection.has(id)) newSelection.delete(id);
        else newSelection.add(id);
        setSelectedForEmail(newSelection);
    };

    // --- Helpers ---

    const promptForMarketplacePrice = (item: any, action: SurplusAction, onConfirm?: (price: number) => void) => {
        const currentPrice = item.price || 0;
        const defaultFactor = action === SurplusAction.MARKETPLACE ? 0.9 : 1.0;
        const suggestedPrice = currentPrice > 0 ? Math.round(currentPrice * defaultFactor * 100) / 100 : 0;
        setPriceModal({ item, action, suggestedPrice, onConfirm });
    };

    const handlePriceConfirm = (finalPrice: number) => {
        if (!priceModal) return;
        const { item, onConfirm } = priceModal;
        if (onConfirm) onConfirm(finalPrice);
        setPriceModal(null);
    };

    const markAsBought = async (id: string) => {
        const item = project.items.find(i => i.id === id);
        if (!item) return;

        // DIRECT UPDATE (No Price Prompt) - User requested speed
        const changes = { isBought: true };
        const updatedItem = { ...item, ...changes };

        setProject(prev => ({
            ...prev,
            items: prev.items.map(i => i.id === id ? updatedItem : i)
        }));

        if (updateItem) await updateItem({ id, ...changes });
        markNotificationAsReadByItemId(id);

        if (item.department) {
            addNotification(`Commande achetée : ${item.name}`, 'SUCCESS', item.department);
        }
    };

    const markAsPurchased = async (id: string) => {
        const item = project.items.find(i => i.id === id);
        if (!item) return;

        const performUpdate = async (price: number) => {
            const changes = { purchased: true, isBought: false };
            const priceUpdate = price > 0 ? { price: price, originalPrice: item.originalPrice || price } : {};
            const updatedItem = { ...item, ...changes, ...priceUpdate };

            setProject(prev => ({
                ...prev,
                items: prev.items.map(i => i.id === id ? updatedItem : i)
            }));

            if (updateItem) await updateItem({ id, ...changes, ...priceUpdate });
            markNotificationAsReadByItemId(id);

            if (item.department) {
                addNotification(`Commande disponible/reçue : ${item.name}`, 'SUCCESS', item.department);
            }
        };

        // DIRECT UPDATE (No Price Prompt) - User requested speed
        await performUpdate(item.price || 0);
    };

    const handleSendEmail = () => {
        const itemsToSend = project.items.filter(item => selectedForEmail.has(item.id) && !item.isBought);
        if (itemsToSend.length === 0) return;

        const date = new Date().toLocaleDateString('fr-FR');
        const subject = `Commande Achats - ${project.name} - ${date}`;
        let body = `Bonjour,\n\nVoici la liste des achats pour la production "${project.name}" (${project.productionCompany}).\n\nDate: ${date}\n\nArticles :\n`;
        (itemsToSend || []).forEach(item => { body += `- ${item.name} (${item.department}) : ${item.quantityInitial} ${item.unit}\n`; });
        body += `\nCordialement Per-Set`;

        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    // Marketplace State
    const [marketplaceItems, setMarketplaceItems] = useState<any[]>([]);

    useEffect(() => {
        const fetchMarketplace = async () => {
            if (getGlobalMarketplaceItems) {
                const globalItems = await getGlobalMarketplaceItems();
                setMarketplaceItems(globalItems);
            }
        };
        fetchMarketplace();
    }, [getGlobalMarketplaceItems]);

    // --- Validation Logic ---
    const validateItem = async (id: string) => {
        if (!user || (!user.isAdmin && user.department !== 'PRODUCTION')) return;
        if (updateItem) await updateItem({ id, isValidated: true });
        addNotification(`Demande validée`, 'SUCCESS', Department.REGIE);
    };

    const validateAll = async () => {
        if (!user || (!user.isAdmin && user.department !== 'PRODUCTION')) return;
        const itemsToValidate = project.items.filter(i => !i.isValidated && !i.purchased);
        const updates = itemsToValidate.map(i => updateItem({ id: i.id, isValidated: true }));
        await Promise.all(updates);
        addNotification(`${itemsToValidate.length} demandes validées`, 'SUCCESS', Department.REGIE);
    };

    // --- Filtering ---
    // 1. Items needing validation (Only visible to Admin/Prod if setting enabled)
    const requireValidation = project.settings?.requireOrderValidation;
    const itemsPendingValidation = project.items.filter(i => !i.purchased && !i.isValidated);

    // 2. Items approved for purchase (Ready to buy)
    // If validation required: must be isValidated=true
    // If validation NOT required: isValidated might be undefined/true/false, basically !purchased
    const requestedItems = project.items.filter(item => {
        if (item.purchased) return false;
        if (requireValidation) return item.isValidated;
        return true;
    });

    // Only show valid departments requests based on View (Production/Regie see everything, others see theirs but this page is restricted anyway)
    const visibleRequests = (currentDept === 'PRODUCTION' || currentDept === Department.REGIE || currentDept === 'REGIE' || currentDept === 'Régie')
        ? requestedItems
        : requestedItems.filter(i => i.department === currentDept);

    const requestsByDept = visibleRequests.reduce((acc, item) => {
        const dept = item.department || 'Autre';
        if (!acc[dept]) acc[dept] = [];
        acc[dept].push(item);
        return acc;
    }, {} as Record<string, typeof project.items>);


    // --- Marketplace Matching Logic ---
    const opportunities = React.useMemo(() => {
        if (!marketplaceItems.length || !visibleRequests.length) return [];

        const matches: any[] = [];

        (visibleRequests || []).forEach(neededItem => {
            // Find in marketplace by Name (Case Insensitive)
            // Allow if:
            // 1. Project ID is different (Marketplace from others)
            // 2. OR it's a BuyBack item (Sold to Per-Set, so available to anyone including origin)
            const marketMatches = marketplaceItems.filter(m =>
                m.name.toLowerCase().trim() === neededItem.name.toLowerCase().trim() &&
                (m.projectId !== project.id || m.surplusAction === SurplusAction.BUYBACK)
            );

            if (marketMatches.length > 0) {
                // Calculate effective price: 75% of original for Buyback items, else standard price
                const matchesWithPrice = marketMatches.map((m: any) => {
                    let effectivePrice = m.price || 0;
                    if (m.surplusAction === SurplusAction.BUYBACK) {
                        effectivePrice = (m.originalPrice || m.price || 0) * 0.75;
                    }
                    return { ...m, effectivePrice };
                });

                matchesWithPrice.sort((a: any, b: any) => a.effectivePrice - b.effectivePrice);
                const bestMatch = matchesWithPrice[0];

                matches.push({
                    neededItem,
                    marketItem: { ...bestMatch, price: bestMatch.effectivePrice },
                    saving: (neededItem.price || 0) - bestMatch.effectivePrice,
                    cost: bestMatch.effectivePrice
                });
            }
        });

        return matches;
    }, [marketplaceItems, visibleRequests, project.id]);

    const handleDirectOrder = async (op: { neededItem: any, marketItem: any }) => {
        if (!user) return;
        const confirmMsg = `Voulez-vous commander "${op.marketItem.name}" à ${op.marketItem.productionName} pour ${Number(op.marketItem.price).toFixed(2)} € ?`;
        if (!window.confirm(confirmMsg)) return;

        try {
            // 1. Create Transaction
            const qtyToBuy = Math.min(op.neededItem.quantityInitial, op.marketItem.quantityCurrent);

            const transactionData: Omit<Transaction, 'id'> = {
                sellerId: op.marketItem.projectId,
                sellerName: op.marketItem.productionName || 'Unknown Production',
                buyerId: project.id,
                buyerName: project.productionCompany || project.name || 'Unknown Buyer',
                items: [{
                    id: op.marketItem.id,
                    name: op.marketItem.name,
                    quantity: qtyToBuy,
                    price: op.marketItem.price || 0
                }],
                totalAmount: (op.marketItem.price || 0) * qtyToBuy,
                platformFee: ((op.marketItem.price || 0) * qtyToBuy) * 0.10, // 10% Fee
                status: 'PENDING',
                createdAt: new Date().toISOString()
            };

            await addDoc(collection(db, 'transactions'), transactionData);

            // 2. Decrement Seller Stock (Direct Firestore)
            await updateDoc(doc(db, 'projects', op.marketItem.projectId, 'items', op.marketItem.id), {
                quantityCurrent: increment(-qtyToBuy)
            });

            // 3. Update Local Request to "Ordered"
            if (updateItem) {
                await updateItem({
                    id: op.neededItem.id,
                    isBought: true,
                    price: op.marketItem.price,
                    originalPrice: op.marketItem.price,
                    quantityCurrent: qtyToBuy // Update stock with bought quantity
                });
            }

            addNotification(
                `Commande envoyée à ${op.marketItem.productionName}`,
                'SUCCESS',
                Department.REGIE
            );

            // Quick fix to update UI
            setMarketplaceItems(prev => prev.map(p => {
                if (p.id === op.marketItem.id) {
                    return { ...p, quantityCurrent: p.quantityCurrent - qtyToBuy };
                }
                return p;
            }).filter(p => p.quantityCurrent > 0));

        } catch (error: any) {
            console.error("Order failed:", error);
            alert("Erreur lors de la commande: " + error.message);
        }
    };

    const handleOrderAll = async () => {
        if (!user || opportunities.length === 0) return;

        const totalCost = opportunities.reduce((sum, op) => sum + (op.marketItem.price || 0) * Math.min(op.neededItem.quantityInitial, op.marketItem.quantityCurrent), 0);
        const confirmMsg = `Commander les ${opportunities.length} articles disponibles pour un total de ${totalCost} € ?`;

        if (!window.confirm(confirmMsg)) return;

        try {
            let successCount = 0;
            const newMarketItems = [...marketplaceItems];

            for (const op of opportunities) {
                const qtyToBuy = Math.min(op.neededItem.quantityInitial, op.marketItem.quantityCurrent);

                // 1. Transaction
                const transactionData: Omit<Transaction, 'id'> = {
                    sellerId: op.marketItem.projectId,
                    sellerName: op.marketItem.productionName || 'Unknown Production',
                    buyerId: project.id,
                    buyerName: project.productionCompany || project.name || 'Unknown Buyer',
                    items: [{
                        id: op.marketItem.id,
                        name: op.marketItem.name,
                        quantity: qtyToBuy,
                        price: op.marketItem.price || 0
                    }],
                    totalAmount: (op.marketItem.price || 0) * qtyToBuy,
                    platformFee: ((op.marketItem.price || 0) * qtyToBuy) * 0.10, // 10% Fee
                    status: 'PENDING',
                    createdAt: new Date().toISOString()
                };
                await addDoc(collection(db, 'transactions'), transactionData);

                // 2. Seller Stock
                await updateDoc(doc(db, 'projects', op.marketItem.projectId, 'items', op.marketItem.id), {
                    quantityCurrent: increment(-qtyToBuy)
                });

                // 3. Local Item
                if (updateItem) {
                    await updateItem({
                        id: op.neededItem.id,
                        isBought: true,
                        price: op.marketItem.price,
                        originalPrice: op.marketItem.price,
                        quantityCurrent: qtyToBuy
                    });
                }

                // Update local market array reference for next iterations/final set (optional but good for consistency)
                const mIndex = newMarketItems.findIndex(m => m.id === op.marketItem.id);
                if (mIndex >= 0) {
                    newMarketItems[mIndex] = { ...newMarketItems[mIndex], quantityCurrent: newMarketItems[mIndex].quantityCurrent - qtyToBuy };
                }

                successCount++;
            }

            addNotification(
                `${successCount} commandes envoyées avec succès !`,
                'SUCCESS',
                Department.REGIE
            );

            // Refresh UI
            setMarketplaceItems(newMarketItems.filter(p => p.quantityCurrent > 0));

        } catch (error: any) {
            console.error("Bulk order error", error);
            alert("Erreur lors de la commande groupée.");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in max-w-7xl mx-auto">
            <header className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <ShoppingCart className="h-8 w-8 text-blue-500" />
                        Gestion des Commandes
                    </h2>
                    <p className="text-slate-400 mt-1">
                        Centralisation des demandes d'achats de tous les départements.
                    </p>
                </div>
            </header>

            {/* SECTION: VALIDATION REQUESTS (Admin/Prod Only, AND currentDept must be Production) */}
            {requireValidation && (currentDept === 'PRODUCTION') && itemsPendingValidation.length > 0 && (
                <div className="bg-gradient-to-r from-amber-900/50 to-orange-900/50 rounded-xl border border-amber-500/30 overflow-hidden mb-8 animate-in slide-in-from-top-4 shadow-2xl shadow-amber-900/20">
                    <div className="px-6 py-4 border-b border-amber-500/30 flex flex-col md:flex-row justify-between items-center bg-amber-900/20 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 animate-pulse">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">À Valider</h3>
                                <p className="text-xs text-amber-200/70">
                                    {itemsPendingValidation.length} demandes nécessitent votre approbation avant achat.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={validateAll}
                            className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg transition-all"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Tout Valider
                        </button>
                    </div>
                    <div className="divide-y divide-amber-500/10 max-h-96 overflow-y-auto">
                        {itemsPendingValidation.map(item => (
                            <div key={item.id} className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-amber-900/10 hover:bg-amber-900/20 transition-colors">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-white">{item.name}</span>
                                        <span className="text-xs bg-cinema-900 text-slate-400 px-2 py-0.5 rounded">
                                            {item.department}
                                        </span>
                                    </div>
                                    <p className="text-sm text-amber-200/60">
                                        Quantité: {item.quantityInitial} {item.unit}
                                    </p>
                                </div>
                                <button
                                    onClick={() => validateItem(item.id)}
                                    className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600 hover:text-white text-amber-500 border border-amber-600/50 rounded-lg text-sm font-bold transition-all"
                                >
                                    Valider
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* If Validation is enabled but user is not Prod/Admin, show status */}
            {requireValidation && itemsPendingValidation.length > 0 && user?.department !== 'PRODUCTION' && !user?.isAdmin && (
                <div className="bg-cinema-800/50 rounded-xl border border-cinema-700 p-4 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded text-amber-500">
                            <Clock className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="text-white font-bold">En attente de validation</h4>
                            <p className="text-slate-400 text-sm">{itemsPendingValidation.length} de vos demandes sont en attente de validation par la Production.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION: MARKETPLACE OPPORTUNITIES */}
            {opportunities.length > 0 && (
                <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 rounded-xl border border-emerald-500/30 overflow-hidden mb-8 animate-in slide-in-from-top-4 shadow-2xl shadow-emerald-900/20">
                    <div className="px-6 py-4 border-b border-emerald-500/30 flex flex-col md:flex-row justify-between items-center bg-emerald-900/20 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 animate-pulse">
                                <RefreshCw className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    Disponible sur Per-Set
                                    <span className="text-xs bg-emerald-500 text-black px-2 py-0.5 rounded-full font-bold">ECO</span>
                                </h3>
                                <p className="text-xs text-emerald-200/70">
                                    {opportunities.length} articles de votre liste sont disponibles en seconde main !
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleOrderAll}
                            className="px-6 py-2 bg-white text-emerald-900 hover:bg-emerald-100 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg transition-all animate-bounce-subtle"
                        >
                            <ShoppingCart className="h-4 w-4" />
                            Tout Commander ({opportunities.reduce((sum, op) => sum + (op.marketItem.price || 0) * Math.min(op.neededItem.quantityInitial, op.marketItem.quantityCurrent), 0).toFixed(2)} €)
                        </button>
                    </div>

                    <div className="divide-y divide-emerald-500/10">
                        {opportunities.map((op, idx) => (
                            <div key={idx} className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-emerald-900/10 hover:bg-emerald-900/20 transition-colors">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-white">{op.neededItem.name}</span>
                                        <span className="text-xs bg-cinema-900 text-slate-400 px-2 py-0.5 rounded">
                                            {op.neededItem.department}
                                        </span>
                                    </div>
                                    <p className="text-sm text-emerald-200/60 flex items-center gap-2">
                                        <span className="line-through text-slate-600">Neuf ?</span>
                                        <span>👉 Dispo chez <strong className="text-white">{op.marketItem.productionName || "Une autre prod"}</strong> ({op.marketItem.quantityCurrent} dispo)</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="font-bold text-emerald-400 text-lg">{Number(op.marketItem.price).toFixed(2)} €</div>
                                        <div className="text-xs text-emerald-600">l'unité</div>
                                    </div>
                                    <button
                                        onClick={() => handleDirectOrder(op)}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all"
                                    >
                                        <ShoppingCart className="h-4 w-4" />
                                        Commander sur Per-Set
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* WIDGET: DEPARTMENT GRID */}
            {visibleRequests.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Synthèse par Département
                        </h3>
                        {selectedRequestDept !== 'ALL' && (
                            <button
                                onClick={() => setSelectedRequestDept('ALL')}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                                <Undo2 className="h-3 w-3" />
                                Voir Tout
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {/* 'ALL' Button */}
                        <button
                            onClick={() => setSelectedRequestDept('ALL')}
                            className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${selectedRequestDept === 'ALL'
                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40 transform scale-105'
                                : 'bg-cinema-800 border-cinema-700 text-slate-400 hover:bg-cinema-700'
                                }`}
                        >
                            <span className="text-2xl font-bold">{visibleRequests.length}</span>
                            <span className="text-xs font-bold uppercase tracking-wider">Tout</span>
                        </button>

                        {/* Department Buttons */}
                        {Object.entries(requestsByDept).sort((a, b) => b[1].length - a[1].length).map(([dept, items]) => (
                            <button
                                key={dept}
                                onClick={() => setSelectedRequestDept(dept)}
                                className={`relative p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${selectedRequestDept === dept
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40 transform scale-105'
                                    : 'bg-cinema-800 border-cinema-700 text-slate-400 hover:bg-cinema-700'
                                    }`}
                            >
                                {items.length > 0 && (
                                    <span className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full animate-in zoom-in">
                                        {items.length}
                                    </span>
                                )}
                                <span className={`text-2xl font-bold ${selectedRequestDept === dept ? 'text-white' : 'text-slate-300'}`}>
                                    {items.length}
                                </span>
                                <span className="text-xs font-bold uppercase tracking-wider text-center truncate w-full px-1">
                                    {dept}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* SHOPPING LIST */}
            <div className="bg-cinema-800/50 rounded-xl border border-cinema-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-cinema-700 flex justify-between items-center bg-gradient-to-r from-cinema-800 to-cinema-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">
                            <ShoppingCart className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Liste des Demandes {requireValidation && "(Validées)"}</h3>
                            <p className="text-xs text-slate-400">
                                {visibleRequests.filter(i => selectedRequestDept === 'ALL' || i.department === selectedRequestDept).length} articles affichés
                            </p>
                        </div>
                    </div>
                    {selectedForEmail.size > 0 && (
                        <button
                            onClick={handleSendEmail}
                            className="bg-cinema-700 hover:bg-cinema-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors border border-cinema-600"
                        >
                            <Mail className="h-4 w-4" />
                            Envoyer sélection ({selectedForEmail.size})
                        </button>
                    )}
                </div>

                <div className="divide-y divide-cinema-700/50">
                    {visibleRequests.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 italic">
                            Aucune demande {requireValidation ? "validée" : ""} en attente.
                        </div>
                    ) : (
                        Object.entries(requestsByDept)
                            .filter(([dept]) => selectedRequestDept === 'ALL' || dept === selectedRequestDept)
                            .map(([dept, items]) => {
                                const isExpanded = expandedDepts.has(dept) || selectedRequestDept === dept;
                                return (
                                    <div key={dept} className="border-b border-cinema-700/50 last:border-0">
                                        <button
                                            onClick={() => toggleDeptExpansion(dept)}
                                            className="w-full bg-cinema-900/40 px-6 py-3 border-y border-cinema-800 flex items-center justify-between hover:bg-cinema-800/60 transition-colors group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1 rounded-full bg-cinema-800 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                                                    <ArrowRight className="h-4 w-4" />
                                                </div>
                                                <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider group-hover:text-white transition-colors">{dept}</h4>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs bg-cinema-800 px-2 py-1 rounded-full text-slate-400 font-medium border border-cinema-700">
                                                    {items.length} {items.length > 1 ? 'articles' : 'article'}
                                                </span>
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="divide-y divide-cinema-700/30 bg-cinema-900/20 animate-in slide-in-from-top-1">
                                                {items.map(item => (
                                                    <div key={item.id} className="p-4 pl-12 flex flex-col sm:flex-row items-center justify-between gap-4 hover:bg-cinema-700/20 transition-colors border-l-4 border-transparent hover:border-cinema-700">
                                                        <div className="flex items-center gap-4 flex-1">
                                                            {!item.isBought && (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedForEmail.has(item.id)}
                                                                    onChange={() => toggleEmailSelection(item.id)}
                                                                    className="h-5 w-5 rounded border-cinema-600 bg-cinema-900 text-eco-500 focus:ring-eco-500 cursor-pointer"
                                                                />
                                                            )}
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-white">{item.name}</span>
                                                                    {item.isBought && (
                                                                        <span className="text-xs bg-blue-900/50 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                                                                            <CheckCircle2 className="h-3 w-3" /> ACHETÉ
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-sm text-slate-500">Quantité : {item.quantityInitial} {item.unit}</p>
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        {item.isBought ? (
                                                            item.department === currentDept ? (
                                                                <button
                                                                    onClick={() => markAsPurchased(item.id)}
                                                                    className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-green-900/20"
                                                                >
                                                                    <PackageCheck className="h-4 w-4" />
                                                                    Valider Réception
                                                                </button>
                                                            ) : (
                                                                <span className="text-xs text-slate-500 italic px-2">
                                                                    En attente de réception par {item.department}
                                                                </span>
                                                            )
                                                        ) : (
                                                            (currentDept === 'PRODUCTION' || currentDept === 'Régie' || currentDept === 'REGIE' || user?.isAdmin) ? (
                                                                <button
                                                                    onClick={() => markAsBought(item.id)}
                                                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-900/20"
                                                                >
                                                                    <CheckCircle2 className="h-4 w-4" />
                                                                    À acheter
                                                                </button>
                                                            ) : (
                                                                <span className="text-xs text-orange-400 italic px-2 bg-orange-900/20 py-1 rounded border border-orange-500/20">
                                                                    En attente d'achat
                                                                </span>
                                                            )
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                    )}
                </div>
            </div>

            {/* Price Modal */}
            {priceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-cinema-800 border border-cinema-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">Prix d'Achat (Optionnel)</h3>
                        <p className="text-slate-300 mb-6">
                            Veuillez indiquer le prix d'achat si vous l'avez (sinon laissez 0).
                        </p>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-400 mb-2">Prix (€)</label>
                            <input
                                type="number"
                                autoFocus
                                defaultValue={priceModal.suggestedPrice}
                                id="resalePriceInput"
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setPriceModal(null)}
                                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => handlePriceConfirm(0)}
                                className="px-4 py-2 rounded-lg font-medium transition-colors text-white bg-slate-600 hover:bg-slate-500"
                            >
                                Passer
                            </button>
                            <button
                                onClick={() => {
                                    const input = document.getElementById('resalePriceInput') as HTMLInputElement;
                                    const val = parseFloat(input.value);
                                    if (!isNaN(val) && val >= 0) handlePriceConfirm(val);
                                }}
                                className="px-4 py-2 rounded-lg font-bold transition-colors text-white bg-emerald-600 hover:bg-emerald-500"
                            >
                                Valider
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
