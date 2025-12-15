import React, { useState } from 'react';
import { ItemStatus, SurplusAction, Department } from '../types';
import { Minus, Plus, ShoppingCart, CheckCircle2, PlusCircle, RefreshCw, GraduationCap, Undo2, Mail, PackageCheck, PackageOpen, Clock, Receipt, Film } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { AddItemModal } from './AddItemModal';
import { ExpenseReportModal } from './ExpenseReportModal';
import { ErrorBoundary } from './ErrorBoundary';


export const InventoryManager: React.FC = () => {
    const { project, setProject, currentDept, addNotification, user, markNotificationAsReadByItemId, updateItem, addItem } = useProject();

    // Form State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedForEmail, setSelectedForEmail] = useState<Set<string>>(new Set());
    const [selectedForExpense, setSelectedForExpense] = useState<Set<string>>(new Set());
    // const [selectedForExpense, setSelectedForExpense] = useState<Set<string>>(new Set());
    const [surplusConfirmation, setSurplusConfirmation] = useState<{ item: any, action: SurplusAction } | null>(null);

    // Check shooting end date
    const shootingEndDate = project.shootingEndDate ? new Date(project.shootingEndDate) : null;
    const isShootingFinished = shootingEndDate ? new Date() >= shootingEndDate : false;

    // Expense Report State
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [expenseItemName, setExpenseItemName] = useState<string>('');


    // toggleExpenseSelection removed


    const toggleExpenseSelection = (id: string) => {
        setSelectedForExpense(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };


    const groupStockItems = (items: typeof project.items) => {
        const grouped: any[] = [];
        const newItemsByName: Record<string, any> = {};
        const startedItemsByName: Record<string, any> = {};

        items.forEach(item => {
            const startedQty = item.quantityStarted || 0;
            const newQty = Math.max(0, item.quantityCurrent - startedQty);
            const key = item.name + (item.surplusAction || 'NONE');

            // Handle New Portion
            if (newQty > 0) {
                if (!newItemsByName[key]) {
                    newItemsByName[key] = {
                        ...item,
                        quantityCurrent: 0,
                        quantityStarted: 0,
                        items: []
                    };
                }
                newItemsByName[key].quantityCurrent += newQty;
                newItemsByName[key].items.push(item);
            }

            // Handle Started Portion
            if (startedQty > 0) {
                if (!startedItemsByName[key]) {
                    startedItemsByName[key] = {
                        ...item,
                        quantityCurrent: 0,
                        quantityStarted: 0,
                        isStartedView: true, // Flag to identify started view
                        items: []
                    };
                }
                startedItemsByName[key].quantityCurrent += startedQty;
                startedItemsByName[key].quantityStarted += startedQty;
                startedItemsByName[key].items.push(item);
            }
        });

        // Add aggregated items
        Object.values(newItemsByName).forEach(agg => grouped.push(agg));
        Object.values(startedItemsByName).forEach(agg => grouped.push(agg));

        return grouped.sort((a, b) => {
            if (a.name !== b.name) return a.name.localeCompare(b.name);
            // New first
            if (!a.isStartedView && b.isStartedView) return -1;
            if (a.isStartedView && !b.isStartedView) return 1;
            return 0;
        });
    };

    const updateQuantity = async (id: string, change: number) => {
        const item = project.items.find(i => i.id === id);
        if (!item) return;

        const newQty = Math.max(0, item.quantityCurrent + change);
        let newStatus = item.status;
        if (newQty === 0) newStatus = ItemStatus.EMPTY;
        else if (newQty < item.quantityInitial) newStatus = ItemStatus.USED;

        const changes = { quantityCurrent: newQty, status: newStatus };
        const updatedItem = { ...item, ...changes };

        setProject(prev => ({
            ...prev,
            items: prev.items.map(i => i.id === id ? updatedItem : i)
        }));

        if (updateItem) await updateItem({ id, ...changes });
    };

    const markAsBought = async (id: string) => {
        const item = project.items.find(i => i.id === id);
        if (!item) return;

        const changes = { isBought: true };
        const updatedItem = { ...item, ...changes };

        setProject(prev => ({
            ...prev,
            items: prev.items.map(i => i.id === id ? updatedItem : i)
        }));

        if (updateItem) await updateItem({ id, ...changes });
        markNotificationAsReadByItemId(id);
    };

    const markAsPurchased = async (id: string) => {
        const item = project.items.find(i => i.id === id);
        if (!item) return;

        const changes = { purchased: true, isBought: false };
        const updatedItem = { ...item, ...changes };

        setProject(prev => ({
            ...prev,
            items: prev.items.map(i => i.id === id ? updatedItem : i)
        }));

        if (updateItem) await updateItem({ id, ...changes });
        markNotificationAsReadByItemId(id);
    };

    const incrementStarted = async (id: string) => {
        const item = project.items.find(i => i.id === id);
        if (!item) return;

        const currentStarted = item.quantityStarted || 0;
        if (currentStarted < item.quantityCurrent) {
            const changes = { quantityStarted: currentStarted + 1, status: ItemStatus.USED };
            const updatedItem = { ...item, ...changes };

            setProject(prev => ({
                ...prev,
                items: prev.items.map(i => i.id === id ? updatedItem : i)
            }));

            if (updateItem) await updateItem({ id, ...changes });
        }
    };

    const setSurplusAction = async (id: string, action: SurplusAction) => {
        const item = project.items.find(i => i.id === id);
        if (!item) return;

        if (action !== SurplusAction.NONE) {
            let actionName = 'Action inconnue';
            if (action === SurplusAction.MARKETPLACE) actionName = 'Stock Virtuel';
            else if (action === SurplusAction.DONATION) actionName = 'Dons';
            else if (action === SurplusAction.SHORT_FILM) actionName = 'Court-Métrage';
            else if (action === SurplusAction.RELEASED_TO_PROD) actionName = 'Libération Production';

            addNotification(
                `♻️ Surplus : ${item.name} (${item.department}) déplacé vers ${actionName} par ${user?.name || 'Département'}`,
                'STOCK_MOVE',
                'PRODUCTION'
            );
        }

        const changes = { surplusAction: action };
        const updatedItem = { ...item, ...changes };

        setProject(prev => ({
            ...prev,
            items: prev.items.map(i => i.id === id ? updatedItem : i)
        }));

        if (updateItem) await updateItem({ id, ...changes });
    };

    const handleSurplusClick = (item: any, action: SurplusAction) => {
        // If item has started units AND new units (mixed stock), ask for confirmation
        if ((item.quantityStarted || 0) > 0 && (item.quantityStarted || 0) < item.quantityCurrent) {
            setSurplusConfirmation({ item, action });
        } else {
            setSurplusAction(item.id, action);
        }
    };

    const confirmSurplus = async (mode: 'ALL' | 'ONLY_NEW') => {
        if (!surplusConfirmation) return;
        const { item, action } = surplusConfirmation;

        // Ensure we work with valid quantities
        const startedQty = item.quantityStarted || 0;
        const newQty = item.quantityCurrent - startedQty;

        if (mode === 'ALL') {
            // If sending to Virtual Stock (Marketplace) and item has started units, split them!
            if (action === SurplusAction.MARKETPLACE && startedQty > 0) {
                // 1. Prepare Objects
                // Original becomes the Started portion -> Short Film
                const updatedOriginalItem = {
                    ...item,
                    quantityCurrent: startedQty,
                    quantityInitial: startedQty,
                    quantityStarted: startedQty,
                    status: ItemStatus.USED,
                    surplusAction: SurplusAction.SHORT_FILM
                };

                // New Item becomes the New portion -> Virtual Stock
                const newItem = {
                    ...item,
                    id: `${item.id}_surplus_new_${Date.now()}`,
                    quantityCurrent: newQty,
                    quantityInitial: newQty,
                    quantityStarted: 0,
                    status: ItemStatus.NEW,
                    surplusAction: SurplusAction.MARKETPLACE,
                    purchased: true,
                    isBought: false
                };

                // 2. Persist to Firestore
                if (updateItem) await updateItem(updatedOriginalItem);
                if (addItem) await addItem(newItem); // Use addItem from context

                // 3. Update Local State
                setProject(prev => ({
                    ...prev,
                    items: [...prev.items.filter(i => i.id !== item.id), updatedOriginalItem, newItem]
                }));

                addNotification(
                    `♻️ Surplus (Split) : ${item.name} -> ${newQty} Neufs vers Stock Virtuel, ${startedQty} Entamés vers Court-Métrage`,
                    'STOCK_MOVE',
                    'PRODUCTION'
                );
            } else {
                // Standard behavior (No split needed, just action update)
                setSurplusAction(item.id, action);
            }
        } else {
            // mode === 'ONLY_NEW'
            // Split logic: Keep started items (Original), move new items (New Item)

            // 1. Prepare Objects
            // Original: Keep started quantity, stay in Stock (or whatever status it had, usually 'USED' if started)
            // Actually, if we split "ONLY NEW", the original stays as is but with reduced quantity.
            // And it shouldn't have a surplus action if we are keeping it?
            // "Garder ... unités entamées ici" -> Implies NO Surplus Action for original.
            const updatedOriginalItem = {
                ...item,
                quantityCurrent: startedQty,
                quantityInitial: startedQty,
                status: ItemStatus.USED,
                surplusAction: SurplusAction.NONE // Reset action for the part we keep
            };

            // New Item: The new units going to Surplus
            const newItem = {
                ...item,
                id: `${item.id}_surplus_${Date.now()}`,
                quantityCurrent: newQty,
                quantityInitial: newQty,
                quantityStarted: 0,
                status: ItemStatus.NEW,
                surplusAction: action,
                purchased: true,
                isBought: false
            };

            // 2. Persist to Firestore
            if (updateItem) await updateItem(updatedOriginalItem);
            if (addItem) await addItem(newItem);

            // 3. Update Local State
            setProject(prev => ({
                ...prev,
                items: [...prev.items.filter(i => i.id !== item.id), updatedOriginalItem, newItem]
            }));

            let actionName = 'Action inconnue';
            if (action === SurplusAction.MARKETPLACE) actionName = 'Stock Virtuel';
            else if (action === SurplusAction.DONATION) actionName = 'Dons';
            else if (action === SurplusAction.RELEASED_TO_PROD) actionName = 'Libération Production';

            addNotification(
                `♻️ Surplus (Partiel) : ${item.name} (${newQty} unités neufs) déplacé vers ${actionName}`,
                'STOCK_MOVE',
                'PRODUCTION'
            );
        }
        setSurplusConfirmation(null);
    };

    const toggleEmailSelection = (id: string) => {
        const newSelection = new Set(selectedForEmail);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedForEmail(newSelection);
    };

    const handleSendEmail = () => {
        const itemsToSend = project.items.filter(item => selectedForEmail.has(item.id) && !item.isBought);
        if (itemsToSend.length === 0) return;

        const date = new Date().toLocaleDateString('fr-FR');
        const subject = `Commande Achats - ${project.name} - ${date}`;

        let body = `Bonjour,\n\nVoici la liste des achats pour la production "${project.name}" (${project.productionCompany}).\n\nDate: ${date}\n\nArticles :\n`;

        itemsToSend.forEach(item => {
            body += `- ${item.name} (${item.department}) : ${item.quantityInitial} ${item.unit}\n`;
        });

        body += `\nCordialement A Better Set`;

        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    // Filter items based on Purchase Status and Current Department view
    const requestedItems = project.items.filter(item => !item.purchased);
    const stockItems = project.items.filter(item => item.purchased && (!item.surplusAction || item.surplusAction === SurplusAction.NONE) && item.quantityCurrent > 0);

    // Further filter by department if not Production view
    const visibleRequests = (currentDept === 'PRODUCTION' || currentDept === Department.REGIE)
        ? requestedItems
        : requestedItems.filter(i => i.department === currentDept);

    // Validation Queue for Production (Items released by Depts)
    const itemsPendingValidation = project.items.filter(item =>
        item.surplusAction === SurplusAction.RELEASED_TO_PROD &&
        (currentDept === 'PRODUCTION' || currentDept === Department.REGIE)
    );

    const visibleStock = (currentDept === 'PRODUCTION' || currentDept === Department.REGIE)
        ? stockItems
        : stockItems.filter(i => i.department === currentDept);

    // Group by department for clearer view
    const stockByDept = visibleStock.reduce((acc, item) => {
        if (!acc[item.department]) acc[item.department] = [];
        acc[item.department].push(item);
        return acc;
    }, {} as Record<string, typeof project.items>);

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-white">Stock & Achats</h2>
                    <p className="text-slate-400 mt-1">
                        {currentDept === 'PRODUCTION'
                            ? "Gérez la liste d'achats globale et suivez l'inventaire."
                            : "Commandez vos consommables et gérez votre stock départemental."}
                    </p>
                </div>
                <div className="flex gap-4">
                    {selectedForExpense.size > 0 && (
                        <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-2">
                            <button
                                onClick={() => setSelectedForExpense(new Set())}
                                className="p-2 rounded-lg border border-cinema-600 text-slate-400 hover:border-red-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                title="Annuler la sélection"
                            >
                                <Undo2 className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => setIsExpenseModalOpen(true)}
                                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-medium transition-all"
                            >
                                <Receipt className="h-5 w-5" />
                                Créer Note de Frais ({selectedForExpense.size})
                            </button>
                        </div>
                    )}
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-eco-600 hover:bg-eco-500 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-eco-900/20 flex items-center gap-2 transition-all hover:scale-105"
                    >
                        <PlusCircle className="h-5 w-5" />
                        Nouvelle Demande
                    </button>
                </div>
            </header>



            <ErrorBoundary>
                <AddItemModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                />
            </ErrorBoundary>

            <ExpenseReportModal
                isOpen={isExpenseModalOpen}
                onClose={() => setIsExpenseModalOpen(false)}
                prefillItemNames={project.items.filter(i => selectedForExpense.has(i.id)).map(i => i.name)}
            />

            {/* SECTION 0: VALIDATION QUEUE (PRODUCTION ONLY) */}
            {itemsPendingValidation.length > 0 && (
                <div className="bg-orange-900/20 rounded-xl border border-orange-500/30 overflow-hidden mb-8 animate-in slide-in-from-top-4">
                    <div className="px-6 py-4 border-b border-orange-500/30 flex justify-between items-center bg-orange-900/20">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">
                                <PackageCheck className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Validations En Attente</h3>
                                <p className="text-xs text-orange-200/70">
                                    {itemsPendingValidation.length} articles libérés par les départements
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="divide-y divide-orange-500/10">
                        {itemsPendingValidation.map(item => (
                            <div key={item.id} className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-white">{item.name}</span>
                                        <span className="text-xs bg-cinema-900 text-slate-400 px-2 py-0.5 rounded">
                                            {item.department}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-400">
                                        Quantité libérée : <span className="text-white font-bold">{item.quantityCurrent} {item.unit}</span>
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleSurplusClick(item, SurplusAction.MARKETPLACE)}
                                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Valider vers Stock Virtuel
                                    </button>
                                    <button
                                        onClick={() => handleSurplusClick(item, SurplusAction.DONATION)}
                                        className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Valider vers Dons
                                    </button>
                                    <button
                                        onClick={() => handleSurplusClick(item, SurplusAction.SHORT_FILM)}
                                        className="px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Court-Métrage
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Surplus Confirmation Modal */}
            {surplusConfirmation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-cinema-800 border border-cinema-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">Confirmation d'envoi</h3>
                        <p className="text-slate-300 mb-6">
                            Cet article contient à la fois des unités <strong>neuves</strong> et <strong>entamées</strong>.
                            Que souhaitez-vous envoyer ?
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => confirmSurplus('ONLY_NEW')}
                                className="w-full p-4 rounded-lg bg-eco-600/20 border border-eco-500/50 hover:bg-eco-600/30 text-left transition-all group"
                            >
                                <div className="font-bold text-eco-400 group-hover:text-eco-300">Uniquement le neuf</div>
                                <div className="text-sm text-slate-400">
                                    Envoyer {surplusConfirmation.item.quantityCurrent - (surplusConfirmation.item.quantityStarted || 0)} unités neuves.
                                    <br />
                                    Garder {surplusConfirmation.item.quantityStarted} unités entamées ici.
                                </div>
                            </button>

                            <button
                                onClick={() => confirmSurplus('ALL')}
                                className="w-full p-4 rounded-lg bg-cinema-700/50 border border-cinema-600 hover:bg-cinema-700 text-left transition-all"
                            >
                                <div className="font-bold text-white">Tout envoyer</div>
                                <div className="text-sm text-slate-400">
                                    Envoyer la totalité ({surplusConfirmation.item.quantityCurrent} unités), y compris l'entamé.
                                </div>
                            </button>
                        </div>

                        <button
                            onClick={() => setSurplusConfirmation(null)}
                            className="mt-6 w-full py-2 text-slate-400 hover:text-white transition-colors"
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            )}

            {/* SECTION 1: SHOPPING LIST (REQUESTS) */}
            <div className="bg-cinema-800/50 rounded-xl border border-cinema-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-cinema-700 flex justify-between items-center bg-gradient-to-r from-cinema-800 to-cinema-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">
                            <ShoppingCart className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Liste d'Achats</h3>
                            <p className="text-xs text-slate-400">
                                {visibleRequests.length} articles en attente d'achat
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
                            Aucune demande d'achat en attente.
                        </div>
                    ) : (
                        visibleRequests.map(item => {
                            const isProductionOrRegie = currentDept === 'PRODUCTION';

                            return (
                                <div key={item.id} className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 hover:bg-cinema-700/20 transition-colors">
                                    <div className="flex items-center gap-4 flex-1">
                                        {!item.isBought && (
                                            <input
                                                type="checkbox"
                                                checked={selectedForEmail.has(item.id)}
                                                onChange={() => toggleEmailSelection(item.id)}
                                                className="h-5 w-5 rounded border-cinema-600 bg-cinema-900 text-eco-500 focus:ring-eco-500 focus:ring-offset-cinema-900"
                                            />
                                        )}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-white">{item.name}</span>
                                                <span className="text-xs bg-cinema-900 text-slate-400 px-2 py-0.5 rounded">
                                                    {item.department}
                                                </span>
                                                {item.isBought && (
                                                    <span className="text-xs bg-blue-900/50 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                                                        <CheckCircle2 className="h-3 w-3" /> ACHETÉ
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-500">Quantité demandée: {item.quantityInitial} {item.unit}</p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    {isProductionOrRegie ? (
                                        // View for Production/Regie
                                        item.isBought ? (
                                            // ALLOW Production/Regie to validate reception for ALL items, not just their own department.
                                            <button
                                                onClick={() => markAsPurchased(item.id)}
                                                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                                            >
                                                <PackageCheck className="h-4 w-4" />
                                                Valider Réception
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => markAsBought(item.id)}
                                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                                À acheter
                                            </button>
                                        )
                                    ) : (
                                        // View for Departments
                                        <div className="flex gap-2">
                                            <div className="flex items-center gap-3 bg-cinema-800/50 px-3 py-2 rounded-lg border border-cinema-700">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedForExpense.has(item.id)}
                                                    onChange={() => toggleExpenseSelection(item.id)}
                                                    className="h-5 w-5 rounded border-cinema-600 bg-cinema-900 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                                />
                                                <span className="text-sm text-slate-300 font-medium">Acheté soi-même</span>
                                            </div>

                                            <button
                                                onClick={() => markAsPurchased(item.id)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${item.isBought
                                                    ? 'bg-green-600 hover:bg-green-500 text-white animate-pulse'
                                                    : 'bg-eco-600 hover:bg-eco-500 text-white'
                                                    }`}
                                            >
                                                <PackageCheck className="h-4 w-4" />
                                                {item.isBought ? 'Valider Réception' : 'Marquer reçu'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* SECTION 2: ACTIVE STOCK */}
            <div className="space-y-6 mt-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-cinema-700"></div>
                    <h3 className="text-xl font-bold text-slate-300 uppercase tracking-wider">Stock En Cours</h3>
                    <div className="h-px flex-1 bg-cinema-700"></div>
                </div>

                {Object.keys(stockByDept).length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-cinema-800 rounded-xl border border-cinema-700 border-dashed">
                        Votre inventaire est vide. Validez les achats ci-dessus pour remplir le stock.
                    </div>
                ) : (
                    Object.keys(stockByDept).map(dept => (
                        <div key={dept} className="bg-cinema-800 rounded-xl border border-cinema-700 overflow-hidden">
                            <div className="bg-cinema-700/40 px-6 py-3 border-b border-cinema-700">
                                <h3 className="text-lg font-bold text-white">{dept}</h3>
                            </div>
                            <div className="divide-y divide-cinema-700">
                                {groupStockItems(stockByDept[dept]).map(aggregatedItem => {
                                    const item = aggregatedItem;
                                    const percentage = (item.quantityCurrent / item.quantityInitial) * 100;
                                    const isSurplus = item.surplusAction && item.surplusAction !== SurplusAction.NONE;
                                    const isStarted = item.isStartedView;

                                    return (
                                        <div key={item.id + (isStarted ? '_started' : '_new')} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-lg text-white">
                                                        {item.name}
                                                        {item.items.length > 1 && (
                                                            <span className="ml-2 text-xs text-slate-500 bg-cinema-900 px-2 py-0.5 rounded-full">
                                                                x{item.items.length}
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${isStarted ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                                                        {isStarted ? 'Entamé' : 'Neuf'}
                                                    </span>
                                                    {isSurplus && (
                                                        <span className={`text-xs px-2 py-0.5 rounded border ${item.surplusAction === SurplusAction.MARKETPLACE
                                                            ? 'bg-blue-900/50 text-blue-400 border-blue-500/30'
                                                            : 'bg-purple-900/50 text-purple-400 border-purple-500/30'
                                                            }`}>
                                                            {item.surplusAction === SurplusAction.MARKETPLACE ? 'En Stock Virtuel' : 'En Don'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                {/* Start Button (Only for New items) */}
                                                {!isSurplus && !isStarted && item.quantityCurrent > 0 && (
                                                    <button
                                                        onClick={() => {
                                                            const target = item.items.find(i => (i.quantityStarted || 0) < i.quantityCurrent);
                                                            if (target) incrementStarted(target.id);
                                                        }}
                                                        className="p-2 rounded-lg border border-cinema-600 text-slate-400 hover:border-orange-500 hover:text-orange-400 hover:bg-orange-500/10 transition-all"
                                                        title="Entamer un article"
                                                    >
                                                        <PackageOpen className="h-4 w-4" />
                                                    </button>
                                                )}

                                                {/* Surplus Actions */}
                                                {!isSurplus && item.quantityCurrent > 0 && (
                                                    <div className="flex gap-2 mr-4">
                                                        {!isStarted && (
                                                            <button
                                                                onClick={() => {
                                                                    const target = item.items.find(i => i.quantityCurrent > 0);
                                                                    if (target) {
                                                                        if (user?.department === 'PRODUCTION') {
                                                                            handleSurplusClick(target, SurplusAction.MARKETPLACE);
                                                                        } else {
                                                                            // Department View: Check Date
                                                                            if (isShootingFinished) {
                                                                                handleSurplusClick(target, SurplusAction.RELEASED_TO_PROD);
                                                                            } else {
                                                                                alert(`Vous ne pourrez libérer le matériel que le ${shootingEndDate?.toLocaleDateString()}`);
                                                                            }
                                                                        }
                                                                    }
                                                                }}
                                                                disabled={user?.department !== 'PRODUCTION' && !isShootingFinished}
                                                                className={`p-2 rounded-lg border transition-all ${user?.department !== 'PRODUCTION' && !isShootingFinished
                                                                    ? 'border-slate-700 text-slate-600 cursor-not-allowed'
                                                                    : 'border-cinema-600 text-slate-400 hover:border-blue-500 hover:text-blue-400 hover:bg-blue-500/10'
                                                                    }`}
                                                                title={user?.department !== 'PRODUCTION'
                                                                    ? (isShootingFinished ? "Libérer pour la Production" : `Disponible le ${shootingEndDate?.toLocaleDateString()}`)
                                                                    : "Envoyer au Stock Virtuel"
                                                                }
                                                            >
                                                                <RefreshCw className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        {user?.department === 'PRODUCTION' && (
                                                            <>
                                                                <button
                                                                    onClick={() => {
                                                                        const target = item.items.find(i => i.quantityCurrent > 0);
                                                                        if (target) handleSurplusClick(target, SurplusAction.DONATION);
                                                                    }}
                                                                    className="p-2 rounded-lg border border-cinema-600 text-slate-400 hover:border-purple-500 hover:text-purple-400 hover:bg-purple-500/10 transition-all"
                                                                    title="Envoyer aux Dons"
                                                                >
                                                                    <GraduationCap className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        const target = item.items.find(i => i.quantityCurrent > 0);
                                                                        if (target) handleSurplusClick(target, SurplusAction.SHORT_FILM);
                                                                    }}
                                                                    className="p-2 rounded-lg border border-cinema-600 text-slate-400 hover:border-orange-500 hover:text-orange-400 hover:bg-orange-500/10 transition-all"
                                                                    title="Envoyer aux Dons Court-Métrage"
                                                                >
                                                                    <Film className="h-4 w-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}

                                                {isSurplus && (
                                                    // Condition for Undo:
                                                    // 1. Production can always undo.
                                                    // 2. Department can ONLY undo if status is RELEASED_TO_PROD (before validation).
                                                    // 3. If item is MARKETPLACE, DONATION or SHORT_FILM, Dept CANNOT undo.
                                                    (user?.department === 'PRODUCTION' || item.surplusAction === SurplusAction.RELEASED_TO_PROD) && (
                                                        <button
                                                            onClick={() => {
                                                                const target = item.items[0];
                                                                if (target) setSurplusAction(target.id, SurplusAction.NONE);
                                                            }}
                                                            className="p-2 mr-4 rounded-lg border border-cinema-600 text-slate-500 hover:text-slate-300 hover:bg-cinema-700 transition-all"
                                                            title="Annuler l'envoi"
                                                        >
                                                            <Undo2 className="h-4 w-4" />
                                                        </button>
                                                    )
                                                )}

                                                {/* Quantity Controls */}
                                                <div className="flex items-center gap-4 bg-cinema-900 p-2 rounded-lg border border-cinema-700">
                                                    <button
                                                        onClick={() => {
                                                            const target = item.items.find(i => i.quantityCurrent > 0);
                                                            if (target) updateQuantity(target.id, -1);
                                                        }}
                                                        className="p-2 rounded-md hover:bg-cinema-700 text-slate-300 hover:text-white transition-colors"
                                                    >
                                                        <Minus className="h-5 w-5" />
                                                    </button>

                                                    <div className="text-center w-24">
                                                        <span className="block text-xl font-bold text-white">{item.quantityCurrent}</span>
                                                        <span className="text-xs text-slate-500">/ {item.quantityInitial} {item.unit}</span>
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            const target = item.items[0];
                                                            if (target) updateQuantity(target.id, 1);
                                                        }}
                                                        className="p-2 rounded-md hover:bg-cinema-700 text-slate-300 hover:text-white transition-colors"
                                                    >
                                                        <Plus className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
