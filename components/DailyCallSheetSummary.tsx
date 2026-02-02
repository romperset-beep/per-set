import React, { useMemo, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Clock, MapPin, Utensils, AlertTriangle, CloudRain, FileText, ChevronDown, ChevronRight, Film } from 'lucide-react';

export const DailyCallSheetSummary: React.FC<{ overrideDepartment?: string }> = ({ overrideDepartment }) => {
    const { project, user, callSheets } = useProject();
    const effectiveDept = overrideDepartment || user?.department;

    // Get "Today's" Call Sheet
    const todayCallSheet = useMemo(() => {
        if (!callSheets) return null;
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        return callSheets.find(cs => cs.date === todayStr);
    }, [callSheets]);

    // Helper for fuzzy department matching
    const getDepartmentTime = (sheet: any, userDept: string) => {
        if (!sheet || !sheet.departmentCallTimes || !userDept) return null;
        const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
        const target = normalize(userDept);

        if (sheet.departmentCallTimes[userDept]) return sheet.departmentCallTimes[userDept];

        const keys = Object.keys(sheet.departmentCallTimes);
        let match = keys.find(k => normalize(k) === target);
        if (match) return sheet.departmentCallTimes[match];

        const synonyms: Record<string, string[]> = {
            'camera': ['image', 'photo', 'cadre', 'opv'],
            'costume': ['habillage', 'wardrobe', 'costumes'],
            'maquillage': ['hmc', 'makeup', 'make-up'],
            'coiffure': ['hmc', 'coiff'],
            'regie': ['general', 'transport', 'cantine'],
            'mise en scene': ['realisation', 'real', 'assistant', 'mes'],
            'lumiere': ['electro', 'elec', 'electricien'],
            'machinerie': ['machino', 'grip', 'machiniste'],
            'decoration': ['deco', 'art'],
            'son': ['sound', 'audio', 'perchman']
        };

        const targetSynonyms = synonyms[target] || [];
        match = keys.find(k => {
            const normKey = normalize(k);
            if (normKey.includes(target)) return true;
            if (target.includes(normKey)) return true;
            return targetSynonyms.some(syn => normKey.includes(syn) || syn.includes(normKey));
        });

        return match ? sheet.departmentCallTimes[match] : null;
    };

    // Format Call Time
    const callTimeDisplay = useMemo(() => {
        if (!todayCallSheet) return '--:--';
        if (effectiveDept) {
            const specificTime = getDepartmentTime(todayCallSheet, effectiveDept);
            if (specificTime) return specificTime;
        }
        return todayCallSheet.callTime || '--:--';
    }, [todayCallSheet, effectiveDept]);

    const getMapsLink = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

    if (!todayCallSheet) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-slate-400 bg-cinema-800 rounded-xl border border-cinema-700">
                <FileText className="w-12 h-12 mb-4 opacity-50" />
                <p>Aucune feuille de service pour aujourd'hui.</p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-cinema-800 to-cinema-900 rounded-2xl p-6 border border-cinema-700 shadow-xl relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="relative z-10 flex flex-col gap-8">
                {/* TOP HERO: SCHEDULE */}
                <div className="w-full flex flex-col justify-center items-center gap-3 py-2">
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full border border-white/5 backdrop-blur-sm">
                        <Clock className="w-3 h-3" />
                        {effectiveDept && getDepartmentTime(todayCallSheet, effectiveDept)
                            ? `CONVOCATION ${effectiveDept.toUpperCase()}`
                            : 'P.A.T GÉNÉRAL'}
                    </div>

                    <div className="relative z-10">
                        <span className="font-black text-white tracking-tighter text-7xl md:text-8xl drop-shadow-2xl">
                            {callTimeDisplay}
                        </span>
                    </div>

                    <div className="flex flex-wrap justify-center gap-8 items-center w-full max-w-xl px-4 mt-1">
                        {(effectiveDept &&
                            todayCallSheet?.departmentCallTimes &&
                            getDepartmentTime(todayCallSheet, effectiveDept) &&
                            todayCallSheet.callTime) && (
                                <div className="flex flex-col items-center">
                                    <span className="text-slate-500 text-[10px] uppercase tracking-wider font-bold mb-0.5">P.A.T Général</span>
                                    <span className="text-slate-300 text-lg font-bold font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">{todayCallSheet.callTime}</span>
                                </div>
                            )}

                        {todayCallSheet?.endTime && (
                            <div className="flex flex-col items-center">
                                <span className="text-slate-500 text-[10px] uppercase tracking-wider font-bold mb-0.5">Fin de journée</span>
                                <span className="text-slate-300 text-lg font-bold font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">{todayCallSheet.endTime}</span>
                            </div>
                        )}
                    </div>

                    <a
                        href={todayCallSheet.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-full text-xs font-bold transition-all shadow-lg hover:shadow-blue-500/30 mt-3"
                    >
                        <FileText className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                        {todayCallSheet.name} (PDF)
                    </a>
                </div>

                {/* RIGHT column: Stacked Widgets */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Localisations & Infos
                    </h3>

                    {/* LOCATIONS */}
                    {todayCallSheet?.location1 && (
                        <a href={getMapsLink(todayCallSheet.location1)} target="_blank" rel="noreferrer" className="block group">
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
                    )}

                    {todayCallSheet?.hmcAddress && (
                        <a href={getMapsLink(todayCallSheet.hmcAddress)} target="_blank" rel="noreferrer" className="block group">
                            <div className="bg-white/5 hover:bg-white/10 p-3 rounded-lg border border-white/10 transition-colors flex items-center gap-3">
                                <div className="p-2 bg-pink-500/20 text-pink-400 rounded-md group-hover:bg-pink-500 group-hover:text-white transition-colors">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs text-slate-400 font-bold uppercase">HMC / Loges</div>
                                    <div className="text-sm font-medium text-white line-clamp-1">{todayCallSheet.hmcAddress}</div>
                                </div>
                                <div className="text-xs text-blue-400 font-bold group-hover:underline">Voir</div>
                            </div>
                        </a>
                    )}

                    {todayCallSheet?.cateringLocation && (
                        <a href={getMapsLink(todayCallSheet.cateringLocation)} target="_blank" rel="noreferrer" className="block group">
                            <div className="bg-white/5 hover:bg-white/10 p-3 rounded-lg border border-white/10 transition-colors flex items-center gap-3">
                                <div className="p-2 bg-orange-500/20 text-orange-400 rounded-md group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                    <Utensils className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <div className="text-xs text-slate-400 font-bold uppercase">Cantine</div>
                                        {todayCallSheet.cateringTime && (
                                            <div className="text-xs text-orange-400 font-bold bg-orange-400/10 px-2 py-0.5 rounded-full">
                                                {todayCallSheet.cateringTime}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-sm font-medium text-white line-clamp-1">{todayCallSheet.cateringLocation}</div>
                                </div>
                                <div className="text-xs text-blue-400 font-bold group-hover:underline">Voir</div>
                            </div>
                        </a>
                    )}

                    {/* WEATHER & SECURITY */}
                    {(todayCallSheet.weather || todayCallSheet.nearestHospital) && (
                        <div className="mt-6 bg-cinema-900/50 p-4 rounded-xl border border-cinema-700">
                            <h4 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-orange-400" />
                                Sécurité & Météo
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                {todayCallSheet.weather && (
                                    <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-500/20">
                                        <div className="flex items-center gap-2 mb-1">
                                            <CloudRain className="w-4 h-4 text-blue-400" />
                                            <span className="text-blue-200 font-bold">{todayCallSheet.weather.morningTemp}°C</span>
                                        </div>
                                        <p className="text-xs text-blue-300 capitalize">{todayCallSheet.weather.condition}</p>
                                    </div>
                                )}
                                {todayCallSheet.nearestHospital && (
                                    <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/20">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">+</div>
                                            <span className="text-red-200 font-bold text-xs">Hôpital</span>
                                        </div>
                                        <p className="text-xs text-red-300 line-clamp-2">{todayCallSheet.nearestHospital}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
