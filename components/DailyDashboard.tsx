
import React, { useMemo, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Clock, MapPin, Utensils, Activity, Footprints, Calendar } from 'lucide-react';
import { CallSheet } from '../types';

export const DailyDashboard: React.FC = () => {
    const { project, user, callSheets } = useProject();

    // Pedometer State (Mockup/Interactive)
    const [steps, setSteps] = useState(0); // In a real app, this would use PWA sensors or manual input

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
                            PÂT (Prêt à Tourner)
                        </div>
                        <div className="text-6xl md:text-8xl font-black text-white tracking-tighter">
                            {callTimeDisplay}
                        </div>
                        {todayCallSheet && (
                            <div className="text-xs text-blue-400 font-medium px-3 py-1 bg-blue-900/30 rounded-full border border-blue-500/30">
                                {todayCallSheet.name}
                            </div>
                        )}
                        {!todayCallSheet && (
                            <p className="text-xs text-slate-500 italic">Aucune feuille de service pour aujourd'hui.</p>
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

            {/* PEDOMETER WIDGET */}
            <div className="bg-cinema-800 rounded-xl p-5 border border-cinema-700 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
                {/* Decorative */}
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-eco-500/10 rounded-full blur-2xl group-hover:bg-eco-500/20 transition-all" />

                <div className="flex items-center gap-4 z-10 w-full">
                    <div className="p-4 bg-eco-900/50 rounded-full border border-eco-500/30 text-eco-400">
                        <Footprints className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Podomètre de Tournage</h3>
                        <p className="text-sm text-slate-400">Gardez la forme (et trackez votre bilan carbone piéton) !</p>
                    </div>
                </div>

                {/* Interactive Counter (Since we can't access real hardware easily on web without permission API complexity) */}
                <div className="flex items-center gap-4 z-10 bg-cinema-900/50 p-2 rounded-lg border border-cinema-700">
                    <div className="text-right">
                        <div className="text-3xl font-black text-white font-mono">{steps.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest text-right">Pas aujourd'hui</div>
                    </div>
                    <button
                        onClick={() => setSteps(s => s + 100)} // Simulator for demo
                        className="px-3 py-1 bg-eco-600 hover:bg-eco-500 text-white text-xs font-bold rounded shadow active:scale-95 transition-all"
                    >
                        + Simuler
                    </button>
                </div>
            </div>

            {/* GRID OF OTHER WIDGETS (To be managed by parent or integrated here?) 
               For now this is the "Top" view. The standard grid can follow. 
             */}
        </div>
    );
};
