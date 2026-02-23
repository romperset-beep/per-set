import React, { useState, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { MenuOfTheDay, CrewMealChoice, Department } from '../types';
import { Utensils, Calendar, Plus, Trash2, Check, Send, Users, Coffee } from 'lucide-react';

export const MenuEditor: React.FC = () => {
    const { project, updateProjectDetails, userProfiles } = useProject();
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // Current menu context
    const existingMenu = useMemo(() => {
        return project.dailyMenus?.find(m => m.date === selectedDate);
    }, [project.dailyMenus, selectedDate]);

    // Local state for editing
    const [starters, setStarters] = useState<string[]>(existingMenu?.starters || []);
    const [mains, setMains] = useState<string[]>(existingMenu?.mains || []);
    const [desserts, setDesserts] = useState<string[]>(existingMenu?.desserts || []);
    const [drinks, setDrinks] = useState<string[]>(existingMenu?.drinks || []);
    const [hasCoffee, setHasCoffee] = useState<boolean>(existingMenu?.hasCoffee ?? true);

    // Sync local state when date changes
    React.useEffect(() => {
        setStarters(existingMenu?.starters || []);
        setMains(existingMenu?.mains || []);
        setDesserts(existingMenu?.desserts || []);
        setDrinks(existingMenu?.drinks || []);
        setHasCoffee(existingMenu?.hasCoffee ?? true);
    }, [existingMenu]);

    // Input handlers
    const handleAdd = (setter: React.Dispatch<React.SetStateAction<string[]>>, list: string[]) => {
        const value = prompt('Ajouter une option :');
        if (value && value.trim() !== '') {
            setter([...list, value.trim()]);
        }
    };

    const handleRemove = (setter: React.Dispatch<React.SetStateAction<string[]>>, list: string[], index: number) => {
        const newList = [...list];
        newList.splice(index, 1);
        setter(newList);
    };

    const handleSaveMenu = async (publish: boolean) => {
        const newMenu: MenuOfTheDay = {
            id: existingMenu?.id || `${selectedDate}_menu`,
            date: selectedDate,
            starters,
            mains,
            desserts,
            drinks,
            hasCoffee,
            isPublished: publish
        };

        const otherMenus = (project.dailyMenus || []).filter(m => m.date !== selectedDate);
        await updateProjectDetails({ dailyMenus: [...otherMenus, newMenu] });
    };

    // Render list editor helper
    const renderListEditor = (title: string, list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => (
        <div className="bg-cinema-900/50 p-4 rounded-xl border border-cinema-700/50">
            <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-slate-300 text-sm">{title}</h4>
                <button
                    onClick={() => handleAdd(setter, list)}
                    className="p-1.5 bg-cinema-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 rounded-lg transition-colors"
                >
                    <Plus size={16} />
                </button>
            </div>
            {list.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Aucune option</p>
            ) : (
                <ul className="space-y-2">
                    {list.map((item, idx) => (
                        <li key={idx} className="flex justify-between items-center bg-cinema-800 px-3 py-2 rounded-lg text-sm group">
                            <span className="text-slate-200">{item}</span>
                            <button
                                onClick={() => handleRemove(setter, list, idx)}
                                className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={14} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header / Date Pick */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-cinema-800 p-6 rounded-xl border border-cinema-700">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
                        <Utensils className="h-8 w-8" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Création du Menu</h2>
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
                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${existingMenu?.isPublished ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-orange-500/20 text-orange-400 border border-orange-500/20'}`}>
                        {existingMenu?.isPublished ? 'Publié' : 'Brouillon'}
                    </span>
                    <button
                        onClick={() => handleSaveMenu(false)}
                        className="bg-cinema-700 hover:bg-cinema-600 text-slate-300 hover:text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors border border-cinema-600"
                    >
                        <Check size={16} /> <span className="hidden md:inline">Enregistrer</span>
                    </button>
                    {!existingMenu?.isPublished && (
                        <button
                            onClick={() => handleSaveMenu(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
                        >
                            <Send size={16} /> <span className="hidden md:inline">Publier à l'équipe</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-3xl mx-auto space-y-4">
                <h3 className="font-bold text-white text-lg flex items-center gap-2 mb-4">
                    Éditer les composants du menu
                </h3>
                {renderListEditor("Entrées", starters, setStarters)}
                {renderListEditor("Plats principaux", mains, setMains)}
                {renderListEditor("Desserts", desserts, setDesserts)}
                {renderListEditor("Boissons", drinks, setDrinks)}

                <div className="bg-cinema-900/50 p-4 rounded-xl border border-cinema-700/50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Coffee size={18} className="text-amber-600" />
                        <h4 className="font-bold text-slate-300 text-sm">Proposer Café / Thé</h4>
                    </div>
                    <div
                        onClick={() => setHasCoffee(!hasCoffee)}
                        className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${hasCoffee ? 'bg-emerald-500' : 'bg-slate-600'}`}
                    >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${hasCoffee ? 'translate-x-4' : ''}`} />
                    </div>
                </div>
            </div>
        </div>
    );
};
