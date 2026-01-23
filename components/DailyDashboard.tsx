
import React, { useMemo, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Department } from '../types';
import { Clock, MapPin, Utensils, Activity, Calendar, FileText, AlertTriangle, CloudRain, Film } from 'lucide-react';

export const DailyDashboard: React.FC<{ overrideDepartment?: string }> = ({ overrideDepartment }) => {
    const { project, user, callSheets, userProfiles } = useProject();

    const effectiveDept = overrideDepartment || user?.department;

    // Resolve Display Name (First Name from Profile > User Name)
    const displayName = useMemo(() => {
        if (!user) return '';
        const profile = userProfiles?.find(p => p.email === user.email);
        if (profile && profile.firstName) return profile.firstName;
        if (user.name.includes(' ')) return user.name.split(' ')[0];
        return user.name;
    }, [user, userProfiles]);

    // Get "Today's" Call Sheet

    // Get "Today's" Call Sheet
    const todayCallSheet = useMemo(() => {
        if (!callSheets) return null;

        // Explicitly construct Local YYYY-MM-DD to match the Upload format
        // This avoids any UTC/Local offset issues that simple ISOString might introduce
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

        // 1. Exact match
        if (sheet.departmentCallTimes[userDept]) return sheet.departmentCallTimes[userDept];

        // 2. Fuzzy match keys
        const keys = Object.keys(sheet.departmentCallTimes);

        // Check exact target first in keys (normalized)
        let match = keys.find(k => normalize(k) === target);
        if (match) return sheet.departmentCallTimes[match];

        // 3. Synonym Matching (Common French Set Terms)
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

        // Get known synonyms for the user's department
        const targetSynonyms = synonyms[target] || [];

        // Find a key that matches target OR one of its synonyms
        match = keys.find(k => {
            const normKey = normalize(k);

            // Key contains target? (e.g. "Equipe Camera" matches "camera")
            if (normKey.includes(target)) return true;

            // Target contains key?
            if (target.includes(normKey)) return true;

            // Key matches any synonym?
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

    // Helper for Google Maps Link
    const getMapsLink = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            {/* Header / Date */}
            <div className="flex justify-between items-end mb-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Bonjour, {displayName} 👋</h1>
                    <p className="text-slate-400 text-sm mt-1 uppercase tracking-wider font-semibold">
                        {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>
            </div>

            {/* MAIN DAILY CARD */}
            <div className="bg-gradient-to-br from-cinema-800 to-cinema-900 rounded-2xl p-6 border border-cinema-700 shadow-xl relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative z-10 flex flex-col gap-8">
                    {/* LEFT: SCHEDULE */}
                    {/* TOP HERO: SCHEDULE */}
                    <div className="w-full flex flex-col justify-center items-center gap-3 py-2">

                        {/* 1. Title Badge */}
                        <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full border border-white/5 backdrop-blur-sm">
                            <Clock className="w-3 h-3" />
                            {effectiveDept && getDepartmentTime(todayCallSheet, effectiveDept)
                                ? `CONVOCATION ${effectiveDept.toUpperCase()}`
                                : 'P.A.T GÉNÉRAL'}
                        </div>

                        {/* 2. Main Time Display - Reduced Size */}
                        <div className="relative z-10">
                            <span className="font-black text-white tracking-tighter text-7xl md:text-8xl drop-shadow-2xl">
                                {callTimeDisplay}
                            </span>
                        </div>

                        {/* 3. Stats Row (PAT & End Time) */}
                        <div className="flex flex-wrap justify-center gap-8 items-center w-full max-w-xl px-4 mt-1">

                            {/* P.A.T */}
                            {(effectiveDept &&
                                todayCallSheet?.departmentCallTimes &&
                                getDepartmentTime(todayCallSheet, effectiveDept) &&
                                todayCallSheet.callTime) && (
                                    <div className="flex flex-col items-center">
                                        <span className="text-slate-500 text-[10px] uppercase tracking-wider font-bold mb-0.5">P.A.T Général</span>
                                        <span className="text-slate-300 text-lg font-bold font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">{todayCallSheet.callTime}</span>
                                    </div>
                                )}

                            {/* Fin de journée */}
                            {todayCallSheet?.endTime && (
                                <div className="flex flex-col items-center">
                                    <span className="text-slate-500 text-[10px] uppercase tracking-wider font-bold mb-0.5">Fin de journée</span>
                                    <span className="text-slate-300 text-lg font-bold font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">{todayCallSheet.endTime}</span>
                                </div>
                            )}
                        </div>

                        {/* 4. PDF Button - Compact */}
                        {todayCallSheet ? (
                            <a
                                href={todayCallSheet.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-full text-xs font-bold transition-all shadow-lg hover:shadow-blue-500/30 mt-3"
                            >
                                <FileText className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                                {todayCallSheet.name} (PDF)
                            </a>
                        ) : (
                            <p className="text-xs text-slate-500 italic mt-2">Aucune feuille de service pour aujourd'hui.</p>
                        )}
                    </div>

                    {/* RIGHT column: Stacked Widgets as per user request */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> Localisations & Infos
                        </h3>

                        {/* 1. ADRESSE : DÉCOR PRINCIPAL */}
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

                        {/* 1b. ADRESSE : HMC (Si présent) */}
                        {todayCallSheet?.hmcAddress && (
                            <a
                                href={getMapsLink(todayCallSheet.hmcAddress)}
                                target="_blank"
                                rel="noreferrer"
                                className="block group"
                            >
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

                        {/* 2. ADRESSE : CANTINE (et Decor Secondaire si existe) */}
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

                        {/* Optional: Second Location if exists, tucked under Cantine or between */}
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

                        {/* DIGITAL CONTENT: NOTES -> SEQUENCES -> WEATHER */}
                        {todayCallSheet && (todayCallSheet.isDigital ?? true) && (
                            <>
                                {/* 3. NOTE DU DÉPARTEMENT (Full Width) */}
                                {(() => {
                                    // 1. If PRODUCTION (or Admin) -> Hide notes as per request
                                    if (effectiveDept === 'PRODUCTION' || effectiveDept === 'Production') {
                                        return null;
                                    }

                                    // 2. Specific Dept Logic
                                    if (effectiveDept) {
                                        const getDeptNotes = (sheet: any, dept: string) => {
                                            if (!sheet?.departmentNotes) return null;
                                            const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                                            const target = normalize(dept);
                                            const keys = Object.keys(sheet.departmentNotes);

                                            if (sheet.departmentNotes[dept]) return sheet.departmentNotes[dept];

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

                                            const match = keys.find(k => {
                                                const normKey = normalize(k);
                                                if (normKey.includes(target)) return true;
                                                if (target.includes(normKey)) return true;
                                                return targetSynonyms.some(syn => normKey.includes(syn) || syn.includes(normKey));
                                            });
                                            return match ? sheet.departmentNotes[match] : null;
                                        };

                                        const notes = getDeptNotes(todayCallSheet, effectiveDept);

                                        if (notes && notes.length > 0) {
                                            return (
                                                <div className="mt-6 bg-purple-900/20 p-4 rounded-xl border border-purple-500/20 animate-pulse-once">
                                                    <h4 className="text-sm font-bold text-purple-400 mb-2 uppercase tracking-wide flex items-center gap-2">
                                                        <FileText className="w-4 h-4" />
                                                        Notes {effectiveDept}
                                                    </h4>
                                                    <ul className="space-y-2">
                                                        {notes.map((note: string, idx: number) => (
                                                            <li key={idx} className="text-sm text-purple-200/90 flex gap-2">
                                                                <span className="text-purple-500 font-bold">•</span>
                                                                {note}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            );
                                        }
                                    }
                                    return null;
                                })()}

                                {/* 4. SÉQUENCES DU JOUR (Full Width - Horizontal) */}
                                {todayCallSheet.sequences && todayCallSheet.sequences.length > 0 && (
                                    <div className="mt-6 bg-cinema-900/50 rounded-xl border border-cinema-700 overflow-hidden">
                                        <div className="bg-cinema-800/50 px-4 py-3 border-b border-cinema-700 flex justify-between items-center">
                                            <h4 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                                                <Film className="w-4 h-4 text-purple-400" />
                                                Séquences du Jour
                                            </h4>
                                            <span className="text-xs text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full">
                                                {todayCallSheet.sequences.length} seq.
                                            </span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-cinema-900 text-gray-400 font-medium">
                                                    <tr>
                                                        <th className="px-4 py-2 w-12 text-center">N°</th>
                                                        <th className="px-4 py-2">Décor / Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-cinema-700">
                                                    {todayCallSheet.sequences.map((seq) => (
                                                        <tr key={seq.id} className="hover:bg-cinema-800/50 transition-colors">
                                                            <td className="px-4 py-3 text-center font-bold text-white bg-cinema-800/30">{seq.sequenceNumber}</td>
                                                            <td className="px-4 py-3">
                                                                <div className="font-bold text-purple-200 mb-0.5">{seq.decor}</div>
                                                                <div className="text-gray-400 line-clamp-2">{seq.description}</div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* 4b. CAST & FIGURATION (Mise en Scène Only) */}
                                {effectiveDept === Department.MISE_EN_SCENE && (
                                    <>
                                        {(todayCallSheet.cast?.length || todayCallSheet.extras?.length) ? (
                                            <div className="mt-6 bg-cinema-900/50 rounded-xl border border-cinema-700 overflow-hidden">
                                                <div className="bg-cinema-800/50 px-4 py-3 border-b border-cinema-700">
                                                    <h4 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                                                        <Film className="w-4 h-4 text-pink-400" />
                                                        Comédiens & Figuration
                                                    </h4>
                                                </div>
                                                <div className="p-4 space-y-4">
                                                    {/* CAST */}
                                                    {todayCallSheet.cast && todayCallSheet.cast.length > 0 && (
                                                        <div>
                                                            <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Comédiens</h5>
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-left text-xs border-collapse">
                                                                    <thead className="bg-cinema-800 text-slate-400 font-bold uppercase">
                                                                        <tr>
                                                                            <th className="p-2 border border-cinema-700">Rôle</th>
                                                                            <th className="p-2 border border-cinema-700 w-16 text-center">P-U</th>
                                                                            <th className="p-2 border border-cinema-700 w-16 text-center">HMC</th>
                                                                            <th className="p-2 border border-cinema-700 w-16 text-center">DÎNER</th>
                                                                            <th className="p-2 border border-cinema-700 w-16 text-center">PAR</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {todayCallSheet.cast.map((c, i) => (
                                                                            <tr key={i} className="border-b border-cinema-700 hover:bg-white/5 transition-colors">
                                                                                <td className="p-2 border-r border-cinema-700">
                                                                                    <div className="font-bold text-white">{c.role}</div>
                                                                                    <div className="text-slate-400 text-[10px]">{c.actor}</div>
                                                                                </td>
                                                                                <td className="p-2 text-center border-r border-cinema-700 text-white font-mono">{c.pickupTime || '-'}</td>
                                                                                <td className="p-2 text-center border-r border-cinema-700 text-white font-mono">{c.hmcTime || '-'}</td>
                                                                                <td className="p-2 text-center border-r border-cinema-700 text-white font-mono">{c.mealTime || '-'}</td>
                                                                                <td className="p-2 text-center text-white font-mono font-bold bg-white/5">{c.readyTime || '-'}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* EXTRAS */}
                                                    {todayCallSheet.extras && todayCallSheet.extras.length > 0 && (
                                                        <div className="mt-4 pt-4 border-t border-cinema-700">
                                                            <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Figuration</h5>
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-left text-xs border-collapse">
                                                                    <thead className="bg-cinema-800 text-slate-400 font-bold uppercase">
                                                                        <tr>
                                                                            <th className="p-2 border border-cinema-700">Groupe</th>
                                                                            <th className="p-2 border border-cinema-700 w-16 text-center">Qté</th>
                                                                            <th className="p-2 border border-cinema-700 w-16 text-center">HMC</th>
                                                                            <th className="p-2 border border-cinema-700 w-16 text-center">DÎNER</th>
                                                                            <th className="p-2 border border-cinema-700 w-16 text-center">PAR</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {todayCallSheet.extras.map((e, i) => {
                                                                            // Handle legacy string extras
                                                                            const isObj = typeof e !== 'string';
                                                                            const name = isObj ? e.name : e;
                                                                            const qty = isObj ? e.quantity : '';
                                                                            const hmc = isObj ? e.hmcTime : '';
                                                                            const meal = isObj ? e.mealTime : '';
                                                                            const ready = isObj ? e.readyTime : '';

                                                                            return (
                                                                                <tr key={i} className="border-b border-cinema-700 hover:bg-white/5 transition-colors">
                                                                                    <td className="p-2 border-r border-cinema-700 font-medium text-white">{name}</td>
                                                                                    <td className="p-2 text-center border-r border-cinema-700 text-slate-400">{qty}</td>
                                                                                    <td className="p-2 text-center border-r border-cinema-700 text-white font-mono">{hmc || '-'}</td>
                                                                                    <td className="p-2 text-center border-r border-cinema-700 text-white font-mono">{meal || '-'}</td>
                                                                                    <td className="p-2 text-center text-white font-mono font-bold bg-white/5">{ready || '-'}</td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : null}
                                    </>
                                )}

                                {/* 5. MÉTÉO (Below Sequences) */}
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
                            </>
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
