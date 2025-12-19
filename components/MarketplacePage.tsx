import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { ShoppingBag, Tag, Search, Filter, Globe, ExternalLink, Plus } from 'lucide-react';
import { ConsumableItem, SurplusAction } from '../types';
import { SellItemModal } from './SellItemModal'; // Added

// Extended interface to include Project ID (added in Context query)
interface MarketplaceItem extends ConsumableItem {
    projectId?: string; // We'll try to populate this if possible, or infer
}

export const MarketplacePage: React.FC = () => {
    const { getGlobalMarketplaceItems, user } = useProject();
    const [items, setItems] = useState<MarketplaceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isSellModalOpen, setIsSellModalOpen] = useState(false); // Added

    useEffect(() => {
        const fetchItems = async () => {
            setLoading(true);
            const data = await getGlobalMarketplaceItems();
            console.log("Marketplace Items Received:", data);
            setItems(data);
            setLoading(false);
        };
        fetchItems();
    }, [getGlobalMarketplaceItems, isSellModalOpen]); // Refresh on close (after sell)

    const categories = ['all', ...Array.from(new Set(items.map(i => i.department).filter(Boolean)))];

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || item.department === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-2xl p-8 mb-8 shadow-xl border border-indigo-700/50">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Globe className="h-8 w-8 text-indigo-400" />
                            <h1 className="text-3xl font-bold text-white">Stock Virtuel Global</h1>
                        </div>
                        <p className="text-indigo-200 text-lg max-w-2xl">
                            Accédez aux surplus de toutes les productions connectées.
                            <br />
                            <span className="text-sm text-indigo-300 italic">Pour ajouter un article ici, utilisez "Valider vers Stock Virtuel" depuis votre Inventaire.</span>
                        </p>
                    </div>
                </div>
            </div>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-cinema-800 p-4 rounded-xl border border-cinema-700 top-20 sticky z-20 shadow-lg backdrop-blur-md bg-opacity-90">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-5 w-5" />
                    <input
                        type="text"
                        placeholder="Rechercher du matériel (ex: Gaffer, Bouteilles...)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                    <Filter className="text-slate-500 h-5 w-5 mr-2" />
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === cat
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                : 'bg-cinema-900 text-slate-400 hover:bg-cinema-700 hover:text-white'
                                }`}
                        >
                            {cat === 'all' ? 'Tout' : cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="text-center py-20 bg-cinema-800/30 rounded-2xl border border-cinema-700/50 border-dashed">
                    <ShoppingBag className="h-16 w-16 text-cinema-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-cinema-300 mb-2">Aucun article disponible</h3>
                    <p className="text-cinema-400 max-w-md mx-auto">
                        Le Stock Virtuel Global est vide pour le moment.
                        <br />
                        Les articles de votre inventaire marqués "Stock Virtuel" apparaîtront ici.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredItems.map(item => (
                        <div key={item.id} className="bg-cinema-800 rounded-2xl border border-cinema-700 overflow-hidden hover:border-indigo-500/50 transition-all hover:shadow-xl hover:-translate-y-1 group flex flex-col">
                            {/* Card Header (Dept) */}
                            <div className="p-4 bg-cinema-900/50 border-b border-cinema-700/50 flex justify-between items-center">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-cinema-800 px-2 py-1 rounded">
                                    {item.department}
                                </span>
                                {(item.price || 0) >= 0 && (
                                    <span className="text-yellow-400 font-bold">
                                        {item.price ? `${item.price} €` : 'Prix à dét.'}
                                    </span>
                                )}
                            </div>

                            {/* Card Body */}
                            <div className="p-5 flex-1 flex flex-col">
                                <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{item.name}</h3>

                                <div className="space-y-3 mt-2 flex-1">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400">Quantité :</span>
                                        <span className="text-white font-mono bg-cinema-700 px-2 py-0.5 rounded">
                                            {item.quantityCurrent || 1} {item.unit || 'unité'}
                                        </span>
                                    </div>

                                    <div className="pt-2">
                                        <div className="text-xs text-slate-500 mb-1">Status :</div>
                                        <div className="flex flex-wrap gap-2">
                                            {item.status === 'SOLD' ? (
                                                <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-md border border-red-500/30 uppercase font-bold">
                                                    Vendu
                                                </span>
                                            ) : (
                                                <span className="text-xs px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded-md border border-indigo-500/30">
                                                    {item.status || 'Disponible'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Action */}
                                <div className="mt-6 pt-4 border-t border-cinema-700/50">
                                    <button
                                        className="w-full bg-white text-black hover:bg-indigo-50 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-white/5 active:scale-95"
                                        onClick={() => window.alert("Fonctionnalité de mise en relation à venir ! Contactez l'admin pour le moment.")}
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                        Contacter
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <SellItemModal isOpen={isSellModalOpen} onClose={() => setIsSellModalOpen(false)} />
        </div>
    );
};
