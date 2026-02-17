
import React, { useState, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { useNotification } from '../context/NotificationContext'; // Added
import { Department, Reinforcement, ReinforcementDetail } from '../types';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, MapPin, User, Truck, Phone, Mail, X, Trash2, Edit2, AlertCircle, Users, UserPlus, ChevronDown, Download, Check, ShieldCheck } from "lucide-react";
import toast from 'react-hot-toast';

export const RenfortsWidget: React.FC = () => {
    const { project, updateProjectDetails, user, currentDept, addNotification, addReinforcement, updateReinforcement, deleteReinforcement } = useProject();
    const { notifications, markAsRead } = useNotification(); // Added

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
    const [viewMode, setViewMode] = useState<'OVERVIEW' | 'MY_TEAM' | 'VALIDATION'>('OVERVIEW');

    // Calculate Pending Validations
    const pendingValidationCount = useMemo(() => {
        if (!project.reinforcements) return 0;
        return (project.reinforcements || []).reduce((acc, r) => {
            const staff = getStaffList(r);
            return acc + staff.filter(s => s.validationStatus === 'PENDING').length;
        }, 0);
    }, [project.reinforcements]);

    // --- DRAG AND DROP STATE (Moved to top level) ---
    const [isDragging, setIsDragging] = useState(false);
    const navThrottleRef = React.useRef<number>(0);

    // Helper: Get Week Info (Relative to Shooting Start or ISO)
    const getWeekInfo = (d: Date) => {
        // 1. Try Relative to Shooting Start
        if (project.shootingStartDate) {
            const start = new Date(project.shootingStartDate);
            const target = new Date(d);
            target.setHours(0, 0, 0, 0);
            start.setHours(0, 0, 0, 0);

            const diffTime = target.getTime() - start.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const weekNum = Math.floor(diffDays / 7) + 1;

            const weekStart = new Date(start);
            weekStart.setDate(start.getDate() + (weekNum - 1) * 7);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            return {
                week: weekNum,
                label: `Semaine ${weekNum} (${weekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - ${weekEnd.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })})`,
                key: `S${weekNum}`,
                start: weekStart // Return start date
            };
        }

        // 2. Fallback to ISO Week
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

        // Calculate ISO Week dates
        const simple = new Date(Date.UTC(d.getUTCFullYear(), 0, 1 + (weekNo - 1) * 7));
        const dow = simple.getUTCDay();
        const monday = simple;
        if (dow <= 4) monday.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
        else monday.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
        const sunday = new Date(monday);
        sunday.setUTCDate(monday.getUTCDate() + 6);

        return {
            week: weekNo,
            label: `Semaine ${weekNo} (${monday.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - ${sunday.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })})`,
            key: `${d.getUTCFullYear()}-${weekNo}`,
            start: monday // Return start date
        };
    };

    const groupedByWeek = useMemo(() => {
        const groups: Record<string, { label: string, count: number, days: string[], start: Date }> = {};

        // Find range of existing reinforcements
        const allDates = (project.reinforcements || []).map(r => r.date).sort();
        if (allDates.length === 0) return {};

        // Populate weeks
        (project.reinforcements || []).forEach(r => {
            const d = new Date(r.date);
            const { key, label, start } = getWeekInfo(d);

            if (!groups[key]) {
                groups[key] = {
                    label,
                    count: 0,
                    days: [],
                    start // Store start date
                };
            }
            const staffCount = getStaffList(r).length;
            groups[key].count += staffCount;
            if (!groups[key].days.includes(r.date)) groups[key].days.push(r.date);
        });

        return groups;
    }, [project.reinforcements, project.shootingStartDate]);

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
    const [newRole, setNewRole] = useState(''); // Added
    const [linkedSequenceId, setLinkedSequenceId] = useState(''); // Added
    const [linkedLocation, setLinkedLocation] = useState(''); // Added
    // Multi-phase selection state
    const [selectedPhases, setSelectedPhases] = useState<{
        PRELIGHT: boolean;
        DEMONTAGE: boolean;
    }>({ PRELIGHT: false, DEMONTAGE: false });
    const [durations, setDurations] = useState<{
        PRELIGHT: number;
        DEMONTAGE: number;
    }>({ PRELIGHT: 1, DEMONTAGE: 1 });
    const [addingToDate, setAddingToDate] = useState<string | null>(null);

    const getReinforcements = (dateStr: string, dept: string) => {
        // Global Visibility Logic:
        // - PRODUCTION sees everything (targetDept determines what is shown)
        // - Others see ONLY their department
        if (user?.department !== 'PRODUCTION' && dept !== user?.department) {
            return [];
        }
        return (project.reinforcements || []).filter(r => r.date === dateStr && r.department === dept);
    };

    const handleValidate = async (dateStr: string, dept: string, staffId: string) => {
        const rein = (project.reinforcements || []).find(r => r.date === dateStr && r.department === dept);
        if (!rein) return;

        const updatedStaff = getStaffList(rein).map(s => {
            if (s.id === staffId) {
                return { ...s, validationStatus: 'APPROVED' as const };
            }
            return s;
        });

        const updatedRein = { ...rein, staff: updatedStaff };
        if ((updatedRein as any).names) delete (updatedRein as any).names; // Normalize
        await updateReinforcement(updatedRein);
        toast.success("Renfort validé");
    };

    const handleAddReinforcement = async (inputDateStr: string | null, keepOpen: boolean = false) => {
        if (!newName.trim()) return;
        const targetDept = user?.department === 'PRODUCTION' ? currentDept : user?.department;
        if (!targetDept) return;

        // 1. Resolve Dates & Offsets
        let targetEntries: { date: string, offset: number, refPoint: 'START' | 'END', type?: 'PRELIGHT' | 'DEMONTAGE' | 'SHOOTING' }[] = [];

        if (linkedLocation && project.pdtDays) {
            // Find location start/end
            const locDays = project.pdtDays
                .filter(d => (d.linkedLocation === linkedLocation || d.location === linkedLocation))
                .sort((a, b) => a.date.localeCompare(b.date));

            if (locDays.length > 0) {
                const firstDay = new Date(locDays[0].date);
                const lastDay = new Date(locDays[locDays.length - 1].date);

                // 1. Handle PRELIGHT
                if (selectedPhases.PRELIGHT) {
                    const dur = durations.PRELIGHT || 1;
                    for (let i = dur; i > 0; i--) {
                        const d = new Date(firstDay);
                        d.setDate(d.getDate() - i);
                        targetEntries.push({
                            date: d.toISOString().split('T')[0],
                            offset: -i,
                            refPoint: 'START',
                            type: 'PRELIGHT'
                        });
                    }
                }

                // 2. Handle DEMONTAGE
                if (selectedPhases.DEMONTAGE) {
                    const dur = durations.DEMONTAGE || 1;
                    for (let i = 1; i <= dur; i++) {
                        const d = new Date(lastDay);
                        d.setDate(d.getDate() + i);
                        targetEntries.push({
                            date: d.toISOString().split('T')[0],
                            offset: i,
                            refPoint: 'END',
                            type: 'DEMONTAGE'
                        });
                    }
                }

                // If NO phases selected (or just Location linking generally implies Shooting support?)
                // The user request was about Prelight OR Demontage OR Both.
                // If neither is selected, maybe they just want to link to the location generally (Shooting)?
                // Let's assume if neither is checked, we default to adding to the specific date clicked but linked (Shooting).
                if (!selectedPhases.PRELIGHT && !selectedPhases.DEMONTAGE) {
                    // SHOOTING - Default behavior if nothing checked but location linked
                    if (inputDateStr) {
                        const d = new Date(inputDateStr);
                        const diffTime = d.getTime() - firstDay.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        targetEntries.push({
                            date: inputDateStr,
                            offset: diffDays,
                            refPoint: 'START',
                            type: 'SHOOTING'
                        });
                    }
                }

            } else if (inputDateStr) {
                targetEntries.push({ date: inputDateStr, offset: 0, refPoint: 'START', type: 'SHOOTING' });
            }
        } else {
            if (inputDateStr) targetEntries.push({ date: inputDateStr, offset: 0, refPoint: 'START', type: 'SHOOTING' });
        }

        // Fallback
        if (targetEntries.length === 0 && inputDateStr) {
            targetEntries.push({ date: inputDateStr, offset: 0, refPoint: 'START', type: 'SHOOTING' });
        }

        // 2. Resolve Names (Comma Separated)
        const namesToAdd = newName.split(',').map(n => n.trim()).filter(n => n.length > 0);

        try {
            for (const entry of targetEntries) {
                const dateStr = entry.date;
                // Find existing reinforcement for this date/dept
                const existing = (project.reinforcements || []).find(r => r.date === dateStr && r.department === targetDept);
                let currentStaff = existing ? getStaffList(existing) : [];

                const newStaffEntries: ReinforcementDetail[] = namesToAdd.map(name => ({
                    id: `staff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name: name,
                    phone: newPhone.trim(),
                    email: newEmail.trim(),
                    role: newRole.trim(),
                    linkedSequenceId: linkedSequenceId || null,
                    linkedLocation: linkedLocation || undefined,
                    linkType: entry.type,
                    dayOffset: entry.offset,
                    duration: (entry.type === 'PRELIGHT' ? durations.PRELIGHT : (entry.type === 'DEMONTAGE' ? durations.DEMONTAGE : 1)),
                    validationStatus: (user?.department === 'PRODUCTION' ? 'APPROVED' : 'PENDING') as 'APPROVED' | 'PENDING' // Auto-approve Production, otherwise pending
                    // Note: refPoint isn't in interface yet, we infer from linkType: PRELIGHT/SHOOTING -> Start, DEMO -> End.
                }));

                if (existing) {
                    const updated = { ...existing, staff: [...currentStaff, ...newStaffEntries] };
                    if (updated.names) delete (updated as any).names;
                    await updateReinforcement(updated);
                } else {
                    const newR: Reinforcement = {
                        id: `${dateStr}_${targetDept}`,
                        date: dateStr,
                        department: targetDept as any,
                        staff: newStaffEntries
                    };
                    await addReinforcement(newR);
                }
            }

            toast.success(keepOpen ? "Renfort ajouté ! Prêt pour le suivant..." : "Renfort ajouté avec succès");

            if (keepOpen) {
                // Keep context (Location, Phases, Durations) but clear personal info
                setNewName('');
                setNewPhone('');
                setNewEmail('');
                setNewRole('');
                // Do NOT clear linkedLocation, selectedPhases, durations, linkedSequenceId, addingToDate
            } else {
                // Reset All
                setNewName(''); setNewPhone(''); setNewEmail(''); setNewRole('');
                setLinkedSequenceId(''); setLinkedLocation('');
                setSelectedPhases({ PRELIGHT: false, DEMONTAGE: false });
                setDurations({ PRELIGHT: 1, DEMONTAGE: 1 });
                setAddingToDate(null);
            }

        } catch (error) {
            console.error("Error adding reinforcement", error);
            alert("Erreur lors de l'ajout.");
        }
    };

    const handleRemoveReinforcement = async (dateStr: string, dept: string, staffId: string) => {
        if (!window.confirm('Supprimer ce renfort ?')) return;
        const existing = (project.reinforcements || []).find(r => r.date === dateStr && r.department === dept);
        if (!existing) return;

        try {
            const currentStaff = getStaffList(existing);
            const newStaff = currentStaff.filter(s => s.id !== staffId);

            if (newStaff.length === 0) {
                await deleteReinforcement(existing.id);
            } else {
                const updated = { ...existing, staff: newStaff };
                if (updated.names) delete (updated as any).names;
                await updateReinforcement(updated);
            }
        } catch (error) {
            console.error("Error removing reinforcement", error);
            alert("Erreur lors de la suppression.");
        }
    };

    // --- CSV EXPORT (Global) ---
    const downloadReinforcementsCSV = () => {
        let reinforcements = project.reinforcements || [];

        // Strict Filter for CSV as well
        if (user?.department !== 'PRODUCTION') {
            reinforcements = reinforcements.filter(r => r.department === user?.department);
        }

        if (reinforcements.length === 0) return alert("Aucun renfort à exporter.");

        // 1. Flatten Data
        const rows: any[] = [];
        reinforcements.forEach(r => {
            const d = new Date(r.date);
            const info = getWeekInfo(d);
            const staff = getStaffList(r);
            staff.forEach(s => {
                rows.push({
                    weekLabel: info.label,
                    weekKey: info.key, // for debug/grouping
                    weekStart: info.start.getTime(), // For sorting!
                    date: r.date,
                    dept: r.department,
                    name: s.name,
                    role: s.role || '', // Added
                    phone: s.phone || '',
                    email: s.email || ''
                });
            });
        });

        // 2. Sort: Week Start DESC (Recent first) > Date ASC > Dept ASC
        rows.sort((a, b) => {
            if (a.weekStart !== b.weekStart) return b.weekStart - a.weekStart;
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.dept.localeCompare(b.dept);
        });

        // 3. Build CSV
        const header = ['Semaine', 'Date', 'Département', 'Nom', 'Poste', 'Téléphone', 'Email'];
        const csvContent = [
            header.join(','),
            ...rows.map(row => [
                row.weekLabel,
                row.date,
                row.dept,
                `"${row.name}"`, // Quote names to be safe
                `"${row.role}"`,
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
                            onClick={() => setViewMode('VALIDATION')}
                            className="relative bg-cinema-900 border border-cinema-700 hover:bg-cinema-700 text-orange-400 font-bold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <ShieldCheck className="h-4 w-4" />
                            <span className="hidden md:inline">À Valider</span>
                            {pendingValidationCount > 0 && (
                                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-cinema-800">
                                    {pendingValidationCount}
                                </span>
                            )}
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

                                                                                    {/* Level 4: Names (Contacts) - UPDATED: Clickable, High Contrast, Grouped by Phase */}
                                                                                    {isDeptExpanded && (
                                                                                        <div className="px-3 pb-3 pt-0 grid gap-2">
                                                                                            {(() => {
                                                                                                // Group by linkType
                                                                                                const grouped = {
                                                                                                    PRELIGHT: staff.filter(s => s.linkType === 'PRELIGHT'),
                                                                                                    SHOOTING: staff.filter(s => !s.linkType || s.linkType === 'SHOOTING'),
                                                                                                    DEMONTAGE: staff.filter(s => s.linkType === 'DEMONTAGE')
                                                                                                };

                                                                                                return (
                                                                                                    <>
                                                                                                        {/* PRELIGHT Group */}
                                                                                                        {grouped.PRELIGHT.length > 0 && (
                                                                                                            <div className="space-y-1.5">
                                                                                                                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 px-2 py-0.5 bg-amber-500/10 rounded inline-block">
                                                                                                                    Prépa
                                                                                                                </div>
                                                                                                                {grouped.PRELIGHT.map(s => (
                                                                                                                    <div
                                                                                                                        key={s.id}
                                                                                                                        onClick={() => setViewingStaff(s)}
                                                                                                                        className="bg-amber-900/20 border-amber-700/50 px-3 py-2 rounded-lg border hover:border-amber-600 hover:bg-amber-900/30 transition-colors cursor-pointer flex items-center justify-between shadow-sm group/card"
                                                                                                                    >
                                                                                                                        <div className="flex items-center gap-3 min-w-0">
                                                                                                                            <User className="h-4 w-4 text-amber-300 shrink-0" />
                                                                                                                            <div className="flex flex-col min-w-0">
                                                                                                                                <div className="flex items-center gap-2">
                                                                                                                                    <span className="font-semibold text-amber-100 truncate">{s.name}</span>
                                                                                                                                    {s.validationStatus === 'PENDING' && (
                                                                                                                                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-orange-500/20 text-orange-300 rounded border border-orange-500/30">
                                                                                                                                            À valider
                                                                                                                                        </span>
                                                                                                                                    )}
                                                                                                                                    {s.validationStatus === 'APPROVED' && (
                                                                                                                                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-green-500/20 text-green-300 rounded border border-green-500/30">
                                                                                                                                            Validé
                                                                                                                                        </span>
                                                                                                                                    )}
                                                                                                                                </div>
                                                                                                                                {s.role && <span className="text-xs text-amber-400/70 truncate">{s.role}</span>}
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                        <button
                                                                                                                            onClick={(e) => { e.stopPropagation(); handleRemoveReinforcement(dateStr, dept as string, s.id); }}
                                                                                                                            className="p-1.5 text-amber-400/50 hover:text-red-400 opacity-0 group-hover/card:opacity-100 transition-opacity"
                                                                                                                        >
                                                                                                                            <X className="h-4 w-4" />
                                                                                                                        </button>
                                                                                                                    </div>
                                                                                                                ))}
                                                                                                            </div>
                                                                                                        )}

                                                                                                        {/* SHOOTING Group */}
                                                                                                        {grouped.SHOOTING.length > 0 && (
                                                                                                            <div className="space-y-1.5">
                                                                                                                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 px-2 py-0.5 bg-indigo-500/10 rounded inline-block">
                                                                                                                    Renfort
                                                                                                                </div>
                                                                                                                {grouped.SHOOTING.map(s => (
                                                                                                                    <div
                                                                                                                        key={s.id}
                                                                                                                        onClick={() => setViewingStaff(s)}
                                                                                                                        className="bg-slate-700 px-3 py-2 rounded-lg border border-slate-600 hover:border-slate-500 hover:bg-slate-600 transition-colors cursor-pointer flex items-center justify-between shadow-sm group/card"
                                                                                                                    >
                                                                                                                        <div className="flex items-center gap-3 min-w-0">
                                                                                                                            <User className="h-4 w-4 text-indigo-300 shrink-0" />
                                                                                                                            <div className="flex flex-col min-w-0">
                                                                                                                                <div className="flex items-center gap-2">
                                                                                                                                    <span className="font-semibold text-white truncate">{s.name}</span>
                                                                                                                                    {s.validationStatus === 'PENDING' && (
                                                                                                                                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-orange-500/20 text-orange-300 rounded border border-orange-500/30">
                                                                                                                                            À valider
                                                                                                                                        </span>
                                                                                                                                    )}
                                                                                                                                    {s.validationStatus === 'APPROVED' && (
                                                                                                                                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-green-500/20 text-green-300 rounded border border-green-500/30">
                                                                                                                                            Validé
                                                                                                                                        </span>
                                                                                                                                    )}
                                                                                                                                </div>
                                                                                                                                {s.role && <span className="text-xs text-slate-400 truncate">{s.role}</span>}
                                                                                                                            </div>
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

                                                                                                        {/* DEMONTAGE Group */}
                                                                                                        {grouped.DEMONTAGE.length > 0 && (
                                                                                                            <div className="space-y-1.5">
                                                                                                                <div className="text-[10px] font-bold uppercase tracking-wider text-red-400 px-2 py-0.5 bg-red-500/10 rounded inline-block">
                                                                                                                    Démontage
                                                                                                                </div>
                                                                                                                {grouped.DEMONTAGE.map(s => (
                                                                                                                    <div
                                                                                                                        key={s.id}
                                                                                                                        onClick={() => setViewingStaff(s)}
                                                                                                                        className="bg-red-900/20 border-red-700/50 px-3 py-2 rounded-lg border hover:border-red-600 hover:bg-red-900/30 transition-colors cursor-pointer flex items-center justify-between shadow-sm group/card"
                                                                                                                    >
                                                                                                                        <div className="flex items-center gap-3 min-w-0">
                                                                                                                            <User className="h-4 w-4 text-red-300 shrink-0" />
                                                                                                                            <div className="flex flex-col min-w-0">
                                                                                                                                <div className="flex items-center gap-2">
                                                                                                                                    <span className="font-semibold text-red-100 truncate">{s.name}</span>
                                                                                                                                    {s.validationStatus === 'PENDING' && (
                                                                                                                                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-orange-500/20 text-orange-300 rounded border border-orange-500/30">
                                                                                                                                            À valider
                                                                                                                                        </span>
                                                                                                                                    )}
                                                                                                                                    {s.validationStatus === 'APPROVED' && (
                                                                                                                                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-green-500/20 text-green-300 rounded border border-green-500/30">
                                                                                                                                            Validé
                                                                                                                                        </span>
                                                                                                                                    )}
                                                                                                                                </div>
                                                                                                                                {s.role && <span className="text-xs text-red-400/70 truncate">{s.role}</span>}
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                        <button
                                                                                                                            onClick={(e) => { e.stopPropagation(); handleRemoveReinforcement(dateStr, dept as string, s.id); }}
                                                                                                                            className="p-1.5 text-red-400/50 hover:text-red-400 opacity-0 group-hover/card:opacity-100 transition-opacity"
                                                                                                                        >
                                                                                                                            <X className="h-4 w-4" />
                                                                                                                        </button>
                                                                                                                    </div>
                                                                                                                ))}
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </>
                                                                                                );
                                                                                            })()}
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
                                {viewingStaff.role && (
                                    <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-300 font-medium text-center">
                                        {viewingStaff.role}
                                    </div>
                                )}
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

    // --- DRAG AND DROP LOGIC ---


    const handleZoneDragOver = (e: React.DragEvent, direction: 'prev' | 'next') => {
        e.preventDefault();
        e.stopPropagation();

        const now = Date.now();
        if (now - navThrottleRef.current > 1000) { // Throttle navigation every 1 second
            changeWeek(direction);
            navThrottleRef.current = now;
        }
    };

    const handleDragStart = (e: React.DragEvent, staff: ReinforcementDetail, dateStr: string, dept: string) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
            staffId: staff.id,
            sourceDate: dateStr,
            sourceDept: dept
        }));
        e.dataTransfer.effectAllowed = 'move';
        setIsDragging(true);
    };

    const handleDragEndGlobal = () => {
        setIsDragging(false);
    };

    const handleDayDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDropOnDay = async (e: React.DragEvent, targetDateStr: string) => {
        e.preventDefault();
        setIsDragging(false);

        const dataStr = e.dataTransfer.getData('application/json');
        if (!dataStr) return;

        try {
            const { staffId, sourceDate, sourceDept } = JSON.parse(dataStr);
            if (sourceDate === targetDateStr) return; // No change

            // Logique de déplacement
            // 1. Trouver le renfort source
            const sourceReinforcement = (project.reinforcements || []).find(r => r.date === sourceDate && r.department === sourceDept);
            if (!sourceReinforcement) return;

            // 2. Retirer le staff de la source
            const sourceStaffList = getStaffList(sourceReinforcement);
            const staffToMove = sourceStaffList.find(s => s.id === staffId);
            if (!staffToMove) return;

            const newSourceStaffList = sourceStaffList.filter(s => s.id !== staffId);

            // 3. Ajouter à la cible
            // La cible doit être du même département que la source (ou l'utilisateur actuel ?)
            // Ici on garde le même département que la source (logique de replanification au sein du même dept)
            const targetDept = sourceDept;

            const targetReinforcement = (project.reinforcements || []).find(r => r.date === targetDateStr && r.department === targetDept);

            let newReinforcements = [...(project.reinforcements || [])];

            // Atomic Move Logic:
            // 1. Add to Target (Safe first)
            // 2. Remove from Source

            try {
                // Step 1: Add to Target
                let targetPromise;
                if (targetReinforcement) {
                    const currentTargetStaff = getStaffList(targetReinforcement);
                    const updatedTarget = { ...targetReinforcement, staff: [...currentTargetStaff, staffToMove] };
                    if (updatedTarget.names) delete (updatedTarget as any).names;
                    targetPromise = updateReinforcement(updatedTarget);
                } else {
                    const newTarget: Reinforcement = {
                        id: `${targetDateStr}_${targetDept}`,
                        date: targetDateStr,
                        department: targetDept as any,
                        staff: [staffToMove]
                    };
                    targetPromise = addReinforcement(newTarget);
                }
                await targetPromise;

                // Step 2: Remove from Source
                // Only if target succeeded
                if (newSourceStaffList.length === 0) {
                    await deleteReinforcement(sourceReinforcement.id);
                } else {
                    const updatedSource = { ...sourceReinforcement, staff: newSourceStaffList };
                    if (updatedSource.names) delete (updatedSource as any).names;
                    await updateReinforcement(updatedSource);
                }

            } catch (error) {
                console.error("Error moving reinforcement", error);
                alert("Erreur lors du déplacement.");
            }


        } catch (error) {
            console.error("Error regarding drag data parsing", error);
        }
    };


    // 2. VALIDATION VIEW
    if (user?.department === 'PRODUCTION' && viewMode === 'VALIDATION') {
        const pendingItems: { rein: Reinforcement, staff: ReinforcementDetail }[] = [];
        (project.reinforcements || []).forEach(r => {
            getStaffList(r).forEach(s => {
                if (s.validationStatus === 'PENDING') {
                    pendingItems.push({ rein: r, staff: s });
                }
            });
        });

        // Group by Date for clarity
        const groupedPending = pendingItems.reduce((acc, item) => {
            if (!acc[item.rein.date]) acc[item.rein.date] = [];
            acc[item.rein.date].push(item);
            return acc;
        }, {} as Record<string, typeof pendingItems>);

        return (
            <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-8">
                {/* Header with Back button */}
                <div className="flex items-center gap-4 bg-cinema-800 p-6 rounded-xl border border-cinema-700">
                    <button onClick={() => setViewMode('OVERVIEW')} className="p-2 hover:bg-cinema-700 rounded-full transition-colors">
                        <ChevronLeft className="h-6 w-6 text-slate-400" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-white">À Valider</h2>
                        <p className="text-slate-400">{pendingItems.length} renfort(s) en attente</p>
                    </div>
                </div>

                {/* List */}
                <div className="bg-cinema-800 rounded-xl border border-cinema-700 overflow-hidden">
                    {pendingItems.length === 0 ? (
                        <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                            <ShieldCheck className="h-12 w-12 mb-4 opacity-50" />
                            <p className="text-lg">Aucun renfort en attente de validation.</p>
                            <button onClick={() => setViewMode('OVERVIEW')} className="mt-4 text-indigo-400 hover:text-indigo-300 font-medium">Retour à l'overview</button>
                        </div>
                    ) : (
                        <div className="divide-y divide-cinema-700">
                            {Object.entries(groupedPending).sort().map(([dateStr, items]) => (
                                <div key={dateStr} className="p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Calendar className="h-4 w-4 text-slate-400" />
                                        <span className="font-bold text-slate-300">{new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                                    </div>
                                    <div className="space-y-2">
                                        {items.map(({ rein, staff }) => (
                                            <div key={staff.id} className="flex items-center justify-between bg-cinema-900/50 p-3 rounded-lg border border-cinema-700 hover:border-cinema-600 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 font-bold">
                                                        {staff.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white">{staff.name}</div>
                                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300">{rein.department}</span>
                                                            <span>{staff.role || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleValidate(rein.date, rein.department as string, staff.id)}
                                                    className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-green-900/20"
                                                >
                                                    <Check className="h-4 w-4" />
                                                    Valider
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
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
            <div className="relative">
                {/* Navigation Zones */}
                {isDragging && (
                    <>
                        <div
                            className="absolute -left-4 top-0 bottom-0 w-20 bg-gradient-to-r from-indigo-500/20 to-transparent z-50 flex items-center justify-start pl-2 transition-opacity opacity-0 hover:opacity-100 rounded-l-xl"
                            onDragOver={(e) => handleZoneDragOver(e, 'prev')}
                        >
                            <ChevronLeft className="w-8 h-8 text-indigo-400 animate-pulse" />
                        </div>

                        <div
                            className="absolute -right-4 top-0 bottom-0 w-20 bg-gradient-to-l from-indigo-500/20 to-transparent z-50 flex items-center justify-end pr-2 transition-opacity opacity-0 hover:opacity-100 rounded-r-xl"
                            onDragOver={(e) => handleZoneDragOver(e, 'next')}
                        >
                            <ChevronRight className="w-8 h-8 text-indigo-400 animate-pulse" />
                        </div>
                    </>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                    {days.map((day) => {
                        const dateStr = day.toISOString().split('T')[0];
                        const isToday = new Date().toISOString().split('T')[0] === dateStr;
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                        return (
                            <div
                                key={dateStr}
                                onDragOver={handleDayDragOver}
                                onDrop={(e) => handleDropOnDay(e, dateStr)}
                                className={`rounded-xl border flex flex-col h-full min-h-[300px] transition-colors
                                    ${isToday ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-cinema-700'}
                                    ${isDragging ? 'hover:bg-cinema-700/50' : ''}
                                    ${isWeekend && !isToday ? 'bg-black/40' : 'bg-cinema-800'}
                                `}
                            >
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

                                                // Group by linkType
                                                const grouped = {
                                                    PRELIGHT: staffList.filter(s => s.linkType === 'PRELIGHT'),
                                                    SHOOTING: staffList.filter(s => !s.linkType || s.linkType === 'SHOOTING'),
                                                    DEMONTAGE: staffList.filter(s => s.linkType === 'DEMONTAGE')
                                                };

                                                const hasAny = staffList.length > 0;

                                                if (!hasAny) {
                                                    return !addingToDate && (
                                                        <div onClick={() => setAddingToDate(dateStr)} className="h-full flex flex-col items-center justify-center text-slate-600 hover:text-indigo-400 cursor-pointer transition-colors border-2 border-dashed border-cinema-700 hover:border-indigo-500/50 rounded-lg p-4 min-h-[100px]">
                                                            <UserPlus className="h-6 w-6 mb-2" />
                                                            <span className="text-xs font-medium">Ajouter</span>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div className="space-y-3">
                                                        {/* PRELIGHT Group */}
                                                        {grouped.PRELIGHT.length > 0 && (
                                                            <div className="space-y-1.5">
                                                                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 px-2 py-0.5 bg-amber-500/10 rounded inline-block">
                                                                    Prépa
                                                                </div>
                                                                {grouped.PRELIGHT.map(s => (
                                                                    <div
                                                                        key={s.id}
                                                                        draggable
                                                                        onDragStart={(e) => handleDragStart(e, s, dateStr, targetDept as string)}
                                                                        onDragEnd={handleDragEndGlobal}
                                                                        onClick={() => setViewingStaff(s)}
                                                                        className="bg-amber-900/20 border-amber-700/50 px-3 py-3 rounded-lg flex justify-between items-center border hover:border-amber-600 hover:bg-amber-900/30 transition-colors cursor-pointer shadow-sm group active:cursor-grabbing cursor-grab"
                                                                    >
                                                                        <div className="flex flex-col min-w-0 pr-2 pointer-events-none">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="text-sm text-amber-100 font-bold truncate">{s.name}</div>
                                                                                {s.validationStatus === 'PENDING' && (
                                                                                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-orange-500/20 text-orange-300 rounded border border-orange-500/30">
                                                                                        À valider
                                                                                    </span>
                                                                                )}
                                                                                {s.validationStatus === 'APPROVED' && (
                                                                                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-green-500/20 text-green-300 rounded border border-green-500/30">
                                                                                        Validé
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            {s.role && <div className="text-xs text-amber-400/70 truncate">{s.role}</div>}
                                                                        </div>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleRemoveReinforcement(dateStr, targetDept as string, s.id); }}
                                                                            className="text-amber-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        >
                                                                            <X className="h-4 w-4" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* SHOOTING Group */}
                                                        {grouped.SHOOTING.length > 0 && (
                                                            <div className="space-y-1.5">
                                                                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 px-2 py-0.5 bg-indigo-500/10 rounded inline-block">
                                                                    Renfort
                                                                </div>
                                                                {grouped.SHOOTING.map(s => (
                                                                    <div
                                                                        key={s.id}
                                                                        draggable
                                                                        onDragStart={(e) => handleDragStart(e, s, dateStr, targetDept as string)}
                                                                        onDragEnd={handleDragEndGlobal}
                                                                        onClick={() => setViewingStaff(s)}
                                                                        className="bg-slate-700 px-3 py-3 rounded-lg flex justify-between items-center border border-slate-600 hover:border-slate-500 hover:bg-slate-600 transition-colors cursor-pointer shadow-sm group active:cursor-grabbing cursor-grab"
                                                                    >
                                                                        <div className="flex flex-col min-w-0 pr-2 pointer-events-none">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="text-sm text-white font-bold truncate">{s.name}</div>
                                                                                {s.validationStatus === 'PENDING' && (
                                                                                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-orange-500/20 text-orange-300 rounded border border-orange-500/30">
                                                                                        À valider
                                                                                    </span>
                                                                                )}
                                                                                {s.validationStatus === 'APPROVED' && (
                                                                                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-green-500/20 text-green-300 rounded border border-green-500/30">
                                                                                        Validé
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            {s.role && <div className="text-xs text-slate-400 truncate">{s.role}</div>}
                                                                        </div>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleRemoveReinforcement(dateStr, targetDept as string, s.id); }}
                                                                            className="text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        >
                                                                            <X className="h-4 w-4" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* DEMONTAGE Group */}
                                                        {grouped.DEMONTAGE.length > 0 && (
                                                            <div className="space-y-1.5">
                                                                <div className="text-[10px] font-bold uppercase tracking-wider text-red-400 px-2 py-0.5 bg-red-500/10 rounded inline-block">
                                                                    Démontage
                                                                </div>
                                                                {grouped.DEMONTAGE.map(s => (
                                                                    <div
                                                                        key={s.id}
                                                                        draggable
                                                                        onDragStart={(e) => handleDragStart(e, s, dateStr, targetDept as string)}
                                                                        onDragEnd={handleDragEndGlobal}
                                                                        onClick={() => setViewingStaff(s)}
                                                                        className="bg-red-900/20 border-red-700/50 px-3 py-3 rounded-lg flex justify-between items-center border hover:border-red-600 hover:bg-red-900/30 transition-colors cursor-pointer shadow-sm group active:cursor-grabbing cursor-grab"
                                                                    >
                                                                        <div className="flex flex-col min-w-0 pr-2 pointer-events-none">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="text-sm text-red-100 font-bold truncate">{s.name}</div>
                                                                                {s.validationStatus === 'PENDING' && (
                                                                                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-orange-500/20 text-orange-300 rounded border border-orange-500/30">
                                                                                        À valider
                                                                                    </span>
                                                                                )}
                                                                                {s.validationStatus === 'APPROVED' && (
                                                                                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-green-500/20 text-green-300 rounded border border-green-500/30">
                                                                                        Validé
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            {s.role && <div className="text-xs text-red-400/70 truncate">{s.role}</div>}
                                                                        </div>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleRemoveReinforcement(dateStr, targetDept as string, s.id); }}
                                                                            className="text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        >
                                                                            <X className="h-4 w-4" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
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
                            {viewingStaff.role && (
                                <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-300 font-medium text-center">
                                    {viewingStaff.role}
                                </div>
                            )}

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
                    onClick={() => { setAddingToDate(null); setNewName(''); setNewPhone(''); setNewEmail(''); setLinkedLocation(''); }}
                >
                    <div
                        className="bg-cinema-800 rounded-xl border border-cinema-700 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-6"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Ajouter un Renfort</h3>
                            <button onClick={() => { setAddingToDate(null); setNewName(''); setNewPhone(''); setNewEmail(''); setLinkedLocation(''); }} className="text-slate-400 hover:text-white">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 text-indigo-300 text-sm font-medium flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(addingToDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </div>

                        {/* Sequence Link */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Lier à une Séquence (Optionnel)</label>
                            <select
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                                value={linkedSequenceId}
                                onChange={e => {
                                    const newSeqId = e.target.value;
                                    setLinkedSequenceId(newSeqId);

                                    if (newSeqId && project.pdtSequences) {
                                        const seq = project.pdtSequences.find(s => s.id === newSeqId);
                                        if (seq) {
                                            // Auto-Update Logic: Same Day
                                            setAddingToDate(seq.date);
                                        }
                                    }
                                }}
                            >
                                <option value="">Aucune séquence liée</option>
                                {(project.pdtSequences || [])
                                    .filter(seq => seq.date === addingToDate)
                                    .sort((a, b) => {
                                        if (a.date !== b.date) return a.date.localeCompare(b.date);
                                        return a.id.localeCompare(b.id, undefined, { numeric: true });
                                    })
                                    .map(seq => (
                                        <option key={seq.id} value={seq.id}>
                                            {seq.id} - {new Date(seq.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ({seq.decor})
                                        </option>
                                    ))}
                            </select>
                            {linkedSequenceId && (
                                <p className="text-xs text-indigo-300 italic">
                                    La date a été ajustée automatiquement à celle de la séquence.
                                </p>
                            )}
                        </div>

                        {/* Location Link (New) */}
                        <div className="space-y-4 bg-cinema-900/50 p-3 rounded-lg border border-cinema-700">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Lier à un Lieu (PDT)</label>
                                <select
                                    className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                                    value={linkedLocation}
                                    onChange={e => {
                                        setLinkedLocation(e.target.value);
                                        setLinkedSequenceId(''); // Reset seq if location selected
                                    }}
                                >
                                    <option value="">-- Aucun lieu lié --</option>
                                    {(() => {
                                        // Show the location planned for the selected day first
                                        const dayLoc = addingToDate && project.pdtDays
                                            ? project.pdtDays.find(d => d.date === addingToDate)
                                            : null;
                                        const dayLocation = dayLoc?.linkedLocation || dayLoc?.location;

                                        if (dayLocation && dayLocation !== 'OFF' && dayLocation !== 'VACANCES') {
                                            // Show only the day's location as suggestion
                                            return <option key={dayLocation} value={dayLocation}>{dayLocation} (prévu ce jour)</option>;
                                        }

                                        // Fallback: show all locations if no PDT match for this day
                                        return Array.from(new Set((project.pdtDays || [])
                                            .map(d => d.linkedLocation || d.location)
                                            .filter(l => l && l !== 'OFF' && l !== 'VACANCES')))
                                            .sort()
                                            .map(loc => (
                                                <option key={loc} value={loc}>{loc}</option>
                                            ));
                                    })()}
                                </select>
                            </div>

                            {linkedLocation && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <label className="text-sm font-medium text-slate-300">Phase(s) à ajouter</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* PRELIGHT CHECKBOX */}
                                        <div className={`p-3 rounded-lg border transition-all ${selectedPhases.PRELIGHT ? 'bg-amber-500/10 border-amber-500' : 'bg-cinema-900 border-cinema-700'}`}>
                                            <div className="flex items-center gap-3 mb-2">
                                                <input
                                                    type="checkbox"
                                                    id="phase-prelight"
                                                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
                                                    checked={selectedPhases.PRELIGHT}
                                                    onChange={e => setSelectedPhases(prev => ({ ...prev, PRELIGHT: e.target.checked }))}
                                                />
                                                <label htmlFor="phase-prelight" className="text-sm font-bold text-white cursor-pointer select-none">
                                                    Prépa / Prelight
                                                </label>
                                            </div>
                                            {selectedPhases.PRELIGHT && (
                                                <div className="pl-7">
                                                    <label className="text-xs text-slate-400 block mb-1">Durée (Jours avant)</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        className="w-full bg-cinema-800 border border-cinema-600 rounded px-2 py-1 text-white text-sm focus:border-amber-500 outline-none"
                                                        value={durations.PRELIGHT}
                                                        onChange={e => setDurations(prev => ({ ...prev, PRELIGHT: parseInt(e.target.value) || 1 }))}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* DEMONTAGE CHECKBOX */}
                                        <div className={`p-3 rounded-lg border transition-all ${selectedPhases.DEMONTAGE ? 'bg-red-500/10 border-red-500' : 'bg-cinema-900 border-cinema-700'}`}>
                                            <div className="flex items-center gap-3 mb-2">
                                                <input
                                                    type="checkbox"
                                                    id="phase-demontage"
                                                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-red-500"
                                                    checked={selectedPhases.DEMONTAGE}
                                                    onChange={e => setSelectedPhases(prev => ({ ...prev, DEMONTAGE: e.target.checked }))}
                                                />
                                                <label htmlFor="phase-demontage" className="text-sm font-bold text-white cursor-pointer select-none">
                                                    Démontage
                                                </label>
                                            </div>
                                            {selectedPhases.DEMONTAGE && (
                                                <div className="pl-7">
                                                    <label className="text-xs text-slate-400 block mb-1">Durée (Jours après)</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        className="w-full bg-cinema-800 border border-cinema-600 rounded px-2 py-1 text-white text-sm focus:border-red-500 outline-none"
                                                        value={durations.DEMONTAGE}
                                                        onChange={e => setDurations(prev => ({ ...prev, DEMONTAGE: parseInt(e.target.value) || 1 }))}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Nom Complet <span className="text-red-400">*</span></label>
                                <div className="relative">
                                    <User className="h-4 w-4 absolute left-3 top-3 text-slate-500" />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Ex: Thomas Dubreuil, Marie..."
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-2.5 pl-10 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Séparez les noms par une virgule pour en ajouter plusieurs.</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Poste</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Ex: Électricien, Assistant..."
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                                        value={newRole}
                                        onChange={e => setNewRole(e.target.value)}
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
                                onClick={() => { setAddingToDate(null); setNewName(''); setNewPhone(''); setNewEmail(''); setNewRole(''); setLinkedLocation(''); }}
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
                            <button
                                onClick={() => handleAddReinforcement(addingToDate, true)}
                                disabled={!newName.trim()}
                                className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                title="Sauvegarder et garder le formulaire ouvert pour ajouter une autre personne"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Ajouter (+)</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

