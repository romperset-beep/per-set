import React, { useState } from 'react';
import { Building2, Film, ArrowRight, Loader2, Plus, LogOut } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

interface ProjectSelectionProps {
    onProjectSelected: () => void;
}

export const ProjectSelection: React.FC<ProjectSelectionProps> = ({ onProjectSelected }) => {
    const { updateProjectDetails, user, logout, joinProject } = useProject();
    const [isLoading, setIsLoading] = useState(false);
    import { Film, Plus, Users, ArrowLeft } from 'lucide-react';
    import { LottieAnimation } from './LottieAnimation';

    export const ProjectSelection: React.FC = () => {
        const { joinProject, createProject, user } = useProject();

        // Default view: if we have saved info for current user, show CHOICE. Else FORM.
        // For simplicity in this demo, defaulting to FORM unless we implement specific logic.
        // Ideally we check if getLastProject(user.email) exists.
        const [view, setView] = useState<'choice' | 'form'>('form');

        const [isCreating, setIsCreating] = useState(false);
        const [projectCode, setProjectCode] = useState('');
        const [productionName, setProductionName] = useState('');
        const [projectTitle, setProjectTitle] = useState('');
        const [email, setEmail] = useState('');

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
                                <span className="block text-xs font-normal text-emerald-200 uppercase tracking-wider">Continuer sur</span>
                                <span className="text-lg">{user?.filmTitle}</span>
                            </div >
    { isLoading?<Loader2 className = "h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />}
                        </button >

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
                    </div >

    <button
        onClick={logout}
        className="w-full text-slate-500 hover:text-red-400 text-sm py-2 flex items-center justify-center gap-2 transition-colors mt-6"
    >
        <LogOut className="h-4 w-4" /> Se déconnecter
    </button>
                </div >
            </div >
        );
    }

return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-cinema-800 border border-cinema-700 p-8 rounded-2xl shadow-2xl relative z-10">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg transform rotate-3">
                    <Plus className="h-8 w-8 text-white" />
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
