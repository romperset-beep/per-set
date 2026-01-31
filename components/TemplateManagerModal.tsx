import React, { useState, useEffect } from 'react';
import { UserTemplate, Department } from '../types';
import { useProject } from '../context/ProjectContext';
import { X, Trash2, Download, Plus, Save, ChevronRight, Loader2, FileText, CheckCircle2 } from 'lucide-react';
// import { Dialog } from '@headlessui/react';

interface TemplateManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    // Mode: 'MANAGE' (View/Delete) or 'SAVE' (Save current stock as template)
    mode: 'MANAGE' | 'SAVE';
    currentStockToSave?: any[];
    templateType?: 'CONSUMABLE' | 'MATERIAL'; // Added
    existingTemplateId?: string; // Added for editing
    initialName?: string; // Added for editing
}

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
    isOpen,
    onClose,
    mode,
    currentStockToSave,
    templateType = 'CONSUMABLE',
    existingTemplateId,
    initialName
}) => {
    const { getUserTemplates, saveUserTemplate, deleteUserTemplate, addItem, updateItem, project, currentDept } = useProject(); // Added updateItem


    const [templates, setTemplates] = useState<UserTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState(initialName || ''); // Init from prop
    const [isSaving, setIsSaving] = useState(false);
    const [importingId, setImportingId] = useState<string | null>(null);

    // Editing state for SAVE mode
    const [itemsToSave, setItemsToSave] = useState<any[]>([]);

    // Import State
    const [importDestination, setImportDestination] = useState<'SHOPPING' | 'STOCK'>('SHOPPING'); // Default to Shopping List


    useEffect(() => {
        if (isOpen) {
            setNewTemplateName(initialName || ''); // Reset/Init name
            if (currentStockToSave && currentStockToSave.length > 0) {
                // clone to avoid mutating props
                setItemsToSave(currentStockToSave.map(i => ({ ...i })));
            } else if (templateType === 'MATERIAL' && !existingTemplateId) {
                // New Material List -> Start empty
                setItemsToSave([]);
            } else if (existingTemplateId && currentStockToSave) {
                // If editing, currentStockToSave is passed as the template items
                setItemsToSave(currentStockToSave.map(i => ({ ...i })));
            }
            fetchTemplates();
        }
    }, [isOpen, currentStockToSave, initialName, existingTemplateId]);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const data = await getUserTemplates();
            // Sort by Date DESC
            setTemplates(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (error) {
            console.error("Error loading templates", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!newTemplateName.trim()) return;
        setIsSaving(true);
        try {
            // Filter 0 qty items
            const filteredItems = itemsToSave.filter(i => (i.quantityCurrent || i.quantity || 0) > 0);
            if (filteredItems.length === 0) {
                alert("La liste est vide ou tous les articles sont à 0.");
                setIsSaving(false);
                return;
            }

            // If existingTemplateId, we might need a distinct update function or just overwrite logic in saveUserTemplate
            // For now, assuming saveUserTemplate handles create. Ideally we'd have update.
            // Since saveUserTemplate creates a NEW ID based on inputs usually, we might need to delete old if renaming/editing?
            // Actually, let's assume saveUserTemplate creates new. The user can delete the old one.
            // OR - Check context if saveUserTemplate supports ID override. 
            // Checking implementation: saveUserTemplate creates a NEW doc.
            // So if editing, we should Delete Old -> Create New (Primitive update)
            if (existingTemplateId && deleteUserTemplate) {
                await deleteUserTemplate(existingTemplateId);
            }

            await saveUserTemplate(newTemplateName, filteredItems, templateType); // Pass type
            setNewTemplateName('');
            setItemsToSave([]); // Clear
            onClose();
        } catch (error) {
            console.error("Error saving template", error);
            alert("Erreur lors de la sauvegarde.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm("Supprimer ce modèle ?")) return;
        try {
            await deleteUserTemplate(id);
            setTemplates(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            console.error("Error deleting template", error);
        }
    };

    const handleImport = async (template: UserTemplate) => {
        if (!addItem || !updateItem) return;
        setImportingId(template.id);

        try {
            let count = 0;
            // Determine department target: Use user's current dept unless Long Metrage logic applies?
            // Actually, for duplicates we need to match status, name, and purchased state.

            const targetPurchased = importDestination === 'STOCK';

            for (const item of template.items) {
                const targetDept = project.projectType === 'Long Métrage' ? template.department : currentDept as any;

                // 1. Check for existing item
                const existingItem = project.items.find(i =>
                    i.name.toLowerCase().trim() === item.name.toLowerCase().trim() &&
                    i.department === targetDept &&
                    // For stock, we usually care about status NEW? 
                    // Templates usually save "ConsumableItem" structure but limited fields.
                    // Let's assume templates import as NEW if going to STOCK.
                    // If going to SHOPPING (purchased=false), status matters less but usually NEW.
                    i.status === 'Neuf' &&  // Standardize on NEW for merging simplicity for now
                    i.purchased === targetPurchased &&
                    i.surplusAction === 'En attente'
                );

                if (existingItem) {
                    // Update Quantity
                    await updateItem({
                        id: existingItem.id,
                        quantityCurrent: existingItem.quantityCurrent + item.quantity
                        // Also update initial? Usually yes if it's a request list.
                        // If it's stock, updating current is key.
                        // Let's safe update both if it's shopping list.
                    });
                } else {
                    // Create New
                    await addItem({
                        id: Math.random().toString(36).substr(2, 9),
                        name: item.name,
                        department: targetDept,
                        quantityInitial: item.quantity,
                        quantityCurrent: item.quantity,
                        unit: item.unit || 'unités',
                        status: 'Neuf' as any,
                        surplusAction: 'En attente' as any,
                        purchased: targetPurchased
                    });
                }
                count++;
            }
            const destinationText = importDestination === 'STOCK' ? 'au stock' : 'à la liste de commande';
            alert(`Import terminé : ${count} articles ajoutés ou mis à jour ${destinationText}.`);
            onClose();
        } catch (error) {
            console.error("Error importing", error);
            alert("Erreur lors de l'import.");
        } finally {
            setImportingId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-cinema-800 rounded-2xl shadow-2xl max-w-lg w-full border border-cinema-600 flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="p-6 border-b border-cinema-700 flex justify-between items-center bg-cinema-900 rounded-t-2xl">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        {mode === 'SAVE' ? <Save className="h-5 w-5 text-eco-400" /> : <FileText className="h-5 w-5 text-purple-400" />}
                        {mode === 'SAVE' ? 'Sauvegarder comme Modèle' : 'Mes Listes Types'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">

                    {mode === 'SAVE' ? (
                        <div className="space-y-6">

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Nom du modèle</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Kit Bijoute Base, Roulante Machino..."
                                    value={newTemplateName}
                                    onChange={e => setNewTemplateName(e.target.value)}
                                    className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-eco-500 focus:outline-none"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <label className="block text-xs font-medium text-slate-400 uppercase">
                                        Articles à sauvegarder ({itemsToSave.length})
                                    </label>
                                    <span className="text-xs text-slate-500">
                                        Décochez ou supprimez les articles inutiles.
                                    </span>
                                </div>
                                {/* Manual Add Item (For Material Lists or creating from scratch) */}
                                {(templateType === 'MATERIAL' || itemsToSave.length === 0) && (
                                    <div className="flex gap-2 mb-4">
                                        <input
                                            id="newItemName"
                                            type="text"
                                            placeholder="Ajouter un article..."
                                            className="flex-1 bg-cinema-800 border border-cinema-700 rounded-lg px-3 py-2 text-white text-sm"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const input = e.currentTarget;
                                                    if (input.value.trim()) {
                                                        setItemsToSave([...itemsToSave, {
                                                            name: input.value.trim(),
                                                            quantity: 1,
                                                            quantityCurrent: 1,
                                                            department: currentDept
                                                        }]);
                                                        input.value = '';
                                                    }
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={() => {
                                                const input = document.getElementById('newItemName') as HTMLInputElement;
                                                if (input && input.value.trim()) {
                                                    setItemsToSave([...itemsToSave, {
                                                        name: input.value.trim(),
                                                        quantity: 1,
                                                        quantityCurrent: 1,
                                                        department: currentDept
                                                    }]);
                                                    input.value = '';
                                                }
                                            }}
                                            className="bg-cinema-700 hover:bg-cinema-600 text-white p-2 rounded-lg"
                                        >
                                            <Plus className="h-5 w-5" />
                                        </button>
                                    </div>
                                )}

                                <div className="bg-cinema-900/50 rounded-xl border border-cinema-700 max-h-60 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                    {itemsToSave.length === 0 ? (
                                        <div className="text-center py-8 text-slate-500 text-sm">
                                            Aucun article sélectionné.
                                        </div>
                                    ) : (
                                        itemsToSave.map((item, idx) => (
                                            <div key={item.id || idx} className="flex items-center gap-3 p-2 hover:bg-cinema-800 rounded-lg group transition-colors">
                                                <button
                                                    onClick={() => {
                                                        const newItems = [...itemsToSave];
                                                        newItems.splice(idx, 1);
                                                        setItemsToSave(newItems);
                                                    }}
                                                    className="text-slate-500 hover:text-red-400 p-1"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-slate-200 truncate">{item.name}</p>
                                                    <p className="text-xs text-slate-500">{item.department}</p>
                                                </div>
                                                <div className="flex items-center gap-2 bg-cinema-900 rounded-lg border border-cinema-700 px-2 py-1">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantityCurrent || item.quantity || 1}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 1;
                                                            const newItems = [...itemsToSave];
                                                            // Update quantity - assuming quantityCurrent allows us to track what to save
                                                            newItems[idx] = { ...newItems[idx], quantityCurrent: val, quantity: val, quantityInitial: val };
                                                            setItemsToSave(newItems);
                                                        }}
                                                        className="w-12 bg-transparent text-right text-sm text-white focus:outline-none"
                                                    />
                                                    <span className="text-xs text-slate-500">{item.unit || 'u'}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={!newTemplateName.trim() || itemsToSave.length === 0 || isSaving}
                                className="w-full bg-eco-600 hover:bg-eco-500 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-eco-900/20"
                            >
                                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                                Sauvegarder la liste
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-8 w-8 text-eco-500 animate-spin" />
                                </div>
                            ) : templates.length === 0 ? (
                                <div className="text-center py-12 text-slate-500 bg-cinema-900/50 rounded-xl border border-dashed border-cinema-700">
                                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                    <p>Aucun modèle enregistré.</p>
                                    <p className="text-xs mt-1 text-slate-400">Pour créer un modèle, fermez cette fenêtre et cliquez sur le <strong>bouton Sauvegarde (💾)</strong> situé à côté du bouton "Mes Listes".</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {templates.map(template => (
                                        <div key={template.id} className="bg-cinema-900/80 border border-cinema-700 rounded-xl p-4 hover:border-purple-500/50 transition-all group relative overflow-hidden">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-bold text-white text-lg">{template.name}</h4>
                                                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                                                        <span className="bg-cinema-800 px-1.5 py-0.5 rounded text-white/70">{template.items.length} articles</span>
                                                        <span>• {new Date(template.createdAt).toLocaleDateString()}</span>
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={(e) => handleDelete(template.id, e)}
                                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>

                                            <div className="flex gap-2 mt-4 flex-col">

                                                {/* Import Options (Only visible when expanding or usually visible?) 
                                                    Let's make it simple: Radio buttons above the button?
                                                    Or just default to Shopping List and maybe a small cog?
                                                    Better: Toggle right there.
                                                */}
                                                <div className="flex gap-4 mb-2 text-sm text-slate-400 justify-center bg-cinema-900/50 p-2 rounded-lg">
                                                    <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                                                        <input
                                                            type="radio"
                                                            name={`dest-${template.id}`}
                                                            checked={importDestination === 'SHOPPING'}
                                                            onChange={() => setImportDestination('SHOPPING')}
                                                            className="text-purple-500 focus:ring-purple-500 bg-gray-800 border-gray-600"
                                                        />
                                                        À commander
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                                                        <input
                                                            type="radio"
                                                            name={`dest-${template.id}`}
                                                            checked={importDestination === 'STOCK'}
                                                            onChange={() => setImportDestination('STOCK')}
                                                            className="text-eco-500 focus:ring-eco-500 bg-gray-800 border-gray-600"
                                                        />
                                                        Déjà en stock
                                                    </label>
                                                </div>

                                                <button
                                                    onClick={() => handleImport(template)}
                                                    disabled={importingId === template.id}
                                                    className="flex-1 bg-cinema-800 hover:bg-purple-600 text-slate-200 hover:text-white py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 border border-cinema-700 hover:border-purple-500"
                                                >
                                                    {importingId === template.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                                    Importer cette liste
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
