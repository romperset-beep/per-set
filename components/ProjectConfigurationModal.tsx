import React from 'react';
import { useProject } from '../context/ProjectContext';
import { FileText, X, Check, LayoutGrid } from 'lucide-react';

interface ProjectConfigurationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProjectConfigurationModal: React.FC<ProjectConfigurationModalProps> = ({ isOpen, onClose }) => {
    const { project, updateProjectDetails } = useProject();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="bg-cinema-800 rounded-xl border border-cinema-700 shadow-2xl w-full max-w-2xl p-6 space-y-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-400" />
                            Configuration du Projet
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">Définissez le type de production et la convention applicable.</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2">Type de Projet</label>
                        <select
                            value={project.projectType || ''}
                            onChange={(e) => {
                                const newType = e.target.value;
                                let newConvention = '';
                                if (newType === 'Publicité') newConvention = 'Publicité';
                                else if (['Téléfilm', 'Plateforme', 'Série TV'].includes(newType)) newConvention = 'USPA';
                                else if (newType === 'Long Métrage') newConvention = project.convention || ''; // Keep existing if switching back or empty

                                updateProjectDetails({ projectType: newType, convention: newConvention });
                            }}
                            className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors cursor-pointer hover:border-cinema-600"
                        >
                            <option value="">Non défini</option>
                            <option value="Long Métrage">Long Métrage</option>
                            <option value="Téléfilm">Téléfilm</option>
                            <option value="Plateforme">Plateforme</option>
                            <option value="Série TV">Série TV</option>
                            <option value="Court Métrage">Court Métrage</option>
                            <option value="Publicité">Publicité</option>
                            <option value="Documentaire">Documentaire</option>
                            <option value="Shooting Photo">Shooting Photo</option>
                            <option value="Clip">Clip</option>
                            <option value="Événementiel">Événementiel</option>
                        </select>
                    </div>

                    {/* Convention Selector (Visible if Long Feature is selected) */}
                    {project.projectType === 'Long Métrage' && (
                        <div className="animate-in fade-in slide-in-from-left-2">
                            <label className="block text-sm font-bold text-slate-300 mb-2">Convention Collective</label>
                            <select
                                value={project.convention || ''}
                                onChange={(e) => updateProjectDetails({ convention: e.target.value })}
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors cursor-pointer hover:border-cinema-600"
                            >
                                <option value="">Non définie</option>
                                <option value="Annexe 1">Annexe I</option>
                                <option value="Annexe 2">Annexe II</option>
                                <option value="Annexe 3">Annexe III</option>
                            </select>
                            <p className="text-xs text-slate-500 mt-2">
                                Détermine les grilles de salaires et les majorations applicables.
                            </p>
                        </div>
                    )}
                </div>

