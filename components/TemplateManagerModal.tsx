import React, { useState, useEffect } from 'react';
import { UserTemplate, Department, ConsumableItem } from '../types';
import { useProject } from '../context/ProjectContext';
import { useMarketplace } from '../context/MarketplaceContext';
import { X, Trash2, Download, Plus, Save, ChevronRight, ChevronDown, Loader2, FileText, CheckCircle2, Search, Check, Mail } from 'lucide-react';
import rvzCatalog from '../src/data/rvz_catalog.json';
import { CONSUMABLES_CATALOG, DEPARTMENT_DISPLAY_NAMES } from '../src/data/consumables_catalog';

export interface TemplateEditorItem extends Partial<ConsumableItem> {
    quantity?: number;
    category?: string;
}

const mapCategoryToDepartment = (rvzCategory: string): Department => {
    const map: Record<string, Department> = {
        'Cameras': Department.CAMERA, // Legacy/Generic
        'Full Frame': Department.CAMERA,
        'Super 35': Department.CAMERA,
        'High Speed': Department.CAMERA,
        'Film 35': Department.CAMERA,
        'Film 16': Department.CAMERA,
        'Lightweight': Department.CAMERA,
        'Director\'s Viewfinder': Department.CAMERA,
        'Focus/Zoom Unit': Department.CAMERA,
        'Mattebox': Department.CAMERA,
        'Camera accessories': Department.CAMERA,
        'Lenses accessories': Department.CAMERA,
        'Monitoring': Department.CAMERA,
        'Filters': Department.CAMERA,
        'Energy': Department.CAMERA,
        'Data': Department.CAMERA,
        'Heads': Department.CAMERA,
        'Camera supports': Department.CAMERA,
        'Stabilisateurs': Department.CAMERA,
        'Roulantes': Department.CAMERA,
        'Sous Marin': Department.CAMERA,

        'Caméras (Divers)': Department.CAMERA, // Legacy/Generic container

        'Primes full frame': Department.CAMERA,
        'Primes super 35': Department.CAMERA,
        'Primes super 16': Department.CAMERA,
        'Primes anamorphiques': Department.CAMERA,
        'Macro': Department.CAMERA,
        'Hors série': Department.CAMERA,
        'Zooms full frame': Department.CAMERA,
        'Zooms super 35': Department.CAMERA,
        'Zooms super 16': Department.CAMERA,

        'Optiques': Department.CAMERA,
        'Accessoires Camera': Department.CAMERA, // Legacy container

        'Lumière': Department.LUMIERE, // Legacy/Generic
        'Sources': Department.LUMIERE,
        'LED': Department.LUMIERE,
        'HMI': Department.LUMIERE,
        'Tungstène': Department.LUMIERE,
        'Fluo': Department.LUMIERE,
        'Accessoires Lumière': Department.LUMIERE,
        'Grip': Department.LUMIERE,
        'Toiles et cadres': Department.LUMIERE,
        'Branchements': Department.LUMIERE,
        'Accessoires LED': Department.LUMIERE,
        'Accessoires HMI & Tungsten': Department.LUMIERE,
        'Chimeras & Octa': Department.LUMIERE,
        'Projecteurs LED': Department.LUMIERE,
        'Projecteurs HMI': Department.LUMIERE,
        'Projecteurs Tungstène': Department.LUMIERE,
        'Projecteurs Fluorescents': Department.LUMIERE,
        'Projecteurs (Divers)': Department.LUMIERE,

        'Energie': Department.LUMIERE,

        'Machinerie': Department.MACHINERIE,
        // Sub-categories Machinerie
        'Tête télécommandée': Department.MACHINERIE,
        'Grue télescopique': Department.MACHINERIE,
        'Grue fixe': Department.MACHINERIE,
        'Bras de grue': Department.MACHINERIE,
        'Dolly': Department.MACHINERIE,
        'Chariot mixte (sol/rail)': Department.MACHINERIE,
        'Chariot pneumatique': Department.MACHINERIE,
        'Accessoires machinerie': Department.MACHINERIE,
        'Bras de déport': Department.MACHINERIE,
        'Rails': Department.MACHINERIE,
        'Construction': Department.MACHINERIE,
        'Accroche Voiture': Department.MACHINERIE,
        'Slider': Department.MACHINERIE,
        'Antivibratoire': Department.MACHINERIE,
        'Tour Samia': Department.MACHINERIE,

        'Régie': Department.REGIE,
        'Véhicules': Department.REGIE,
        // 'Energie': Department.LUMIERE, // Removed duplicate
        'Photo': Department.CAMERA,
        'Boitiers Canon': Department.CAMERA,
        'Optiques Canon Fixes': Department.CAMERA,
        'Optiques Canon Zooms': Department.CAMERA,
        'Optiques à Bascule/décentrement': Department.CAMERA,
        'Optiques Adaptées en monture Canon': Department.CAMERA,
        'Accessoires Optiques': Department.CAMERA,
        'Accessoires Canon': Department.CAMERA,
        'Boitiers Nikon': Department.CAMERA,
        'Optiques Nikon Fixes': Department.CAMERA,
        'Optiques Nikon Zooms': Department.CAMERA,
        'Optiques Nikon à Bascule/décentrement': Department.CAMERA,
        'Accessoires Optiques Nikon': Department.CAMERA,
        'Accessoires Nikon': Department.CAMERA,
        'Boitiers PhaseOne': Department.CAMERA,
        'Optiques PhaseOne': Department.CAMERA,
        'Dos numériques PhaseOne': Department.CAMERA,
        'Accessoires PhaseOne': Department.CAMERA,
        'Boitiers Hasselbald série H': Department.CAMERA,
        'Optiques Hasselblad Fixes': Department.CAMERA,
        'Optiques Hasselblad Zooms': Department.CAMERA,
        'Accessoires Optiques Hasselblad': Department.CAMERA,
        'Ordinateurs Capture': Department.CAMERA,
        'Ecrans Capture': Department.CAMERA,
        'Batteries Externes MacBook': Department.CAMERA,
        'Imprimantes': Department.CAMERA,
        'Accessoires Capture': Department.CAMERA,
        'Flashs B2PRO': Department.CAMERA,
        'Flashs Briese': Department.CAMERA,
        'Flashs Broncolor': Department.CAMERA,
        'Flashs Elinchrom': Department.CAMERA,
        'Flashs légers': Department.CAMERA,
        'Flashs Profoto': Department.CAMERA,
        'Accessoires Briese': Department.CAMERA,
        'Accessoires Broncolor': Department.CAMERA,
        'Accessoires Elinchrom': Department.CAMERA,
        'Accessoires Flashs': Department.CAMERA,
        'Accessoires Profoto': Department.CAMERA,
        'Toiles & Cadres': Department.CAMERA,
        'Trépieds & Rotules': Department.CAMERA,
        'Divers Flashs': Department.CAMERA,
    };
    return map[rvzCategory] || Department.REGIE;
};
// import { Dialog } from '@headlessui/react';

