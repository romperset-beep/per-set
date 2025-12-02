import React from 'react';
import { SurplusAction, ItemStatus } from '../types';
import { Recycle, Heart, ShoppingBag, ArrowRight, Check, LayoutDashboard, RefreshCw, GraduationCap, Box, Undo2 , Film } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

export const CircularEconomy: React.FC = () => {
    const { project, setProject, circularView: view, setCircularView: setView, addNotification, user } = useProject();
    const [transferModal, setTransferModal] = React.useState<{ item: any, quantity: number } | null>(null);

    // All items that have leftover quantity
        // All items that have leftover quantity (filtered by department)
    const totalSurplusItems = project.items.filter(item => {
        const hasQuantity = item.quantityCurrent > 0;
        const isMyDept = user?.department === 'PRODUCTION' || item.department === user?.department;
        return hasQuantity && isMyDept;
    });

    // Filtered lists
    const pendingItems = totalSurplusItems.filter(item => item.surplusAction === SurplusAction.NONE);
    const marketItems = totalSurplusItems.filter(item => item.surplusAction === SurplusAction.MARKETPLACE);
    const donationItems = totalSurplusItems.filter(item => item.surplusAction === SurplusAction.DONATION);
    const shortFilmItems = totalSurplusItems.filter(item => item.surplusAction === SurplusAction.SHORT_FILM);

    const setAction = (id: string, action: SurplusAction) => {
        setProject(prev => {
            const item = prev.items.find(i => i.id === id);
            if (item && action !== SurplusAction.NONE) {
                const actionName = action === SurplusAction.MARKETPLACE ? 'Stock Virtuel' : 'Dons';
                addNotification(
                    `♻️ Surplus : ${item.name} (${item.department}) déplacé vers ${actionName} par ${user?.name}`,
                    'STOCK_MOVE',
                    'PRODUCTION'
                );
            }
            return {
                ...prev,
                items: prev.items.map(item => item.id === id ? { ...item, surplusAction: action } : item)
            };
        });
    };

    
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
    const handleTransferClick = (item: any) => {
        setTransferModal({ item, quantity: 1 });
    };

    const confirmTransfer = () => {
        if (!transferModal) return;
        const { item, quantity } = transferModal;

        if (quantity >= item.quantityCurrent) {
            // Move everything
            setAction(item.id, SurplusAction.DONATION);
        } else {
            // Split logic
            setProject(prev => {
                const remainingQty = item.quantityCurrent - quantity;

                // 1. Update original item (keep remaining in Marketplace)
                const updatedItems = prev.items.map(i =>
                    i.id === item.id
                        ? { ...i, quantityCurrent: remainingQty }
                        : i
                );

                // 2. Create new item (send quantity to Donation)
                const newItem = {
                    ...item,
                    id: `${item.id}_donation_${Date.now()}`,
                    quantityCurrent: quantity,
                    quantityInitial: quantity,
                    surplusAction: SurplusAction.DONATION
                };

                addNotification(
                    `♻️ Don Partiel : ${item.name} (${quantity} unités) envoyé aux écoles`,
                    'STOCK_MOVE',
                    'PRODUCTION'
                );

                return { ...prev, items: [...updatedItems, newItem] };
            });
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
                        onClick={() => setView('shortFilm')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${view === 'shortFilm' ? 'bg-orange-600/20 text-orange-400 border border-orange-500/30' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Film className="h-4 w-4" /> Court-Métrage ({shortFilmItems.length})
                    </button>
                </div>
            </header>

            {/* Transfer Modal */}
            {transferModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-cinema-800 border border-cinema-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">Donner aux Écoles</h3>
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

            {/* OVERVIEW / MANAGEMENT VIEW */}
            {view === 'overview' && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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

                        <button onClick={() => setView('shortFilm')} className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 relative overflow-hidden group hover:bg-cinema-750 transition-all text-left">
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-orange-500 blur-[50px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-orange-500/20 text-orange-400 p-3 rounded-lg">
                                    <Film className="h-6 w-6" />
                                </div>
                                <span className="text-4xl font-bold text-white">{shortFilmItems.length}</span>
                            </div>
                            <h3 className="text-lg font-bold text-white">Court-Métrage</h3>
                            <p className="text-sm text-slate-400 mt-2">Soutien à la création jeune.</p>
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
                                                                onClick={() => setAction(item.id, SurplusAction.DONATION)}
                                                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border border-cinema-600 text-slate-400 hover:border-purple-500 hover:text-purple-400 hover:bg-purple-500/10"
                                                            >
                                                                <GraduationCap className="h-3 w-3" />
                                                                Vers Don
                                                            </button>
                                                        )}
                                                        {user?.department === 'PRODUCTION' && (
                                                            <button
                                                                onClick={() => setAction(item.id, SurplusAction.SHORT_FILM)}
                                                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border border-cinema-600 text-slate-400 hover:border-orange-500 hover:text-orange-400 hover:bg-orange-500/10"
                                                            >
                                                                <Film className="h-3 w-3" />
                                                                Vers Court-Métrage
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
                                <div key={item.id} className="p-4 flex justify-between items-center hover:bg-cinema-700/20 transition-colors">
                                    <div>
                                        <h4 className="text-white font-medium text-lg">{item.name}</h4>
                                        <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                                            <span className="bg-cinema-900 px-2 py-0.5 rounded border border-cinema-700 text-xs">{item.department}</span>
                                            <span>{item.status}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <span className="block text-2xl font-bold text-blue-400">{item.quantityCurrent}</span>
                                            <span className="text-xs text-slate-500 uppercase">{item.unit}</span>
                                        </div>
                                        {user?.department === 'PRODUCTION' && (
                                            <button
                                                onClick={() => handleTransferClick(item)}
                                                className="p-2 text-purple-500 hover:text-purple-300 hover:bg-purple-500/20 rounded-full transition-colors"
                                                title="Transférer vers Dons"
                                            >
                                                <GraduationCap className="h-5 w-5" />
                                            </button>
                                        )}
                                        {user?.department === 'PRODUCTION' && (
                                            <button
                                                onClick={() => setAction(item.id, SurplusAction.SHORT_FILM)}
                                                className="p-2 text-orange-500 hover:text-orange-300 hover:bg-orange-500/20 rounded-full transition-colors"
                                                title="Transférer vers Court-Métrage"
                                            >
                                                <Film className="h-5 w-5" />
                                            </button>
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
                                <div key={item.id} className="p-4 flex justify-between items-center hover:bg-cinema-700/20 transition-colors">
                                    <div>
                                        <h4 className="text-white font-medium text-lg">{item.name}</h4>
                                        <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                                            <span className="bg-cinema-900 px-2 py-0.5 rounded border border-cinema-700 text-xs">{item.department}</span>
                                            <span>{item.status}</span>
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
                                        {user?.department === 'PRODUCTION' && (
                                            <button
                                                onClick={() => setAction(item.id, SurplusAction.SHORT_FILM)}
                                                className="p-2 text-orange-500 hover:text-orange-300 hover:bg-orange-500/20 rounded-full transition-colors"
                                                title="Transférer vers Court-Métrage"
                                            >
                                                <Film className="h-5 w-5" />
                                            </button>
                                        )}
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

            {/* SHORT FILM LIST VIEW */}
            {view === 'shortFilm' && (
                <div className="bg-cinema-800 rounded-xl border border-cinema-700 overflow-hidden shadow-xl">
                    <div className="bg-orange-900/20 border-b border-orange-500/20 p-4">
                        <div className="flex items-center gap-3 text-orange-400">
                            <Film className="h-5 w-5" />
                            <span className="font-bold">Dons pour Courts-Métrages</span>
                        </div>
                    </div>
                    <div className="divide-y divide-cinema-700">
                        {shortFilmItems.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                                <Film className="h-12 w-12 mb-4 opacity-20" />
                                <p>Aucun article n'a été attribué aux courts-métrages pour le moment.</p>
                                <button onClick={() => setView('overview')} className="mt-4 text-orange-400 hover:text-orange-300 text-sm">Retourner à la gestion</button>
                            </div>
                        ) : (
                            shortFilmItems.map(item => (
                                <div key={item.id} className="p-4 flex justify-between items-center hover:bg-cinema-700/20 transition-colors">
                                    <div>
                                        <h4 className="text-white font-medium text-lg">{item.name}</h4>
                                        <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                                            <span className="bg-cinema-900 px-2 py-0.5 rounded border border-cinema-700 text-xs">{item.department}</span>
                                            <span>{item.status}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <span className="block text-2xl font-bold text-orange-400">{item.quantityCurrent}</span>
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
        </div>
    );
};
