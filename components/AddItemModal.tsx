import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Department, ConsumableItem, ItemStatus, SurplusAction } from '../types';
import { X, Plus, Leaf, List, Search, Upload, Loader2, AlertCircle, ToggleLeft, ToggleRight, Euro } from 'lucide-react';
import { analyzeOrderFile } from '../services/geminiService';
import { useProject } from '../context/ProjectContext';

// Popular items database for the scrolling banner
const POPULAR_ITEMS: Record<string, string[]> = {
    [Department.CAMERA]: [
        'Gaffer Tape Noir 50mm', 'Gaffer Tape Blanc 50mm', 'Gaffer Tape Noir 25mm', 'Camera Tape (toutes couleurs)',
        'Dust Off (Air Sec)', 'Pancro (Nettoyant Optique)', 'Lingettes Optiques (Kimwipes)', 'Microfibre',
        'Marqueur Ardoise (Noir/Rouge/Bleu)', 'Bongo Ties', 'Velcro Adhésif', 'Velcro Double Face',
        'Piles AA Lithium', 'Piles AAA Lithium', 'Piles 9V', 'Batteries CR123',
        'Charte de Gris', 'Clap', 'Stylo Nettoyage Objectif', 'Coton-tige Précision',
        'T-Marker', 'Coins Photo', 'Chamoisine', 'Housse Pluie Caméra'
    ],
    [Department.LUMIERE]: [
        'Gélatine CTB (Full/1/2/1/4)', 'Gélatine CTO (Full/1/2/1/4)', 'Gélatine Plus Green', 'Gélatine Minus Green',
        'Diffusion 216 (White Diffusion)', 'Diffusion 250 (Half White)', 'Diffusion 251 (Quarter White)',
        'Grid Cloth (Full/Lite/Quarter)', 'Opal Frost', 'Hampshire Frost',
        'Black Wrap (Cinefoil)', 'Ruban Élec (Barnier) Noir/Blanc/Couleurs',
        'C-47 (Pinces bois)', 'Spigot', 'Gants Chaleur', 'Domino', 'Scotch Aluminium',
        'J-Lar (Scotch Transparent)', 'Duvetine Noire', 'Cyc Tape', 'Spray Dulling (Matifiant)'
    ],
    [Department.MACHINERIE]: [
        'Gaffer Tape Fluo (Rose/Vert/Jaune/Orange)', 'Gaffer Tape Noir 50mm',
        'Sangle à cliquet', 'Cordelette Noire (Drisse)', 'Cordelette Blanche',
        'Tapis de sol', 'Wedges (Cales bois)', 'Pagnotte (Cales)', 'Ball de Tennis',
        'Chaîne de sécurité', 'Mousqueton', 'Poulie', 'Manille',
        'Duvetine', 'Borniol', 'Polyane (Bâche protection)', 'Couverture de son',
        'WD-40', 'Graisse Lithium', 'Nettoyant Freins'
    ],
    [Department.SON]: [
        'Piles AA Pro (Duracell/Varta)', 'Piles AAA Pro', 'Piles 9V',
        'Mousse Micro', 'Bonnette Anti-vent', 'Poils (Windjammer)',
        'Adhésif Double Face (Topstick)', 'Moleskin', 'Urgo (Pansements)',
        'Connecteurs XLR', 'Adaptateur Jack', 'Câble Micro',
        'Lingettes Désinfectantes', 'Sangle Velcro', 'Ceinture Émetteur'
    ],
    [Department.MAQUILLAGE]: [
        'Éponges Latex', 'Houpette', 'Coton Démaquillant', 'Lingettes Bébé', 'Kleenex',
        'Laque Cheveux', 'Gel Coiffant', 'Sang Artificiel', 'Latex Liquide',
        'Kleener (Nettoyant Pinceaux)', 'Alcool 70°', 'Cotons-tiges', 'Bâtonnets Biseautés',
        'Fond de teint', 'Poudre Matifiante', 'Colle à postiche (Spirit Gum)', 'Dissolvant',
        'Miroir Main', 'Serviettes Invité'
    ],
    [Department.COIFFURE]: [
        'Épingles à cheveux (Neige/Bronze/Noir)', 'Épingles à chignon', 'Pinces Kirby',
        'Laque Forte', 'Laque Souple', 'Shampoing Sec', 'Mousse Volume', 'Cire Coiffante',
        'Brosses Jetables', 'Peigne à queue', 'Élastiques (Transparents/Noirs)', 'Filet à cheveux',
        'Capes de coupe', 'Vaporisateur Eau'
    ],
    [Department.COSTUME]: [
        'Épingles de sûreté (Nourrice)', 'Épingles Tête Verre',
        'Cintres Métal', 'Cintres Bois', 'Cintres Pince',
        'Eau Déminéralisée', 'Brosse Adhésive', 'Recharges Brosse Adhésive',
        'Détachant Express (K2R)', 'Lingettes Anti-décoloration',
        'Semelles', 'Lacets', 'Talonnettes',
        'Fil à coudre (Noir/Blanc/Gris)', 'Boutons assortis', 'Ruban Mètre', 'Craie Tailleur',
        'Défroisseur Vapeur', 'Sacs Housse Costume'
    ],
    [Department.DECO]: [
        'Patafix (Blanche/Jaune)', 'Fil de fer', 'Fil Nylon',
        'Peinture Noire Mat', 'Peinture Blanche', 'Bombes Peinture (Divers)',
        'Vis à bois', 'Clous', 'Crochets X',
        'Scotch Double Face Moquette', 'Scotch Double Face Mousse', 'Scotch Masquage (Tesa)',
        'Carton Plume', 'Cutter', 'Lames Cutter', 'Tapis de découpe',
        'Colle à bois', 'Colle Néoprène', 'Colle Spray (3M 77)',
        'Papier de verre', 'Chiffons', 'White Spirit', 'Acétone'
    ],
    [Department.REGIE]: [
        'Gobelets Carton', 'Touillettes bois', 'Sucre (Morceaux/Poudre)', 'Café Moulu', 'Thé/Infusions',
        'Bouteilles Eau 50cl', 'Fontaine Eau',
        'Sacs Poubelle 100L', 'Sacs Poubelle 50L', 'Sacs Gravats',
        'Essuie-Tout', 'Papier Toilette', 'Mouchoirs',
        'Gel Hydroalcoolique', 'Savon Main', 'Liquide Vaisselle', 'Éponges',
        'Sacs Ziploc (Petit/Moyen/Grand)', 'Film Étirable', 'Papier Alu',
        'Cendriers', 'Balai', 'Pelle', 'Seau'
    ],
    [Department.ACCESSOIRE]: [
        'Briquet', 'Allumettes', 'Cendrier Portable',
        'Stylos Bic (Noir/Bleu)', 'Marqueurs Indélébiles', 'Surligneurs',
        'Carnet Notes', 'Bloc-notes', 'Post-it',
        'Colle Super Glue', 'Piles AAA', 'Piles AA',
        'Scotch Transparent', 'Scotch Emballage',
        'Ciseaux', 'Couteau Suisse', 'Lampe Torche', 'Frontale'
    ]
};