interface TemplateManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    // Mode: 'MANAGE' (View/Delete) or 'SAVE' (Save current stock as template)
    mode: 'MANAGE' | 'SAVE';
    currentStockToSave?: TemplateEditorItem[];
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
    const { addToCatalog } = useMarketplace();


    const [templates, setTemplates] = useState<UserTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState(initialName || ''); // Init from prop
    const [isSaving, setIsSaving] = useState(false);
    const [importingId, setImportingId] = useState<string | null>(null);

    // Editing state for SAVE mode
    const [itemsToSave, setItemsToSave] = useState<TemplateEditorItem[]>([]);

    // Import State
    const [importDestination, setImportDestination] = useState<'SHOPPING' | 'STOCK'>('SHOPPING'); // Default to Shopping List

    // Catalog Logic
    const [newItemName, setNewItemName] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');

    // Extract unique categories and format them hierarchically with items
    const categoriesStructure = React.useMemo(() => {
        // CONSUMABLES: Use simple department-based structure
        if (templateType === 'CONSUMABLE') {
            type HierarchyGroup = {
                name: string;
                children?: { name: string, items: TemplateEditorItem[] }[];
            };

            const hierarchyGroups: HierarchyGroup[] = Object.entries(CONSUMABLES_CATALOG).map(([dept, items]) => ({
                name: DEPARTMENT_DISPLAY_NAMES[dept] || dept,
                children: [{
                    name: 'Tous',
                    items: items.map(name => ({
                        name,
                        category: dept,
                        department: dept as Department | 'PRODUCTION'
                    }))
                }]
            }));

            return { hierarchyGroups, flatCategories: [] };
        }

        // MATERIAL: Use RVZ hierarchical structure
        const rawItems = rvzCatalog as { category: string; name: string;[key: string]: unknown }[];
        const rawCategories = Array.from(new Set(rawItems.map((i) => i.category)));

        // Helper to get items for a category
        const getItems = (cat: string) => rawItems.filter(i => i.category === cat).sort((a, b) => a.name.localeCompare(b.name));

        // Define hierarchy groups
        // For Camera, we use a nested structure to support sub-groups
        type HierarchyValue = string[] | Record<string, string[]>;
        const hierarchy: Record<string, HierarchyValue> = {
            'Cameras': {
                'Corps Camera': [
                    'Full Frame',
                    'Super 35',
                    'High Speed',
                    'Film 35',
                    'Film 16',
                    'Lightweight',
                    'Director\'s Viewfinder'
                ],
                'Optiques': [
                    'Primes full frame',
                    'Primes super 35',
                    'Primes super 16',
                    'Primes anamorphiques',
                    'Macro',
                    'Hors série',
                    'Zooms full frame',
                    'Zooms super 35',
                    'Zooms super 16'
                ],
                'Accessoires Camera': [
                    'Focus/Zoom Unit',
                    'Mattebox',
                    'Camera accessories',
                    'Lenses accessories',
                    'Monitoring',
                    'Filters',
                    'Energy',
                    'Data',
                    'Heads',
                    'Camera supports',
                    'Stabilisateurs',
                    'Roulantes',
                    'Sous Marin',
                    'Caméras (Divers)'
                ]
            },
            'Lumière': [
                'LED',
                'HMI',
                'Tungstène',
                'Fluo',
                'Accessoires Lumière',
                'Grip',
                'Toiles et cadres',
                'Branchements',
                'Accessoires LED',
                'Accessoires HMI & Tungsten',
                'Chimeras & Octa'
            ],
            'Photo': [
                'Boitiers Canon',
                'Optiques Canon Fixes',
                'Optiques Canon Zooms',
                'Optiques à Bascule/décentrement',
                'Optiques Adaptées en monture Canon',
                'Accessoires Optiques',
                'Accessoires Canon',
                'Boitiers Nikon',
                'Optiques Nikon Fixes',
                'Optiques Nikon Zooms',
                'Optiques Nikon à Bascule/décentrement',
                'Accessoires Optiques Nikon',
                'Accessoires Nikon',
                'Boitiers PhaseOne',
                'Optiques PhaseOne',
                'Dos numériques PhaseOne',
                'Accessoires PhaseOne',
                'Boitiers Hasselbald série H',
                'Optiques Hasselblad Fixes',
                'Optiques Hasselblad Zooms',
                'Accessoires Optiques Hasselblad',
                'Ordinateurs Capture',
                'Ecrans Capture',
                'Batteries Externes MacBook',
                'Imprimantes',
                'Accessoires Capture',
                'Flashs B2PRO',
                'Flashs Briese',
                'Flashs Broncolor',
                'Flashs Elinchrom',
                'Flashs légers',
                'Flashs Profoto',
                'Accessoires Briese',
                'Accessoires Broncolor',
                'Accessoires Elinchrom',
                'Accessoires Flashs',
                'Accessoires Profoto',
                'Toiles & Cadres',
                'Trépieds & Rotules',
                'Divers Flashs'
            ],
            'Machinerie': [
                'Tête télécommandée',
                'Grue télescopique',
                'Grue fixe',
                'Bras de grue',
                'Dolly',
                'Chariot mixte (sol/rail)',
                'Chariot pneumatique',
                'Accessoires machinerie',
                'Bras de déport',
                'Rails',
                'Slider',
                'Antivibratoire',
                'Construction',
                'Tour Samia',
                'Accroche Voiture'
            ]
        };

        type HierarchyGroup = {
            name: string;
            children?: { name: string, items: { category: string; name: string;[key: string]: unknown }[] }[];
            subGroups?: { name: string, children: { name: string, items: { category: string; name: string;[key: string]: unknown }[] }[] }[];
        };

        const hierarchyGroups: HierarchyGroup[] = [];
        const used = new Set<string>();

        // 1. Add Hierarchical Groups
        Object.entries(hierarchy).forEach(([parent, value]) => {
            // Check if this is a nested structure (like Camera) or flat (like Machinerie)
            if (Array.isArray(value)) {
                // Flat structure: parent -> categories
                const mappedChildren = value.map(childName => ({
                    name: childName,
                    items: getItems(childName)
                }));

                hierarchyGroups.push({ name: parent, children: mappedChildren });
                used.add(parent);
                value.forEach(c => used.add(c));
            } else {
                // Nested structure: parent -> sub-groups -> categories
                const subGroups = Object.entries(value).map(([subGroupName, categories]) => ({
                    name: subGroupName,
                    children: categories.map(catName => ({
                        name: catName,
                        items: getItems(catName)
                    }))
                }));

                hierarchyGroups.push({ name: parent, subGroups });
                used.add(parent);
                Object.values(value).flat().forEach(c => used.add(c));
            }
        });

        // 2. Add remaining categories alphabetically
        // Exclude categories that are duplicates or already organized in hierarchical groups
        const excludedCategories = new Set([
            'Accessoires Camera',  // Already in Cameras > Accessoires Camera
            'Optiques',            // Already in Cameras > Optiques
            'Projecteurs (Divers)' // Already organized in Lumière hierarchy
        ]);

        const flatCategories = rawCategories
            .filter(c => !used.has(c) && !excludedCategories.has(c))
            .sort()
            .map(cat => ({
                name: cat,
                items: getItems(cat)
            }));

        return { hierarchyGroups, flatCategories };
    }, [templateType]);

    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

    // Level 1: Groups (Machines, Cameras...)
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        'Machinerie': false,
        'Cameras': false,
        'Lumière': false
    });

    // Level 2: Sub-groups (Corps Camera, Optiques, Accessoires Camera) and Categories (Dolly, Rails...)
    const [expandedSubGroups, setExpandedSubGroups] = useState<Record<string, boolean>>({});
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsCategoryDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleGroup = (groupName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
    };

    // Map internal group names to display names
    const getGroupDisplayName = (groupName: string): string => {
        const displayNames: Record<string, string> = {
            'Cameras': 'Caméra',
            'Machinerie': 'Machinerie',
            'Lumière': 'Lumière',
            'Photo': 'Photo'
        };
        return displayNames[groupName] || groupName;
    };

    const handleSelectCategory = (cat: string) => {
        setSelectedCategory(cat);
        setIsCategoryDropdownOpen(false);
    };

    // Filter catalog based on category AND input
    const catalogSuggestions = React.useMemo(() => {
        if (!newItemName || newItemName.length < 1) return [];

        const lower = newItemName.toLowerCase();

        // CONSUMABLES: Use flat list from CONSUMABLES_CATALOG
        if (templateType === 'CONSUMABLE') {
            let allConsumables: { name: string; department: string }[] = [];

            // Flatten all consumables from all departments
            Object.entries(CONSUMABLES_CATALOG).forEach(([dept, items]) => {
                items.forEach(name => {
                    allConsumables.push({ name, department: dept });
                });
            });

            // Filter by selected category (department) if any
            if (selectedCategory) {
                const deptKey = Object.keys(DEPARTMENT_DISPLAY_NAMES).find(
                    key => DEPARTMENT_DISPLAY_NAMES[key] === selectedCategory
                );
                if (deptKey) {
                    allConsumables = allConsumables.filter(item => item.department === deptKey);
                }
            }

            // Filter by search term
            return allConsumables
                .filter(item => item.name.toLowerCase().includes(lower))
                .slice(0, 50)
                .map(item => ({ name: item.name, category: item.department }));
        }

        // MATERIAL: Use RVZ catalog
        let filtered = rvzCatalog as { category: string; name: string;[key: string]: unknown }[];

        if (selectedCategory) {
            filtered = filtered.filter(item => item.category === selectedCategory);
        }

        return filtered
            .filter(item => item.name.toLowerCase().includes(lower))
            .slice(0, 50);
    }, [newItemName, selectedCategory, templateType]);

    const handleAddItem = (name: string, category?: string) => {
        if (!name.trim()) return;

        const categoryToUse = category || selectedCategory;
        const dept = categoryToUse ? mapCategoryToDepartment(categoryToUse) : currentDept;

        setItemsToSave([...itemsToSave, {
            name: name.trim(),
            quantity: 1,
            quantityCurrent: 1,
            department: dept as Department | 'PRODUCTION'
        }]);

        // Add to global catalog for future searches (consumables only)
        if (templateType === 'CONSUMABLE' && addToCatalog) {
            addToCatalog(name.trim(), dept as Department);
        }

        setNewItemName('');
    };

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

    const handleExportCSV = () => {
        if (itemsToSave.length === 0) {
            alert("La liste est vide.");
            return;
        }

        // Create CSV content
        const headers = ['Nom', 'Quantité', 'Unité', 'Département', 'Catégorie'];
        const rows = itemsToSave.map(item => [
            item.name || '',
            item.quantityCurrent || item.quantity || 1,
            item.unit || 'unités',
            item.department || '',
            item.category || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `${newTemplateName || 'liste'}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSendEmail = () => {
        if (itemsToSave.length === 0) {
            alert("La liste est vide.");
            return;
        }

        const listName = newTemplateName || 'Ma Liste';
        const subject = `Liste: ${listName}`;

        let body = `Bonjour,\n\nVoici la liste "${listName}":\n\n`;

        itemsToSave.forEach((item, index) => {
            const qty = item.quantityCurrent || item.quantity || 1;
            const unit = item.unit || 'unités';
            body += `${index + 1}. ${item.name} - ${qty} ${unit}`;
            if (item.department) body += ` (${item.department})`;
            body += '\n';
        });

        body += `\n\nTotal: ${itemsToSave.length} articles\n\nCordialement`;

        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
                const targetDept = (project.projectType === 'Long Métrage' ? template.department : currentDept) as Department | 'PRODUCTION';

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
                        status: 'Neuf' as ConsumableItem['status'],
                        surplusAction: 'En attente' as ConsumableItem['surplusAction'],
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
            <div className="bg-cinema-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-cinema-600 flex flex-col max-h-[80vh]">

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
                                {/* Manual Add Item with Catalog Search */}
                                {(templateType === 'MATERIAL' || itemsToSave.length === 0 || true) && (
                                    <div className="relative mb-4 space-y-2">

                                        {/* Custom Category Dropdown */}
                                        <div className="relative" ref={dropdownRef}>
                                            <button
                                                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                                className="w-full bg-cinema-800 border border-cinema-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none flex justify-between items-center hover:bg-cinema-700 transition-colors"
                                            >
                                                <span className={!selectedCategory ? 'text-slate-400' : ''}>
                                                    {selectedCategory || "-- Categories --"}
                                                </span>
                                                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            {isCategoryDropdownOpen && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-cinema-800 border border-cinema-600 rounded-lg shadow-xl z-[60] max-h-80 overflow-y-auto custom-scrollbar">
                                                    {/* Default Option */}
                                                    <button
                                                        onClick={() => handleSelectCategory('')}
                                                        className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-cinema-700 hover:text-white transition-colors border-b border-cinema-700/50"
                                                    >
                                                        -- Toutes les catégories --
                                                    </button>

                                                    {/* Hierarchical Groups */}
                                                    {categoriesStructure.hierarchyGroups.map(group => (
                                                        <div key={group.name} className="border-b border-cinema-700/30 last:border-0">
                                                            {/* Level 1: Group (e.g. Machinerie) */}
                                                            <button
                                                                onClick={(e) => toggleGroup(group.name, e)}
                                                                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-200 hover:bg-cinema-700/50 hover:text-white transition-colors"
                                                            >
                                                                <span className="flex items-center gap-2">
                                                                    {getGroupDisplayName(group.name)}
                                                                </span>
                                                                <ChevronRight className={`h-3.5 w-3.5 text-slate-500 transition-transform ${expandedGroups[group.name] ? 'rotate-90' : ''}`} />
                                                            </button>

                                                            {expandedGroups[group.name] && (
                                                                <div className="bg-cinema-900/30">
                                                                    {/* Check if this group has sub-groups (3-level) or direct children (2-level) */}
                                                                    {group.subGroups ? (
                                                                        // 3-level structure: Group > Sub-groups > Categories > Items
                                                                        group.subGroups.map(subGroup => (
                                                                            <div key={subGroup.name}>
                                                                                {/* Level 2: Sub-group (e.g. Corps Camera, Optiques) */}
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setExpandedSubGroups(prev => ({ ...prev, [subGroup.name]: !prev[subGroup.name] }));
                                                                                    }}
                                                                                    className={`w-full text-left pl-6 pr-3 py-1.5 text-sm font-medium transition-colors flex items-center justify-between hover:bg-cinema-700/50 ${expandedSubGroups[subGroup.name] ? 'text-purple-300' : 'text-slate-300'}`}
                                                                                >
                                                                                    <span>{subGroup.name}</span>
                                                                                    <ChevronRight className={`h-3.5 w-3.5 text-slate-500 transition-transform ${expandedSubGroups[subGroup.name] ? 'rotate-90' : ''}`} />
                                                                                </button>

                                                                                {expandedSubGroups[subGroup.name] && (
                                                                                    <div className="bg-cinema-900/50">
                                                                                        {subGroup.children.map(child => (
                                                                                            <div key={child.name}>
                                                                                                {/* Level 3: Category (e.g. Full Frame) */}
                                                                                                <button
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        setExpandedCategories(prev => ({ ...prev, [child.name]: !prev[child.name] }));
                                                                                                    }}
                                                                                                    className={`w-full text-left pl-12 pr-3 py-1.5 text-sm transition-colors flex items-center justify-between hover:bg-cinema-700/50 ${expandedCategories[child.name] ? 'text-purple-300' : 'text-slate-400'}`}
                                                                                                >
                                                                                                    <span className="flex items-center gap-2">
                                                                                                        {child.name}
                                                                                                        <span className="text-xs text-slate-600">({child.items.length})</span>
                                                                                                    </span>
                                                                                                    <ChevronRight className={`h-3 w-3 text-slate-600 transition-transform ${expandedCategories[child.name] ? 'rotate-90' : ''}`} />
                                                                                                </button>

                                                                                                {/* Level 4: Items */}
                                                                                                {expandedCategories[child.name] && (
                                                                                                    <div className="pl-16 pr-2 pb-1 space-y-0.5">
                                                                                                        {child.items.map(item => (
                                                                                                            <button
                                                                                                                key={item.id}
                                                                                                                onClick={() => handleAddItem(item.name, item.category)}
                                                                                                                className="w-full text-left py-1 text-xs text-slate-500 hover:text-white hover:bg-purple-500/10 px-2 rounded flex justify-between items-center group/item"
                                                                                                            >
                                                                                                                <span className="truncate">{item.name}</span>
                                                                                                                <Plus className="h-3 w-3 opacity-0 group-hover/item:opacity-100 text-purple-400" />
                                                                                                            </button>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        // 2-level structure: Group > Categories > Items
                                                                        group.children?.map(child => (
                                                                            <div key={child.name}>
                                                                                {/* Level 2: Category (e.g. Dolly) - Toggleable if has items */}
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setExpandedCategories(prev => ({ ...prev, [child.name]: !prev[child.name] }));
                                                                                    }}
                                                                                    className={`w-full text-left pl-6 pr-3 py-1.5 text-sm transition-colors flex items-center justify-between hover:bg-cinema-700/50 ${expandedCategories[child.name] ? 'text-purple-300' : 'text-slate-400'}`}
                                                                                >
                                                                                    <span className="flex items-center gap-2">
                                                                                        {child.name}
                                                                                        <span className="text-xs text-slate-600">({child.items.length})</span>
                                                                                    </span>
                                                                                    <ChevronRight className={`h-3 w-3 text-slate-600 transition-transform ${expandedCategories[child.name] ? 'rotate-90' : ''}`} />
                                                                                </button>

                                                                                {/* Level 3: Items (e.g. Fisher 10) */}
                                                                                {expandedCategories[child.name] && (
                                                                                    <div className="pl-9 pr-2 pb-1 space-y-0.5">
                                                                                        {child.items.map(item => (
                                                                                            <button
                                                                                                key={item.id}
                                                                                                onClick={() => handleAddItem(item.name, item.category)}
                                                                                                className="w-full text-left py-1 text-xs text-slate-500 hover:text-white hover:bg-purple-500/10 px-2 rounded flex justify-between items-center group/item"
                                                                                            >
                                                                                                <span className="truncate">{item.name}</span>
                                                                                                <Plus className="h-3 w-3 opacity-0 group-hover/item:opacity-100 text-purple-400" />
                                                                                            </button>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}

                                                    {/* Flat Categories */}
                                                    {categoriesStructure.flatCategories.map(cat => (
                                                        <div key={cat.name} className="border-b border-cinema-700/50 last:border-0">
                                                            <button
                                                                onClick={() => setExpandedCategories(prev => ({ ...prev, [cat.name]: !prev[cat.name] }))}
                                                                className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${expandedCategories[cat.name] ? 'text-purple-300' : 'text-slate-300 hover:bg-cinema-700 hover:text-white'}`}
                                                            >
                                                                <span>{cat.name}</span>
                                                                <ChevronRight className={`h-3 w-3 text-slate-500 transition-transform ${expandedCategories[cat.name] ? 'rotate-90' : ''}`} />
                                                            </button>

                                                            {expandedCategories[cat.name] && (
                                                                <div className="pl-6 pr-2 pb-1 space-y-0.5 bg-cinema-900/30">
                                                                    {cat.items.map(item => (
                                                                        <button
                                                                            key={item.id}
                                                                            onClick={() => handleAddItem(item.name, item.category)}
                                                                            className="w-full text-left py-1 text-xs text-slate-500 hover:text-white hover:bg-purple-500/10 px-2 rounded flex justify-between items-center group/item"
                                                                        >
                                                                            <span className="truncate">{item.name}</span>
                                                                            <Plus className="h-3 w-3 opacity-0 group-hover/item:opacity-100 text-purple-400" />
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="relative flex gap-2">
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    placeholder={selectedCategory ? `Rechercher dans ${selectedCategory}...` : "Rechercher un article..."}
                                                    value={newItemName}
                                                    onChange={(e) => setNewItemName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleAddItem(newItemName);
                                                    }}
                                                    className="w-full bg-cinema-900 border border-cinema-700 rounded-lg pl-3 pr-10 py-2 text-white text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                                />
                                                <div className="absolute right-3 top-2.5 text-slate-500">
                                                    <Search className="h-4 w-4" />
                                                </div>

                                                {/* Suggestions */}
                                                {catalogSuggestions.length > 0 && (
                                                    <div className="absolute top-full left-0 right-0 mt-1 bg-cinema-800 border border-cinema-600 rounded-lg shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                                                        {catalogSuggestions.map((item: { name: string; category?: string }) => (
                                                            <button
                                                                key={item.name}
                                                                onClick={() => handleAddItem(item.name, item.category)}
                                                                className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-purple-600/20 hover:text-white transition-colors flex justify-between items-center group border-b border-cinema-700/50 last:border-0"
                                                            >
                                                                <span>{item.name}</span>
                                                                {!selectedCategory && (
                                                                    <span className="text-xs text-slate-500 bg-cinema-900 px-1 rounded">{item.category}</span>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleAddItem(newItemName)}
                                                className="bg-cinema-700 hover:bg-cinema-600 text-white p-2 rounded-lg"
                                            >
                                                <Plus className="h-5 w-5" />
                                            </button>
                                        </div>
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

                            {/* Action Buttons */}
                            <div className="space-y-3">
                                {/* Primary Save Button */}
                                <button
                                    onClick={handleSave}
                                    disabled={!newTemplateName.trim() || itemsToSave.length === 0 || isSaving}
                                    className="w-full bg-eco-600 hover:bg-eco-500 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-eco-900/20"
                                >
                                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                                    Sauvegarder la liste
                                </button>

                                {/* Export Options */}
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={handleSendEmail}
                                        disabled={itemsToSave.length === 0}
                                        className="bg-cinema-700 hover:bg-cinema-600 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-cinema-600"
                                    >
                                        <Mail className="h-4 w-4" />
                                        Envoyer par Email
                                    </button>

                                    <button
                                        onClick={handleExportCSV}
                                        disabled={itemsToSave.length === 0}
                                        className="bg-cinema-700 hover:bg-cinema-600 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-cinema-600"
                                    >
                                        <Download className="h-4 w-4" />
                                        Exporter CSV
                                    </button>
                                </div>
                            </div>
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
