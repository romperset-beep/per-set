import React, { useState, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { EnergyLog, Department } from '../types';
import { Zap, Droplet, Activity, Save, AlertTriangle, Calendar } from 'lucide-react';

export const EnergyTracker: React.FC = () => {
    const { project, updateProjectDetails, user, currentDept } = useProject();
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // Form State
    const [generatorHours, setGeneratorHours] = useState('');
    const [fuelLiters, setFuelLiters] = useState('');
    const [gridKwh, setGridKwh] = useState('');
    const [notes, setNotes] = useState('');

    const isAuthorized = user?.department === 'PRODUCTION' || user?.department === Department.LUMIERE;

    // Get current log
    const currentLog = useMemo(() => {
        return (project.energyLogs || []).find(l => l.date === selectedDate);
    }, [project.energyLogs, selectedDate]);

    // Load form when date changes
    React.useEffect(() => {
        if (currentLog) {
            setGeneratorHours(currentLog.generatorHours.toString());
            setFuelLiters(currentLog.fuelLiters.toString());
            setGridKwh(currentLog.gridKwh.toString());
            setNotes(currentLog.notes || '');
        } else {
            setGeneratorHours('');
            setFuelLiters('');
            setGridKwh('');
            setNotes('');
        }
    }, [currentLog, selectedDate]);

    const handleSave = async () => {
        if (!isAuthorized) return;

        const newLog: EnergyLog = {
            id: currentLog?.id || `${selectedDate}_energy`,
            date: selectedDate,
            generatorHours: parseFloat(generatorHours) || 0,
            fuelLiters: parseFloat(fuelLiters) || 0,
            gridKwh: parseFloat(gridKwh) || 0,
            notes,
            submittedBy: user?.name
        };

        const otherLogs = (project.energyLogs || []).filter(l => l.date !== selectedDate);
        await updateProjectDetails({ energyLogs: [...otherLogs, newLog] });
        alert('Données Énergie sauvegardées.');
    };

    // Calculate Totals
    const totals = useMemo(() => {
        return (project.energyLogs || []).reduce((acc, log) => ({
            hours: acc.hours + log.generatorHours,
            fuel: acc.fuel + log.fuelLiters,
            grid: acc.grid + log.gridKwh
        }), { hours: 0, fuel: 0, grid: 0 });
    }, [project.energyLogs]);

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full text-slate-500">
                <AlertTriangle className="h-12 w-12 mb-4" />
                <p>Accès réservé à l'équipe Lumière et à la Production.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
            {/* Header */}
            <div className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-yellow-500/20 rounded-xl text-yellow-400">
                        <Zap className="h-8 w-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Suivi Énergie</h2>
                        <p className="text-slate-400">Groupes Électrogènes & Réseau</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-cinema-900 p-1.5 rounded-lg border border-cinema-700">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-transparent border-none text-white focus:ring-0 p-0 text-sm font-bold"
                    />
                </div>
            </div>

            {/* Dashboard Mini */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-cinema-800 p-4 rounded-xl border border-cinema-700">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Activity className="h-4 w-4" /> Total Heures Groupe
                    </div>
                    <div className="text-2xl font-bold text-white">{totals.hours} h</div>
                </div>
                <div className="bg-cinema-800 p-4 rounded-xl border border-cinema-700">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Droplet className="h-4 w-4" /> Total Carburant
                    </div>
                    <div className="text-2xl font-bold text-yellow-500">{totals.fuel} L</div>
                </div>
                <div className="bg-cinema-800 p-4 rounded-xl border border-cinema-700">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Zap className="h-4 w-4" /> Total Réseau
                    </div>
                    <div className="text-2xl font-bold text-blue-400">{totals.grid} kWh</div>
                </div>
            </div>

            {/* Form */}
            <div className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 space-y-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-400" />
                    Saisie Journalière ({new Date(selectedDate).toLocaleDateString()})
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-yellow-500 uppercase tracking-wider">Groupe Électrogène</h4>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Heures de Fonctionnement</label>
                            <input
                                type="number"
                                value={generatorHours}
                                onChange={e => setGeneratorHours(e.target.value)}
                                placeholder="0"
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-3 text-white focus:border-yellow-500/50 outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Carburant Consommé (Litres)</label>
                            <input
                                type="number"
                                value={fuelLiters}
                                onChange={e => setFuelLiters(e.target.value)}
                                placeholder="0"
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-3 text-white focus:border-yellow-500/50 outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Réseau Électrique</h4>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Consommation Relevée (kWh)</label>
                            <input
                                type="number"
                                value={gridKwh}
                                onChange={e => setGridKwh(e.target.value)}
                                placeholder="0"
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-3 text-white focus:border-blue-500/50 outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Notes / Observations</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Ex: Groupe B en panne..."
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-3 text-white focus:border-blue-500/50 outline-none transition-colors h-[52px]"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-cinema-700 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-green-600/20 transition-all"
                    >
                        <Save className="h-5 w-5" />
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>
    );
};