interface AddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose }) => {
    const { setProject, currentDept, project, addNotification, user, addItem, catalogItems, addToCatalog, getGlobalMarketplaceItems } = useProject();

    const [newItemName, setNewItemName] = useState('');
    const [newItemQty, setNewItemQty] = useState(1);
    // const [selectedDept, setSelectedDept] = useState<Department>(Department.CAMERA); // Removed: Use currentDept
    const [suggestion, setSuggestion] = useState<string | null>(null);
    const [loadingSuggestion, setLoadingSuggestion] = useState(false);
    const [isCatalogOpen, setIsCatalogOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // New States for "Already Bought"
    const [isAlreadyBought, setIsAlreadyBought] = useState(false);
    const [customPrice, setCustomPrice] = useState<string>(''); // string to handle empty state better input
    const [catalogMode, setCatalogMode] = useState<'NEW' | 'ECO'>('NEW');

    const suggestionsListRef = useRef<HTMLDivElement>(null);

    const [marketplaceItems, setMarketplaceItems] = useState<any[]>([]);

    useEffect(() => {
        const fetchMarketplace = async () => {
            if (getGlobalMarketplaceItems && isOpen) {
                const items = await getGlobalMarketplaceItems();
                setMarketplaceItems(items);
            }
        };
        fetchMarketplace();
    }, [getGlobalMarketplaceItems, isOpen]);

    // Flatten all items for global autocomplete with case-insensitive deduplication
    const allCatalogItems = useMemo(() => {
        const itemMap = new Map<string, string>(); // lowercase -> display name

        const addToMap = (name: string) => {
            if (!name) return;
            const key = name.trim().toLowerCase();
            if (!itemMap.has(key)) {
                itemMap.set(key, name.trim());
            }
        };

        // 1. Popular Items (Standard/Cleanest names first)
        Object.values(POPULAR_ITEMS).forEach(items => items.forEach(addToMap));

        // 2. Global Catalog (Next preferred source)
        (catalogItems || []).forEach(i => addToMap(i.name));

        // 3. Project History (User typed, might be less clean)
        (project?.items || []).forEach(i => addToMap(i.name));

        // 4. Marketplace Items (ensure they are findable even if not in catalog)
        (marketplaceItems || []).forEach(i => {
            if (i.quantityCurrent > 0 && i.projectId !== project.id) {
                addToMap(i.name);
            }
        });

        return Array.from(itemMap.values()).sort((a, b) => a.localeCompare(b));
    }, [project.items, catalogItems, marketplaceItems, project.id]);

    // Get ALL suggestions for Global Catalog (Flattend & Sorted)
    const catalogItemsList = useMemo(() => {
        const itemMap = new Map<string, string>();
        const addToMap = (name: string) => {
            if (!name) return;
            const key = name.trim().toLowerCase();
            if (!itemMap.has(key)) {
                itemMap.set(key, name.trim());
            }
        };

        // 1. Base Catalog (All Departments)
        Object.values(POPULAR_ITEMS).forEach(items => items.forEach(addToMap));

        // 2. Global Catalog Items (All)
        (catalogItems || []).forEach(item => addToMap(item.name));

        // 3. History Items (All)
        (project?.items || []).forEach(item => addToMap(item.name));

        return Array.from(itemMap.values()).sort((a, b) => a.localeCompare(b));
    }, [project.items, catalogItems]);

    // Filter suggestions when typing
    useEffect(() => {
        if (!newItemName || newItemName.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const lowerInput = newItemName.toLowerCase();
        const filtered = allCatalogItems.filter(item =>
            item.toLowerCase().includes(lowerInput)
        ).slice(0, 50); // Increased limit to 50

        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
        setSelectedIndex(-1); // Reset selection on new search
    }, [newItemName, allCatalogItems]);

    const selectSuggestion = (name: string) => {
        setNewItemName(name);
        setShowSuggestions(false);
        setSelectedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showSuggestions || suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            setSelectedIndex(prev => (prev > -1 ? prev - 1 : -1));
        } else if (e.key === 'Enter') {
            if (selectedIndex >= 0) {
                e.preventDefault();
                e.stopPropagation();
                selectSuggestion(suggestions[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setShowSuggestions(false);
        }
    };

    // Auto-scroll to selected item
    useEffect(() => {
        if (selectedIndex >= 0 && suggestionsListRef.current) {
            const list = suggestionsListRef.current;
            const element = list.children[selectedIndex] as HTMLElement;
            if (element) {
                element.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    // ... (rest of the file)



    // Sync form department -> Removed logic as we purely rely on currentDept checking in handleAddItem
    // useEffect(() => {
    //     if (isOpen && currentDept !== 'PRODUCTION') {
    //         setSelectedDept(currentDept as Department);
    //     }
    // }, [isOpen, currentDept]);

    if (!isOpen) return null;



    const handleAddItem = async (shouldClose: boolean = true) => {
        if (!newItemName) return;
        setIsSubmitting(true);

        // Determine final department:
        // Always use the user's current logged-in department (or Production if they are Prod)
        const finalDepartment = currentDept as (Department | 'PRODUCTION');

        const newItem: ConsumableItem = {
            id: Math.random().toString(36).substr(2, 9), // Will be ignored by addItem
            name: newItemName,
            department: finalDepartment,
            quantityInitial: newItemQty,
            quantityCurrent: newItemQty,
            unit: 'unités',
            status: ItemStatus.NEW,
            surplusAction: SurplusAction.NONE,
            purchased: isAlreadyBought, // Directly to Stock if true
            price: (isAlreadyBought && customPrice) ? parseFloat(customPrice.replace(',', '.')) : 0,
            originalPrice: (isAlreadyBought && customPrice) ? parseFloat(customPrice.replace(',', '.')) : 0
        };

        // Use Firestore Action instead of local state
        if (addItem) {
            await addItem(newItem);

            // Add to Global Catalog for future suggestions
            if (addToCatalog) {
                addToCatalog(newItemName, finalDepartment);
            }
        } else {
            console.error("addItem function is missing from context!");
            alert("Erreur interne : Impossible d'ajouter l'article (Fonction manquante).");
            setIsSubmitting(false);
            return;
        }

        // Notification is now handled inside addItem (or we can keep it here if we remove it from context)
        // For now, let's rely on context's addItem notification to avoid duplicates if we added it there.
        // Checking context... yes, addItem adds a notification.

        setIsSubmitting(false);

        // Reset and close
        setNewItemName('');
        setNewItemQty(1);
        setSuggestion(null);
        setIsAlreadyBought(false);
        setCustomPrice('');
        if (shouldClose) {
            onClose();
        }
    };




    const selectItemFromCatalog = (name: string) => {
        setNewItemName(name);
        setIsCatalogOpen(false);
    };


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-cinema-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-cinema-600 flex flex-col relative">

                {/* Header */}
                <div className="p-6 border-b border-cinema-700 flex justify-between items-center bg-cinema-900 rounded-t-2xl">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Plus className="h-6 w-6 text-eco-400" />
                        Nouvelle Commande
                    </h3>
                    <div className="flex items-center gap-2">
                        <label className="cursor-pointer bg-cinema-700 hover:bg-cinema-600 text-slate-200 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors border border-cinema-600">
                            {loadingSuggestion ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            <span className="hidden sm:inline">Scanner / Importer (PDF, Photo)</span>
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*,.pdf,.csv,.txt"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;

                                    setError(null); // Clear previous errors

                                    if (file.size > 20 * 1024 * 1024) {
                                        setError("Le fichier est trop volumineux (max 20MB).");
                                        e.target.value = '';
                                        return;
                                    }

                                    // Reset input so the same file can be selected again if needed
                                    e.target.value = '';

                                    setLoadingSuggestion(true);
                                    const { items, rawResponse } = await analyzeOrderFile(file);

                                    if (items.length > 0) {
                                        // Add all items found
                                        items.forEach(item => {
                                            if (item.name) {
                                                const targetDept = currentDept as (Department | 'PRODUCTION');

                                                const newItem: ConsumableItem = {
                                                    id: Math.random().toString(36).substr(2, 9),
                                                    name: item.name,
                                                    department: targetDept,
                                                    quantityInitial: item.quantityInitial || 1,
                                                    quantityCurrent: item.quantityInitial || 1,
                                                    unit: item.unit || 'unités',
                                                    status: ItemStatus.NEW,
                                                    surplusAction: SurplusAction.NONE,
                                                    purchased: false
                                                };
                                                setProject(prev => ({ ...prev, items: [...prev.items, newItem] }));
                                            }
                                        });

                                        addNotification(
                                            `Scan terminé : ${items.length} articles ajoutés par ${user?.name}`,
                                            'ORDER',
                                            'PRODUCTION'
                                        );
                                        onClose();
                                    } else {
                                        setError(`Aucun article identifié. Réponse brute de l'IA : ${rawResponse.substring(0, 200)}...`);
                                    }
                                    setLoadingSuggestion(false);
                                }}
                            />
                        </label>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-cinema-700 rounded-full transition-colors">
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mx-6 mt-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="text-sm font-medium text-red-400">Échec de l'import</h4>
                            <p className="text-xs text-red-300 mt-1">{error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="p-6 space-y-6">


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Department Selector Removed - Items are ordered for the current user's department */}
                        <div>
                            <p className="block text-xs font-medium text-slate-500 mb-1 uppercase">Département demandeur</p>
                            <div className="w-full bg-cinema-900/50 border border-cinema-700/50 rounded-lg px-4 py-2.5 text-slate-400 cursor-not-allowed">
                                {currentDept}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Quantité</label>
                            <input
                                type="number"
                                min="1"
                                value={newItemQty}
                                onChange={(e) => setNewItemQty(parseInt(e.target.value))}
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-eco-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Already Bought Toggle & Price */}
                    <div className="bg-cinema-900/30 border border-cinema-700/50 rounded-xl p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-slate-300 font-medium">J'ai déjà cet article (Achat direct)</label>
                            <button
                                onClick={() => setIsAlreadyBought(!isAlreadyBought)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${isAlreadyBought ? 'bg-eco-600' : 'bg-cinema-700'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isAlreadyBought ? 'translate-x-6' : ''}`} />
                            </button>
                        </div>

                        {isAlreadyBought && (
                            <div className="animate-in slide-in-from-top-2">
                                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Prix d'achat (Total estimé) €</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00 €"
                                    value={customPrice}
                                    onChange={(e) => setCustomPrice(e.target.value)}
                                    className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-eco-500 focus:outline-none"
                                />
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Nom du consommable</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder="Ex: Gaffer Tape Noir 50mm"
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-eco-500 focus:outline-none"
                                    autoComplete="off"
                                    onFocus={() => {
                                        if (suggestions.length > 0) setShowSuggestions(true);
                                    }}
                                    onBlur={() => {
                                        // Delay hiding to allow click
                                        setTimeout(() => setShowSuggestions(false), 200);
                                    }}
                                    onKeyDown={handleKeyDown}
                                />
                                {showSuggestions && (
                                    <div
                                        ref={suggestionsListRef}
                                        className="absolute z-10 w-full mt-1 bg-cinema-800 border border-cinema-600 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 custom-scrollbar"
                                    >
                                        {suggestions.map((suggestion, idx) => {
                                            const isEco = marketplaceItems.some(i => i.name.toLowerCase().trim() === suggestion.toLowerCase().trim() && i.projectId !== project.id && i.quantityCurrent > 0);
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => selectSuggestion(suggestion)}
                                                    className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 ${idx === selectedIndex
                                                        ? 'bg-eco-600 text-white font-medium'
                                                        : 'text-slate-200 hover:bg-cinema-700 hover:text-white'
                                                        }`}
                                                >
                                                    <Search className={`h-3 w-3 ${idx === selectedIndex ? 'text-white' : 'text-slate-500'}`} />
                                                    <span className="flex-1 truncate">{suggestion}</span>
                                                    {isEco && (
                                                        <span className="text-[10px] bg-emerald-500 text-black px-1.5 py-0.5 rounded-full font-bold ml-2">
                                                            ECO
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {loadingSuggestion && <Leaf className="absolute right-3 top-3 h-4 w-4 text-eco-400 animate-spin" />}
                            </div>
                            <button
                                onClick={() => setIsCatalogOpen(true)}
                                className="bg-cinema-700 hover:bg-cinema-600 text-slate-200 px-3 rounded-lg border border-cinema-600 transition-colors flex items-center justify-center"
                                title="Ouvrir le catalogue"
                            >
                                <List className="h-5 w-5" />
                            </button>
                        </div>
                    </div>


                </div>

                {/* Footer */}
                <div className="p-6 border-t border-cinema-700 bg-cinema-900/50 flex justify-end gap-3 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-cinema-700 transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={() => handleAddItem()}
                        disabled={!newItemName || isSubmitting}
                        className="bg-eco-600 hover:bg-eco-500 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-eco-900/20 flex items-center gap-2"
                    >
                        {isSubmitting ? 'Envoi...' : 'Ajouter'}
                    </button>
                    <button
                        onClick={() => handleAddItem(false)}
                        disabled={!newItemName || isSubmitting}
                        className="bg-cinema-700 hover:bg-cinema-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-cinema-600 flex items-center gap-2"
                        title="Ajouter et rester sur la fenêtre pour saisir un autre article"
                    >
                        <Plus className="h-4 w-4" />
                        + 1 Autre
                    </button>
                </div>

                {/* Nested Catalog Modal */}
                {isCatalogOpen && (
                    <div className="absolute inset-0 z-50 bg-cinema-800 flex flex-col animate-in slide-in-from-bottom-10 rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-cinema-700 flex justify-between items-center bg-cinema-900">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <List className="h-5 w-5 text-eco-400" />
                                Catalogue Global
                            </h3>
                            <button onClick={() => setIsCatalogOpen(false)} className="p-1 text-slate-400 hover:text-white">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                            {catalogItemsList.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <Search className="h-10 w-10 mx-auto mb-4 opacity-20" />
                                    <p>Aucun article.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {catalogItemsList.map((item, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => selectItemFromCatalog(item)}
                                            className="p-3 bg-cinema-900 border border-cinema-700 rounded-lg hover:border-eco-500 hover:bg-cinema-700 transition-all text-left text-sm text-slate-200"
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
