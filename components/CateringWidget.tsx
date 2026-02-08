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
    const isRegie = currentDept === Department.REGIE || currentDept === 'Régie' || currentDept === 'REGIE' || isProduction;

    // Security Check
    if (!isRegie && !isProduction) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <div className="bg-red-500/10 p-4 rounded-full mb-4">
                    <Utensils className="h-12 w-12 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Accès Restreint</h2>
                <p className="text-slate-400">La feuille de cantine est réservée à la Régie et à la Production.</p>
            </div>
        );
    }

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
        // 1. Existing Users (Filtered by Project)
        const userRows = userProfiles
            .filter(profile => {
                const p = profile as any;
                const isCurrent = p.currentProjectId === project.id;
                const isInHistory = p.projectHistory?.some((h: any) => h.id === project.id);
                return isCurrent || isInHistory;
            })
            .map(profile => {
                const log = dailyLogs.find(l => l.userId === profile.email); // Assume email is ID for now
                return {
                    id: profile.email,
                    name: (profile.firstName && profile.lastName) ? `${profile.firstName} ${profile.lastName}` : ((profile as any).name || profile.email),
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

    // Helper: Format Date DD/MM/YYYY
    const formatDateFR = (dateStr: string | Date) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Helper: Get Week Number (Relative to Shooting Start or ISO)
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
                label: `Semaine ${weekNum}`,
                startDate: weekStart,
                endDate: weekEnd,
                isRelative: true,
                key: `S${weekNum}` // Simple key
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
            key: `${d.getUTCFullYear()}-${weekNo}`
        };
    };

    // Weekly Stats Calculation
    const weeklyStats = useMemo(() => {
        if (!project.cateringLogs) return [];

        const weeks: Record<string, { total: number, veggie: number, label: string, firstDate: string }> = {};

        project.cateringLogs.forEach(log => {
            if (!log.hasEaten) return;
            const date = new Date(log.date);
            const info = getWeekInfo(date);

            // If relative, key is S1, S2... If ISO, key is 2023-45
            const key = info.key;

            if (!weeks[key]) {
                const startStr = formatDateFR(info.startDate);
                const endStr = formatDateFR(info.endDate);
                const fullLabel = info.isRelative
                    ? `Semaine ${info.week} (du ${startStr} au ${endStr})`
                    : `Semaine ${info.week} (du ${startStr} au ${endStr})`;

                weeks[key] = {
                    total: 0,
                    veggie: 0,
                    firstDate: log.date,
                    label: fullLabel
                };
            }
            weeks[key].total++;
            if (log.isVegetarian) weeks[key].veggie++;
        });

        // Sort keys. If relative (S1, S2), sort numerically. If ISO, string sort ok-ish but Year-Week better.
        return Object.entries(weeks)
            .sort((a, b) => {
                // Determine sort logic based on key format
                if (a[0].startsWith('S') && b[0].startsWith('S')) {
                    // S1 vs S10
                    const numA = parseInt(a[0].substring(1));
                    const numB = parseInt(b[0].substring(1));
                    return numB - numA; // Descending
                }
                return b[0].localeCompare(a[0]);
            })
            .map(([key, data]) => ({
                key,
                ...data
            }));
    }, [project.cateringLogs, project.shootingStartDate]); // Re-calc if start date changes

    // Summary Calculations (Daily)
    const stats = useMemo(() => {
        // Use reduce for explicit boolean checking
        const total = dailyLogs.reduce((acc, l) => acc + (l.hasEaten ? 1 : 0), 0);
        const veggie = dailyLogs.reduce((acc, l) => acc + (l.hasEaten && l.isVegetarian ? 1 : 0), 0);

        const byDept: Record<string, { total: number, veggie: number }> = {};

        dailyLogs.forEach(l => {
            if (l.hasEaten) {
                const dept = l.department || 'Autre';
                if (!byDept[dept]) byDept[dept] = { total: 0, veggie: 0 };
                byDept[dept].total++;
                if (l.isVegetarian) byDept[dept].veggie++;
            }
        });

        return { total, veggie, byDept };
    }, [dailyLogs]);

    // CSV Export Logic
    const downloadCSV = (data: any[], filename: string, isWeeklyLog = false) => {
        const headers = ['Date', 'Nom', 'Département', 'Fonction', 'Régime', 'A Mangé', 'Végétarien'];

        const rows = data.map(row => {
            // Normalize data source (Table Row vs Raw Log)
            let date, name, dept, role, diet, hasEaten, isVeg;

            if (isWeeklyLog) {
                // Raw Log (Weekly)
                const log = row as CateringLog;
                date = formatDateFR(log.date);
                name = log.guestName || (log.userId ? userProfiles.find(u => u.email === log.userId)?.firstName + ' ' + userProfiles.find(u => u.email === log.userId)?.lastName : 'Inconnu');
                dept = log.department;
                // Lookup role if user
                const profile = log.userId ? userProfiles.find(u => u.email === log.userId) : null;
                role = profile?.role || (log.isManual ? 'Invité' : '');
                diet = profile?.dietaryHabits || (log.isVegetarian ? 'Végétarien' : 'Standard');
                hasEaten = log.hasEaten ? 'OUI' : 'NON';
                isVeg = log.isVegetarian ? 'OUI' : 'NON';
            } else {
                // Table Row (Daily)
                date = formatDateFR(selectedDate);
                name = row.name;
                dept = row.department;
                role = row.role || '';
                diet = row.diet;
                hasEaten = row.hasEaten ? 'OUI' : 'NON';
                isVeg = row.isVegetarian ? 'OUI' : 'NON';
            }

            return [date, `"${name}"`, dept, `"${role}"`, diet, hasEaten, isVeg];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

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
    };

    // Structured Weekly Report
    const downloadWeeklyReport = (weekKey: string, logsForWeek: any[]) => {
        // 1. Group by Date
        const logsByDate: Record<string, any[]> = {};
        logsForWeek.forEach(log => {
            if (!logsByDate[log.date]) logsByDate[log.date] = [];
            logsByDate[log.date].push(log);
        });

        // 2. Sort Dates (ISO strings sort correctly)
        const sortedDates = Object.keys(logsByDate).sort();
        if (sortedDates.length === 0) return alert("Aucune donnée pour cette semaine.");

        const startDate = sortedDates[0];
        const endDate = sortedDates[sortedDates.length - 1]; // Use actual data range for header text? Or calculated week?
        // Let's use formatted dates from the first/last log for the filename logic or header

        // Better: Use `getWeekInfo` on one of the dates to get the theoretical week range?
        // Let's stick to actual data range for prompt message, but consistent week label.

        const weeklyTotal = logsForWeek.length;
        const weeklyVeggie = logsForWeek.filter(l => l.isVegetarian).length;

        // Find week info for header
        const weekInfo = getWeekInfo(new Date(startDate));
        const weekLabelFull = `SEMAINE ${weekInfo.week} (Du ${formatDateFR(weekInfo.startDate)} au ${formatDateFR(weekInfo.endDate)})`;

        // 3. Build CSV Content
        let csv = `RAPPORT CANTINE - ${weekLabelFull}\n`;
        csv += `TOTAL SEMAINE: ${weeklyTotal} repas (Dont Végé: ${weeklyVeggie})\n\n`;

        // Columns Header
        const cols = "Date,Nom,Département,Fonction,Régime,A Mangé,Végétarien";

        // Iterate Days
        sortedDates.forEach(date => {
            const dayLogs = logsByDate[date];
            const dayTotal = dayLogs.length;
            const dayVeggie = dayLogs.filter(l => l.isVegetarian).length;

            // Sort by Dept then Name
            dayLogs.sort((a, b) => {
                if (a.department !== b.department) return a.department.localeCompare(b.department);
                const nameA = a.guestName || (a.userId ? userProfiles.find(u => u.email === a.userId)?.lastName : '') || '';
                const nameB = b.guestName || (b.userId ? userProfiles.find(u => u.email === b.userId)?.lastName : '') || '';
                return nameA.localeCompare(nameB);
            });

            // Day Header
            csv += `JOURNÉE DU ${formatDateFR(date)} (Total: ${dayTotal} - Végé: ${dayVeggie})\n`;
            csv += `${cols}\n`;

            // Rows
            dayLogs.forEach(log => {
                // Resolve details
                const profile = log.userId ? userProfiles.find(u => u.email === log.userId) : null;
                const name = log.guestName || (profile ? `${profile.firstName} ${profile.lastName}` : 'Inconnu');
                const dept = log.department;
                const role = profile?.role || (log.isManual ? 'Invité' : '');
                const diet = profile?.dietaryHabits || (log.isVegetarian ? 'Végétarien' : 'Standard');
                const hasEaten = log.hasEaten ? 'OUI' : 'NON';
                const isVeg = log.isVegetarian ? 'OUI' : 'NON';

                csv += `${formatDateFR(date)},"${name}",${dept},"${role}",${diet},${hasEaten},${isVeg}\n`;
            });

            csv += `\n`; // Spacer between days
        });

        // Download
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `Rapport_Cantine_Semaine_${weekInfo.week}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

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

                <div className="flex flex-wrap justify-center md:justify-end items-center gap-4 w-full md:w-auto">
                    {/* View Toggle for Production & Régie */}
                    {isRegie && (
                        <div className="bg-cinema-900 rounded-lg p-1 flex gap-1 border border-cinema-700">
                            {/* Export BUTTON for Daily View */}
                            {viewMode === 'daily' && (
                                <button
                                    onClick={() => downloadCSV(tableData, `Cantine_Jour_${selectedDate}`)}
                                    className="px-3 py-1.5 rounded-md text-sm font-medium text-eco-400 hover:text-eco-300 flex items-center gap-1 border-r border-cinema-700 pr-2 mr-2"
                                    title="Exporter la journée"
                                >
                                    <Download className="h-4 w-4" />
                                    <span className="hidden lg:inline">Export Jour</span>
                                </button>
                            )}

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

            {/* PDT / FORECAST SECTION */}
            {
                isRegie && (
                    <div className="bg-cinema-900/50 border border-cinema-700 rounded-xl p-4 flex flex-col md:flex-row gap-6 items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                <PieIcon className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold">Prévisions (PDT)</h3>
                                <p className="text-xs text-slate-400">Basé sur la feuille de service</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 md:gap-8">
                            {/* Technique */}
                            <div className="text-center">
                                <div className="text-xl font-bold text-white">
                                    {(project.members ? Object.values(project.members).length : 0)}
                                </div>
                                <div className="text-[10px] uppercase font-bold text-slate-500">Technique</div>
                            </div>

                            {/* Comédiens (From PDT) */}
                            <div className="text-center">
                                <div className="text-xl font-bold text-white">
                                    {(() => {
                                        const pdtDay = project.pdtDays?.find(d => d.date === selectedDate);
                                        return pdtDay?.cast?.length || 0;
                                    })()}
                                </div>
                                <div className="text-[10px] uppercase font-bold text-slate-500">Comédiens</div>
                            </div>

                            {/* Figurants (Editable) */}
                            <div className="text-center">
                                <div className="relative group">
                                    <input
                                        type="number"
                                        className="w-16 bg-cinema-800 border border-cinema-600 rounded text-center text-white font-bold focus:border-amber-500 outline-none"
                                        value={(() => {
                                            // 1. Manual Override?
                                            if (project.cateringInfos?.[selectedDate]?.extrasManual !== undefined) {
                                                return project.cateringInfos[selectedDate].extrasManual;
                                            }
                                            // 2. PDT Value?
                                            const pdtDay = project.pdtDays?.find(d => d.date === selectedDate);
                                            if (pdtDay?.extras) {
                                                const match = pdtDay.extras.match(/(\d+)/);
                                                return match ? parseInt(match[1]) : 0;
                                            }
                                            return 0;
                                        })()}
                                        onChange={async (e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            const newInfos = {
                                                ...(project.cateringInfos || {}),
                                                [selectedDate]: {
                                                    ...(project.cateringInfos?.[selectedDate] || { date: selectedDate }),
                                                    extrasManual: val
                                                }
                                            };
                                            await updateProjectDetails({ cateringInfos: newInfos });
                                        }}
                                    />
                                    <div className="absolute -top-2 -right-2 hidden group-hover:block text-[8px] bg-slate-700 text-white px-1 rounded pointer-events-none">
                                        Modifiable
                                    </div>
                                </div>
                                <div className="text-[10px] uppercase font-bold text-slate-500 mt-1">Figurants</div>
                            </div>

                            {/* Cascadeurs (Editable) */}
                            <div className="text-center">
                                <div className="relative group">
                                    <input
                                        type="number"
                                        className="w-16 bg-cinema-800 border border-cinema-600 rounded text-center text-white font-bold focus:border-amber-500 outline-none"
                                        value={project.cateringInfos?.[selectedDate]?.stunts || 0}
                                        onChange={async (e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            const newInfos = {
                                                ...(project.cateringInfos || {}),
                                                [selectedDate]: {
                                                    ...(project.cateringInfos?.[selectedDate] || { date: selectedDate }),
                                                    stunts: val
                                                }
                                            };
                                            await updateProjectDetails({ cateringInfos: newInfos });
                                        }}
                                    />
                                </div>
                                <div className="text-[10px] uppercase font-bold text-slate-500 mt-1">Cascadeurs</div>
                            </div>

                            {/* TOTAL PREVISIONNEL */}
                            <div className="w-px h-10 bg-cinema-700 mx-2 hidden md:block"></div>

                            <div className="text-center">
                                <div className="text-2xl font-bold text-amber-500">
                                    {(() => {
                                        // Calculate Total Forecast
                                        const tech = project.members ? Object.values(project.members).length : 0;

                                        const pdtDay = project.pdtDays?.find(d => d.date === selectedDate);
                                        const cast = pdtDay?.cast?.length || 0;

                                        let extras = 0;
                                        if (project.cateringInfos?.[selectedDate]?.extrasManual !== undefined) {
                                            extras = project.cateringInfos[selectedDate].extrasManual!;
                                        } else if (pdtDay?.extras) {
                                            const match = pdtDay.extras.match(/(\d+)/);
                                            extras = match ? parseInt(match[1]) : 0;
                                        }

                                        const stunts = project.cateringInfos?.[selectedDate]?.stunts || 0;

                                        return tech + cast + extras + stunts;
                                    })()}
                                </div>
                                <div className="text-[10px] uppercase font-bold text-amber-500/70">Total Prévu</div>
                            </div>

                        </div>
                    </div>
                )
            }

            {/* WEEKLY VIEW TABLE */}
            {
                viewMode === 'weekly' ? (
                    <div className="bg-cinema-800 rounded-xl border border-cinema-700 overflow-hidden animate-in fade-in">
                        <div className="overflow-x-auto">
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
                                                <div className="flex justify-center gap-4">
                                                    <button
                                                        onClick={() => {
                                                            // Filter logs for this week
                                                            const logsForWeek = (project.cateringLogs || []).filter(l => {
                                                                if (!l.hasEaten) return false;
                                                                const d = new Date(l.date);
                                                                const info = getWeekInfo(d);
                                                                // Match by key (S1, S2... or 2023-45)
                                                                return info.key === week.key;
                                                            });
                                                            downloadWeeklyReport(week.key, logsForWeek);
                                                        }}
                                                        className="text-eco-400 hover:text-eco-300 text-sm font-bold flex items-center gap-1 hover:underline"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                        CSV
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedDate(week.firstDate);
                                                            setViewMode('daily');
                                                        }}
                                                        className="text-blue-400 hover:text-blue-300 text-sm font-bold hover:underline"
                                                    >
                                                        Voir Détail
                                                    </button>
                                                </div>
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
                    </div>
                ) : (
                    <>

                        {/* Main Table (Daily) */}
                        <div className="bg-cinema-800 rounded-xl border border-cinema-700 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-cinema-900/50 border-b border-cinema-700 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            <th className="px-2 py-3 md:px-6 md:py-4">Nom</th>
                                            <th className="px-2 py-3 md:px-6 md:py-4 text-center">
                                                <span className="md:hidden">Manger</span>
                                                <span className="hidden md:inline">A Mangé ?</span>
                                            </th>
                                            <th className="px-2 py-3 md:px-6 md:py-4 text-center">
                                                <span className="md:hidden">Végé</span>
                                                <span className="hidden md:inline">Végétarien ?</span>
                                            </th>
                                            <th className="px-2 py-3 md:px-6 md:py-4">Régime</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-cinema-700">
                                        {/* Group by Department */}
                                        {Object.entries(
                                            tableData.reduce((acc, row) => {
                                                const dept = row.department || 'Autre';
                                                if (!acc[dept]) acc[dept] = [];
                                                acc[dept].push(row);
                                                return acc;
                                            }, {} as Record<string, typeof tableData>)
                                        ).sort((a, b) => a[0].localeCompare(b[0])).map(([dept, rows]) => (
                                            <React.Fragment key={dept}>
                                                {/* Department Header */}
                                                <tr className="bg-cinema-900/80 border-b border-cinema-700">
                                                    <td colSpan={4} className="px-2 py-2 md:px-6 md:py-3 text-eco-400 font-bold uppercase tracking-wider text-xs md:text-sm">
                                                        {dept} <span className="text-slate-500 text-[10px] md:text-xs ml-2">({rows.length} pers.)</span>
                                                    </td>
                                                </tr>
                                                {/* Rows for this Department */}
                                                {rows.map((row) => (
                                                    <tr key={row.id} className="hover:bg-cinema-700/30 transition-colors">
                                                        <td className="px-2 py-3 md:px-6 md:py-4">
                                                            <div className="font-bold text-white flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                                                                <span className="truncate max-w-[150px] md:max-w-none">{row.name}</span>
                                                                <div className="text-[10px] md:text-xs text-slate-500 truncate max-w-[100px] md:max-w-none hidden sm:block">
                                                                    {row.role}
                                                                </div>
                                                                {row.isManual && <span className="text-[8px] md:text-[10px] bg-blue-900/50 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30 inline-block w-fit">INVITÉ</span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-3 md:px-6 md:py-4 text-center">
                                                            <button
                                                                onClick={() => handleToggleMeal(row, 'hasEaten')}
                                                                disabled={!isRegie || isValidated}
                                                                className={`p-1.5 md:p-2 rounded-lg transition-all ${row.hasEaten
                                                                    ? 'bg-green-600 text-white shadow-lg shadow-green-600/20 md:scale-110'
                                                                    : 'bg-cinema-900 text-slate-600 hover:bg-cinema-700'
                                                                    } ${(!isRegie || isValidated) && 'opacity-50 cursor-not-allowed'}`}
                                                            >
                                                                <Check className="h-4 w-4 md:h-5 md:w-5" />
                                                            </button>
                                                        </td>
                                                        <td className="px-2 py-3 md:px-6 md:py-4 text-center">
                                                            <button
                                                                onClick={() => handleToggleMeal(row, 'isVegetarian')}
                                                                disabled={!isRegie || isValidated}
                                                                className={`p-1.5 md:p-2 rounded-lg transition-all ${row.isVegetarian
                                                                    ? 'bg-eco-600 text-white shadow-lg shadow-eco-600/20'
                                                                    : 'bg-cinema-900 text-slate-600 hover:bg-cinema-700'
                                                                    } ${(!isRegie || isValidated) && 'opacity-50 cursor-not-allowed'}`}
                                                            >
                                                                <Leaf className="h-4 w-4 md:h-5 md:w-5" />
                                                            </button>
                                                        </td>
                                                        <td className="px-2 py-3 md:px-6 md:py-4">
                                                            {row.diet !== 'Standard' ? (
                                                                <span className="text-[10px] md:text-xs font-bold bg-purple-900/50 text-purple-400 px-1.5 py-0.5 md:px-2 md:py-1 rounded border border-purple-500/30 whitespace-nowrap">
                                                                    {row.diet === 'Végétarien' ? 'Végé' : row.diet}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] md:text-xs text-slate-600">Std</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Production Summary View (Daily) - Moved to Bottom */}
                        {isProduction && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
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
                    </>
                )
            }

            {/* Add Guest Modal */}
            {
                isAddGuestModalOpen && (
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
                )
            }
        </div >
    );
};
