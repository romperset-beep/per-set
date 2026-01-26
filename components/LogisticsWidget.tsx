
import React, { useState, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { useNotification } from '../context/NotificationContext'; // Added
import { Department, LogisticsRequest, LogisticsType } from '../types';
import { Truck, ChevronLeft, ChevronRight, Plus, X, Calendar, MapPin, Clock, FileText, User, ChevronDown, ChevronRight as ChevronRightIcon, Package } from 'lucide-react';

export const LogisticsWidget: React.FC = () => {
    const { project, updateProjectDetails, user, currentDept, addNotification, addLogisticsRequest, deleteLogisticsRequest } = useProject();
    const { notifications, markAsRead } = useNotification(); // Added

    // Auto-clear notifications for Production
    React.useEffect(() => {
        if (user?.department === 'PRODUCTION' || user?.department === Department.REGIE) {
            const unread = notifications.filter(n => !n.read && (n.message.toLowerCase().includes('transport') || n.targetDept === 'PRODUCTION'));
            if (unread.length > 0) {
                unread.forEach(n => markAsRead(n.id));
            }
        }
    }, [user, notifications, markAsRead]);

    // --- Production View State ---
    const [prodSelectedWeek, setProdSelectedWeek] = useState<string | null>(null);
    const [prodExpandedDays, setProdExpandedDays] = useState<string[]>([]);
    // If Production wants to manage their own requests, they also need viewMode
    const [viewMode, setViewMode] = useState<'OVERVIEW' | 'MY_REQUESTS'>('OVERVIEW');

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
                key: `S${weekNum}`
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
            key: `${d.getUTCFullYear()}-${weekNo}`
        };
    };

    const groupedByWeek = useMemo(() => {
        const groups: Record<string, { label: string, count: number, days: string[] }> = {};
        const allDates = (project.logistics || []).map(r => r.date).sort();
        if (allDates.length === 0) return {};

        (project.logistics || []).forEach(r => {
            const d = new Date(r.date);
            const { key, label } = getWeekInfo(d);

            if (!groups[key]) {
                groups[key] = {
                    label,
                    count: 0,
                    days: []
                };
            }
            groups[key].count += 1;
            if (!groups[key].days.includes(r.date)) groups[key].days.push(r.date);
        });
        return groups;
    }, [project.logistics, project.shootingStartDate]);

    const toggleProdDay = (dateStr: string) => {
        setProdExpandedDays(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]);
    };

    // --- Department View State ---
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

    // --- Form State ---
    const [addingToDate, setAddingToDate] = useState<string | null>(null);
    const [newType, setNewType] = useState<LogisticsType>('roundtrip');
    const [newTime, setNewTime] = useState('');
    const [newLocation, setNewLocation] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newContact, setNewContact] = useState('');
    const [newVehicle, setNewVehicle] = useState<'HGV' | 'Truck' | 'Van' | 'Car' | 'Scooter'>('Van');
    const [newDistance, setNewDistance] = useState('');

    const getRequests = (dateStr: string, dept: string) => {
        return (project.logistics || []).filter(r => r.date === dateStr && r.department === dept);
    };

    const handleAddRequest = async () => {
        if (!addingToDate || !newLocation || !newTime) return;
        const targetDept = user?.department === 'PRODUCTION' ? currentDept : user?.department;
        if (!targetDept) return;

        const newReq: LogisticsRequest = {
            id: `log_${Date.now()}`,
            date: addingToDate,
            department: targetDept as any,
            type: newType,
            time: newTime,
            location: newLocation,
            description: newDescription,
            contact: newContact || user?.name || '',
            vehicleType: newVehicle,
            distanceKm: newDistance ? parseFloat(newDistance) : 0
        };

        await addLogisticsRequest(newReq);

        // Reset
        setAddingToDate(null);
        setNewLocation('');
        setNewDescription('');
        setNewTime('');
        setNewContact('');
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Supprimer cette demande ?')) return;
        await deleteLogisticsRequest(id);
    };

    // --- RENDER ---

    // 1. PRODUCTION OVERVIEW
    if ((user?.department === 'PRODUCTION' || user?.department === Department.REGIE) && currentDept === 'PRODUCTION' && viewMode === 'OVERVIEW') {
        const sortedWeeks = Object.entries(groupedByWeek).sort((a, b) => b[0].localeCompare(a[0]));

        return (
            <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center gap-4 bg-cinema-800 p-6 rounded-xl border border-cinema-700">
                    <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400">
                        <Truck className="h-8 w-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Logistique Matériel</h2>
                        <p className="text-slate-400">Vue globale des transports</p>
                    </div>
                    <div className="w-full md:w-auto md:ml-auto mt-4 md:mt-0">
                        <button
                            onClick={() => setViewMode('MY_REQUESTS')}
                            className="w-full md:w-auto bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Gérer mes Transports
                        </button>
                    </div>
                </div>

                <div className="bg-cinema-800/50 rounded-xl border border-cinema-700 overflow-hidden">
                    {sortedWeeks.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">Aucun transport prévu.</div>
                    ) : (
                        <div className="divide-y divide-cinema-700">
                            {sortedWeeks.map(([weekKey, weekData]) => (
                                <div key={weekKey} className="bg-cinema-800">
                                    <button
                                        onClick={() => setProdSelectedWeek(prodSelectedWeek === weekKey ? null : weekKey)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-cinema-700/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            {prodSelectedWeek === weekKey ? <ChevronDown className="h-5 w-5 text-amber-400" /> : <ChevronRightIcon className="h-5 w-5 text-slate-500" />}
                                            <span className="text-lg font-semibold text-white">{weekData.label}</span>
                                        </div>
                                        <div className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-sm font-bold">
                                            {weekData.count} Course(s)
                                        </div>
                                    </button>

                                    {prodSelectedWeek === weekKey && (
                                        <div className="bg-cinema-900/30 border-t border-cinema-700 pl-4 md:pl-8">
                                            {weekData.days.sort().map(dateStr => {
                                                const dayRequests = (project.logistics || []).filter(r => r.date === dateStr);
                                                const dateObj = new Date(dateStr);
                                                const isExpanded = prodExpandedDays.includes(dateStr);

                                                return (
                                                    <div key={dateStr} className="border-l border-cinema-700 ml-4 my-2">
                                                        <button
                                                            onClick={() => toggleProdDay(dateStr)}
                                                            className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors rounded-r-lg text-left"
                                                        >
                                                            {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRightIcon className="h-4 w-4 text-slate-500" />}
                                                            <span className="text-slate-200 font-medium capitalize">
                                                                {dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                                                            </span>
                                                            <span className="text-xs text-slate-400 bg-cinema-800 px-2 py-0.5 rounded border border-cinema-700">
                                                                {dayRequests.length}
                                                            </span>
                                                        </button>

                                                        {isExpanded && (
                                                            <div className="pl-8 pr-4 pb-2 space-y-2">
                                                                {dayRequests.map(req => (
                                                                    <div key={req.id} className="bg-cinema-800 p-3 rounded-lg border border-cinema-700 flex flex-col md:flex-row md:items-center gap-4">
                                                                        <div className="flex items-center gap-2 w-32 shrink-0">
                                                                            <span className="text-xs font-bold text-amber-500 px-2 py-1 bg-amber-500/10 rounded uppercase">
                                                                                {req.department}
                                                                            </span>
                                                                        </div>

                                                                        <div className="flex-1 space-y-1 min-w-0">
                                                                            <div className="flex flex-wrap items-center gap-2 text-white font-medium">
                                                                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                                                                {req.time}
                                                                                <span className="text-slate-500 mx-1">•</span>
                                                                                <span className={`uppercase text-xs font-bold ${req.type === 'pickup' ? 'text-green-400' :
                                                                                    req.type === 'dropoff' ? 'text-blue-400' :
                                                                                        req.type === 'pickup_set' ? 'text-lime-400' :
                                                                                            req.type === 'dropoff_set' ? 'text-cyan-400' :
                                                                                                'text-purple-400'
                                                                                    }`}>
                                                                                    {req.type === 'pickup' ? 'Enlèvement' :
                                                                                        req.type === 'dropoff' ? 'Retour' :
                                                                                            req.type === 'pickup_set' ? 'Enlèvement Plateau' :
                                                                                                req.type === 'dropoff_set' ? 'Retour Plateau' :
                                                                                                    'A/R'}
                                                                                </span>
                                                                                <span className="text-slate-500 mx-1">•</span>
                                                                                {req.distanceKm ? <><span className="text-slate-500 mx-1">•</span><span className="text-slate-300">{req.distanceKm} km ({req.vehicleType})</span></> : null}
                                                                                <span className="text-slate-500 mx-1">•</span>
                                                                                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                                                                <span className="text-slate-300">{req.location}</span>
                                                                            </div>
                                                                            {req.description && (
                                                                                <div className="text-sm text-slate-400 italic">
                                                                                    "{req.description}"
                                                                                </div>
                                                                            )}
                                                                            {req.contact && (
                                                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                                                    <User className="h-3 w-3" /> {req.contact}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(req.id); }} className="text-slate-600 hover:text-red-400 p-1">
                                                                            <X className="h-4 w-4" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 2. DEPARTMENT MODAL & VIEW (Or Requests View)
    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-cinema-800 p-6 rounded-xl border border-cinema-700">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400">
                        <Truck className="h-8 w-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Aller-Retour Matériel</h2>
                        <p className="text-slate-400">
                            {user?.department === 'PRODUCTION' ? 'Mes Transports' : `${currentDept} - Demandes de transport`}
                        </p>
                    </div>
                </div>

                {(user?.department === 'PRODUCTION' || user?.department === Department.REGIE) && (
                    <button
                        onClick={() => setViewMode('OVERVIEW')}
                        className="bg-cinema-700 hover:bg-cinema-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <Truck className="h-4 w-4" />
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

            {/* Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                {days.map((day) => {
                    const dateStr = day.toISOString().split('T')[0];
                    const isToday = new Date().toISOString().split('T')[0] === dateStr;
                    const requests = getRequests(dateStr, (user?.department === 'PRODUCTION' || user?.department === Department.REGIE) ? currentDept : user?.department || '');

                    return (
                        <div key={dateStr} className={`bg-cinema-800 rounded-xl border ${isToday ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-cinema-700'} flex flex-col h-full min-h-[300px]`}>
                            <div className={`p-3 text-center border-b ${isToday ? 'bg-amber-500/10 border-amber-500' : 'bg-cinema-900/50 border-cinema-700'}`}>
                                <div className={`text-sm font-bold uppercase ${isToday ? 'text-amber-400' : 'text-slate-400'}`}>
                                    {day.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}
                                </div>
                                <div className={`text-xl font-bold ${isToday ? 'text-white' : 'text-slate-200'}`}>
                                    {day.getDate()}
                                </div>
                            </div>

                            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                                <div className="h-full flex flex-col">
                                    <div className="flex-1 space-y-2">
                                        {requests.length > 0 ? requests.map(req => (
                                            <div key={req.id} className="bg-slate-700/30 p-2 rounded-lg border border-transparent hover:border-slate-600 transition-colors group relative">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${req.type === 'pickup' ? 'bg-green-500/20 text-green-400' :
                                                        req.type === 'dropoff' ? 'bg-blue-500/20 text-blue-400' :
                                                            req.type === 'pickup_set' ? 'bg-lime-500/20 text-lime-400' :
                                                                req.type === 'dropoff_set' ? 'bg-cyan-500/20 text-cyan-400' :
                                                                    'bg-purple-500/20 text-purple-400'
                                                        }`}>
                                                        {req.type === 'pickup' ? 'Enlèv.' :
                                                            req.type === 'dropoff' ? 'Retour' :
                                                                req.type === 'pickup_set' ? 'Enl. Plat.' :
                                                                    req.type === 'dropoff_set' ? 'Ret. Plat.' :
                                                                        'A/R'}
                                                    </span>
                                                    <span className="text-xs text-slate-300 font-mono">{req.time}</span>
                                                </div>
                                                <div className="text-xs font-medium text-white truncate mb-0.5" title={req.location}>
                                                    {req.location}
                                                </div>
                                                {req.description && (
                                                    <div className="text-[10px] text-slate-400 truncate italic">
                                                        {req.description}
                                                    </div>
                                                )}

                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(req.id); }}
                                                    className="absolute top-1 right-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        )) : (
                                            !addingToDate && (
                                                <div onClick={() => setAddingToDate(dateStr)} className="h-full flex flex-col items-center justify-center text-slate-600 hover:text-amber-400 cursor-pointer transition-colors border-2 border-dashed border-cinema-700 hover:border-amber-500/50 rounded-lg p-4 min-h-[100px]">
                                                    <Plus className="h-6 w-6 mb-2" />
                                                    <span className="text-xs font-medium">Demander</span>
                                                </div>
                                            )
                                        )}
                                    </div>

                                    {addingToDate !== dateStr && requests.length > 0 && (
                                        <button
                                            onClick={() => setAddingToDate(dateStr)}
                                            className="mt-2 w-full py-2 flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-amber-400 hover:bg-cinema-700/30 rounded-lg transition-colors border border-transparent hover:border-cinema-700"
                                        >
                                            <Plus className="h-3 w-3" />
                                            Ajouter
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ADD MODAL */}
            {addingToDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setAddingToDate(null)}>
                    <div className="bg-cinema-800 rounded-xl border border-cinema-700 shadow-2xl w-full max-w-lg p-6 space-y-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Nouvelle Demande de Transport</h3>
                            <button onClick={() => setAddingToDate(null)} className="text-slate-400 hover:text-white">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-amber-300 text-sm font-medium flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(addingToDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Type</label>
                                <select
                                    className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
                                    value={newType}
                                    onChange={e => setNewType(e.target.value as any)}
                                >
                                    <option value="pickup">Enlèvement (Chez Loueur)</option>
                                    <option value="dropoff">Retour (Chez Loueur)</option>
                                    <option value="pickup_set">Enlèvement Plateau</option>
                                    <option value="dropoff_set">Retour Plateau</option>
                                    <option value="roundtrip">Aller-Retour</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Heure</label>
                                    <input
                                        type="time"
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
                                        value={newTime}
                                        onChange={e => setNewTime(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Type de Véhicule</label>
                                    <select
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
                                        value={newVehicle}
                                        onChange={e => setNewVehicle(e.target.value as any)}
                                    >
                                        <option value="Van">Van / Utilitaire</option>
                                        <option value="Truck">Porteur (Camion)</option>
                                        <option value="HGV">Poids Lourd</option>
                                        <option value="Car">Voiture</option>
                                        <option value="Scooter">2 Roues</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Distance (km)</label>
                            <input
                                type="number"
                                placeholder="Ex: 50"
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                                value={newDistance}
                                onChange={e => setNewDistance(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Lieu / Loueur</label>
                            <div className="relative">
                                <MapPin className="h-4 w-4 absolute left-3 top-3 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Ex: TSF Caméra, Loge..."
                                    className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-2.5 pl-10 text-white focus:outline-none focus:border-amber-500"
                                    value={newLocation}
                                    onChange={e => setNewLocation(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Description (Liste Matériel)</label>
                            <div className="relative">
                                <Package className="h-4 w-4 absolute left-3 top-3 text-slate-500" />
                                <textarea
                                    placeholder="Ex: 10 Pellicules, Caméra B..."
                                    className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-2.5 pl-10 text-white focus:outline-none focus:border-amber-500 min-h-[80px]"
                                    value={newDescription}
                                    onChange={e => setNewDescription(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Contact sur place (Optionnel)</label>
                            <div className="relative">
                                <User className="h-4 w-4 absolute left-3 top-3 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Nom & Téléphone"
                                    className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-2.5 pl-10 text-white focus:outline-none focus:border-amber-500"
                                    value={newContact}
                                    onChange={e => setNewContact(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                onClick={() => setAddingToDate(null)}
                                className="px-4 py-2 text-slate-400 hover:text-white transition-colors font-medium"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleAddRequest}
                                disabled={!newLocation || !newTime}
                                className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
                            >
                                Valider la Demande
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