                {/* Modules du Projet */}
                <div className="pt-4 border-t border-cinema-700">
                    <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4 text-blue-400" />
                        Modules du Projet
                    </h4>
                    <p className="text-xs text-slate-500 mb-4">
                        Activez ou désactivez les fonctionnalités pour l'ensemble du projet. Si un module est désactivé, il disparaîtra du menu pour toute l'équipe.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[
                            { id: 'pdt-manager', label: 'Gestion des PDT', desc: 'Analyse et planning de tournage' },
                            { id: 'orders', label: 'Commandes', desc: 'Validation et suivi des achats' },
                            { id: 'callsheets', label: 'Feuilles de Service', desc: "Création et diffusion d'appels" },
                            { id: 'timesheet', label: "Feuilles d'heures", desc: 'Saisie et suivi des heures' },
                            { id: 'energy', label: 'Énergie / Groupe', desc: 'Suivi de la consommation électrique' },
                            { id: 'catering', label: 'Cantine / Repas', desc: 'Choix de repas et validations' },
                            { id: 'food-donations', label: 'Dons Alimentaires', desc: 'Sauvetage des repas non consommés' },
                            { id: 'renforts', label: 'Renforts', desc: 'Gestion du personnel' },
                            { id: 'logistics', label: 'Aller-Retour Matériel', desc: 'Besoins logistiques' },
                            { id: 'inventory', label: 'Consommables', desc: 'Suivi des stocks' },
                            { id: 'social', label: 'Messagerie', desc: 'Communication inter-équipe' },
                            { id: 'expenses', label: 'Notes de Frais', desc: 'Gestion des dépenses' },
                            { id: 'inter_marketplace', label: 'Revente Inter-Prod', desc: 'Vente entre productions' },
                            { id: 'local_marketplace', label: "Ventes à l'équipe", desc: 'Vente de matériel en fin de projet' },
                            { id: 'donations', label: 'Économie Circulaire', desc: 'Dons aux assos, écoles' },
                            { id: 'report', label: 'Rapport RSE+', desc: "Export de données d'impact" },
                            { id: 'global-stats', label: 'Statistiques', desc: 'Vue globale du projet' },
                        ].map((feature) => (
                            <label
                                key={feature.id}
                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${project.features?.[feature.id] !== false
                                        ? 'bg-blue-600/20 border-blue-500 text-white'
                                        : 'bg-cinema-900/50 border-cinema-700 text-slate-400 hover:border-cinema-500 opacity-60'
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={project.features?.[feature.id] !== false}
                                    onChange={(e) => {
                                        const currentFeatures = project.features || {};
                                        updateProjectDetails({
                                            features: {
                                                ...currentFeatures,
                                                [feature.id]: e.target.checked
                                            }
                                        });
                                    }}
                                    className="mt-1 w-4 h-4 text-blue-600 bg-cinema-800 border-cinema-600 focus:ring-blue-500 focus:ring-opacity-50"
                                />
                                <div>
                                    <span className="block font-medium text-sm">{feature.label}</span>
                                    <span className="text-[10px] leading-tight block mt-0.5">{feature.desc}</span>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Catering Mode Options */}
                <div className="pt-4 border-t border-cinema-700">
                    <h4 className="text-sm font-bold text-slate-300 mb-4">Gestion des Repas</h4>
                    <div className="space-y-3">
                        <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${project.cateringMode !== 'TRAITEUR' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-cinema-900/50 border-cinema-700 text-slate-300 hover:border-cinema-500'}`}>
                            <input
                                type="radio"
                                name="cateringMode"
                                value="CANTINE"
                                checked={project.cateringMode !== 'TRAITEUR'}
                                onChange={() => updateProjectDetails({ cateringMode: 'CANTINE' })}
                                className="mt-1 w-4 h-4 text-blue-600 bg-cinema-800 border-cinema-600 focus:ring-blue-500 focus:ring-opacity-50"
                            />
                            <div>
                                <span className="block font-medium">Cantine professionnelle (Sur place)</span>
                                <span className="text-xs text-slate-400">Utilise la Feuille de Cantine (pointage de l'équipe avec totaux).</span>
                            </div>
                        </label>

                        <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${project.cateringMode === 'TRAITEUR' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-cinema-900/50 border-cinema-700 text-slate-300 hover:border-cinema-500'}`}>
                            <input
                                type="radio"
                                name="cateringMode"
                                value="TRAITEUR"
                                checked={project.cateringMode === 'TRAITEUR'}
                                onChange={() => updateProjectDetails({ cateringMode: 'TRAITEUR' })}
                                className="mt-1 w-4 h-4 text-blue-600 bg-cinema-800 border-cinema-600 focus:ring-blue-500 focus:ring-opacity-50"
                            />
                            <div>
                                <span className="block font-medium">Traiteur / Restaurant (Commande à la carte)</span>
                                <span className="text-xs text-slate-400">Permet à la Régie de créer un menu et à l'équipe de faire son choix.</span>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Advanced Settings */}
                <div className="pt-4 border-t border-cinema-700">
                    <h4 className="text-sm font-bold text-slate-300 mb-4">Paramètres Avancés</h4>
                    <div className="flex items-center justify-between bg-cinema-900/50 p-4 rounded-lg border border-cinema-700">
                        <div>
                            <span className="block text-white font-medium">Validation des commandes</span>
                            <span className="text-xs text-slate-400">Le Directeur de Prod doit valider les demandes avant achat.</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={project.settings?.requireOrderValidation || false}
                                onChange={(e) => updateProjectDetails({
                                    settings: { ...project.settings, requireOrderValidation: e.target.checked }
                                })}
                            />
                            <div className="w-11 h-6 bg-cinema-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>

                <div className="pt-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold transition-colors flex items-center gap-2"
                    >
                        <Check className="h-4 w-4" />
                        Valider
                    </button>
                </div>
            </div>
        </div>
    );
};
