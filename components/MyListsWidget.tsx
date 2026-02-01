import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { UserTemplate, Department } from '../types';
import { TemplateManagerModal } from './TemplateManagerModal'; // Reuse existing logic where possible, or refactor
import { Package, Truck, Trash2, Edit, Plus, Copy, FileText, CheckCircle2, Upload, ShoppingCart } from 'lucide-react';
import { analyzeOrderFile, analyzeMarketplaceMatch } from '../services/geminiService';

export const MyListsWidget: React.FC = () => {
    const { getUserTemplates, user, deleteUserTemplate, project } = useProject();
    const [activeTab, setActiveTab] = useState<'CONSUMABLE' | 'MATERIAL'>('CONSUMABLE');
    const [selectedTemplate, setSelectedTemplate] = useState<UserTemplate | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [creationType, setCreationType] = useState<'CONSUMABLE' | 'MATERIAL' | null>(null);
    const [allTemplates, setAllTemplates] = useState<UserTemplate[]>([]);

    React.useEffect(() => {
        fetchTemplates();
    }, [user, isEditModalOpen]); // Reload on user change or modal close

    const fetchTemplates = async () => {
        if (!getUserTemplates) return; // Safety check
        const t = await getUserTemplates();
        setAllTemplates(t);
    };

    const templates = allTemplates.filter(t =>
        (t.userId === user?.email || t.userId === user?.id) && // Ensure ownership
        (t.type === activeTab || (!t.type && activeTab === 'CONSUMABLE')) // Default to consumable if undefined
    );

    const handleDelete = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!window.confirm('Supprimer cette liste ?')) return;

        try {
            // console.log("Deleting template:", id);
            await deleteUserTemplate(id);
            setAllTemplates(prev => prev.filter(t => t.id !== id));
        } catch (error: any) {
            console.error("Error deleting template", error);
            alert(`Erreur: ${error.message || "Impossible de supprimer"}`);
        }
    };

    const handleCopy = (t: UserTemplate) => {
        const text = t.items.map(i => `- ${i.quantity} x ${i.name}`).join('\n');
        navigator.clipboard.writeText(text);
        alert('Liste copiée dans le presse-papier !');
    };

    // File import functionality
    const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const extension = file.name.split('.').pop()?.toLowerCase();
            let items: any[] = [];

            // Use Gemini AI for PDF and images
            if (extension === 'pdf' || extension === 'png' || extension === 'jpg' || extension === 'jpeg') {
                const result = await analyzeOrderFile(file);
                if (result.items && result.items.length > 0) {
                    items = result.items.map(item => ({
                        name: item.name || 'Item',
                        quantity: item.quantityInitial || 1,
                        category: (item as any).category || '',
                        department: (item.department || 'CAMERA') as Department
                    }));
                } else {
                    alert('Aucun article trouvé dans le fichier. Vérifiez le format.');
                    return;
                }
            } else if (extension === 'csv') {
                items = await parseCSV(file);
            } else if (extension === 'json') {
                items = await parseJSON(file);
            } else if (extension === 'txt') {
                items = await parseTXT(file);
            } else {
                alert('Format non supporté. Utilisez PDF, CSV, JSON ou TXT.');
                return;
            }

            if (items.length === 0) {
                alert('Aucun article trouvé dans le fichier.');
                return;
            }

            // Open modal with imported items
            setCreationType(activeTab);
            setSelectedTemplate({
                id: '',
                name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
                items: items,
                type: activeTab,
                department: 'CAMERA' as Department,
                userId: user?.email || '',
                createdAt: new Date().toISOString()
            });
            setIsEditModalOpen(true);
        } catch (error: any) {
            console.error('Import error:', error);
            alert(`Erreur d'import: ${error.message}`);
        }

        // Reset input
        event.target.value = '';
    };

    const parseCSV = async (file: File): Promise<any[]> => {
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim());

        // Skip header if it looks like a header
        const startIndex = lines[0].toLowerCase().includes('nom') || lines[0].toLowerCase().includes('name') ? 1 : 0;

        return lines.slice(startIndex).map(line => {
            const parts = line.split(',').map(p => p.trim());
            return {
                name: parts[0] || 'Item',
                quantity: parseInt(parts[1]) || 1,
                category: parts[2] || '',
                department: (parts[3] || 'CAMERA') as Department
            };
        }).filter(item => item.name && item.name !== 'Item');
    };

    const parseJSON = async (file: File): Promise<any[]> => {
        const text = await file.text();
        const data = JSON.parse(text);

        // Handle different JSON formats
        if (Array.isArray(data)) {
            return data;
        } else if (data.items && Array.isArray(data.items)) {
            return data.items;
        }

        throw new Error('Format JSON invalide');
    };

    const parseTXT = async (file: File): Promise<any[]> => {
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim());

        return lines.map(line => {
            // Parse formats like "5x Camera RED" or "Camera RED x5" or just "Camera RED"
            const match = line.match(/(\d+)\s*x\s*(.+)|(.+)\s*x\s*(\d+)|(.+)/i);

            if (match) {
                const quantity = parseInt(match[1] || match[4] || '1');
                const name = (match[2] || match[3] || match[5] || '').trim();

                return {
                    name,
                    quantity,
                    category: '',
                    department: 'CAMERA' as Department
                };
            }

            return null;
        }).filter(item => item !== null) as any[];
    };

    // Send to order functionality
    const handleSendToOrder = async (template: UserTemplate) => {
        // Check if we're in the consumables tab (lists shown in this tab are consumables)
        if (activeTab !== 'CONSUMABLE') {
            alert('Seules les listes de consommables peuvent être commandées');
            return;
        }

        if (!window.confirm(`Envoyer "${template.name}" en commande ?\n\n${template.items.length} articles seront ajoutés à vos consommables.`)) {
            return;
        }

        try {
            // Store order data for InventoryManager to pick up
            const orderData = {
                templateName: template.name,
                items: template.items.map(item => ({
                    ...item,
                    status: 'REQUESTED',
                    requestedBy: user?.email,
                    requestedAt: new Date().toISOString()
                })),
                timestamp: new Date().toISOString(),
                userId: user?.email
            };

            localStorage.setItem('pendingOrder', JSON.stringify(orderData));

            // Success notification
            alert(`✓ ${template.items.length} articles envoyés en commande !\n\nRendez-vous dans "Consommables" pour finaliser la commande.`);

        } catch (error: any) {
            console.error('Order error:', error);
            alert(`Erreur: ${error.message}`);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-cinema-800 p-6 rounded-xl border border-cinema-700">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
                        <FileText className="h-8 w-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Mes Listes</h2>
                        <p className="text-slate-400">Gérez vos listes de matériel et de consommables</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    {/* Import Button */}
                    <label className="bg-cinema-700 hover:bg-cinema-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors cursor-pointer">
                        <Upload className="h-4 w-4" />
                        Importer
                        <input
                            type="file"
                            accept=".csv,.json,.txt,.pdf"
                            onChange={handleImportFile}
                            className="hidden"
                        />
                    </label>

                    {/* New List Button */}
                    <button
                        onClick={() => {
                            setCreationType(activeTab);
                            setSelectedTemplate(null);
                            setIsEditModalOpen(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Nouvelle Liste {activeTab === 'MATERIAL' ? 'Matériel' : 'Consommable'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-cinema-700">
                <button
                    onClick={() => setActiveTab('CONSUMABLE')}
                    className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'CONSUMABLE'
                        ? 'text-white border-indigo-500 bg-indigo-500/10'
                        : 'text-slate-400 border-transparent hover:text-white hover:bg-cinema-800'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Consommables
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('MATERIAL')}
                    className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'MATERIAL'
                        ? 'text-white border-indigo-500 bg-indigo-500/10'
                        : 'text-slate-400 border-transparent hover:text-white hover:bg-cinema-800'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Matériel
                    </div>
                </button>
            </div>

            {/* Content */}
            {templates.length === 0 ? (
                <div className="text-center py-12 bg-cinema-800/50 rounded-xl border border-cinema-700 border-dashed">
                    <p className="text-slate-500">Aucune liste enregistrée.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(t => (
                        <div key={t.id} className="bg-cinema-800 rounded-xl border border-cinema-700 p-4 hover:border-indigo-500/50 transition-colors group">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="font-bold text-white text-lg truncate pr-2">{t.name}</h3>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleCopy(t)}
                                        className="p-1.5 text-slate-400 hover:text-white hover:bg-cinema-700 rounded"
                                        title="Copier le contenu"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedTemplate(t);
                                            setCreationType(t.type || 'CONSUMABLE');
                                            setIsEditModalOpen(true);
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded"
                                        title="Modifier"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={(e) => handleDelete(t.id, e)}
                                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded"
                                        title="Supprimer"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1 mb-4">
                                {t.items.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="text-sm text-slate-400 flex justify-between">
                                        <span className="truncate flex-1">{item.name}</span>
                                        <span className="font-mono text-slate-500">x{item.quantity}</span>
                                    </div>
                                ))}
                                {t.items.length > 3 && (
                                    <div className="text-xs text-indigo-400 italic">
                                        + {t.items.length - 3} autres articles...
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-cinema-700">
                                <span className="uppercase font-bold tracking-wider">{t.department}</span>
                                <span>•</span>
                                <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                            </div>

                            {/* Send to Order Button (only for consumables) */}
                            {activeTab === 'CONSUMABLE' && (
                                <button
                                    onClick={() => handleSendToOrder(t)}
                                    className="w-full mt-3 bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                >
                                    <ShoppingCart className="h-4 w-4" />
                                    Envoyer en Commande
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Edit/Create Modal */}
            <TemplateManagerModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                mode={selectedTemplate ? 'SAVE' : 'SAVE'} // Re-using SAVE mode for editing
                currentStockToSave={selectedTemplate ? selectedTemplate.items : []}
                templateType={creationType || 'CONSUMABLE'}
                existingTemplateId={selectedTemplate?.id}
                initialName={selectedTemplate?.name}
            />
        </div>
    );
};
