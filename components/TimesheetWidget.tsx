
import React, { useState, useMemo, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { TimeLog } from '../types';
import { db, auth } from '../services/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Clock, Calendar, Save, Trash2, StopCircle, PlayCircle, Utensils, Users, ChevronRight, ArrowLeft, Download, Loader2, Coins } from 'lucide-react';
import { calculateUSPAGross, calculateEstimatedSalary, getAvailableJobs } from '../utils/payrollUtils';
import { getJobByTitle, USPA_JOBS } from '../data/uspaRates';

export const TimesheetWidget: React.FC = () => {
    const { project, updateProjectDetails, user } = useProject();

    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [callTime, setCallTime] = useState('');
    const [mealTime, setMealTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [hasShortenedMeal, setHasShortenedMeal] = useState(false);
    const [isContinuousDay, setIsContinuousDay] = useState(false); // New
    const [breakDuration, setBreakDuration] = useState<number>(0); // New
    const [pauseTime, setPauseTime] = useState(''); // New: Time of pause
    const [note, setNote] = useState(''); // New
    const [userProfileData, setUserProfileData] = useState<{ firstName?: string, lastName?: string, role?: string }>({}); // New
    const [travelHoursInside, setTravelHoursInside] = useState<number>(0);
    const [travelHoursOutside, setTravelHoursOutside] = useState<number>(0);
    const [isDownloading, setIsDownloading] = useState(false); // New: Async download state

    // Dynamic Job List based on Convention
    const availableJobs = useMemo(() => {
        if (project.projectType === 'Long Métrage' && project.convention) {
            const cinemaJobs = getAvailableJobs(project.convention);
            if (cinemaJobs.length > 0) return cinemaJobs;
        }
        if (project.projectType === 'Publicité') {
            return getAvailableJobs('Publicité');
        }
        return USPA_JOBS;
    }, [project.projectType, project.convention]);

    // Fetch User Profile for current user (to get Role/Name details)
    React.useEffect(() => {
        const fetchProfile = async () => {
            if (auth.currentUser) {
                try {
                    const docRef = doc(db, 'users', auth.currentUser.uid);
                    const snap = await getDoc(docRef);
                    if (snap.exists()) {
                        const data = snap.data();
                        setUserProfileData({
                            firstName: data.firstName,
                            lastName: data.lastName,
                            role: data.role
                        });
                    }
                } catch (err) {
                    console.error("Error fetching user profile for timesheet:", err);
                }
            }
        };
        fetchProfile();
    }, [user]);

    // Calculate hours helper
    const calculateHours = (start: string, meal: string, end: string, shortMeal: boolean, continuous: boolean, pause: number) => {
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

        // Deductions
        // 1. Meal: Always deduct if entered (Effective work time logic).
        // The "Paid Break" for continuous day is handled in Salary Calculation, not here.
        if (meal) {
            const mealDeduction = shortMeal ? 30 : 60;
            duration -= mealDeduction;
        }

        // 2. Manual Pause (Unpaid)
        if (pause > 0) {
            duration -= pause;
        }

        return Math.max(0, duration / 60);
    };

    const handleSaveLog = async () => {
        if (!callTime || !endTime || !user) return;

        const totalHours = calculateHours(callTime, mealTime, endTime, hasShortenedMeal, isContinuousDay, breakDuration);
        const logId = `${date}_${user.email} `;

        const newLog: TimeLog = {
            id: logId,
            userId: user.email,
            userName: user.name,
            department: user.department,
            date,
            callTime,
            mealTime: mealTime || '',
            hasShortenedMeal,
            isContinuousDay,
            breakDuration,
            pauseTime, // Save pause time
            note, // Save note
            travelHoursInside,
            travelHoursOutside,

            // User Details from Profile
            userFirstName: userProfileData.firstName || user.name.split(' ')[0],
            userLastName: userProfileData.lastName || user.name.split(' ').slice(1).join(' '),
            userRole: userProfileData.role || '',

            endTime,
            totalHours
        };

        // Remove existing log for same day/user if any, then add new
        const otherLogs = (project.timeLogs || []).filter(l => l.id !== logId);
        const newLogs = [...otherLogs, newLog];

        await updateProjectDetails({ timeLogs: newLogs });
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

    // Helper: Format Date DD/MM/YYYY
    const formatDateFR = (dateStr: string | Date) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Group logs by week (Relative or ISO)
    const getWeekInfo = (d: Date) => {
        // 1. Try Relative to Shooting Start
        if (project.shootingStartDate) {
            const start = new Date(project.shootingStartDate);
            // Reset times to midnight for accurate day diff
            const target = new Date(d);
            target.setHours(0, 0, 0, 0);
            start.setHours(0, 0, 0, 0);

            // Calculate diff in days
            const diffTime = target.getTime() - start.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            // If date is before start date, maybe use Pre-Prod weeks? Or just negative?
            // For now let's handle "Week 1" as days 0-6.
            const weekNum = Math.floor(diffDays / 7) + 1;

            // Calculate start/end of this relative week
            const weekStart = new Date(start);
            weekStart.setDate(start.getDate() + (weekNum - 1) * 7);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            return {
                week: weekNum,
                year: weekStart.getFullYear(), // Just for grouping key mostly
                label: `Semaine ${weekNum} `,
                startDate: weekStart,
                endDate: weekEnd,
                isRelative: true,
                key: `S${weekNum} ` // Simple key
            };
        }

        // 2. Fallback to ISO Week
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

        // Calculate ISO Week dates (approx)
        const simple = new Date(Date.UTC(d.getUTCFullYear(), 0, 1 + (weekNo - 1) * 7));
        const dow = simple.getUTCDay();
        const monday = simple;
        if (dow <= 4) monday.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
        else monday.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
        const sunday = new Date(monday);
        sunday.setUTCDate(monday.getUTCDate() + 6);

        return {
            week: weekNo,
            year: d.getUTCFullYear(),
            label: `Semaine ${weekNo} (ISO)`,
            startDate: monday,
            endDate: sunday,
            isRelative: false,
            key: `${d.getUTCFullYear()} -W${weekNo} `
        };
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
        const weeks: Record<string, { totalHours: number, logs: TimeLog[], label: string, firstDate: string }> = {};

        activeLogs.forEach(log => {
            const d = new Date(log.date);
            const info = getWeekInfo(d);
            const key = info.key;

            if (!weeks[key]) {
                const startStr = formatDateFR(info.startDate);
                const endStr = formatDateFR(info.endDate);
                const fullLabel = info.isRelative
                    ? `SEMAINE ${info.week} (DU ${startStr} AU ${endStr})`
                    : `SEMAINE ${info.week} (DU ${startStr} AU ${endStr}) - ISO`;

                weeks[key] = {
                    totalHours: 0,
                    logs: [],
                    label: fullLabel,
                    firstDate: log.date // fallback
                };
            }
            weeks[key].logs.push(log);
            weeks[key].totalHours += log.totalHours;
        });

        // Sort keys. If relative (S1, S2), sort numerically. If ISO, string sort ok-ish but Year-Week better.
        return Object.entries(weeks).sort((a, b) => {
            // Determine sort logic based on key format
            if (a[0].startsWith('S') && b[0].startsWith('S')) {
                // S1 vs S10
                const numA = parseInt(a[0].substring(1));
                const numB = parseInt(b[0].substring(1));
                return numB - numA; // Descending
            }
            return b[0].localeCompare(a[0]);
        });
    }, [activeLogs, project.shootingStartDate]); // updated dependency

    // Help format hours decimal to HhMM
    const formatHours = (decimalHours: number) => {
        const hours = Math.floor(decimalHours);
        const minutes = Math.round((decimalHours - hours) * 60);
        return `${hours}h${minutes > 0 ? minutes.toString().padStart(2, '0') : ''} `;
    };

    const downloadCSV = async (logs: TimeLog[], filename: string) => {
        setIsDownloading(true);
        try {
            // 1. Identify valid user emails from logs that define 'userId' (email)
            // AND might be missing detailed info.
            const emailsToFetch = Array.from(new Set(logs.map(l => l.userId).filter(Boolean)));
            const profileMap: Record<string, { firstName?: string, lastName?: string, role?: string }> = {};

            // 2. Fetch profiles for these emails
            if (emailsToFetch.length > 0) {
                // Limit queries? Firestore 'in' limit is 10. Better to loop or promise.all if simple where.
                // Or just query the 'users' collection generally? No, that's heavy.
                // Loop is safer for small batches.
                await Promise.all(emailsToFetch.map(async (email) => {
                    try {
                        const usersRef = collection(db, 'users');
                        const q = query(usersRef, where('email', '==', email));
                        const querySnapshot = await getDocs(q);
                        if (!querySnapshot.empty) {
                            const data = querySnapshot.docs[0].data();
                            profileMap[email] = {
                                firstName: data.firstName,
                                lastName: data.lastName,
                                role: data.role
                            };
                        }
                    } catch (e) {
                        console.error(`Failed to fetch profile for ${email}`, e);
                    }
                }));
            }

            const headers = ['Date', 'Nom', 'Prénom', 'Fonction', 'Département', 'Début', 'Fin', 'Repas (Début)', 'Repas Écourté', 'Journée Continue', 'Pause (min)', 'Heure Pause', 'Note', 'Heures Totales'];
            const rows = logs.map(log => {
                // Determine best available data
                const profile = profileMap[log.userId];

                // Fallback Priority: Log data > Fetched Profile > Fallback splits
                const lastName = log.userLastName || profile?.lastName || log.userName.split(' ').slice(1).join(' ');
                const firstName = log.userFirstName || profile?.firstName || log.userName.split(' ')[0];
                const role = log.userRole || profile?.role || '';
                const dateFormatted = formatDateFR(log.date);

                return [
                    dateFormatted,
                    lastName,
                    firstName,
                    role,
                    log.department,
                    log.callTime,
                    log.endTime,
                    log.mealTime || '',
                    log.hasShortenedMeal ? 'OUI' : 'NON',
                    log.isContinuousDay ? 'OUI' : 'NON',
                    log.breakDuration || 0,
                    log.pauseTime || '', // Added
                    `"${(log.note || '').replace(/"/g, '""')}"`, // Escape quotes
                    formatHours(log.totalHours)
                ];
            });

            let csvContent = [
                headers.join(','),
                ...rows.map(r => r.join(','))
            ].join('\n');

            // Add Total Hours Summary Row
            const totalHours = logs.reduce((acc, log) => acc + log.totalHours, 0);
            const formattedTotal = formatHours(totalHours);
            const firstDate = logs.length > 0 ? new Date(logs.sort((a, b) => a.date.localeCompare(b.date))[0].date) : new Date();
            // Get week info for this export if available to show nice label?
            const weekInfo = getWeekInfo(firstDate);
            const weekLabel = weekInfo.isRelative
                ? `Semaine ${weekInfo.week}`
                : `Semaine du ${formatDateFR(weekInfo.startDate)}`;

            // Append explicit summary line at the bottom
            csvContent += `\n\nTotal heures ${weekLabel} : ${formattedTotal} heures`;

            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `${filename}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error("CSV Export Failed:", error);
            alert("Erreur lors de l'export CSV");
        } finally {
            setIsDownloading(false);
        }
    };

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

                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 items-end">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none"
                                    />
                                </div>

                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Début</label>
                                    <input
                                        type="time"
                                        value={callTime}
                                        onChange={(e) => setCallTime(e.target.value)}
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none"
                                    />
                                </div>

                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Repas (Début)</label>
                                    <input
                                        type="time"
                                        value={mealTime}
                                        onChange={(e) => setMealTime(e.target.value)}
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none"
                                    />
                                </div>

                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Fin</label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none"
                                    />
                                </div>

                                {/* Options Column */}
                                <div className="col-span-2 lg:col-span-2 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 h-[34px] bg-cinema-900 px-3 rounded-lg border border-cinema-700 w-full">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-cinema-600 bg-cinema-800 text-blue-600 focus:ring-blue-500"
                                            checked={isContinuousDay}
                                            onChange={(e) => setIsContinuousDay(e.target.checked)}
                                        />
                                        <span className="text-xs font-medium text-slate-400 whitespace-nowrap">Journée Continue</span>
                                    </div>

                                    <div className="flex items-center gap-2 h-[34px] bg-cinema-900 px-3 rounded-lg border border-cinema-700 w-full">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-cinema-600 bg-cinema-800 text-blue-600 focus:ring-blue-500"
                                            checked={hasShortenedMeal}
                                            onChange={(e) => setHasShortenedMeal(e.target.checked)}
                                        />
                                        <span className="text-xs font-medium text-slate-400 whitespace-nowrap">Repas Écourté (30m)</span>
                                    </div>
                                </div>

                                {/* Pause (Min) and Pause Time */}
                                <div className="col-span-2 lg:col-span-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Pause (min)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="0"
                                                value={breakDuration || ''}
                                                onChange={(e) => setBreakDuration(Number(e.target.value))}
                                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Heure de Pause</label>
                                            <input
                                                type="time"
                                                value={pauseTime}
                                                onChange={(e) => setPauseTime(e.target.value)}
                                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Note Input */}
                                <div className="col-span-2 lg:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Note (Optionnel)</label>
                                    <input
                                        type="text"
                                        placeholder="Commentaire..."
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none"
                                    />
                                </div>


                                <div className="col-span-2 lg:col-span-1 flex items-end">
                                    <button
                                        onClick={handleSaveLog}
                                        disabled={!date || !callTime || !endTime}
                                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                    >
                                        <Save className="h-4 w-4" />
                                        <span className="hidden lg:inline">Ajouter</span>
                                        <span className="lg:hidden">Enregistrer</span>
                                    </button>
                                </div>

                                <div className="col-span-full mt-2 bg-cinema-900/50 px-4 py-2.5 rounded-lg border border-cinema-700 flex justify-center items-center gap-2">
                                    <span className="text-slate-500 text-xs font-bold uppercase">Total Estimé :</span>
                                    <span className="text-blue-400 font-bold text-lg">
                                        {formatHours(calculateHours(callTime, mealTime, endTime, hasShortenedMeal, isContinuousDay, breakDuration))}
                                    </span>
                                </div>

                                {/* Salary Estimate - Only for USPA Projects (Telefilm / Plateforme / Série TV) */}
                                {['Long Métrage', 'Série TV', 'Téléfilm', 'Plateforme', 'Publicité'].includes(project.projectType) && (
                                    <div className="col-span-full mt-2 bg-emerald-900/20 px-4 py-2.5 rounded-lg border border-emerald-700/50 flex justify-between items-center gap-2">
                                        <div className="flex items-center gap-2">
                                            <Coins className="h-4 w-4 text-emerald-400" />
                                            <span className="text-slate-400 text-xs font-bold uppercase">Estim. Brut (Jour) :</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-emerald-400 font-bold text-lg">
                                                {(() => {
                                                    const hours = calculateHours(callTime, mealTime, endTime, hasShortenedMeal, isContinuousDay, breakDuration);
                                                    if (hours <= 0) return '- €';

                                                    // Try to find job from profile role
                                                    // @ts-ignore
                                                    const jobTitle = userProfileData.role || user?.role || 'Régisseur Général';

                                                    // Search in availableJobs (Cinema or USPA)
                                                    // @ts-ignore
                                                    const job = availableJobs.find(j => j.title === jobTitle) || availableJobs[0];

                                                    const est = calculateEstimatedSalary({
                                                        job,
                                                        hoursWorked: hours,
                                                        contractType: 'JOUR', // Default assumption
                                                        travelHoursInside: travelHoursInside || 0,
                                                        travelHoursOutside: travelHoursOutside || 0,
                                                        isContinuousDay: isContinuousDay,
                                                        convention: project.convention
                                                    });
                                                    return `${est.grossAmount.toFixed(2)} €`;
                                                })()}
                                            </span>
                                            <div className="text-[9px] text-emerald-600/60 uppercase font-bold tracking-wider">
                                                {project.convention || 'Convention USPA'}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Weekly Summary Tables */}
                    <div className="space-y-8">
                        {weeklyData.length > 0 ? weeklyData.map(([weekKey, data]) => (
                            <div key={weekKey} className="bg-cinema-800 text-slate-200 rounded-xl overflow-hidden border border-cinema-700 shadow-xl">
                                {/* Header */}
                                <div className="bg-cinema-900/50 px-6 py-4 flex justify-between items-end border-b border-cinema-700">
                                    <div>
                                        <h3 className="font-bold text-xl text-white uppercase tracking-tight">{data.label}</h3>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-slate-500 uppercase font-bold">Total Hebdo</div>
                                        <div className="text-2xl font-black text-white leading-none">{formatHours(data.totalHours)}</div>
                                        <button
                                            onClick={() => downloadCSV(data.logs, `Heures_Semaine_${weekKey}`)}
                                            disabled={isDownloading}
                                            className="mt-2 text-[10px] font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 flex items-center justify-end gap-1 disabled:opacity-50"
                                        >
                                            {isDownloading ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <Download className="h-3 w-3" />
                                            )}
                                            Export CSV
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm whitespace-nowrap">
                                        <thead>
                                            <tr className="bg-cinema-900/30 border-b border-cinema-700 text-left text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                                                <th className="px-4 py-3">Jour</th>
                                                <th className="px-4 py-3">Début</th>
                                                <th className="px-4 py-3">Repas</th>
                                                <th className="px-4 py-3 text-center">Infos / Pause</th>
                                                <th className="px-4 py-3">Fin</th>
                                                <th className="px-4 py-3 text-right">Total Jour</th>
                                                <th className="px-4 py-3 text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-cinema-700/50">
                                            {data.logs
                                                .sort((a, b) => a.date.localeCompare(b.date))
                                                .map(log => (
                                                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                                        <td className="px-4 py-4 font-bold text-white">
                                                            {new Date(log.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
                                                        </td>
                                                        <td className="px-4 py-4 text-slate-300 font-mono">{log.callTime}</td>
                                                        <td className="px-4 py-4 text-slate-300 font-mono">
                                                            {log.mealTime || '-'}
                                                        </td>
                                                        <td className="px-4 py-4 text-slate-400 text-xs text-center">
                                                            <div className="flex flex-col gap-1 items-center">
                                                                {log.isContinuousDay && (
                                                                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold uppercase border border-blue-500/30">Journée Continue</span>
                                                                )}
                                                                {!log.isContinuousDay && (
                                                                    <span>{log.hasShortenedMeal ? 'Repas -30m' : 'Repas -1h'}</span>
                                                                )}
                                                                {log.breakDuration && log.breakDuration > 0 && (
                                                                    <div className="text-red-400 flex items-center gap-1">
                                                                        <StopCircle className="h-3 w-3" />
                                                                        Pause -{log.breakDuration}m
                                                                        {log.pauseTime && <span className="text-xs text-slate-500 ml-1">({log.pauseTime})</span>}
                                                                    </div>
                                                                )}
                                                                {log.note && (
                                                                    <div className="group relative">
                                                                        <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/20 cursor-help max-w-[150px] truncate block">
                                                                            Note : {log.note}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-slate-300 font-mono">{log.endTime}</td>
                                                        <td className="px-4 py-4 text-right font-bold text-white bg-cinema-900/30">{formatHours(log.totalHours)}</td>
                                                        <td className="px-4 py-4 text-center">
                                                            <div className="flex justify-center items-center gap-2">
                                                                <button
                                                                    onClick={() => downloadCSV([log], `Heures_${log.userName}_${log.date}`)}
                                                                    disabled={isDownloading}
                                                                    className="text-slate-500 hover:text-blue-400 p-1 rounded transition-colors disabled:opacity-50"
                                                                    title="Télécharger CSV"
                                                                >
                                                                    {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                                                </button>
                                                                {/* Only allow delete in Personal Mode */}
                                                                {viewMode === 'personal' && (
                                                                    <button
                                                                        onClick={() => handleDeleteLog(log.id)}
                                                                        className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                                                                        title="Supprimer"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                        <tfoot className="bg-cinema-900/30 border-t border-cinema-700">
                                            <tr>
                                                <td colSpan={5} className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Total Semaine</td>
                                                <td className="px-4 py-3 text-right font-black text-white border-l border-cinema-700">{formatHours(data.totalHours)}</td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
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
            )
            }
        </div >
    );
};
