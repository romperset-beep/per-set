import React, { useState, useEffect, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { Department, CateringLog, UserProfile } from '../types';
import { Utensils, Calendar, UserPlus, Check, X, Leaf, PieChart as PieIcon, Download } from 'lucide-react';

export const CateringWidget: React.FC = () => {
    const { project, updateProjectDetails, user, userProfiles, currentDept } = useProject();
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false);

    // Guest Form
    const [guestName, setGuestName] = useState('');
    const [guestDept, setGuestDept] = useState<Department | 'PRODUCTION'>(Department.REGIE);
    const [guestDiet, setGuestDiet] = useState<string>('');

    const isProduction = currentDept === 'PRODUCTION';
    const isRegie = currentDept === Department.REGIE || isProduction; // Prod can also edit if needed, or just view

    // Get logs for selected date
    const dailyLogs = useMemo(() => {
        return (project.cateringLogs || []).filter(log => log.date === selectedDate);
    }, [project.cateringLogs, selectedDate]);

    // Check validation status
    const isValidated = useMemo(() => {
        return project.cateringValidations?.[selectedDate] || false;
    }, [project.cateringValidations, selectedDate]);

    // Merge User Profiles with Logs
    const tableData = useMemo(() => {
        // 1. Existing Users
        const userRows = userProfiles.map(profile => {
            const log = dailyLogs.find(l => l.userId === profile.email); // Assume email is ID for now
            return {
                id: profile.email,
                name: `${profile.firstName} ${profile.lastName}`,
                department: profile.department,
                diet: profile.dietaryHabits || 'Standard',
                hasEaten: log?.hasEaten || false,
                isVegetarian: log?.isVegetarian || (profile.dietaryHabits === 'Végétarien' || profile.dietaryHabits === 'Végétalien (Vegan)'), // Auto-check if profile says so
                isManual: false,
                role: profile.role
            };
        });

        // 2. Manual Guests
        const manualRows = dailyLogs.filter(l => l.isManual).map(log => ({
            id: log.id,
            name: log.guestName || 'Invité',
            department: log.department,
            diet: 'Invité',
            hasEaten: log.hasEaten,
            isVegetarian: log.isVegetarian,
            isManual: true,
            role: 'Invité'
        }));

        return [...userRows, ...manualRows].sort((a, b) => {
            if (a.department !== b.department) return a.department.localeCompare(b.department);
            return a.name.localeCompare(b.name);
        });
    }, [userProfiles, dailyLogs]);

    const handleToggleMeal = async (row: any, field: 'hasEaten' | 'isVegetarian') => {
        if (!isRegie || isValidated) return; // Read-only for others or if validated

        const newValue = !row[field];
        const logId = row.isManual ? row.id : `${selectedDate}_${row.id}`;

        let newLogs = [...(project.cateringLogs || [])];
        const existingLogIndex = newLogs.findIndex(l => l.id === logId);

        if (existingLogIndex >= 0) {
            newLogs[existingLogIndex] = { ...newLogs[existingLogIndex], [field]: newValue };
        } else {
            // Create new log entry
            newLogs.push({
                id: logId,
                date: selectedDate,
                userId: row.isManual ? undefined : row.id,
                department: row.department,
                hasEaten: field === 'hasEaten' ? newValue : false,
                isVegetarian: field === 'isVegetarian' ? newValue : row.isVegetarian, // Keep profile default if toggling eaten
                isManual: false,
                guestName: row.name // Redundant for users but good for consistency
            });
        }

        // If toggling 'hasEaten' to true, ensure we have a log. If false, maybe remove or keep as false? 
        // We accept keeping false records.

        await updateProjectDetails({ cateringLogs: newLogs });
    };

    const handleAddGuest = async () => {
        if (!guestName || isValidated) return;

        const logId = `${selectedDate}_guest_${Date.now()}`;
        const newLog: CateringLog = {
            id: logId,
            date: selectedDate,
            guestName,
            department: guestDept,
            hasEaten: true, // Auto-check eaten when adding manual guest? Yes usually.
            isVegetarian: guestDiet === 'Végétarien',
            isManual: true
        };

        const newLogs = [...(project.cateringLogs || []), newLog];
        await updateProjectDetails({ cateringLogs: newLogs });

        setGuestName('');
        setIsAddGuestModalOpen(false);
    };

    const handleValidateDay = async () => {
        if (!window.confirm("Valider définitivement la feuille pour aujourd'hui ?")) return;

        const newValidations = { ...(project.cateringValidations || {}), [selectedDate]: true };
        await updateProjectDetails({ cateringValidations: newValidations });
    };

    // View Mode for Production
    const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');

    // Helper: Get ISO Week
    const getWeekNumber = (d: Date) => {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return { week: weekNo, year: d.getUTCFullYear() };
    };

    const getWeekLabel = (weekStr: string) => {
        const [year, week] = weekStr.split('-').map(Number);
        // Approximation of week start date for display
        // Simple label for now
        return `Semaine ${week} (${year})`;
    };

    // Weekly Stats Calculation
    const weeklyStats = useMemo(() => {
        if (!project.cateringLogs) return [];

        const weeks: Record<string, { total: number, veggie: number, firstDate: string }> = {};

        project.cateringLogs.forEach(log => {
            if (!log.hasEaten) return;
            const date = new Date(log.date);
            const { week, year } = getWeekNumber(date);
            const key = `${year}-${week}`;

            if (!weeks[key]) weeks[key] = { total: 0, veggie: 0, firstDate: log.date };
            weeks[key].total++;
            if (log.isVegetarian) weeks[key].veggie++;
        });

        return Object.entries(weeks)
            .sort((a, b) => b[0].localeCompare(a[0])) // Descending (newest first)
            .map(([key, data]) => ({
                key,
                label: getWeekLabel(key),
                ...data
            }));
    }, [project.cateringLogs]);

    // Summary Calculations (Daily)
    const stats = useMemo(() => {
        const total = dailyLogs.filter(l => l.hasEaten).length;
        const veggie = dailyLogs.filter(l => l.hasEaten && l.isVegetarian).length;
        const byDept: Record<string, { total: number, veggie: number }> = {};

        dailyLogs.filter(l => l.hasEaten).forEach(log => {
            if (!byDept[log.department]) byDept[log.department] = { total: 0, veggie: 0 };
            byDept[log.department].total++;
            if (log.isVegetarian) byDept[log.department].veggie++;
        });

        return { total, veggie, byDept };
    }, [dailyLogs]);

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-cinema-800 p-6 rounded-xl border border-cinema-700">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-500/20 rounded-xl text-orange-400">
                        <Utensils className="h-8 w-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Feuille Cantine</h2>
                        <div className="flex items-center gap-2 text-slate-400 mt-1">
                            <Calendar className="h-4 w-4" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent border-none text-white focus:ring-0 p-0 text-sm font-medium"
                            />
                            {isValidated && (
                                <span className="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded border border-green-500/30 flex items-center gap-1">
                                    <Check className="h-3 w-3" /> Validé
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* View Toggle for Production */}
                    {isProduction && (
                        <div className="bg-cinema-900 rounded-lg p-1 flex gap-1 border border-cinema-700">
                            <button
                                onClick={() => setViewMode('daily')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'daily' ? 'bg-cinema-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                            >
                                Jour
                            </button>
                            <button
                                onClick={() => setViewMode('weekly')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'weekly' ? 'bg-cinema-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                            >
                                Semaine
                            </button>
                        </div>
                    )}

                    {viewMode === 'daily' && (
                        <>
                            <div className="text-center">
                                <span className="block text-2xl font-bold text-white">{stats.total}</span>
                                <span className="text-xs text-slate-400 uppercase font-bold">Repas Total</span>
                            </div>
                            <div className="text-center">
                                <span className="block text-2xl font-bold text-eco-400">{stats.veggie}</span>
                                <span className="text-xs text-slate-400 uppercase font-bold text-eco-400/70">Dont Végé</span>
                            </div>
                        </>
                    )}

                    {isRegie && (
                        <div className="flex gap-2">
                            {!isValidated ? (
                                <>
                                    <button
                                        onClick={() => setIsAddGuestModalOpen(true)}
                                        className="bg-cinema-700 hover:bg-cinema-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors border border-cinema-600"
                                    >
                                        <UserPlus className="h-4 w-4" />
                                        <span className="hidden md:inline">Ajouter Invité</span>
                                    </button>
                                    <button
                                        onClick={handleValidateDay}
                                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-green-600/20"
                                    >
                                        <Check className="h-4 w-4" />
                                        <span className="hidden md:inline">Valider</span>
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={async () => {
                                        if (!window.confirm("Voulez-vous déverrouiller cette feuille pour la modifier ?")) return;
                                        const newValidations = { ...(project.cateringValidations || {}), [selectedDate]: false };
                                        await updateProjectDetails({ cateringValidations: newValidations });
                                    }}
                                    className="bg-cinema-700 hover:bg-cinema-600 text-slate-300 hover:text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors border border-cinema-600"
                                >
                                    <Utensils className="h-4 w-4" />
                                    <span className="hidden md:inline">Modifier</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </header>

            {/* WEEKLY VIEW TABLE */}
            {viewMode === 'weekly' ? (
                <div className="bg-cinema-800 rounded-xl border border-cinema-700 overflow-hidden animate-in fade-in">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-cinema-900/50 border-b border-cinema-700 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                                <th className="px-6 py-4">Semaine</th>
                                <th className="px-6 py-4 text-center">Total Repas</th>
                                <th className="px-6 py-4 text-center">Dont Végétariens</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-cinema-700">
                            {weeklyStats.length > 0 ? weeklyStats.map((week) => (
                                <tr key={week.key} className="hover:bg-cinema-700/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-white text-lg">{week.label}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-xl font-bold text-white">{week.total}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-xl font-bold text-eco-400">{week.veggie}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => {
                                                setSelectedDate(week.firstDate);
                                                setViewMode('daily');
                                            }}
                                            className="text-blue-400 hover:text-blue-300 text-sm font-bold hover:underline"
                                        >
                                            Voir Détail
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        Aucune donnée enregistrée pour le moment.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <>
                    {/* Production Summary View (Daily) */}
                    {isProduction && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {Object.entries(stats.byDept).map(([dept, count]) => (
                                <div key={dept} className="bg-cinema-800 p-4 rounded-xl border border-cinema-700">
                                    <h4 className="text-sm font-bold text-slate-300 mb-2">{dept}</h4>
                                    <div className="flex justify-between items-end">
                                        <span className="text-2xl font-bold text-white">{count.total}</span>
                                        <span className="text-sm font-medium text-eco-400 flex items-center gap-1">
                                            <Leaf className="h-3 w-3" /> {count.veggie}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Main Table (Daily) */}
                    <div className="bg-cinema-800 rounded-xl border border-cinema-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-cinema-900/50 border-b border-cinema-700 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        <th className="px-6 py-4">Nom</th>
                                        <th className="px-6 py-4">Département & Fonction</th>
                                        <th className="px-6 py-4">Régime</th>
                                        <th className="px-6 py-4 text-center">A Mangé ?</th>
                                        <th className="px-6 py-4 text-center">Végétarien ?</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cinema-700">
                                    {tableData.map((row) => (
                                        <tr key={row.id} className="hover:bg-cinema-700/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-white flex items-center gap-2">
                                                    {row.name}
                                                    {row.isManual && <span className="text-[10px] bg-blue-900/50 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">INVITÉ</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-white">{row.department}</div>
                                                <div className="text-xs text-slate-500">{row.role}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {row.diet !== 'Standard' ? (
                                                    <span className="text-xs font-bold bg-purple-900/50 text-purple-400 px-2 py-1 rounded border border-purple-500/30">
                                                        {row.diet}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-600">Standard</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleToggleMeal(row, 'hasEaten')}
                                                    disabled={!isRegie}
                                                    className={`p-2 rounded-lg transition-all ${row.hasEaten
                                                        ? 'bg-green-600 text-white shadow-lg shadow-green-600/20 scale-110'
                                                        : 'bg-cinema-900 text-slate-600 hover:bg-cinema-700'
                                                        } ${!isRegie && 'opacity-50 cursor-not-allowed'}`}
                                                >
                                                    <Check className="h-5 w-5" />
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleToggleMeal(row, 'isVegetarian')}
                                                    disabled={!isRegie}
                                                    className={`p-2 rounded-lg transition-all ${row.isVegetarian
                                                        ? 'bg-eco-600 text-white shadow-lg shadow-eco-600/20'
                                                        : 'bg-cinema-900 text-slate-600 hover:bg-cinema-700'
                                                        } ${!isRegie && 'opacity-50 cursor-not-allowed'}`}
                                                >
                                                    <Leaf className="h-5 w-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Add Guest Modal */}
            {isAddGuestModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-cinema-800 rounded-xl border border-cinema-700 w-full max-w-md p-6 relative">
                        <button
                            onClick={() => setIsAddGuestModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-eco-400" />
                            Ajouter un Invité
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Nom Prénom</label>
                                <input
                                    type="text"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-3 text-white focus:border-eco-500 outline-none"
                                    placeholder="Ex: Chauffeur Camion"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Département (Rattachement)</label>
                                <select
                                    value={guestDept}
                                    onChange={(e) => setGuestDept(e.target.value as any)}
                                    className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-3 text-white focus:border-eco-500 outline-none"
                                >
                                    {Object.values(Department).map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                    <option value="PRODUCTION">Production</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Régime Spécifique</label>
                                <select
                                    value={guestDiet}
                                    onChange={(e) => setGuestDiet(e.target.value)}
                                    className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-3 text-white focus:border-eco-500 outline-none"
                                >
                                    <option value="">Standard</option>
                                    <option value="Végétarien">Végétarien</option>
                                    <option value="Sans Porc">Sans Porc</option>
                                </select>
                            </div>

                            <button
                                onClick={handleAddGuest}
                                disabled={!guestName}
                                className="w-full bg-eco-600 hover:bg-eco-500 text-white font-bold py-3 rounded-lg mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Valider & Ajouter
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
