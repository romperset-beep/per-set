import React from 'react';
import { useProject } from '../context/ProjectContext';
import { FileText, X, Check } from 'lucide-react';

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
                className="bg-cinema-800 rounded-xl border border-cinema-700 shadow-2xl w-full max-w-lg p-6 space-y-6 animate-in fade-in zoom-in-95"
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
