import React, { useState, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { TimeLog } from '../types';
import { Clock, Calendar, Save, Trash2, StopCircle, PlayCircle, Utensils, Users, ChevronRight, ArrowLeft } from 'lucide-react';

export const TimesheetWidget: React.FC = () => {
    const { project, updateProjectDetails, user } = useProject();

    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [callTime, setCallTime] = useState('');
    const [mealTime, setMealTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [hasShortenedMeal, setHasShortenedMeal] = useState(false);

    // Calculate hours helper
    const calculateHours = (start: string, meal: string, end: string, shortMeal: boolean) => {
        if (!start || !end) return 0;

        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);

        let startMin = startH * 60 + startM;
        let endMin = endH * 60 + endM;

        // Handle overnight shifts (crossing midnight)
        if (endMin < startMin) {
            endMin += 24 * 60;
        }

        let duration = endMin - startMin;

        // Deduct meal
        const mealDeduction = shortMeal ? 30 : 60;
        duration -= mealDeduction;

        return Math.max(0, duration / 60);
    };

    const handleSaveLog = async () => {
        if (!callTime || !endTime || !user) return;

        const totalHours = calculateHours(callTime, mealTime, endTime, hasShortenedMeal);
        const logId = `${date}_${user.email}`;

        const newLog: TimeLog = {
            id: logId,
            userId: user.email,
            userName: user.name,
            department: user.department,
            date,
            callTime,
            mealTime: mealTime || '', // Optional if no meal break? Usually mandatory but let's handle empty
            hasShortenedMeal,
            endTime,
            totalHours
        };

        // Remove existing log for same day/user if any, then add new
        const otherLogs = (project.timeLogs || []).filter(l => l.id !== logId);
        const newLogs = [...otherLogs, newLog];

        await updateProjectDetails({ timeLogs: newLogs });

        // Reset form (optional, maybe keep date?)
        // setCallTime('');
        // setMealTime('');
        // setEndTime('');
    };

    const handleDeleteLog = async (logId: string) => {
        if (!window.confirm('Supprimer cette entrée ?')) return;
        const newLogs = (project.timeLogs || []).filter(l => l.id !== logId);
        await updateProjectDetails({ timeLogs: newLogs });
    };

    // Production Supervision State
    const [viewMode, setViewMode] = useState<'personal' | 'team'>('personal');
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    const isProduction = user?.department === 'PRODUCTION' || user?.department === 'Régie';

    // Group logs by week
    const getWeekNumber = (d: Date) => {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return { week: weekNo, year: d.getUTCFullYear() };
    };

    // Personal Logs
    const personalLogs = useMemo(() => {
        if (!user || !project.timeLogs) return [];
        return project.timeLogs
            .filter(l => l.userId === user.email)
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [project.timeLogs, user]);

    // Team Logs (Grouped by Dept -> User)
    const teamStructure = useMemo(() => {
        if (!project.timeLogs) return {};
        const structure: Record<string, Record<string, { name: string, lastLog: string }>> = {};

        project.timeLogs.forEach(log => {
            if (!structure[log.department]) structure[log.department] = {};
            if (!structure[log.department][log.userId]) {
                structure[log.department][log.userId] = { name: log.userName, lastLog: log.date };
            }
            // Update last log date if newer
            if (log.date > structure[log.department][log.userId].lastLog) {
                structure[log.department][log.userId].lastLog = log.date;
            }
        });
        return structure;
    }, [project.timeLogs]);

    // Active Logs for display (Personal OR Selected User)
    const activeLogs = useMemo(() => {
        if (viewMode === 'personal') return personalLogs;
        if (selectedUserId && project.timeLogs) {
            return project.timeLogs
                .filter(l => l.userId === selectedUserId)
                .sort((a, b) => b.date.localeCompare(a.date));
        }
        return [];
    }, [viewMode, selectedUserId, personalLogs, project.timeLogs]);

    const weeklyData = useMemo(() => {
        const weeks: Record<string, { totalHours: number, logs: TimeLog[] }> = {};

        activeLogs.forEach(log => {
            const d = new Date(log.date);
            const { week, year } = getWeekNumber(d);
            const key = `${year}-W${week}`;

            if (!weeks[key]) weeks[key] = { totalHours: 0, logs: [] };
            weeks[key].logs.push(log);
            weeks[key].totalHours += log.totalHours;
        });

        return Object.entries(weeks).sort((a, b) => b[0].localeCompare(a[0]));
    }, [activeLogs]);

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-cinema-800 p-6 rounded-xl border border-cinema-700">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
                        <Clock className="h-8 w-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Les Heures</h2>
                        <p className="text-slate-400">Saisie et suivi de vos heures de travail</p>
                    </div>
                </div>

                {isProduction && (
                    <div className="flex bg-cinema-900 rounded-lg p-1 border border-cinema-700">
                        <button
                            onClick={() => { setViewMode('personal'); setSelectedUserId(null); }}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'personal' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Mes Heures
                        </button>
                        <button
                            onClick={() => setViewMode('team')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'team' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Supervision Équipe
                        </button>
                    </div>
                )}
            </div>

            {/* SUPERVISION SELECTION (Only visible in Team Mode) */}
            {viewMode === 'team' && !selectedUserId && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
                    {Object.entries(teamStructure).sort().map(([dept, users]) => (
                        <div key={dept} className="bg-cinema-800 rounded-xl border border-cinema-700 overflow-hidden">
                            <div className="bg-cinema-900/50 px-4 py-3 border-b border-cinema-700 font-bold text-white flex items-center gap-2">
                                <Users className="h-4 w-4 text-slate-400" />
                                {dept}
                            </div>
                            <div className="divide-y divide-cinema-700">
                                {Object.entries(users).map(([uid, uData]) => (
                                    <button
                                        key={uid}
                                        onClick={() => setSelectedUserId(uid)}
                                        className="w-full text-left px-4 py-3 hover:bg-cinema-700/50 transition-colors flex justify-between items-center group"
                                    >
                                        <div>
                                            <div className="text-slate-200 font-medium group-hover:text-white">{uData.name}</div>
                                            <div className="text-[10px] text-slate-500">Dernière saisie : {new Date(uData.lastLog).toLocaleDateString()}</div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-blue-400" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                    {Object.keys(teamStructure).length === 0 && (
                        <div className="col-span-full text-center py-12 text-slate-500">
                            Aucune donnée d'équipe disponible pour le moment.
                        </div>
                    )}
                </div>
            )}

            {/* DETAIL VIEW (Personal OR Selected User) */}
            {(viewMode === 'personal' || selectedUserId) && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">

                    {/* Back Button for Team Mode */}
                    {viewMode === 'team' && selectedUserId && (
                        <button
                            onClick={() => setSelectedUserId(null)}
                            className="mb-4 flex items-center gap-2 text-slate-400 hover:text-white hover:underline transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Retour à la liste des équipes
                        </button>
                    )}

                    {/* Horizontal Input Bar (Only Active for Personal Mode) */}
                    {viewMode === 'personal' && (
                        <div className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 shadow-lg mb-8">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-blue-400" />
                                Saisie Rapide
                            </h3>

                            <div className="flex flex-col lg:flex-row gap-4 items-end">
                                <div className="flex-1 w-full lg:w-auto">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none"
                                    />
                                </div>

                                <div className="w-full lg:w-32">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Début</label>
                                    <input
                                        type="time"
                                        value={callTime}
                                        onChange={(e) => setCallTime(e.target.value)}
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none"
                                    />
                                </div>

                                <div className="w-full lg:w-32">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Repas</label>
                                    <input
                                        type="time"
                                        value={mealTime}
                                        onChange={(e) => setMealTime(e.target.value)}
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none"
                                    />
                                </div>

                                <div className="w-full lg:w-32">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Fin</label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none"
                                    />
                                </div>

                                <div className="flex items-center gap-2 h-[42px] bg-cinema-900 px-3 rounded-lg border border-cinema-700">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-cinema-600 bg-cinema-800 text-blue-600 focus:ring-blue-500"
                                        checked={hasShortenedMeal}
                                        onChange={(e) => setHasShortenedMeal(e.target.checked)}
                                    />
                                    <span className="text-xs font-medium text-slate-400 whitespace-nowrap">Repas Écourté (30m)</span>
                                </div>

                                <button
                                    onClick={handleSaveLog}
                                    disabled={!date || !callTime || !endTime}
                                    className="w-full lg:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    <Save className="h-4 w-4" />
                                    <span className="hidden lg:inline">Ajouter</span>
                                    <span className="lg:hidden">Enregistrer</span>
                                </button>

                                <div className="bg-cinema-900/50 px-4 py-2.5 rounded-lg border border-cinema-700 whitespace-nowrap">
                                    <span className="text-slate-500 text-xs font-bold uppercase mr-2">Total :</span>
                                    <span className="text-blue-400 font-bold">
                                        {calculateHours(callTime, mealTime, endTime, hasShortenedMeal).toFixed(2)}h
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Weekly Summary Tables */}
                    <div className="space-y-8">
                        {weeklyData.length > 0 ? weeklyData.map(([weekKey, data]) => (
                            <div key={weekKey} className="bg-white text-slate-900 rounded-sm overflow-hidden shadow-xl">
                                {/* Header styled like paper */}
                                <div className="bg-slate-100 px-6 py-4 flex justify-between items-end border-b border-slate-300">
                                    <div>
                                        <h3 className="font-bold text-xl text-slate-800 uppercase tracking-tight">{weekKey}</h3>
                                        <div className="text-xs text-slate-500 font-mono mt-1">SEMAINE DU {new Date(data.logs[0].date).toLocaleDateString()}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-slate-500 uppercase font-bold">Total Hebdo</div>
                                        <div className="text-2xl font-black text-slate-900 leading-none">{data.totalHours.toFixed(2)} <span className="text-sm font-normal text-slate-500">heures</span></div>
                                    </div>
                                </div>

                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 border-b-2 border-slate-200 text-left text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                                            <th className="px-6 py-3">Jour</th>
                                            <th className="px-6 py-3">Début</th>
                                            <th className="px-6 py-3">Repas</th>
                                            <th className="px-6 py-3">Pause</th>
                                            <th className="px-6 py-3">Fin</th>
                                            <th className="px-6 py-3 text-right">Total Jour</th>
                                            <th className="px-6 py-3 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {data.logs
                                            .sort((a, b) => a.date.localeCompare(b.date))
                                            .map(log => (
                                                <tr key={log.id} className="hover:bg-blue-50/50 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-slate-700">
                                                        {new Date(log.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600 font-mono">{log.callTime}</td>
                                                    <td className="px-6 py-4 text-slate-600 font-mono">{log.mealTime}</td>
                                                    <td className="px-6 py-4 text-slate-500 text-xs">
                                                        {log.hasShortenedMeal ? '30 min' : '1h 00'}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600 font-mono">{log.endTime}</td>
                                                    <td className="px-6 py-4 text-right font-bold text-slate-800 bg-slate-50/50">{log.totalHours.toFixed(2)}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        {/* Only allow delete in Personal Mode, or maybe Admin? Let's restrict to Personal for now */}
                                                        {viewMode === 'personal' && (
                                                            <button
                                                                onClick={() => handleDeleteLog(log.id)}
                                                                className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                                                                title="Supprimer"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50 border-t border-slate-200">
                                        <tr>
                                            <td colSpan={5} className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Total Semaine</td>
                                            <td className="px-6 py-3 text-right font-black text-slate-900 border-l border-slate-200">{data.totalHours.toFixed(2)}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )) : (
                            <div className="bg-cinema-800 rounded-xl border border-cinema-700 p-12 text-center opacity-50">
                                <Clock className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">Aucune fiche d'heure</h3>
                                <p className="text-slate-400">
                                    {viewMode === 'personal' ? 'Remplissez le formulaire ci-dessus pour commencer.' : 'Aucune donnée pour cet utilisateur.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
