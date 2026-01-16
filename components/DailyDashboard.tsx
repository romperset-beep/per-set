
import React, { useMemo, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Clock, MapPin, Utensils, Activity, Calendar, FileText } from 'lucide-react';

export const DailyDashboard: React.FC = () => {
    const { project, user, callSheets } = useProject();

    // Get "Today's" Call Sheet

    // Get "Today's" Call Sheet
    const todayCallSheet = useMemo(() => {
        if (!callSheets) return null;

        // Ensure robust date comparison (Local vs UTC issues)
        // Since CallSheet upload uses YYYY-MM-DD string from input type="date", we should compare against local YYYY-MM-DD
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        return callSheets.find(cs => cs.date === todayStr);
    }, [callSheets]);

    // Format Call Time
    const callTimeDisplay = todayCallSheet?.callTime || '--:--';

    // Helper for Google Maps Link
    const getMapsLink = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            {/* Header / Date */}
            <div className="flex justify-between items-end mb-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Bonjour, {user?.name.split(' ')[0]} 👋</h1>
                    <p className="text-slate-400 text-sm mt-1 uppercase tracking-wider font-semibold">
                        {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>
            </div>

            {/* MAIN DAILY CARD */}
            <div className="bg-gradient-to-br from-cinema-800 to-cinema-900 rounded-2xl p-6 border border-cinema-700 shadow-xl relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* LEFT: SCHEDULE */}
                    <div className="flex flex-col justify-center items-center md:items-start space-y-2">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                            <Clock className="w-4 h-4" />
                            HORAIRES DE LA JOURNÉE
                        </div>
                        <div className={`font-black text-white tracking-tighter ${todayCallSheet?.endTime ? 'text-4xl md:text-6xl' : 'text-6xl md:text-8xl'}`}>
                            {todayCallSheet?.endTime ? `${callTimeDisplay} - ${todayCallSheet.endTime}` : callTimeDisplay}
                        </div>
                        {todayCallSheet ? (
                            <a
                                href={todayCallSheet.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-bold transition-all shadow-lg hover:shadow-blue-500/25 mt-2"
                            >
                                <FileText className="w-4 h-4" />
                                {todayCallSheet.name} (PDF)
                            </a>
                        ) : (
                            <p className="text-xs text-slate-500 italic mt-2">Aucune feuille de service pour aujourd'hui.</p>
                        )}
                    </div>

                    {/* RIGHT: LOCATIONS */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> Localisations
                        </h3>

                        {/* Set 1 */}
                        {todayCallSheet?.location1 ? (
                            <a
                                href={getMapsLink(todayCallSheet.location1)}
                                target="_blank"
                                rel="noreferrer"
                                className="block group"
                            >
                                <div className="bg-white/5 hover:bg-white/10 p-3 rounded-lg border border-white/10 transition-colors flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-md group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs text-slate-400 font-bold uppercase">Décor Principal</div>
                                        <div className="text-sm font-medium text-white line-clamp-1">{todayCallSheet.location1}</div>
                                    </div>
                                    <div className="text-xs text-blue-400 font-bold group-hover:underline">Voir</div>
                                </div>
                            </a>
                        ) : (
                            <div className="p-3 rounded-lg border border-white/5 bg-white/5 opacity-50 flex items-center gap-3">
                                <div className="p-2 bg-slate-700 rounded-md"><MapPin className="w-5 h-5 text-slate-500" /></div>
                                <span className="text-sm text-slate-500">Adresse Décor non renseignée</span>
                            </div>
                        )}

                        {/* Set 2 (Conditional) */}
                        {todayCallSheet?.location2 && (
                            <a
                                href={getMapsLink(todayCallSheet.location2)}
                                target="_blank"
                                rel="noreferrer"
                                className="block group"
                            >
                                <div className="bg-white/5 hover:bg-white/10 p-3 rounded-lg border border-white/10 transition-colors flex items-center gap-3">
                                    <div className="p-2 bg-teal-500/20 text-teal-400 rounded-md group-hover:bg-teal-500 group-hover:text-white transition-colors">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs text-slate-400 font-bold uppercase">Décor Secondaire</div>
                                        <div className="text-sm font-medium text-white line-clamp-1">{todayCallSheet.location2}</div>
                                    </div>
                                    <div className="text-xs text-blue-400 font-bold group-hover:underline">Voir</div>
                                </div>
                            </a>
                        )}

                        {/* Catering */}
                        {todayCallSheet?.cateringLocation && (
                            <a
                                href={getMapsLink(todayCallSheet.cateringLocation)}
                                target="_blank"
                                rel="noreferrer"
                                className="block group"
                            >
                                <div className="bg-white/5 hover:bg-white/10 p-3 rounded-lg border border-white/10 transition-colors flex items-center gap-3">
                                    <div className="p-2 bg-orange-500/20 text-orange-400 rounded-md group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                        <Utensils className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs text-slate-400 font-bold uppercase">Cantine</div>
                                        <div className="text-sm font-medium text-white line-clamp-1">{todayCallSheet.cateringLocation}</div>
                                    </div>
                                    <div className="text-xs text-blue-400 font-bold group-hover:underline">Voir</div>
                                </div>
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* PEDOMETER REMOVED BY USER REQUEST (Mockup only) */}

            {/* GRID OF OTHER WIDGETS (To be managed by parent or integrated here?) 
               For now this is the "Top" view. The standard grid can follow. 
             */}
        </div>
    );
};
