import React, { useState, useEffect } from 'react';
import { Department, ConsumableItem, ItemStatus, SurplusAction } from '../types';
import { X, Plus, Leaf, List, Search, Upload, Loader2, AlertCircle } from 'lucide-react';
import { suggestEcoAlternatives, analyzeOrderFile } from '../services/geminiService';
import { useProject } from '../context/ProjectContext';

// Popular items database for the scrolling banner
const POPULAR_ITEMS: Record<string, string[]> = {
    [Department.CAMERA]: ['Gaffer Tape Noir 50mm', 'Dust Off (Air Sec)', 'Lingettes Optiques', 'Marqueur Ardoise', 'Bongo Ties', 'Microfibre', 'Piles AA Lithium', 'Velcro Adhésif', 'Charte de Gris', 'Clap', 'Stylo Nettoyage Objectif'],
    [Department.LUMIERE]: ['Gélatine CTB 1/2', 'Gélatine CTO 1/4', 'Black Wrap', 'C-47 (Pinces bois)', 'Ruban Élec (Barnier)', 'Diffusion 216', 'Spigot', 'Gants Chaleur', 'Cinefoil', 'Domino', 'Scotch Aluminium'],
    [Department.MACHINERIE]: ['Sangle à cliquet', 'Cordelette Noire', 'Tapis de sol', 'Wedges (Cales)', 'Ball de Tennis', 'Gaffer Tape Fluo', 'Chaîne de sécurité', 'Mousqueton', 'Poulie', 'Duvetine'],
    [Department.SON]: ['Piles AA Pro', 'Piles 9V', 'Mousse Micro', 'Adhésif Double Face', 'Moleskin', 'Connecteurs XLR', 'Lingettes Désinfectantes', 'Bonnette Anti-vent', 'Sangle Velcro', 'Adaptateur Jack'],
    [Department.MAQUILLAGE]: ['Éponges Latex', 'Coton Démaquillant', 'Lingettes Bébé', 'Laque Cheveux', 'Sang Artificiel', 'Kleener', 'Cotons-tiges', 'Fond de teint', 'Poudre Matifiante', 'Colle à postiche'],
    [Department.COIFFURE]: ['Épingles à cheveux', 'Laque Forte', 'Brosses Jetables', 'Élastiques', 'Filet à cheveux', 'Shampoing Sec', 'Gel Coiffant', 'Peigne à queue', 'Mousse Volume'],
    [Department.COSTUME]: ['Épingles de sûreté', 'Cintres Métal', 'Eau Déminéralisée', 'Brosse Adhésive', 'Détachant Express', 'Semelles', 'Fil à coudre (Noir/Blanc)', 'Boutons assortis', 'Ruban Mètre'],
    [Department.DECO]: ['Patafix', 'Fil de fer', 'Peinture Noire Mat', 'Vis à bois', 'Scotch Double Face Moquette', 'Carton Plume', 'Cutter', 'Lames Cutter', 'Colle à bois', 'Clous'],
    [Department.REGIE]: ['Gobelets Carton', 'Café Moulu', 'Sacs Poubelle 100L', 'Essuie-Tout', 'Papier Toilette', 'Bouteilles Eau 50cl', 'Gel Hydroalcoolique', 'Sucre', 'Touillettes bois', 'Sacs Ziploc'],
    [Department.ACCESSOIRE]: ['Briquet', 'Cendrier Portable', 'Stylos Bic', 'Carnet Notes', 'Colle Super Glue', 'Piles AAA', 'Scotch Transparent', 'Ciseaux', 'Lampe Torche']
};

interface AddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose }) => {
    const { setProject, currentDept, project, addNotification, user } = useProject();

