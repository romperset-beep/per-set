import React, { useState } from 'react';
import { useProject } from '@/context/ProjectContext';
import { Department, CallSheet, CallSheetSequence, CallSheetWeather } from '../types';
import { Calendar, Clock, MapPin, Plus, Trash2, Save, FileText, Film, AlertTriangle, CloudRain, Shield } from 'lucide-react';

interface CallSheetBuilderProps {
    onSave: (data: any) => void;
    onCancel: () => void;
    initialData?: Partial<CallSheet>; // Optional data for editing
}

export const CallSheetBuilder: React.FC<CallSheetBuilderProps> = ({ onSave, onCancel, initialData }) => {
    // State for general info
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [callTime, setCallTime] = useState(initialData?.callTime || '08:00');
    const [endTime, setEndTime] = useState(initialData?.endTime || '18:00');

    const [location1, setLocation1] = useState(initialData?.location1 || '');
    const [location1Address, setLocation1Address] = useState(initialData?.location1Address || '');
    const [location1MapsLink, setLocation1MapsLink] = useState(initialData?.location1MapsLink || '');

    const [location2, setLocation2] = useState(initialData?.location2 || '');
    const [location2Address, setLocation2Address] = useState(initialData?.location2Address || '');

    const [cateringLocation, setCateringLocation] = useState(initialData?.cateringLocation || '');
    const [cateringAddress, setCateringAddress] = useState(initialData?.cateringAddress || '');
    const [cateringTime, setCateringTime] = useState(initialData?.cateringTime || '');
    const [hmcAddress, setHmcAddress] = useState(initialData?.hmcAddress || '');

    const [nearestHospital, setNearestHospital] = useState(initialData?.nearestHospital || '');

    // Weather State
    const [weather, setWeather] = useState<CallSheetWeather>(initialData?.weather || {
        morningTemp: 12,
        afternoonTemp: 18,
        condition: 'Ensoleillé',
        sunrise: '07:30',
        sunset: '20:15'
    });

    // Department Call Times
    const [departmentCallTimes, setDepartmentCallTimes] = useState<Record<string, string>>(initialData?.departmentCallTimes || {});

    // Sequences
    const [sequences, setSequences] = useState<CallSheetSequence[]>(initialData?.sequences || []);

    // Notes
    const [notes, setNotes] = useState<string[]>(initialData?.notes || []);
    const [newNote, setNewNote] = useState('');

    // --- Handlers ---

    const addSequence = () => {
        setSequences([
            ...sequences,
            {
                id: Math.random().toString(36).substr(2, 9),
                sequenceNumber: '',
                description: '',
                decor: '',
                characters: []
            }
        ]);
    };

    const updateSequence = (id: string, field: keyof CallSheetSequence, value: any) => {
        setSequences(sequences.map(seq =>
            seq.id === id ? { ...seq, [field]: value } : seq
        ));
    };

    const removeSequence = (id: string) => {
        setSequences(sequences.filter(seq => seq.id !== id));
    };

    const addNote = () => {
        if (newNote.trim()) {
            setNotes([...notes, newNote.trim()]);
            setNewNote('');
        }
    };

    const removeNote = (index: number) => {
        setNotes(notes.filter((_, i) => i !== index));
    };

    // Department Notes State
    const [departmentNotes, setDepartmentNotes] = useState<Record<string, string[]>>(initialData?.departmentNotes || {});
    const [newDeptNoteDept, setNewDeptNoteDept] = useState('');
    const [newDeptNoteContent, setNewDeptNoteContent] = useState('');

    const addDepartmentNote = () => {
        if (!newDeptNoteDept || !newDeptNoteContent) return;
        setDepartmentNotes(prev => {
            const current = prev[newDeptNoteDept] || [];
            return { ...prev, [newDeptNoteDept]: [...current, newDeptNoteContent] };
        });
        setNewDeptNoteContent('');
    };

    const removeDepartmentNote = (dept: string, index: number) => {
        setDepartmentNotes(prev => {
            const current = prev[dept] || [];
            if (current.length === 1) {
                const { [dept]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [dept]: current.filter((_, i) => i !== index) };
        });
    };

    // Cast & Extras State
    // We now use full CastMember and ExtrasGroup objects
    const [cast, setCast] = useState<{ role: string, actor: string, pickupTime?: string, hmcTime?: string, mealTime?: string, readyTime?: string }[]>(initialData?.cast || []);
    const [extras, setExtras] = useState<{ name: string, quantity?: number, hmcTime?: string, mealTime?: string, readyTime?: string }[]>(
        (initialData?.extras || []).map(e => typeof e === 'string' ? { name: e } : e)
    );

    // New Cast Inputs
    const [newCastRole, setNewCastRole] = useState('');
    const [newCastActor, setNewCastActor] = useState('');
    // New Extra Inputs
    const [newExtraName, setNewExtraName] = useState('');

    const addCastMember = () => {
        if (newCastRole && newCastActor) {
            setCast([...cast, { role: newCastRole, actor: newCastActor }]);
            setNewCastRole('');
            setNewCastActor('');
        }
    };

    const updateCastMember = (index: number, field: string, value: string) => {
        const newCast = [...cast];
        // @ts-ignore - dynamic key assignment
        newCast[index][field] = value;
        setCast(newCast);
    };

    const removeCastMember = (index: number) => {
        setCast(cast.filter((_, i) => i !== index));
    };

    const addExtra = () => {
        if (newExtraName.trim()) {
            setExtras([...extras, { name: newExtraName.trim() }]);
            setNewExtraName('');
        }
    };

    const updateExtra = (index: number, field: string, value: string) => {
        const newExtras = [...extras];
        // @ts-ignore
        newExtras[index][field] = value;
        setExtras(newExtras);
    };

    const removeExtra = (index: number) => {
        setExtras(extras.filter((_, i) => i !== index));
    };

    // Transports State
    const [transports, setTransports] = useState<any[]>(initialData?.transports || []);

    const addTransport = () => {
        setTransports([
            ...transports,
            {
                id: Math.random().toString(36).substr(2, 9),
                name: '',
                pickupTime: '',
                pickupLocation: '',
                driver: '',
                destination: '',
                arrivalTime: ''
            }
        ]);
    };

    const updateTransport = (id: string, field: string, value: string) => {
        setTransports(transports.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const removeTransport = (id: string) => {
        setTransports(transports.filter(t => t.id !== id));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const callSheetData: Partial<CallSheet> = {
            date,
            name: initialData?.name || `FDS - ${new Date(date).toLocaleDateString()}`,
            callTime,
            endTime,
            location1,
            location1Address,
            location1MapsLink,
            location2: location2 || null,
            location2Address,
            cateringLocation,
            cateringAddress,
            cateringTime,
            hmcAddress,
            nearestHospital,
            weather,
            departmentCallTimes, // Now properly in scope
            departmentNotes, // Added
            cast: cast.map(c => ({
                ...c,
                pickupTime: c.pickupTime || null,
                hmcTime: c.hmcTime || null,
                mealTime: c.mealTime || null,
                readyTime: c.readyTime || null
            })), // Sanitize
            extras: extras.map(e => ({
                ...e,
                quantity: e.quantity || null,
                hmcTime: e.hmcTime || null,
                mealTime: e.mealTime || null,
                readyTime: e.readyTime || null
            })), // Sanitize
            transports: transports.map(t => ({
                id: t.id,
                name: t.name || "",
                pickupTime: t.pickupTime || null,
                pickupLocation: t.pickupLocation || null,
                driver: t.driver || null,
                destination: t.destination || null,
                arrivalTime: t.arrivalTime || null
            })),
            sequences,
            notes,
            isDigital: true
        };

        onSave(callSheetData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-6 rounded-2xl border border-blue-500/30 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                        {initialData ? 'Modifier la Feuille de Service' : 'Créateur de Feuille de Service'}
                    </h2>
                    <p className="text-blue-300 text-sm">
                        {initialData ? 'Mettez à jour les informations.' : 'Remplissez les informations pour générer une FDS digitale.'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
                        Annuler
                    </button>
                    <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all hover:scale-105">
                        <Save className="w-4 h-4" />
                        {initialData ? 'Mettre à jour' : 'Publier'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Left Column: Logistics */}
                <div className="space-y-6">
                    {/* General Info */}
                    <div className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 space-y-4">
                        <h3 className="text-lg font-bold text-eco-400 flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Horaires & Date
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Date</label>
                                <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-cinema-900 border border-cinema-700 rounded p-2 text-white focus:outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">P.A.T</label>
                                <input type="time" required value={callTime} onChange={e => setCallTime(e.target.value)} className="w-full bg-cinema-900 border border-cinema-700 rounded p-2 text-white focus:outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Fin Estimée</label>
                                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-cinema-900 border border-cinema-700 rounded p-2 text-white focus:outline-none focus:border-blue-500" />
                            </div>
                        </div>
                    </div>

                    {/* Locations */}
                    <div className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 space-y-4">
                        <h3 className="text-lg font-bold text-orange-400 flex items-center gap-2">
                            <MapPin className="w-5 h-5" />
                            Lieux & Adresses
                        </h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Décor Principal (Nom)</label>
                                <input type="text" placeholder="ex: Tour Eiffel - Pilier Est" value={location1} onChange={e => setLocation1(e.target.value)} className="w-full bg-cinema-900 border border-cinema-700 rounded p-2 text-white focus:outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Adresse GPS (Décor 1)</label>
                                <input type="text" placeholder="ex: 5 Avenue Anatole France, 75007 Paris" value={location1Address} onChange={e => setLocation1Address(e.target.value)} className="w-full bg-cinema-900 border border-cinema-700 rounded p-2 text-white focus:outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Adresse HMC / Loges (Si différent)</label>
                                <input type="text" placeholder="ex: 3 Rue de l'Université (Loges)" value={hmcAddress} onChange={e => setHmcAddress(e.target.value)} className="w-full bg-cinema-900 border border-cinema-700 rounded p-2 text-white focus:outline-none focus:border-blue-500" />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-cinema-700 space-y-3">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Lieu Cantine / Heure Repas</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="col-span-2">
                                        <input type="text" placeholder="ex: Base Arrière" value={cateringLocation} onChange={e => setCateringLocation(e.target.value)} className="w-full bg-cinema-900 border border-cinema-700 rounded p-2 text-white focus:outline-none focus:border-blue-500" />
                                    </div>
                                    <div className="col-span-1">
                                        <input type="text" placeholder="HH:MM" value={cateringTime} onChange={e => setCateringTime(e.target.value)} className="w-full bg-cinema-900 border border-cinema-700 rounded p-2 text-white text-center focus:outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-cinema-700">
                            <div className={`transition-all overflow-hidden ${location2 ? 'opacity-100' : 'opacity-50 hover:opacity-100'}`}>
                                <label className="block text-xs text-slate-400 mb-1">Décor Secondaire (Optionnel)</label>
                                <input type="text" placeholder="Décor 2..." value={location2} onChange={e => setLocation2(e.target.value)} className="w-full bg-cinema-900 border border-cinema-700 rounded p-2 text-white focus:outline-none focus:border-blue-500" />
                            </div>
                        </div>
                    </div>

                    {/* Safety / Weather */}
                    <div className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 space-y-4">
                        <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            Sécurité & Météo
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs text-slate-400 mb-1">Hôpital le plus proche</label>
                                <input type="text" placeholder="Nom et adresse..." value={nearestHospital} onChange={e => setNearestHospital(e.target.value)} className="w-full bg-cinema-900 border border-cinema-700 rounded p-2 text-white focus:outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Météo (Condition)</label>
                                <div className="relative">
                                    <CloudRain className="absolute left-2 top-2.5 w-4 h-4 text-slate-500" />
                                    <input type="text" placeholder="Pluie, Soleil..." value={weather.condition} onChange={e => setWeather({ ...weather, condition: e.target.value })} className="w-full bg-cinema-900 border border-cinema-700 rounded pl-8 p-2 text-white focus:outline-none focus:border-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Temp. (°C)</label>
                                <input type="number" placeholder="15" value={weather.morningTemp || ''} onChange={e => setWeather({ ...weather, morningTemp: parseInt(e.target.value) || 0 })} className="w-full bg-cinema-900 border border-cinema-700 rounded p-2 text-white focus:outline-none focus:border-blue-500" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Sequences & Notes */}
                <div className="space-y-6">

                    {/* Sequences */}
                    <div className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 flex flex-col h-full min-h-[400px]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-purple-400 flex items-center gap-2">
                                <Film className="w-5 h-5" />
                                Séquences à Tourner
                            </h3>
                            <button type="button" onClick={addSequence} className="bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white px-3 py-1 rounded text-sm transition-colors flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Ajouter
                            </button>
                        </div>

                        <div className="space-y-3 flex-1 overflow-y-auto pr-2 max-h-[500px]">
                            {sequences.map((seq, idx) => (
                                <div key={seq.id} className="bg-cinema-900/50 p-3 rounded-lg border border-cinema-700 relative group animate-in fade-in slide-in-from-right-4 duration-300">
                                    <button type="button" onClick={() => removeSequence(seq.id)} className="absolute top-2 right-2 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="w-4 h-4" />
                                    </button>

                                    <div className="flex gap-2 mb-2">
                                        <div className="w-16">
                                            <input type="text" placeholder="N°" value={seq.sequenceNumber} onChange={e => updateSequence(seq.id, 'sequenceNumber', e.target.value)} className="w-full bg-cinema-900 border border-cinema-700 rounded p-1 text-sm text-white text-center font-bold" />
                                        </div>
                                        <div className="flex-1">
                                            <input type="text" placeholder="Décor..." value={seq.decor} onChange={e => updateSequence(seq.id, 'decor', e.target.value)} className="w-full bg-cinema-900 border border-cinema-700 rounded p-1 text-sm text-white" />
                                        </div>
                                    </div>
                                    <textarea
                                        placeholder="Description de l'action..."
                                        value={seq.description}
                                        onChange={e => updateSequence(seq.id, 'description', e.target.value)}
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded p-2 text-sm text-slate-300 min-h-[60px]"
                                    />
                                </div>
                            ))}

                            {sequences.length === 0 && (
                                <div className="text-center py-12 text-slate-500 border-2 border-dashed border-cinema-700/50 rounded-xl">
                                    Aucune séquence ajoutée.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Cast & Extras Section */}
                    <div className="bg-cinema-800 p-6 rounded-xl border border-cinema-700">
                        <h3 className="text-lg font-bold text-pink-400 flex items-center gap-2 mb-4">
                            <Film className="w-5 h-5" />
                            Comédiens & Figuration
                        </h3>

                        {/* Cast */}
                        <div className="mb-6">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Comédiens (Rôles Principaux)</h4>

                            {/* Input Form */}
                            <div className="flex gap-2 mb-3">
                                <input
                                    type="text"
                                    placeholder="Rôle (ex: TAMARA)..."
                                    value={newCastRole}
                                    onChange={e => setNewCastRole(e.target.value)}
                                    className="flex-1 bg-cinema-900 border border-cinema-700 rounded p-2 text-white text-sm focus:outline-none focus:border-pink-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Interprète (ex: Camille LOU)..."
                                    value={newCastActor}
                                    onChange={e => setNewCastActor(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCastMember())}
                                    className="flex-1 bg-cinema-900 border border-cinema-700 rounded p-2 text-white text-sm focus:outline-none focus:border-pink-500"
                                />
                                <button type="button" onClick={addCastMember} className="bg-cinema-700 hover:bg-pink-600 hover:text-white px-3 py-2 rounded text-slate-300 transition-colors">
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Cast List / Table */}
                            <div className="space-y-2">
                                {cast.map((c, idx) => (
                                    <div key={idx} className="bg-pink-500/5 p-3 rounded-lg border border-pink-500/20">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className="font-bold text-pink-200">{c.role}</span>
                                                <span className="text-slate-400 text-sm ml-2">({c.actor})</span>
                                            </div>
                                            <button type="button" onClick={() => removeCastMember(idx)} className="text-pink-500/50 hover:text-pink-500">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        {/* Timing Fields */}
                                        <div className="grid grid-cols-4 gap-2">
                                            <div>
                                                <label className="text-[10px] text-slate-500 uppercase">P-U</label>
                                                <input type="time" value={c.pickupTime || ''} onChange={e => updateCastMember(idx, 'pickupTime', e.target.value)} className="w-full bg-black/20 border border-pink-500/10 rounded px-1 py-1 text-xs text-white" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-500 uppercase">HMC</label>
                                                <input type="time" value={c.hmcTime || ''} onChange={e => updateCastMember(idx, 'hmcTime', e.target.value)} className="w-full bg-black/20 border border-pink-500/10 rounded px-1 py-1 text-xs text-white" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-500 uppercase">DÎNER</label>
                                                <input type="time" value={c.mealTime || ''} onChange={e => updateCastMember(idx, 'mealTime', e.target.value)} className="w-full bg-black/20 border border-pink-500/10 rounded px-1 py-1 text-xs text-white" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-500 uppercase">PAR</label>
                                                <input type="time" value={c.readyTime || ''} onChange={e => updateCastMember(idx, 'readyTime', e.target.value)} className="w-full bg-black/20 border border-pink-500/10 rounded px-1 py-1 text-xs text-white" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Extras */}
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Figuration</h4>
                            <div className="flex gap-2 mb-3">
                                <input
                                    type="text"
                                    placeholder="Groupe (ex: Passants (10))..."
                                    value={newExtraName}
                                    onChange={e => setNewExtraName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addExtra())}
                                    className="flex-1 bg-cinema-900 border border-cinema-700 rounded p-2 text-white text-sm focus:outline-none focus:border-pink-500"
                                />
                                <button type="button" onClick={addExtra} className="bg-cinema-700 hover:bg-pink-600 hover:text-white px-3 py-2 rounded text-slate-300 transition-colors">
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-2">
                                {extras.map((e, idx) => (
                                    <div key={idx} className="bg-pink-500/5 p-3 rounded-lg border border-pink-500/20">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-medium text-pink-200">{e.name}</span>
                                            <button type="button" onClick={() => removeExtra(idx)} className="text-pink-500/50 hover:text-pink-500">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        {/* Timing Fields */}
                                        <div className="grid grid-cols-4 gap-2">
                                            {/* Spacer for P-U which is rarely used for extras/group but keeping grid alignment */}
                                            <div></div>
                                            <div>
                                                <label className="text-[10px] text-slate-500 uppercase">HMC</label>
                                                <input type="time" value={e.hmcTime || ''} onChange={e => updateExtra(idx, 'hmcTime', e.target.value)} className="w-full bg-black/20 border border-pink-500/10 rounded px-1 py-1 text-xs text-white" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-500 uppercase">DÎNER</label>
                                                <input type="time" value={e.mealTime || ''} onChange={e => updateExtra(idx, 'mealTime', e.target.value)} className="w-full bg-black/20 border border-pink-500/10 rounded px-1 py-1 text-xs text-white" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-500 uppercase">PAR</label>
                                                <input type="time" value={e.readyTime || ''} onChange={e => updateExtra(idx, 'readyTime', e.target.value)} className="w-full bg-black/20 border border-pink-500/10 rounded px-1 py-1 text-xs text-white" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Transports Section */}
                    <div className="bg-cinema-800 p-6 rounded-xl border border-cinema-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-teal-400 flex items-center gap-2">
                                <span className="text-xl">🚕</span>
                                Transports
                            </h3>
                            <button type="button" onClick={addTransport} className="bg-teal-600/20 text-teal-400 hover:bg-teal-600 hover:text-white px-3 py-1 rounded text-sm transition-colors flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Ajouter
                            </button>
                        </div>

                        <div className="space-y-3">
                            {transports.map((t) => (
                                <div key={t.id} className="bg-cinema-900/50 p-3 rounded-lg border border-cinema-700 relative group">
                                    <button type="button" onClick={() => removeTransport(t.id)} className="absolute top-2 right-2 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="w-4 h-4" />
                                    </button>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2 pr-6">
                                        <input type="text" placeholder="Nom (ex: Camille LOU)" value={t.name} onChange={e => updateTransport(t.id, 'name', e.target.value)} className="w-full bg-black/20 border border-cinema-700 rounded px-2 py-1 text-sm text-white font-bold" />
                                        <input type="text" placeholder="Conducteur / Taxi" value={t.driver} onChange={e => updateTransport(t.id, 'driver', e.target.value)} className="w-full bg-black/20 border border-cinema-700 rounded px-2 py-1 text-sm text-white" />
                                    </div>

                                    <div className="grid grid-cols-4 gap-2">
                                        <div>
                                            <label className="text-[10px] text-slate-500 uppercase">Pick-Up</label>
                                            <input type="time" value={t.pickupTime || ''} onChange={e => updateTransport(t.id, 'pickupTime', e.target.value)} className="w-full bg-black/20 border border-cinema-700 rounded px-1 py-1 text-xs text-white" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-500 uppercase">Lieu</label>
                                            <input type="text" placeholder="Lieu..." value={t.pickupLocation || ''} onChange={e => updateTransport(t.id, 'pickupLocation', e.target.value)} className="w-full bg-black/20 border border-cinema-700 rounded px-1 py-1 text-xs text-white" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-500 uppercase">Dest.</label>
                                            <input type="text" placeholder="HMC..." value={t.destination || ''} onChange={e => updateTransport(t.id, 'destination', e.target.value)} className="w-full bg-black/20 border border-cinema-700 rounded px-1 py-1 text-xs text-white" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-500 uppercase">Sur Place</label>
                                            <input type="time" value={t.arrivalTime || ''} onChange={e => updateTransport(t.id, 'arrivalTime', e.target.value)} className="w-full bg-black/20 border border-cinema-700 rounded px-1 py-1 text-xs text-white" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {transports.length === 0 && (
                                <div className="text-center py-4 text-slate-500 text-xs italic">
                                    Aucun transport planifié.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-cinema-800 p-6 rounded-xl border border-cinema-700">
                        <h3 className="text-lg font-bold text-yellow-400 flex items-center gap-2 mb-4">
                            <AlertTriangle className="w-5 h-5" />
                            Notes Importantes
                        </h3>

                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                placeholder="Ajouter une note (ex: ID obligatoire)..."
                                value={newNote}
                                onChange={e => setNewNote(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addNote())}
                                className="flex-1 bg-cinema-900 border border-cinema-700 rounded p-2 text-white focus:outline-none focus:border-yellow-500"
                            />
                            <button type="button" onClick={addNote} className="bg-cinema-700 hover:bg-yellow-600 hover:text-white px-3 py-2 rounded text-slate-300 transition-colors">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        <ul className="space-y-2">
                            {notes.map((note, idx) => (
                                <li key={idx} className="flex justify-between items-start bg-yellow-500/10 text-yellow-200 p-2 rounded border border-yellow-500/20 text-sm">
                                    <span>• {note}</span>
                                    <button type="button" onClick={() => removeNote(idx)} className="text-yellow-500/50 hover:text-yellow-500">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Department Notes */}
                    <div className="bg-cinema-800 p-6 rounded-xl border border-cinema-700">
                        <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2 mb-4">
                            <FileText className="w-5 h-5" />
                            Notes par Département
                        </h3>

                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                placeholder="Département (ex: Caméra)..."
                                value={newDeptNoteDept}
                                onChange={e => setNewDeptNoteDept(e.target.value)}
                                className="w-1/3 bg-cinema-900 border border-cinema-700 rounded p-2 text-white text-sm focus:outline-none focus:border-blue-500"
                            />
                            <input
                                type="text"
                                placeholder="Note à ajouter..."
                                value={newDeptNoteContent}
                                onChange={e => setNewDeptNoteContent(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDepartmentNote())}
                                className="flex-1 bg-cinema-900 border border-cinema-700 rounded p-2 text-white text-sm focus:outline-none focus:border-blue-500"
                            />
                            <button type="button" onClick={addDepartmentNote} className="bg-cinema-700 hover:bg-blue-600 hover:text-white px-3 py-2 rounded text-slate-300 transition-colors">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {Object.entries(departmentNotes).map(([dept, notesList]) => (
                                <div key={dept} className="bg-cinema-900/50 p-3 rounded-lg border border-cinema-700">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">{dept}</h4>
                                    <ul className="space-y-1">
                                        {notesList.map((n, i) => (
                                            <li key={i} className="flex justify-between items-start text-sm text-slate-300">
                                                <span>• {n}</span>
                                                <button type="button" onClick={() => removeDepartmentNote(dept, i)} className="text-slate-600 hover:text-red-500 ml-2">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </form >
    );
};

const XSmallIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
);
