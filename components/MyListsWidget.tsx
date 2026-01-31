import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { UserTemplate, Department } from '../types';
import { TemplateManagerModal } from './TemplateManagerModal'; // Reuse existing logic where possible, or refactor
import { Package, Truck, Trash2, Edit, Plus, Copy, FileText, CheckCircle2 } from 'lucide-react';

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

    const handleDelete = async (id: string) => {
        if (window.confirm('Supprimer cette liste ?')) {
            await deleteUserTemplate(id);
        }
    };

    const handleCopy = (t: UserTemplate) => {
        const text = t.items.map(i => `- ${i.quantity} x ${i.name}`).join('\n');
        navigator.clipboard.writeText(text);
        alert('Liste copiée dans le presse-papier !');
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
                        <h2 className="text-2xl font-bold text-white">Mes Listes & Inventaires</h2>
                        <p className="text-slate-400">Gérez vos listes de matériel et de consommables</p>
                    </div>
                </div>

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
                                        onClick={() => handleDelete(t.id)}
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
