import React, { useState } from 'react';
import { Building2, Film, ArrowRight, Loader2, Plus, LogOut } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { LottieAnimation } from './LottieAnimation';

interface ProjectSelectionProps {
    onProjectSelected: () => void;
}

export const ProjectSelection: React.FC<ProjectSelectionProps> = ({ onProjectSelected }) => {
    const { user, logout, joinProject } = useProject();
    const [isLoading, setIsLoading] = useState(false);

    const hasSavedProject = user?.productionName && user?.filmTitle;
    const [view, setView] = useState<'choice' | 'form'>(hasSavedProject ? 'choice' : 'form');

    const [formData, setFormData] = useState({
        productionName: user?.productionName || '',
        filmTitle: user?.filmTitle || '',
        startDate: user?.startDate || '',
        endDate: user?.endDate || ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.productionName || !formData.filmTitle) return;

        setIsLoading(true);
        try {
            await joinProject(formData.productionName, formData.filmTitle, formData.startDate, formData.endDate);
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
            await joinProject(user.productionName, user.filmTitle, user.startDate, user.endDate);
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
                            Bon retour, {user?.name ? user.name.split(' ')[0] : 'Cher Membre'} !
                        </h2>
                        <p className="text-slate-400 text-sm">
                            Voulez-vous reprendre votre travail sur ce projet ?
                        </p>
                    </div>

                    <div className="space-y-4">
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

                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-cinema-700"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-500 text-xs uppercase">Ou</span>
                            <div className="flex-grow border-t border-cinema-700"></div>
                        </div>

                        <button
                            onClick={() => setView('form')}
                            className="w-full bg-cinema-700 hover:bg-cinema-600 text-slate-300 font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            Nouveau Projet / Autre Film
                        </button>
                    </div>

                    <LogOut className="h-4 w-4" /> Se déconnecter
                </button>

                {user?.projectHistory && user.projectHistory.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-cinema-700 animate-in fade-in slide-in-from-bottom-2 delay-300">
                        <h3 className="text-slate-400 text-xs uppercase tracking-wider mb-3 font-semibold">
                            Récemment consultés
                        </h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                            {user.projectHistory
                                .filter(p => hasSavedProject ? (p.filmTitle !== user.filmTitle) : true) // Exclude current if relevant
                                .sort((a, b) => new Date(b.lastAccess).getTime() - new Date(a.lastAccess).getTime())
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
                                        className="w-full text-left p-3 rounded-lg bg-cinema-700/30 hover:bg-cinema-700 border border-transparent hover:border-cinema-600 transition-all group"
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
            <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                    <LottieAnimation
                        url="/animations/clapperboard.json"
                        className="h-24 w-24"
                        loop={true}
                    />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                    Nouveau Projet
                </h2>
                <p className="text-slate-400 text-sm">
                    Entrez les informations de votre nouvelle production.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative group">
                    <Building2 className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-eco-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Société de Production (ex: HBO, Marvel...)"
                        value={formData.productionName}
                        onChange={(e) => setFormData({ ...formData, productionName: e.target.value })}
                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-eco-500 focus:outline-none transition-all"
                        required
                    />
                    <p className="text-[10px] text-slate-500 mt-1 ml-1">
                        * Ce nom doit être identique pour toute l'équipe afin de rejoindre le même projet.
                    </p>
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
                    />
                </div>

                {(user?.department === 'PRODUCTION') && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
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

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 transition-all transform hover:scale-[1.02] mt-6 flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <>
                            <Plus className="h-5 w-5" />
                            Créer l'espace
                        </>
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
