
import React, { useState, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { Department, Reinforcement, ReinforcementDetail } from '../types';
import { Users, ChevronLeft, ChevronRight, UserPlus, X, Calendar, Phone, Mail, User, ChevronDown, ChevronUp, ArrowRight, Download } from 'lucide-react';

export const RenfortsWidget: React.FC = () => {
    const { project, updateProjectDetails, user, currentDept, addNotification, notifications, markAsRead } = useProject();

    React.useEffect(() => {
        // Clear notifications when viewing this tab.
        // We filter for notifications related to "Renfort" OR general production notifications if user is prod.
        if (notifications.length > 0) {
            const unread = notifications.filter(n =>
                !n.read && (
                    n.message.toLowerCase().includes('renfort') ||
                    n.type === 'RENFORT' ||
                    (user?.department === 'PRODUCTION' && n.targetDept === 'PRODUCTION') ||
                    (user?.department === Department.REGIE && n.targetDept === 'PRODUCTION') // Regie also sees Prod overview
                )
            );
            if (unread.length > 0) {
                console.log("RenfortsWidget: Clearing notifications", unread);
                unread.forEach(n => markAsRead(n.id));
            }
        }
    }, [user, notifications, markAsRead]);

    // --- Common Helpers ---
    const getStaffList = (r: Reinforcement): ReinforcementDetail[] => {
        if (r.staff && r.staff.length > 0) return r.staff;
        if (r.names && r.names.length > 0) {
            return r.names.map((n, i) => ({ id: `${r.id}_legacy_${i} `, name: n }));
        }
        return [];
    };

    // --- Production View State & Logic ---
    const [prodSelectedWeek, setProdSelectedWeek] = useState<string | null>(null); // 'YYYY-Wxx'
    const [prodExpandedDays, setProdExpandedDays] = useState<string[]>([]); // Date Strings
    const [prodExpandedDepts, setProdExpandedDepts] = useState<string[]>([]); // 'YYYY-MM-DD_DEPT'
    const [viewMode, setViewMode] = useState<'OVERVIEW' | 'MY_TEAM'>('OVERVIEW');

    // Helper to get ISO Week
    const getISOWeek = (d: Date) => {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return { year: d.getUTCFullYear(), week: weekNo };
    };

    const groupedByWeek = useMemo(() => {
        const groups: Record<string, { label: string, count: number, start: Date, end: Date, days: string[] }> = {};

        // Find range of existing reinforcements
        const allDates = (project.reinforcements || []).map(r => r.date).sort();
        if (allDates.length === 0) return {};

        // Populate weeks based on actual data
        (project.reinforcements || []).forEach(r => {
            const d = new Date(r.date);
            const { year, week } = getISOWeek(d);
            const key = `${year} -W${week} `;

            if (!groups[key]) {
                // Calculate start of week (Monday)
                const simple = new Date(d);
                const day = simple.getDay();
                const diff = simple.getDate() - day + (day === 0 ? -6 : 1);
                const start = new Date(simple.setDate(diff));
                const end = new Date(start);
                end.setDate(end.getDate() + 6);

                groups[key] = {
                    label: `Semaine ${week} (${start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })})`,
                    count: 0,
                    start,
                    end,
                    days: []
                };
            }
            const staffCount = getStaffList(r).length;
            groups[key].count += staffCount;
            if (!groups[key].days.includes(r.date)) groups[key].days.push(r.date);
        });

        return groups;
    }, [project.reinforcements]);

    // Helpers for production actions
    const toggleProdDay = (dateStr: string) => {
        setProdExpandedDays(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]);
    };
    const toggleProdDept = (key: string) => {
        setProdExpandedDepts(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    };


    // --- Department View State (Standard) ---
    const [selectedDate, setSelectedDate] = useState(new Date());

    const getWeekDays = (date: Date) => {
        const start = new Date(date);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            days.push(d);
        }
        return days;
    };
    const days = getWeekDays(selectedDate);
    const weekStart = days[0];

    const changeWeek = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        setSelectedDate(newDate);
    };

    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [addingToDate, setAddingToDate] = useState<string | null>(null);

    const getReinforcements = (dateStr: string, dept: string) => {
        return (project.reinforcements || []).filter(r => r.date === dateStr && r.department === dept);
    };

    const handleAddReinforcement = async (dateStr: string) => {
        if (!newName.trim()) return;
        const targetDept = user?.department === 'PRODUCTION' ? currentDept : user?.department;
        if (!targetDept) return;

        const existing = (project.reinforcements || []).find(r => r.date === dateStr && r.department === targetDept);
        let newReinforcements = [...(project.reinforcements || [])];

        const newStaff: ReinforcementDetail = {
            id: `staff_${Date.now()} `,
            name: newName.trim(),
            phone: newPhone.trim(),
            email: newEmail.trim()
        };

        if (existing) {
            const currentStaff = getStaffList(existing);
            const updated = { ...existing, staff: [...currentStaff, newStaff] };
            if (updated.names) delete (updated as any).names;
            newReinforcements = newReinforcements.map(r => r.id === existing.id ? updated : r);
        } else {
            const newR: Reinforcement = {
                id: `${dateStr}_${targetDept} `,
                date: dateStr,
                department: targetDept as any,
                staff: [newStaff]
            };
            newReinforcements.push(newR);
        }

        await updateProjectDetails({ reinforcements: newReinforcements });

        if (user?.department !== 'PRODUCTION') {
            addNotification(
                `Nouveau Renfort: ${newStaff.name} (${targetDept}) pour le ${new Date(dateStr).toLocaleDateString()} `,
                'INFO',
                'PRODUCTION'
            );
        }
        setNewName(''); setNewPhone(''); setNewEmail(''); setAddingToDate(null);
    };

    const handleRemoveReinforcement = async (dateStr: string, dept: string, staffId: string) => {
        if (!window.confirm('Supprimer ce renfort ?')) return;
        const existing = (project.reinforcements || []).find(r => r.date === dateStr && r.department === dept);
        if (!existing) return;
        const currentStaff = getStaffList(existing);
        const newStaff = currentStaff.filter(s => s.id !== staffId);
        let newReinforcements = [...(project.reinforcements || [])];
        if (newStaff.length === 0) {
            newReinforcements = newReinforcements.filter(r => r.id !== existing.id);
        } else {
            const updated = { ...existing, staff: newStaff };
            if (updated.names) delete (updated as any).names;
            newReinforcements = newReinforcements.map(r => r.id === existing.id ? updated : r);
        }
        await updateProjectDetails({ reinforcements: newReinforcements });
    };

    // --- CSV EXPORT (Global) ---
    const downloadReinforcementsCSV = () => {
        const reinforcements = project.reinforcements || [];
        if (reinforcements.length === 0) return alert("Aucun renfort à exporter.");

        // 1. Flatten Data
        const rows: any[] = [];
        reinforcements.forEach(r => {
            const { week, year } = getISOWeek(new Date(r.date));
            const staff = getStaffList(r);
            staff.forEach(s => {
                rows.push({
                    week: `${year}-W${week}`,
                    date: r.date, // Formatted later or raw
                    dept: r.department,
                    name: s.name,
                    phone: s.phone || '',
                    email: s.email || ''
                });
            });
        });

        // 2. Sort: Week DESC > Date ASC > Dept ASC
        rows.sort((a, b) => {
            if (a.week !== b.week) return b.week.localeCompare(a.week);
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.dept.localeCompare(b.dept);
        });

        // 3. Build CSV
        const header = ['Semaine', 'Date', 'Département', 'Nom', 'Téléphone', 'Email'];
        const csvContent = [
            header.join(','),
            ...rows.map(row => [
                row.week,
                row.date,
                row.dept,
                `"${row.name}"`, // Quote names to be safe
                `"${row.phone}"`,
                `"${row.email}"`
            ].join(','))
        ].join('\n');

        // 4. Download
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `Renforts_Global_${new Date().toISOString().split('T')[0]}.csv`);
            link.setAttribute('style', 'visibility:hidden');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const [viewingStaff, setViewingStaff] = useState<ReinforcementDetail | null>(null);

    // --- RENDER ---

    // 1. PRODUCTION VIEW (Hierarchical)
    if (user?.department === 'PRODUCTION' && currentDept === 'PRODUCTION' && viewMode === 'OVERVIEW') {
        const sortedWeeks = Object.entries(groupedByWeek).sort((a, b) => b[0].localeCompare(a[0])); // Recent first

        return (
            <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center gap-4 bg-cinema-800 p-6 rounded-xl border border-cinema-700">
                    <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
                        <Users className="h-8 w-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Renforts Global</h2>
                        <p className="text-slate-400">Vue d'overview par Semaine et Département</p>
                    </div>

                    <div className="w-full md:w-auto md:ml-auto mt-4 md:mt-0 flex gap-4">
                        <button
                            onClick={downloadReinforcementsCSV}
                            className="bg-cinema-900 border border-cinema-700 hover:bg-cinema-700 text-eco-400 font-bold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Download className="h-4 w-4" />
                            <span className="hidden md:inline">Export CSV</span>
                        </button>
                        <button
                            onClick={() => setViewMode('MY_TEAM')}
                            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <UserPlus className="h-4 w-4" />
                            Gérer mes Renforts
                        </button>
                    </div>
                </div>

                <div className="bg-cinema-800/50 rounded-xl border border-cinema-700 overflow-hidden">
                    {/* Level 1: Weeks */}
                    {sortedWeeks.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">Aucun renfort prévu.</div>
                    ) : (
                        <div className="divide-y divide-cinema-700">
                            {sortedWeeks.map(([weekKey, weekData]) => (
                                <div key={weekKey} className="bg-cinema-800">
                                    <button
                                        onClick={() => setProdSelectedWeek(prodSelectedWeek === weekKey ? null : weekKey)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-cinema-700/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            {prodSelectedWeek === weekKey ? <ChevronDown className="h-5 w-5 text-indigo-400" /> : <ChevronRight className="h-5 w-5 text-slate-500" />}
                                            <span className="text-lg font-semibold text-white">{weekData.label}</span>
                                        </div>
                                        <div className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-sm font-bold">
                                            {weekData.count} Renforts
                                        </div>
                                    </button>

                                    {/* Level 2: Days (Expanded) */}
                                    {prodSelectedWeek === weekKey && (
                                        <div className="bg-cinema-900/30 border-t border-cinema-700 pl-4 md:pl-8">
                                            {(() => {
                                                const daysList = [];
                                                for (let i = 0; i < 7; i++) {
                                                    const d = new Date(weekData.start);
                                                    d.setDate(d.getDate() + i);
                                                    daysList.push(d);
                                                }
                                                return daysList.map(dateObj => {
                                                    const dateStr = dateObj.toISOString().split('T')[0];
                                                    // Count for this day
                                                    const dayReinforcements = (project.reinforcements || []).filter(r => r.date === dateStr);
                                                    if (dayReinforcements.length === 0) return null; // Or show empty? "on voit les jours avec nom dept". Let's show existing days or all? "quand on clique sur une semaine on voit les jours".
                                                    // Let's show Mon-Sun of that week.

                                                    const isExpanded = prodExpandedDays.includes(dateStr);
                                                    const dayCount = dayReinforcements.reduce((acc, r) => acc + getStaffList(r).length, 0);

                                                    return (
                                                        <div key={dateStr} className="border-l border-cinema-700 ml-4 my-2">
                                                            <button
                                                                onClick={() => toggleProdDay(dateStr)}
                                                                className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors rounded-r-lg text-left"
                                                            >
                                                                {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                                                                <div className="flex-1">
                                                                    <span className="text-slate-200 font-medium capitalize">
                                                                        {dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                                                                    </span>
                                                                </div>
                                                                {dayCount > 0 && (
                                                                    <span className="text-xs text-slate-400 bg-cinema-800 px-2 py-0.5 rounded border border-cinema-700">
                                                                        {dayCount} prévu(s)
                                                                    </span>
                                                                )}
                                                            </button>

                                                            {/* Level 3: Departments */}
                                                            {isExpanded && (
                                                                <div className="pl-8 pr-4 pb-2 space-y-2">
                                                                    {(() => {
                                                                        // Fix for "Ghost Reinforcements": 
                                                                        // Calculate unique departments present in the data for this day.
                                                                        // This ensures custom departments or 'PRODUCTION' (not in enum) are displayed.
                                                                        const activeDepts = Array.from(new Set(dayReinforcements.map(r => r.department))).sort();

                                                                        return activeDepts.map(dept => {
                                                                            // dept is string here (Department | 'PRODUCTION')
                                                                            const deptItem = dayReinforcements.find(r => r.department === dept);
                                                                            const staff = deptItem ? getStaffList(deptItem) : [];
                                                                            if (staff.length === 0) return null;

                                                                            const deptKey = `${dateStr}_${dept} `;
                                                                            const isDeptExpanded = prodExpandedDepts.includes(deptKey);

                                                                            return (
                                                                                <div key={dept} className="bg-cinema-800 rounded-lg border border-cinema-700">
                                                                                    <button
                                                                                        onClick={() => toggleProdDept(deptKey)}
                                                                                        className="w-full flex items-center justify-between p-3 hover:bg-cinema-700/50 transition-colors rounded-lg"
                                                                                    >
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-sm font-bold text-indigo-300 uppercase">{dept}</span>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-xs font-bold text-white">{staff.length}</span>
                                                                                            <Users className="h-3 w-3 text-slate-400" />
                                                                                        </div>
                                                                                    </button>

                                                                                    {/* Level 4: Names (Contacts) - UPDATED: Clickable, High Contrast */}
                                                                                    {isDeptExpanded && (
                                                                                        <div className="px-3 pb-3 pt-0 grid gap-2">
                                                                                            {staff.map(s => (
                                                                                                <div
                                                                                                    key={s.id}
                                                                                                    onClick={() => setViewingStaff(s)}
                                                                                                    className="bg-slate-700 px-3 py-2 rounded-lg border border-slate-600 hover:border-slate-500 hover:bg-slate-600 transition-colors cursor-pointer flex items-center justify-between shadow-sm group/card"
                                                                                                >
                                                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                                                        <User className="h-4 w-4 text-indigo-300 shrink-0" />
                                                                                                        <span className="font-semibold text-white truncate">{s.name}</span>
                                                                                                    </div>
                                                                                                    <button
                                                                                                        onClick={(e) => { e.stopPropagation(); handleRemoveReinforcement(dateStr, dept as string, s.id); }}
                                                                                                        className="p-1.5 text-slate-400 hover:text-red-400 opacity-0 group-hover/card:opacity-100 transition-opacity"
                                                                                                    >
                                                                                                        <X className="h-4 w-4" />
                                                                                                    </button>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        });
                                                                    })()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            })()}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* RE-USING DETAILS MODAL HERE IF NEEDED, OR ITS GLOBAL */}
                {viewingStaff && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setViewingStaff(null)}
                    >
                        <div
                            className="bg-cinema-800 rounded-xl border border-cinema-700 shadow-2xl w-full max-w-sm p-6 space-y-6 animate-in fade-in zoom-in-95"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-white">{viewingStaff.name}</h3>
                                    <p className="text-sm text-slate-400">Détails du renfort</p>
                                </div>
                                <button onClick={() => setViewingStaff(null)} className="text-slate-400 hover:text-white">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-cinema-900 rounded-lg border border-cinema-700 space-y-3">
                                    {viewingStaff.phone ? (
                                        <a href={`tel:${viewingStaff.phone}`} className="flex items-center gap-3 text-slate-200 hover:text-indigo-400 transition-colors">
                                            <div className="p-2 bg-cinema-800 rounded-full text-indigo-400">
                                                <Phone className="h-4 w-4" />
                                            </div>
                                            <span className="font-medium">{viewingStaff.phone}</span>
                                        </a>
                                    ) : (
                                        <div className="flex items-center gap-3 text-slate-500 opacity-50">
                                            <div className="p-2 bg-cinema-800 rounded-full">
                                                <Phone className="h-4 w-4" />
                                            </div>
                                            <span className="italic">Pas de téléphone</span>
                                        </div>
                                    )}

                                    {viewingStaff.email ? (
                                        <a href={`mailto:${viewingStaff.email}`} className="flex items-center gap-3 text-slate-200 hover:text-indigo-400 transition-colors">
                                            <div className="p-2 bg-cinema-800 rounded-full text-indigo-400">
                                                <Mail className="h-4 w-4" />
                                            </div>
                                            <span className="font-medium truncate">{viewingStaff.email}</span>
                                        </a>
                                    ) : (
                                        <div className="flex items-center gap-3 text-slate-500 opacity-50">
                                            <div className="p-2 bg-cinema-800 rounded-full">
                                                <Mail className="h-4 w-4" />
                                            </div>
                                            <span className="italic">Pas d'email</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => setViewingStaff(null)}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 2. DEPARTMENT VIEW (Original Matrix) - UPDATED
    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-cinema-800 p-6 rounded-xl border border-cinema-700">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
                        <Users className="h-8 w-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Gestion des Renforts</h2>
                        <p className="text-slate-400">
                            {currentDept} - Gestion de votre équipe supplémentaire
                        </p>
                    </div>
                </div>

                {user?.department === 'PRODUCTION' && (
                    <button
                        onClick={() => setViewMode('OVERVIEW')}
                        className="bg-cinema-700 hover:bg-cinema-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <Users className="h-4 w-4" />
                        Vue Globale
                    </button>
                )}

                <div className="flex items-center gap-4 bg-cinema-900 rounded-lg p-1 border border-cinema-700">
                    <button onClick={() => changeWeek('prev')} className="p-2 text-slate-400 hover:text-white transition-colors">
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="text-center px-4">
                        <div className="text-xs text-slate-500 uppercase font-bold">Semaine du</div>
                        <div className="text-white font-mono">{weekStart.toLocaleDateString()}</div>
                    </div>
                    <button onClick={() => changeWeek('next')} className="p-2 text-slate-400 hover:text-white transition-colors">
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Matrix View */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                {days.map((day) => {
                    const dateStr = day.toISOString().split('T')[0];
                    const isToday = new Date().toISOString().split('T')[0] === dateStr;

                    return (
                        <div key={dateStr} className={`bg-cinema-800 rounded-xl border ${isToday ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-cinema-700'} flex flex-col h-full min-h-[300px]`}>
                            {/* Day Header */}
                            <div className={`p-3 text-center border-b ${isToday ? 'bg-indigo-500/10 border-indigo-500' : 'bg-cinema-900/50 border-cinema-700'}`}>
                                <div className={`text-sm font-bold uppercase ${isToday ? 'text-indigo-400' : 'text-slate-400'}`}>
                                    {day.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}
                                </div>
                                <div className={`text-xl font-bold ${isToday ? 'text-white' : 'text-slate-200'}`}>
                                    {day.getDate()}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                                <div className="h-full flex flex-col">
                                    <div className="flex-1 space-y-2">
                                        {(() => {
                                            const targetDept = user?.department === 'PRODUCTION' ? currentDept : user?.department;
                                            const items = getReinforcements(dateStr, targetDept as string);
                                            const staffList = items.length ? getStaffList(items[0]) : [];

                                            return staffList.length > 0 ? (
                                                staffList.map((s) => (
                                                    <div
                                                        key={s.id}
                                                        onClick={() => setViewingStaff(s)}
                                                        className="bg-slate-700 px-3 py-3 rounded-lg flex justify-between items-center border border-slate-600 hover:border-slate-500 hover:bg-slate-600 transition-colors cursor-pointer shadow-sm group"
                                                    >
                                                        <div className="text-sm text-white font-bold truncate pr-2">{s.name}</div>

                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleRemoveReinforcement(dateStr, targetDept as string, s.id); }}
                                                            className="text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                !addingToDate && (
                                                    <div onClick={() => setAddingToDate(dateStr)} className="h-full flex flex-col items-center justify-center text-slate-600 hover:text-indigo-400 cursor-pointer transition-colors border-2 border-dashed border-cinema-700 hover:border-indigo-500/50 rounded-lg p-4 min-h-[100px]">
                                                        <UserPlus className="h-6 w-6 mb-2" />
                                                        <span className="text-xs font-medium">Ajouter</span>
                                                    </div>
                                                )
                                            );
                                        })()}
                                    </div>


                                    {/* Mini Add Button */}
                                    {addingToDate !== dateStr && getReinforcements(dateStr, user?.department === 'PRODUCTION' ? currentDept : user?.department || '').length > 0 && (
                                        <button
                                            onClick={() => setAddingToDate(dateStr)}
                                            className="mt-2 w-full py-2 flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-indigo-400 hover:bg-cinema-700/30 rounded-lg transition-colors border border-transparent hover:border-cinema-700"
                                        >
                                            <UserPlus className="h-3 w-3" />
                                            Ajouter
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* DETAILS MODAL FOR STANDARD VIEW */}
            {viewingStaff && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setViewingStaff(null)}
                >
                    <div
                        className="bg-cinema-800 rounded-xl border border-cinema-700 shadow-2xl w-full max-w-sm p-6 space-y-6 animate-in fade-in zoom-in-95"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-white">{viewingStaff.name}</h3>
                                <p className="text-sm text-slate-400">Détails du renfort</p>
                            </div>
                            <button onClick={() => setViewingStaff(null)} className="text-slate-400 hover:text-white">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-cinema-900 rounded-lg border border-cinema-700 space-y-3">
                                {viewingStaff.phone ? (
                                    <a href={`tel:${viewingStaff.phone}`} className="flex items-center gap-3 text-slate-200 hover:text-indigo-400 transition-colors">
                                        <div className="p-2 bg-cinema-800 rounded-full text-indigo-400">
                                            <Phone className="h-4 w-4" />
                                        </div>
                                        <span className="font-medium">{viewingStaff.phone}</span>
                                    </a>
                                ) : (
                                    <div className="flex items-center gap-3 text-slate-500 opacity-50">
                                        <div className="p-2 bg-cinema-800 rounded-full">
                                            <Phone className="h-4 w-4" />
                                        </div>
                                        <span className="italic">Pas de téléphone</span>
                                    </div>
                                )}

                                {viewingStaff.email ? (
                                    <a href={`mailto:${viewingStaff.email}`} className="flex items-center gap-3 text-slate-200 hover:text-indigo-400 transition-colors">
                                        <div className="p-2 bg-cinema-800 rounded-full text-indigo-400">
                                            <Mail className="h-4 w-4" />
                                        </div>
                                        <span className="font-medium truncate">{viewingStaff.email}</span>
                                    </a>
                                ) : (
                                    <div className="flex items-center gap-3 text-slate-500 opacity-50">
                                        <div className="p-2 bg-cinema-800 rounded-full">
                                            <Mail className="h-4 w-4" />
                                        </div>
                                        <span className="italic">Pas d'email</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => setViewingStaff(null)}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            )}

            {/* Modal for Adding Renfort */}
            {addingToDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => { setAddingToDate(null); setNewName(''); setNewPhone(''); setNewEmail(''); }}
                >
                    <div
                        className="bg-cinema-800 rounded-xl border border-cinema-700 shadow-2xl w-full max-w-md p-6 space-y-6"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Ajouter un Renfort</h3>
                            <button onClick={() => { setAddingToDate(null); setNewName(''); setNewPhone(''); setNewEmail(''); }} className="text-slate-400 hover:text-white">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 text-indigo-300 text-sm font-medium flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(addingToDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Nom Complet <span className="text-red-400">*</span></label>
                                <div className="relative">
                                    <User className="h-4 w-4 absolute left-3 top-3 text-slate-500" />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Ex: Thomas Dubreuil"
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-2.5 pl-10 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Téléphone</label>
                                    <div className="relative">
                                        <Phone className="h-4 w-4 absolute left-3 top-3 text-slate-500" />
                                        <input
                                            type="tel"
                                            placeholder="06 12..."
                                            className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-2.5 pl-10 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                                            value={newPhone}
                                            onChange={e => setNewPhone(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Email</label>
                                    <div className="relative">
                                        <Mail className="h-4 w-4 absolute left-3 top-3 text-slate-500" />
                                        <input
                                            type="email"
                                            placeholder="contact@..."
                                            className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-2.5 pl-10 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                                            value={newEmail}
                                            onChange={e => setNewEmail(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && newName.trim()) handleAddReinforcement(addingToDate);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                onClick={() => { setAddingToDate(null); setNewName(''); setNewPhone(''); setNewEmail(''); }}
                                className="px-4 py-2 text-slate-400 hover:text-white transition-colors font-medium"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => handleAddReinforcement(addingToDate)}
                                disabled={!newName.trim()}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                            >
                                Valider le Renfort
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

