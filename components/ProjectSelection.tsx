import React, { useState } from 'react';
import { Building2, Film, ArrowRight, Loader2, Plus, LogOut, X } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { LottieAnimation } from './LottieAnimation';
import { Project } from '../types';

interface ProjectSelectionProps {
    onProjectSelected: () => void;
}

export const ProjectSelection: React.FC<ProjectSelectionProps> = ({ onProjectSelected }) => {
    const { user, logout, joinProject, removeProjectFromHistory, searchProjects } = useProject();
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<Project[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isNewProject, setIsNewProject] = useState(true);

    const hasSavedProject = !!(user?.productionName && user?.filmTitle);
    const hasHistory = !!(user?.projectHistory && user.projectHistory.length > 0);

    // Default to choice if we have a saved project OR history to show
    const [view, setView] = useState<'choice' | 'form'>((hasSavedProject || hasHistory) ? 'choice' : 'form');

    const [formData, setFormData] = useState({
        productionName: user?.productionName || '',
        filmTitle: user?.filmTitle || '',
        startDate: user?.startDate || '',
        endDate: user?.endDate || '',
        projectType: user?.projectType || '',
        convention: '' // Added
    });

    const handleSelectProject = (p: Project) => {
        setFormData({
            ...formData,
            productionName: p.productionCompany,
            filmTitle: p.name,
        });
        setIsNewProject(false);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.productionName || !formData.filmTitle) return;

        setIsLoading(true);
        try {
            // Determine default convention if implicit
            let finalConvention = formData.convention;
            if (['Téléfilm', 'Plateforme', 'Série TV'].includes(formData.projectType)) {
                finalConvention = 'USPA'; // Auto-set USPA
            } else if (formData.projectType === 'Publicité') {
                finalConvention = 'Publicité'; // Auto-set Publicité
            }

            await joinProject(formData.productionName, formData.filmTitle, formData.startDate, formData.endDate, formData.projectType, finalConvention);
            onProjectSelected();
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResume = async () => {
        if (!user?.productionName || !user?.filmTitle) return;
        setIsLoading(true);
        try {
            // Retrieve stored convention from user profile/project context potentially
            // @ts-ignore
            await joinProject(user.productionName, user.filmTitle, user.startDate, user.endDate, user.projectType, user.convention);
            onProjectSelected();
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    if (view === 'choice') {
        return (
            <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-cinema-800 border border-cinema-700 p-8 rounded-2xl shadow-2xl relative z-10">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <LottieAnimation
                                url="/animations/folder.json"
                                className="h-32 w-32"
                                loop={true}
                            />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                            {hasSavedProject
                                ? `Bon retour, ${user?.name ? user.name.split(' ')[0] : 'Cher Membre'} !`
                                : `Bienvenue, ${user?.name ? user.name.split(' ')[0] : 'Cher Membre'} !`}
                        </h2>
                        <p className="text-slate-400 text-sm">
                            {hasSavedProject
                                ? "Voulez-vous reprendre votre travail sur ce projet ?"
                                : "Sélectionnez un projet récent ou créez-en un nouveau."}
                        </p>
                    </div>

                    <div className="space-y-4">
                        {hasSavedProject && (
                            <button
                                onClick={handleResume}
                                disabled={isLoading}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-between px-6 transition-all transform hover:scale-[1.02] group"
                            >
                                <div className="text-left">
                                    <span className="block text-xs font-normal text-emerald-200 uppercase tracking-wider">Continuer sur</span>
                                    <span className="text-lg">{user?.filmTitle}</span>
                                </div>
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />}
                            </button>
                        )}

                        {hasSavedProject && (
                            <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-cinema-700"></div>
                                <span className="flex-shrink-0 mx-4 text-gray-500 text-xs uppercase">Ou</span>
                                <div className="flex-grow border-t border-cinema-700"></div>
                            </div>
                        )}

                        <button
                            onClick={() => setView('form')}
                            className="w-full bg-cinema-700 hover:bg-cinema-600 text-slate-300 font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            Nouveau Projet / Autre Film
                        </button>
                    </div>

                    <button
                        onClick={logout}
                        className="w-full text-slate-500 hover:text-red-400 text-sm py-2 flex items-center justify-center gap-2 transition-colors mt-6"
                    >
                        <LogOut className="h-4 w-4" /> Se déconnecter
                    </button>

                    {hasHistory && (
                        <div className="mt-8 pt-6 border-t border-cinema-700 animate-in fade-in slide-in-from-bottom-2 delay-300">
                            <h3 className="text-slate-400 text-xs uppercase tracking-wider mb-3 font-semibold">
                                Récemment consultés
                            </h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                {user?.projectHistory
                                    ?.filter(p => hasSavedProject ? (p.filmTitle !== user.filmTitle) : true) // Exclude current if relevant
                                    .sort((a, b) => new Date(b.lastAccess).getTime() - new Date(a.lastAccess).getTime())
                                    // Deduplicate by ID to show unique projects
                                    .filter((project, index, self) =>
                                        index === self.findIndex((p) => (
                                            p.id === project.id ||
                                            (p.productionName === project.productionName && p.filmTitle === project.filmTitle)
                                        ))
                                    )
                                    .map(hist => (
                                        <button
                                            key={hist.id}
                                            onClick={async () => {
                                                setIsLoading(true);
                                                try {
                                                    // Reuse known dates or leave empty if not stored (User profile has current dates, not history)
                                                    // Improvement: Store dates in history too? For now, keep it simple.
                                                    await joinProject(hist.productionName, hist.filmTitle);
                                                    onProjectSelected();
                                                } catch (err) {
                                                    console.error(err);
                                                } finally {
                                                    setIsLoading(false);
                                                }
                                            }}
                                            className="w-full text-left p-3 rounded-lg bg-cinema-700/30 hover:bg-cinema-700 border border-transparent hover:border-cinema-600 transition-all group relative pr-10"
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium text-slate-300 group-hover:text-white truncate">
                                                    {hist.filmTitle}
                                                </span>
                                                <ArrowRight className="h-3 w-3 text-slate-500 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all" />
                                            </div>
                                            <div className="text-xs text-slate-500 truncate">
                                                {hist.productionName}
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeProjectFromHistory(hist.id);
                                                }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Retirer de l'historique"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </button>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            </div >
        );
    }

    return (
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-cinema-800 border border-cinema-700 p-8 rounded-2xl shadow-2xl relative z-10">
                <div className="text-center mb-6">
                    <div className="flex justify-center mb-4">
                        <LottieAnimation
                            url="/animations/clapperboard.json"
                            className="h-24 w-24"
                            loop={true}
                        />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        Créer ou Rejoindre un Projet
                    </h2>
                    <p className="text-slate-400 text-sm">
                        Tapez le nom de la production pour voir si le projet existe déjà.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 relative">
                    {/* Production Name with Autocomplete */}
                    <div className="relative group z-20">
                        <Building2 className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-eco-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Société de Production (ex: HBO...)"
                            value={formData.productionName}
                            onChange={async (e) => {
                                const val = e.target.value;
                                setFormData({ ...formData, productionName: val });
                                setIsNewProject(true); // Reset to new by default
                                setShowSuggestions(true);

                                if (val.length >= 2) {
                                    const results = await searchProjects(val);
                                    setSuggestions(results);
                                } else {
                                    setSuggestions([]);
                                }
                            }}
                            className="w-full bg-cinema-900 border border-cinema-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-eco-500 focus:outline-none transition-all"
                            required
                        />

                        {/* Suggestions Dropdown */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute top-full left-0 w-full bg-cinema-800 border border-cinema-700 rounded-lg mt-1 shadow-xl max-h-48 overflow-y-auto z-30">
                                {suggestions.map(s => (
                                    <div
                                        key={s.id}
                                        onClick={() => handleSelectProject(s)}
                                        className="p-3 hover:bg-cinema-700 cursor-pointer flex justify-between items-center transition-colors group"
                                    >
                                        <div>
                                            <div className="text-white font-medium">{s.productionCompany}</div>
                                            <div className="text-xs text-slate-400">{s.name}</div>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="relative group">
                        <Film className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-eco-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Titre du Film / Projet"
                            value={formData.filmTitle}
                            onChange={(e) => setFormData({ ...formData, filmTitle: e.target.value })}
                            className="w-full bg-cinema-900 border border-cinema-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-eco-500 focus:outline-none transition-all"
                            required
                            readOnly={!isNewProject} // Read-only if joining
                        />
                    </div>

                    {/* Additional Fields - Only if creating a NEW project */}
                    {isNewProject && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-500 space-y-4">
                            <div className="relative group">
                                <label className="text-xs text-slate-400 mb-1 block ml-1">Type de Projet</label>
                                <select
                                    value={formData.projectType}
                                    onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                                    className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-eco-500 focus:outline-none transition-all appearance-none"
                                >
                                    <option value="">Sélectionner le type...</option>
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

                            {/* Convention Selector for Cinema */}
                            {formData.projectType === 'Long Métrage' && (
                                <div className="relative group animate-in fade-in slide-in-from-top-1 duration-500">
                                    <label className="text-xs text-slate-400 mb-1 block ml-1">Convention Collective</label>
                                    <select
                                        value={formData.convention}
                                        onChange={(e) => setFormData({ ...formData, convention: e.target.value })}
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-eco-500 focus:outline-none transition-all appearance-none"
                                    >
                                        <option value="">Choisir l'Annexe...</option>
                                        <option value="Annexe 1">Annexe I (Gros Budget)</option>
                                        <option value="Annexe 2">Annexe II (Moyen Budget)</option>
                                        <option value="Annexe 3">Annexe III (Petit Budget)</option>
                                    </select>
                                </div>
                            )}

                            {(user?.department === 'PRODUCTION' || true) && ( // Show dates for everyone creating a project
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative group">
                                        <label className="text-xs text-slate-400 mb-1 block ml-1">Début Tournage</label>
                                        <input
                                            type="date"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-eco-500 focus:outline-none transition-all"
                                        />
                                    </div>
                                    <div className="relative group">
                                        <label className="text-xs text-slate-400 mb-1 block ml-1">Fin Tournage</label>
                                        <input
                                            type="date"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-eco-500 focus:outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || (isNewProject && (!formData.projectType || !formData.startDate))}
                        className={`w-full font-bold py-3 rounded-lg shadow-lg transition-all transform hover:scale-[1.02] mt-6 flex items-center justify-center gap-2
                            ${!isNewProject
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20 hover:shadow-emerald-900/40' // JOIN Style
                                : (formData.projectType && formData.startDate)
                                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 hover:shadow-blue-900/40' // CREATE Valid Style
                                    : 'bg-slate-700 text-slate-400 cursor-not-allowed' // CREATE Incapable Style
                            }`}
                    >
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            !isNewProject ? (
                                <>
                                    <ArrowRight className="h-5 w-5" />
                                    Rejoindre {formData.filmTitle}
                                </>
                            ) : (
                                <>
                                    <Plus className="h-5 w-5" />
                                    Créer le projet
                                </>
                            )
                        )}
                    </button>

                    <div className="flex flex-col gap-2 mt-4">
                        {hasSavedProject && (
                            <button
                                type="button"
                                onClick={() => setView('choice')}
                                className="w-full text-slate-400 hover:text-white text-sm py-2 transition-colors"
                            >
                                Annuler et retourner au choix
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={logout}
                            className="w-full text-slate-500 hover:text-red-400 text-sm py-2 flex items-center justify-center gap-2 transition-colors"
                        >
                            <LogOut className="h-4 w-4" /> Se déconnecter
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
