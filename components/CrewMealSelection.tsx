import React, { useState, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { CrewMealChoice } from '../types';
import { Utensils, Calendar, Check, Send, Coffee } from 'lucide-react';
import toast from 'react-hot-toast';

export const CrewMealSelection: React.FC = () => {
    const { project, updateProjectDetails, user } = useProject();
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // Current menu available
    const existingMenu = useMemo(() => {
        return project.dailyMenus?.find(m => m.date === selectedDate);
    }, [project.dailyMenus, selectedDate]);

    // User's existing choice
    const existingChoice = useMemo(() => {
        return project.mealChoices?.find(c => c.date === selectedDate && c.userId === user?.email);
    }, [project.mealChoices, selectedDate, user]);

    // Form state
    const [starter, setStarter] = useState<string>(existingChoice?.starter || '');
    const [main, setMain] = useState<string>(existingChoice?.main || '');
    const [dessert, setDessert] = useState<string>(existingChoice?.dessert || '');
    const [drink, setDrink] = useState<string>(existingChoice?.drink || '');
    const [wantsCoffee, setWantsCoffee] = useState<boolean>(existingChoice?.wantsCoffee || false);

    // Sync form on date change
    React.useEffect(() => {
        setStarter(existingChoice?.starter || '');
        setMain(existingChoice?.main || '');
        setDessert(existingChoice?.dessert || '');
        setDrink(existingChoice?.drink || '');
        setWantsCoffee(existingChoice?.wantsCoffee || false);
    }, [existingChoice]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) return;

        const newChoice: CrewMealChoice = {
            id: existingChoice?.id || `${selectedDate}_${user.email}`,
            date: selectedDate,
            userId: user.email,
            userName: user.name || user.email,
            department: user.department,
            starter: starter || undefined,
            main: main || undefined,
            dessert: dessert || undefined,
            drink: drink || undefined,
            wantsCoffee,
            hasReceived: existingChoice?.hasReceived || false
        };

        const otherChoices = (project.mealChoices || []).filter(c => c.id !== newChoice.id);

        try {
            await updateProjectDetails({ mealChoices: [...otherChoices, newChoice] });
            toast.success('Choix de repas enregistré avec succès !', {
                style: {
                    background: '#10b981', // emerald-500
                    color: '#fff',
                },
                iconTheme: {
                    primary: '#fff',
                    secondary: '#10b981',
                },
            });
        } catch (error) {
            toast.error('Erreur lors de la sauvegarde.');
        }
    };

    const renderRadioGroup = (label: string, value: string, setter: React.Dispatch<React.SetStateAction<string>>, options: string[]) => {
        if (!options || options.length === 0) return null;

        return (
            <div className="bg-cinema-900/50 p-4 rounded-xl border border-cinema-700/50 mb-4 animate-in fade-in slide-in-from-bottom-2">
                <h4 className="font-bold text-slate-300 text-sm mb-3">{label}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {options.map((opt, idx) => (
                        <label
                            key={idx}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${value === opt ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-cinema-800 border-cinema-700 text-slate-300 hover:border-cinema-500'}`}
                        >
                            <input
                                type="radio"
                                name={label}
                                value={opt}
                                checked={value === opt}
                                onChange={() => setter(opt)}
                                className="w-4 h-4 text-blue-600 bg-cinema-900 border-cinema-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium flex-1">{opt}</span>
                        </label>
                    ))}
                    {/* Option to clear selection if not required */}
                    <label
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${value === '' ? 'bg-slate-700/50 border-slate-500 text-slate-300' : 'bg-cinema-800 border-cinema-700 text-slate-500 hover:border-cinema-500'}`}
                    >
                        <input
                            type="radio"
                            name={label}
                            value=""
                            checked={value === ''}
                            onChange={() => setter('')}
                            className="w-4 h-4 text-slate-600 bg-cinema-900 border-cinema-600 focus:ring-slate-500"
                        />
                        <span className="text-sm italic">Aucun / Sans</span>
                    </label>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-2xl mx-auto w-full space-y-6 animate-in fade-in">
            {/* Header / Date Pick */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-cinema-800 p-6 rounded-xl border border-cinema-700">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
                        <Utensils className="h-8 w-8" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Mon Choix Repas</h2>
                        <div className="flex items-center gap-2 text-slate-400 mt-1">
                            <Calendar className="h-4 w-4" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent border-none text-white focus:ring-0 p-0 text-sm font-medium"
                            />
                        </div>
                    </div>
                </div>

                {existingChoice && (
                    <div className="bg-emerald-900/50 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap">
                        <Check size={16} /> Enregistré
                    </div>
                )}
            </div>

            {/* Content Based on Menu Availability */}
            {!existingMenu?.isPublished ? (
                <div className="bg-cinema-800 border border-dashed border-cinema-700 rounded-xl p-12 text-center text-slate-400">
                    <Utensils size={48} className="mx-auto mb-4 text-slate-600" />
                    <p className="text-lg font-medium text-slate-300 mb-2">Aucun menu disponible</p>
                    <p>La Régie n'a pas encore publié le menu pour cette journée.</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="bg-cinema-800 rounded-xl border border-cinema-700 p-6 shadow-xl">
                    <div className="mb-6 pb-6 border-b border-cinema-700">
                        <h3 className="text-lg font-bold text-white mb-2">Composez votre repas pour le {new Date(selectedDate).toLocaleDateString('fr-FR')}</h3>
                        <p className="text-sm text-slate-400">Sélectionnez vos préférences parmi les options prévues par la Régie.</p>
                    </div>

                    <div className="space-y-2">
                        {renderRadioGroup("🍽️ Entrée", starter, setStarter, existingMenu.starters)}
                        {renderRadioGroup("🥘 Plat Principal", main, setMain, existingMenu.mains)}
                        {renderRadioGroup("🍰 Dessert", dessert, setDessert, existingMenu.desserts)}
                        {renderRadioGroup("🥤 Boisson", drink, setDrink, existingMenu.drinks)}

                        {existingMenu.hasCoffee && (
                            <div className="bg-cinema-900/50 p-4 rounded-xl border border-cinema-700/50 flex justify-between items-center mt-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                                        <Coffee size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-300 text-sm">Café / Thé de fin de repas</h4>
                                        <p className="text-xs text-slate-500">Souhaitez-vous une boisson chaude ?</p>
                                    </div>
                                </div>
                                <label className="flex items-center cursor-pointer">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={wantsCoffee}
                                            onChange={(e) => setWantsCoffee(e.target.checked)}
                                        />
                                        <div className={`block w-14 h-8 rounded-full transition-colors ${wantsCoffee ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
                                        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${wantsCoffee ? 'transform translate-x-6' : ''}`}></div>
                                    </div>
                                    <span className={`ml-3 text-sm font-bold ${wantsCoffee ? 'text-emerald-400' : 'text-slate-500'}`}>
                                        {wantsCoffee ? 'OUI' : 'NON'}
                                    </span>
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-cinema-700 flex justify-end">
                        <button
                            type="submit"
                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
                        >
                            <Send size={18} />
                            Valider mes choix
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};