    const [newItemName, setNewItemName] = useState('');
    const [newItemQty, setNewItemQty] = useState(1);
    const [selectedDept, setSelectedDept] = useState<Department>(Department.CAMERA);
    const [suggestion, setSuggestion] = useState<string | null>(null);
    const [loadingSuggestion, setLoadingSuggestion] = useState(false);
    const [isCatalogOpen, setIsCatalogOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sync form department with global department if not Production
    useEffect(() => {
        if (isOpen && currentDept !== 'PRODUCTION') {
            setSelectedDept(currentDept as Department);
        }
    }, [isOpen, currentDept]);

    if (!isOpen) return null;

    const handleAddItem = () => {
        if (!newItemName) return;

        const newItem: ConsumableItem = {
            id: Math.random().toString(36).substr(2, 9),
            name: newItemName,
            department: selectedDept,
            quantityInitial: newItemQty,
            quantityCurrent: newItemQty,
            unit: 'unités',
            status: ItemStatus.NEW,
            surplusAction: SurplusAction.NONE,
            purchased: false // Request/Need
        };

        setProject(prev => ({
            ...prev,
            items: [...prev.items, newItem]
        }));

        // Notify Production
        // Assuming addNotification and user are available in this scope, e.g., from useProject or another context.
        // For this change, we're replacing the incorrect object with the provided function call.
        // The original code had a syntax error here, which is being corrected.
        // The 'user' variable is assumed to be accessible, e.g., from project.user or a user context.
        addNotification(
            `Nouvelle commande de ${newItemQty}x ${newItemName} (${selectedDept}) par ${user?.name}`,
            'ORDER',
            Department.REGIE,
            newItem.id
        );

        // Reset and close
        setNewItemName('');
        setNewItemQty(1);
        setSuggestion(null);
        onClose();
    };

    const handleGetEcoTip = async (name?: string) => {
        const targetName = name || newItemName;
        if (!targetName) return;
        setLoadingSuggestion(true);
        const tip = await suggestEcoAlternatives(targetName);
        setSuggestion(tip);
        setLoadingSuggestion(false);
    };

    const selectItemFromCatalog = (name: string) => {
        setNewItemName(name);
        setIsCatalogOpen(false);
        handleGetEcoTip(name);
    };

    // Get suggestions for current department catalog
    const baseCatalog = POPULAR_ITEMS[selectedDept] || [];
    const historyItems = project.items
        .filter(item => item.department === selectedDept)
        .map(item => item.name);

    const catalogItems = Array.from(new Set([...baseCatalog, ...historyItems])).sort((a, b) => a.localeCompare(b));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-cinema-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-cinema-600 flex flex-col relative">

                {/* Header */}
                <div className="p-6 border-b border-cinema-700 flex justify-between items-center bg-cinema-900">
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
                                    try {
                                        const { items, rawResponse } = await analyzeOrderFile(file);

                                        if (items.length > 0) {
                                            // Add all items found
                                            items.forEach(item => {
                                                if (item.name) {
                                                    const newItem: ConsumableItem = {
                                                        id: Math.random().toString(36).substr(2, 9),
                                                        name: item.name,
                                                        department: (item.department as Department) || selectedDept,
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
                                    } catch (err: any) {
                                        console.error(err);
                                        setError(`Erreur technique : ${err.message || JSON.stringify(err)}`);
                                    } finally {
                                        setLoadingSuggestion(false);
                                    }
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
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Département</label>
                            <select
                                value={selectedDept}
                                onChange={(e) => setSelectedDept(e.target.value as Department)}
                                disabled={currentDept !== 'PRODUCTION'}
                                className={`w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-eco-500 focus:outline-none ${currentDept !== 'PRODUCTION' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {Object.values(Department).map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
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
                                />
                                {loadingSuggestion && <Leaf className="absolute right-3 top-3 h-4 w-4 text-eco-400 animate-spin" />}
                            </div>
                            <button
                                onClick={() => setIsCatalogOpen(true)}
                                className="bg-cinema-700 hover:bg-cinema-600 text-slate-200 px-3 rounded-lg border border-cinema-600 transition-colors flex items-center justify-center"
                                title="Ouvrir le catalogue"
                            >
                                <List className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => handleGetEcoTip()}
                                disabled={!newItemName || loadingSuggestion}
                                className="bg-eco-600/20 hover:bg-eco-600/40 text-eco-400 px-3 rounded-lg border border-eco-600/50 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Obtenir un conseil éco-responsable"
                            >
                                <Leaf className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {suggestion && (
                        <div className="flex items-start gap-2 text-sm text-eco-300 bg-eco-900/30 p-3 rounded border border-eco-800 animate-in fade-in slide-in-from-top-2">
                            <Leaf className="h-4 w-4 mt-0.5 shrink-0" />
                            <span><span className="font-bold">Conseil Éco-IA :</span> {suggestion}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-cinema-700 bg-cinema-900/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-cinema-700 transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleAddItem}
                        disabled={!newItemName}
                        className="bg-eco-600 hover:bg-eco-500 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-eco-900/20 flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Ajouter à la liste
                    </button>
                </div>

                {/* Nested Catalog Modal */}
                {isCatalogOpen && (
                    <div className="absolute inset-0 z-50 bg-cinema-800 flex flex-col animate-in slide-in-from-bottom-10">
                        <div className="p-4 border-b border-cinema-700 flex justify-between items-center bg-cinema-900">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <List className="h-5 w-5 text-eco-400" />
                                Catalogue : {selectedDept}
                            </h3>
                            <button onClick={() => setIsCatalogOpen(false)} className="p-1 text-slate-400 hover:text-white">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                            {catalogItems.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <Search className="h-10 w-10 mx-auto mb-4 opacity-20" />
                                    <p>Aucun article.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {catalogItems.map((item, idx) => (
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
