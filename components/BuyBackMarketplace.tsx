import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Department } from '../types';
import { ShoppingBag, Tag, Euro, User, CheckSquare, Square, Plus, Image as ImageIcon } from 'lucide-react';
import { SellItemModal } from './SellItemModal';

export const BuyBackMarketplace: React.FC = () => {
    const { buyBackItems, toggleBuyBackReservation, user, currentDept } = useProject();
    const [isSellModalOpen, setIsSellModalOpen] = useState(false);

    if (!buyBackItems) {
        return <div className="p-8 text-center text-red-400">Erreur de chargement des données (buyBackItems manquant). Veuillez rafraîchir la page.</div>;
    }

    const sortedItems = [...buyBackItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalSold = buyBackItems.filter(i => i.status === 'SOLD').length;
    const totalRevenue = buyBackItems
        .filter(i => i.status === 'RESERVED' || i.status === 'SOLD')
        .reduce((acc, item) => acc + item.price, 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <ShoppingBag className="h-8 w-8 text-yellow-400" />
                        Zone de Rachat / Revente
                    </h2>
                    <p className="text-slate-400 mt-1">
                        Rachetez du matériel aux autres départements ou vendez vos surplus.
                    </p>
                </div>

                <button
                    onClick={() => setIsSellModalOpen(true)}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-yellow-500/20"
                >
                    <Plus className="h-5 w-5" />
                    Vendre un article
                </button>
            </header>

            {/* Production Stats */}
            {user?.department === 'PRODUCTION' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-cinema-800 p-4 rounded-xl border border-cinema-700">
                        <div className="text-slate-400 text-sm uppercase font-bold tracking-wider mb-1">Articles en Vente</div>
                        <div className="text-2xl font-bold text-white">{buyBackItems.length}</div>
                    </div>
                    <div className="bg-cinema-800 p-4 rounded-xl border border-cinema-700">
                        <div className="text-slate-400 text-sm uppercase font-bold tracking-wider mb-1">Articles Réservés</div>
                        <div className="text-2xl font-bold text-yellow-400">
                            {buyBackItems.filter(i => i.status === 'RESERVED').length}
                        </div>
                    </div>
                    <div className="bg-cinema-800 p-4 rounded-xl border border-cinema-700">
                        <div className="text-slate-400 text-sm uppercase font-bold tracking-wider mb-1">Montant Récupéré</div>
                        <div className="text-2xl font-bold text-green-400">{totalRevenue} €</div>
                    </div>
                </div>
            )}

            {/* Marketplace Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedItems.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-500 bg-cinema-800/50 rounded-xl border border-cinema-700 border-dashed">
                        <Tag className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>Aucun article en vente pour le moment.</p>
                    </div>
                ) : (
                    sortedItems.map(item => (
                        <div 
                            key={item.id} 
                            className={`bg-cinema-800 rounded-xl border overflow-hidden transition-all hover:border-yellow-500/30 group ${
                                item.status === 'RESERVED' ? 'border-yellow-500/50 opacity-75' : 'border-cinema-700'
                            }`}
                        >
                            {/* Image Area */}
                            <div className="aspect-video bg-cinema-900 relative overflow-hidden">
                                {item.photo ? (
                                    <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                                        <ImageIcon className="h-12 w-12" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2">
                                    <span className="bg-cinema-900/90 text-white px-2 py-1 rounded text-xs font-bold border border-cinema-700">
                                        {item.sellerDepartment}
                                    </span>
                                </div>
                                {item.status === 'RESERVED' && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                        <div className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold transform -rotate-6 shadow-xl border-2 border-white">
                                            RÉSERVÉ
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-4 space-y-4">
                                <div>
                                    <div className="flex justify-between items-start gap-2">
                                        <h3 className="text-lg font-bold text-white leading-tight">{item.name}</h3>
                                        <div className="text-xl font-bold text-yellow-400 whitespace-nowrap">{item.price} €</div>
                                    </div>
                                    {item.originalPrice && (
                                        <p className="text-xs text-slate-500 line-through">Prix d'achat : {item.originalPrice} €</p>
                                    )}
                                </div>

                                {item.description && (
                                    <div className="bg-cinema-900/50 p-3 rounded-lg text-sm text-slate-300 italic border border-cinema-700/50">
                                        "{item.description}"
                                    </div>
                                )}

                                {/* Footer / Actions */}
                                <div className="pt-4 border-t border-cinema-700 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span>Mis en vente le {new Date(item.date).toLocaleDateString()}</span>
                                    </div>

                                    <button
                                        onClick={() => toggleBuyBackReservation(item.id, user?.department || 'PRODUCTION')}
                                        disabled={item.status === 'RESERVED' && item.reservedBy !== user?.department && user?.department !== 'PRODUCTION'}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                            item.status === 'RESERVED'
                                                ? item.reservedBy === user?.department
                                                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 hover:bg-yellow-500/30' // Reserved by me -> Click to unreserve
                                                    : 'bg-cinema-900 text-slate-500 cursor-not-allowed' // Reserved by others
                                                : 'bg-cinema-700 hover:bg-yellow-500 hover:text-black text-white' // Available
                                        }`}
                                    >
                                        {item.status === 'RESERVED' ? (
                                            <>
                                                <CheckSquare className="h-4 w-4" />
                                                {item.reservedBy === user?.department ? 'Réservé (Annuler)' : `Réservé par ${item.reservedBy}`}
                                            </>
                                        ) : (
                                            <>
                                                <Square className="h-4 w-4" />
                                                Réserver
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <SellItemModal isOpen={isSellModalOpen} onClose={() => setIsSellModalOpen(false)} />
        </div>
    );
};
