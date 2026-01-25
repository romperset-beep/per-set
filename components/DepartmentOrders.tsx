import React, { useState } from 'react';
import { Department, SurplusAction } from '../types';
import { ShoppingCart, CheckCircle2, RefreshCw, Undo2, PackageCheck, Mail, ArrowRight } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { db } from '../services/firebase';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';

export const DepartmentOrders: React.FC = () => {
    const { project, setProject, currentDept, addNotification, user, markNotificationAsReadByItemId, updateItem, addItem, getGlobalMarketplaceItems } = useProject();

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

        promptForMarketplacePrice(item, SurplusAction.NONE, async (price) => {
            const changes = { isBought: true };
            const priceUpdate = price > 0 ? { price: price, originalPrice: item.originalPrice || price } : {};
            const updatedItem = { ...item, ...changes, ...priceUpdate };

            setProject(prev => ({
                ...prev,
                items: prev.items.map(i => i.id === id ? updatedItem : i)
            }));

            if (updateItem) await updateItem({ id, ...changes, ...priceUpdate });
            markNotificationAsReadByItemId(id);

            if (item.department) {
                addNotification(`Commande achetée : ${item.name}`, 'SUCCESS', item.department);
            }
        });
    };

    const markAsPurchased = async (id: string) => {
        const item = project.items.find(i => i.id === id);
        if (!item) return;

        promptForMarketplacePrice(item, SurplusAction.NONE, async (price) => {
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
        });
    };

    const handleSendEmail = () => {
        const itemsToSend = project.items.filter(item => selectedForEmail.has(item.id) && !item.isBought);
        if (itemsToSend.length === 0) return;

        const date = new Date().toLocaleDateString('fr-FR');
        const subject = `Commande Achats - ${project.name} - ${date}`;
        let body = `Bonjour,\n\nVoici la liste des achats pour la production "${project.name}" (${project.productionCompany}).\n\nDate: ${date}\n\nArticles :\n`;
        itemsToSend.forEach(item => { body += `- ${item.name} (${item.department}) : ${item.quantityInitial} ${item.unit}\n`; });
        body += `\nCordialement A Better Set`;

        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    // --- Filtering ---
    const requestedItems = project.items.filter(item => !item.purchased);

    // Only show valid departments requests based on View (Production/Regie see everything, others see theirs but this page is restricted anyway)
    const visibleRequests = (currentDept === 'PRODUCTION' || currentDept === Department.REGIE)
        ? requestedItems
        : requestedItems.filter(i => i.department === currentDept);

    const requestsByDept = visibleRequests.reduce((acc, item) => {
        const dept = item.department || 'Autre';
        if (!acc[dept]) acc[dept] = [];
        acc[dept].push(item);
        return acc;
    }, {} as Record<string, typeof project.items>);


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
                            <h3 className="text-xl font-bold text-white">Liste des Demandes</h3>
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
                            Aucune demande en attente.
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
                                                            <button
                                                                onClick={() => markAsPurchased(item.id)}
                                                                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-green-900/20"
                                                            >
                                                                <PackageCheck className="h-4 w-4" />
                                                                Valider Réception
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => markAsBought(item.id)}
                                                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-900/20"
                                                            >
                                                                <CheckCircle2 className="h-4 w-4" />
                                                                À acheter
                                                            </button>
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
