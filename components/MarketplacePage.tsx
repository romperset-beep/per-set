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

    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [contactModalOpen, setContactModalOpen] = useState(false);
    const [activeContactItems, setActiveContactItems] = useState<MarketplaceItem[]>([]);
    const [contactQuantities, setContactQuantities] = useState<Record<string, number>>({});

    useEffect(() => {
        const fetchItems = async () => {
            setLoading(true);
            const data = await getGlobalMarketplaceItems();
            setItems(data);
            setLoading(false);
        };
        fetchItems();
    }, [getGlobalMarketplaceItems, isSellModalOpen]);

    const categories = ['all', ...Array.from(new Set(items.map(i => i.department).filter(Boolean)))];

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || item.department === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const toggleSelection = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation(); // Prevent card click
        const newSet = new Set(selectedItems);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedItems(newSet);
    };

    const handleBatchContact = () => {
        const selected = items.filter(i => selectedItems.has(i.id));
        setActiveContactItems(selected);

        // Init quantities to max
        const quantities: Record<string, number> = {};
        selected.forEach(i => quantities[i.id] = i.quantityCurrent);
        setContactQuantities(quantities);

        setContactModalOpen(true);
    };

    const handleSingleContact = (item: MarketplaceItem, e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveContactItems([item]);

        // Init quantity
        setContactQuantities({ [item.id]: item.quantityCurrent });

        setContactModalOpen(true);
    };

    const handleQuantityChange = (id: string, val: number, max: number) => {
        if (val < 1) val = 1;
        if (val > max) val = max;
        setContactQuantities(prev => ({ ...prev, [id]: val }));
    };

    const handleMailContact = () => {
        const subject = encodeURIComponent("Intérêt rachat matériel - A Better Set");
        const itemList = activeContactItems.map(i => {
            const qty = contactQuantities[i.id] || i.quantityCurrent;
            return `- ${i.name} (x${qty} / ${i.quantityCurrent}) - Prix : ${i.price || '?'}€/u`;
        }).join('\n');

        const body = encodeURIComponent(`Bonjour,\n\nJe suis intéressé par le rachat des articles suivants :\n\n${itemList}\n\nMerci de me recontacter.\n\nCordialement,\n${user?.name || ''}`);
        window.location.href = `mailto:rachats@abetterset.com?subject=${subject}&body=${body}`;
        setContactModalOpen(false);
    };

    const handlePhoneContact = () => {
        alert("Contact : Romain Perset\nTél : 06 80 59 12 71");
        setContactModalOpen(false); // Or keep open? User request said "appear on screen", alert is simplest.
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
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

            {/* Sticky Bulk Action Bar (if items selected) */}
            {selectedItems.size > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-indigo-600 text-white px-8 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5">
                    <span className="font-bold">{selectedItems.size} article(s) sélectionné(s)</span>
                    <button
                        onClick={handleBatchContact}
                        className="bg-white text-indigo-700 px-4 py-1.5 rounded-full font-bold hover:bg-indigo-50 transition-colors flex items-center gap-2"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Contacter pour le lot
                    </button>
                    <button
                        onClick={() => setSelectedItems(new Set())}
                        className="p-1 hover:bg-indigo-500 rounded-full"
                    >
                        ✕
                    </button>
                </div>
            )}

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
                        <div
                            key={item.id}
                            onClick={() => toggleSelection(item.id)}
                            className={`bg-cinema-800 rounded-2xl border overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 group flex flex-col cursor-pointer relative ${selectedItems.has(item.id)
                                ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-indigo-500/20'
                                : 'border-cinema-700 hover:border-indigo-500/50'
                                }`}
                        >
                            {/* Checkbox Overlay */}
                            <div className="absolute top-4 right-4 z-10">
                                <div className={`h-6 w-6 rounded-md border flex items-center justify-center transition-colors ${selectedItems.has(item.id)
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'bg-cinema-900/80 border-cinema-600 text-transparent hover:border-indigo-400'
                                    }`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                            </div>

                            {/* Card Header (Dept) */}
                            <div className="p-4 bg-cinema-900/50 border-b border-cinema-700/50 flex justify-between items-center">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-cinema-800 px-2 py-1 rounded">
                                    {item.department}
                                </span>
                                {(item.price || 0) >= 0 && (
                                    <span className={`font-bold pr-8 ${item.price ? 'text-yellow-400' : 'text-slate-500'}`}>
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
                                        {/* Status moved here */}
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
                                        onClick={(e) => handleSingleContact(item, e)}
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

            {/* Contact Method Modal */}
            {contactModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-cinema-800 rounded-2xl border border-cinema-700 p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setContactModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white"
                        >
                            ✕
                        </button>

                        <h2 className="text-2xl font-bold text-white mb-2 text-center">Contacter le vendeur</h2>
                        <p className="text-slate-300 text-center mb-6">
                            Vérifiez votre sélection avant de choisir le moyen de contact.
                        </p>

                        {/* Order Summary with Quantity Input */}
                        <div className="bg-cinema-900/50 rounded-xl p-4 mb-6 space-y-3 max-h-60 overflow-y-auto border border-cinema-700/50">
                            {activeContactItems.map(item => (
                                <div key={item.id} className="flex justify-between items-center gap-4 bg-cinema-800 p-3 rounded-lg border border-cinema-700">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-white truncate">{item.name}</p>
                                        <p className="text-xs text-slate-400">Stock : {item.quantityCurrent} {item.unit}</p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {item.quantityCurrent > 1 ? (
                                            <div className="flex items-center bg-cinema-900 rounded-lg border border-cinema-600">
                                                <button
                                                    onClick={() => handleQuantityChange(item.id, (contactQuantities[item.id] || item.quantityCurrent) - 1, item.quantityCurrent)}
                                                    className="px-2 py-1 text-slate-300 hover:text-white hover:bg-cinema-700 rounded-l-lg"
                                                >
                                                    -
                                                </button>
                                                <input
                                                    type="number"
                                                    value={contactQuantities[item.id] || item.quantityCurrent}
                                                    onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1, item.quantityCurrent)}
                                                    className="w-12 text-center bg-transparent text-white font-mono text-sm focus:outline-none py-1"
                                                    min="1"
                                                    max={item.quantityCurrent}
                                                />
                                                <button
                                                    onClick={() => handleQuantityChange(item.id, (contactQuantities[item.id] || item.quantityCurrent) + 1, item.quantityCurrent)}
                                                    className="px-2 py-1 text-slate-300 hover:text-white hover:bg-cinema-700 rounded-r-lg"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-sm font-mono text-slate-400 px-3">x1</span>
                                        )}
                                        <span className="text-yellow-400 font-bold w-16 text-right">
                                            {item.price ? `${(item.price * (contactQuantities[item.id] || item.quantityCurrent))}€` : '-'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {/* Total Estimate */}
                            <div className="pt-2 border-t border-cinema-700 flex justify-end text-sm">
                                <span className="text-slate-400 mr-2">Total estimé :</span>
                                <span className="text-yellow-400 font-bold">
                                    {activeContactItems.reduce((acc, i) => acc + ((i.price || 0) * (contactQuantities[i.id] || i.quantityCurrent)), 0)} €
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={handleMailContact}
                                className="flex flex-col items-center justify-center gap-3 p-6 bg-cinema-700/50 border border-cinema-600 rounded-xl hover:bg-indigo-600 hover:border-indigo-500 hover:scale-105 transition-all group"
                            >
                                <div className="p-3 bg-cinema-800 rounded-full group-hover:bg-indigo-500 transition-colors">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                </div>
                                <span className="font-bold text-white">Par Email</span>
                            </button>

                            <button
                                onClick={handlePhoneContact}
                                className="flex flex-col items-center justify-center gap-3 p-6 bg-cinema-700/50 border border-cinema-600 rounded-xl hover:bg-green-600 hover:border-green-500 hover:scale-105 transition-all group"
                            >
                                <div className="p-3 bg-cinema-800 rounded-full group-hover:bg-green-500 transition-colors">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                </div>
                                <span className="font-bold text-white">Par Téléphone</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}


            <SellItemModal isOpen={isSellModalOpen} onClose={() => setIsSellModalOpen(false)} />
        </div >
    );
};
