import React, { useState, useMemo, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { FoodDonation } from '../types';
import { HeartHandshake, MapPin, Calendar, Users, Package, FileText, Download, CheckCircle, Clock, Trash2, Edit2, Info } from 'lucide-react';
import { db } from '../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export const FoodDonationWidget: React.FC = () => {
    const { project, updateProjectDetails, callSheets } = useProject();

    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [mealsSaved, setMealsSaved] = useState<number | ''>('');
    const [association, setAssociation] = useState('');
    const [customAssociation, setCustomAssociation] = useState('');
    const [cantineAddress, setCantineAddress] = useState('');
    const [status, setStatus] = useState<'A_RECUPERER' | 'EN_ATTENTE' | 'COLLECTE'>('A_RECUPERER');
    const [contactName, setContactName] = useState('');
    const [note, setNote] = useState('');

    const associationsList = [
        "Restos du Cœur",
        "Secours Populaire",
        "Banque Alimentaire",
        "Croix-Rouge",
        "Le Chaînon Manquant",
        "Linkee",
        "Autre"
    ];

    // Auto-fill cantine address from CallSheet when Date changes
    useEffect(() => {
        if (!callSheets || !date) return;
        const sheet = callSheets.find(cs => cs.date === date);
        if (sheet && sheet.cateringAddress) {
            setCantineAddress(sheet.cateringAddress);
        } else if (sheet && sheet.cateringLocation) {
            setCantineAddress(sheet.cateringLocation);
        }
    }, [date, callSheets]);


    // Extract list of donations
    const donations = useMemo(() => {
        return (project.foodDonations || []).sort((a, b) => b.date.localeCompare(a.date));
    }, [project.foodDonations]);

    // Counters
    const totalMealsSaved = donations.reduce((acc, current) => acc + current.mealsSaved, 0);
    const pendingCollections = donations.filter(d => d.status !== 'COLLECTE').length;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!date || !mealsSaved || (!association && !customAssociation)) {
            alert('Veuillez remplir les champs obligatoires');
            return;
        }

        const actualAssociation = association === 'Autre' ? customAssociation : association;

        const newDonation: FoodDonation = {
            id: `don_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            date,
            cantineAddress,
            mealsSaved: Number(mealsSaved),
            association: actualAssociation,
            status,
            contactName,
            note,
            createdAt: new Date().toISOString()
        };

        const currentDonations = project.foodDonations || [];
        await updateProjectDetails({
            foodDonations: [...currentDonations, newDonation]
        });

        // Reset form
        setMealsSaved('');
        setAssociation('');
        setCustomAssociation('');
        setStatus('A_RECUPERER');
        setContactName('');
        setNote('');
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Supprimer ce don ?")) return;
        const newDonations = (project.foodDonations || []).filter(d => d.id !== id);
        await updateProjectDetails({ foodDonations: newDonations });
    };

    const handleStatusChange = async (id: string, newStatus: 'A_RECUPERER' | 'EN_ATTENTE' | 'COLLECTE') => {
        const newDonations = (project.foodDonations || []).map(d => {
            if (d.id === id) return { ...d, status: newStatus };
            return d;
        });
        await updateProjectDetails({ foodDonations: newDonations });
    };

    const exportCSV = () => {
        if (donations.length === 0) return;
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Date,Nb Repas,Association,Statut,Adresse Cantine,Contact,Notes\n";

        donations.forEach(row => {
            const r = [
                row.date,
                row.mealsSaved,
                `"${row.association}"`,
                row.status,
                `"${row.cantineAddress}"`,
                `"${row.contactName || ''}"`,
                `"${row.note || ''}"`
            ];
            csvContent += r.join(",") + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Dons_Alimentaires_${project.filmTitle || 'Film'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-cinema-900 animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-cinema-800 border-b border-cinema-700 px-6 py-5 shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
                            <HeartHandshake className="h-6 w-6 text-emerald-400" />
                            Dons Alimentaires
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">
                            Gérez les restes de cantine et les redistributions aux associations
                        </p>
                    </div>
                    {donations.length > 0 && (
                        <button
                            onClick={exportCSV}
                            className="bg-cinema-700 hover:bg-cinema-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors border border-cinema-600 text-sm font-medium whitespace-nowrap"
                        >
                            <Download size={16} />
                            Exporter CSV
                        </button>
                    )}
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-cinema-900 border border-cinema-700/50 p-4 rounded-xl">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                                <Package className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Repas Sauvés</span>
                        </div>
                        <div className="text-2xl font-bold text-white mt-2">{totalMealsSaved}</div>
                    </div>

                    <div className="bg-cinema-900 border border-cinema-700/50 p-4 rounded-xl">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                                <HeartHandshake className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dons effectués</span>
                        </div>
                        <div className="text-2xl font-bold text-white mt-2">{donations.filter(d => d.status === 'COLLECTE').length}</div>
                    </div>

                    <div className="bg-cinema-900 border border-cinema-700/50 p-4 rounded-xl">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 bg-orange-500/20 text-orange-400 rounded-lg">
                                <Clock className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">En Attente</span>
                        </div>
                        <div className="text-2xl font-bold text-white mt-2">{pendingCollections}</div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Add Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-cinema-800 border border-cinema-700 rounded-xl overflow-hidden sticky top-0">
                            <div className="p-4 border-b border-cinema-700 bg-cinema-800/50 flex items-center justify-between">
                                <h2 className="font-bold text-white flex items-center gap-2">
                                    <Package size={18} className="text-emerald-400" />
                                    Nouveau Don
                                </h2>
                            </div>
                            <form onSubmit={handleSave} className="p-5 space-y-4">
                                {/* Date */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        Date
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full bg-cinema-900 border border-cinema-700 rounded-lg pl-10 pr-3 py-2 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Repas sauvés */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        <span className="text-red-400 mr-1">*</span> Nombre de repas
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={mealsSaved}
                                        onChange={(e) => setMealsSaved(e.target.value ? Number(e.target.value) : '')}
                                        placeholder="Ex: 15"
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500/50 placeholder-slate-600"
                                        required
                                    />
                                </div>

                                {/* Association */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        <span className="text-red-400 mr-1">*</span> Association
                                    </label>
                                    <select
                                        value={association}
                                        onChange={(e) => setAssociation(e.target.value)}
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500/50 mb-2"
                                        required
                                    >
                                        <option value="">Sélectionnez une asso...</option>
                                        {associationsList.map(a => (
                                            <option key={a} value={a}>{a}</option>
                                        ))}
                                    </select>
                                    {association === 'Autre' && (
                                        <input
                                            type="text"
                                            value={customAssociation}
                                            onChange={(e) => setCustomAssociation(e.target.value)}
                                            placeholder="Nom de l'association"
                                            className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500/50 placeholder-slate-600"
                                            required
                                        />
                                    )}
                                </div>

                                {/* Adresse (Auto-filled but editable) */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        Adresse (Cantine)
                                    </label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 text-slate-500 w-4 h-4" />
                                        <input
                                            type="text"
                                            value={cantineAddress}
                                            onChange={(e) => setCantineAddress(e.target.value)}
                                            placeholder="Lieu de récupération..."
                                            className="w-full bg-cinema-900 border border-cinema-700 rounded-lg pl-10 pr-3 py-2 text-white placeholder-slate-600 focus:ring-2 focus:ring-emerald-500/50"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1 pl-1 flex items-center gap-1">
                                        <Info size={10} />
                                        Localisation auto via la FDS du jour
                                    </p>
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        Statut de la collecte
                                    </label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value as any)}
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500/50"
                                    >
                                        <option value="A_RECUPERER">À récupérer sur place</option>
                                        <option value="EN_ATTENTE">En cours de livraison / Attente</option>
                                        <option value="COLLECTE">Récupéré par l'association</option>
                                    </select>
                                </div>

                                {/* Contact */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        Contact Asso / Téléphone
                                    </label>
                                    <input
                                        type="text"
                                        value={contactName}
                                        onChange={(e) => setContactName(e.target.value)}
                                        placeholder="Optionnel"
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:ring-2 focus:ring-emerald-500/50"
                                    />
                                </div>

                                {/* Note */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        Détails des repas
                                    </label>
                                    <textarea
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="Ex: Barquettes de blanquette intactes..."
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:ring-2 focus:ring-emerald-500/50 h-20 resize-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors mt-6"
                                >
                                    <CheckCircle size={18} />
                                    Enregistrer le don
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Registry List */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h2 className="text-lg font-bold text-white">Historique des dons</h2>
                            <span className="text-sm font-medium text-slate-400 bg-cinema-800 px-3 py-1 rounded-full border border-cinema-700">
                                {donations.length} {donations.length === 1 ? 'enregistrement' : 'enregistrements'}
                            </span>
                        </div>

                        {donations.length === 0 ? (
                            <div className="bg-cinema-800 border-2 border-dashed border-cinema-700 rounded-xl p-10 flex flex-col items-center justify-center text-center">
                                <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-full mb-4">
                                    <Package size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Aucun don enregistré</h3>
                                <p className="text-slate-400 max-w-sm">
                                    Commencez à noter les repas non-consommés pour suivre votre impact de redistribution.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {donations.map((d) => (
                                    <div key={d.id} className="bg-cinema-800 border border-cinema-700 rounded-xl p-4 hover:border-cinema-600 transition-colors flex flex-col sm:flex-row gap-4 sm:items-center">
                                        {/* Date Block */}
                                        <div className="bg-cinema-900 p-3 rounded-lg border border-cinema-800 flex flex-col items-center justify-center min-w-[80px] shrink-0">
                                            <span className="text-xs text-slate-400 font-bold uppercase">{new Date(d.date).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                                            <span className="text-xl font-bold text-white">{new Date(d.date).getDate()}</span>
                                            <span className="text-[10px] text-emerald-400/80 mt-1">{d.mealsSaved} repas</span>
                                        </div>

                                        {/* Main Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="font-bold text-white text-lg truncate pr-4">{d.association}</h3>
                                                <div className="shrink-0 flex items-center gap-1">
                                                    {d.status === 'COLLECTE' ? (
                                                        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-emerald-500/20 flex items-center gap-1">
                                                            <CheckCircle size={12} /> Collecté
                                                        </span>
                                                    ) : d.status === 'EN_ATTENTE' ? (
                                                        <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-orange-500/20 flex items-center gap-1">
                                                            <Clock size={12} /> Attente
                                                        </span>
                                                    ) : (
                                                        <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-blue-500/20 flex items-center gap-1">
                                                            <Package size={12} /> À récupérer
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <p className="text-sm text-slate-300 line-clamp-2 mt-1">
                                                {d.note || "Aucun détail saisi."}
                                            </p>

                                            <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                                                {d.cantineAddress && (
                                                    <span className="flex items-center gap-1 truncate max-w-[50%]">
                                                        <MapPin size={12} className="shrink-0" />
                                                        <span className="truncate">{d.cantineAddress}</span>
                                                    </span>
                                                )}
                                                {d.contactName && (
                                                    <span className="flex items-center gap-1 truncate">
                                                        <Users size={12} className="shrink-0" />
                                                        <span className="truncate">{d.contactName}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-row sm:flex-col gap-2 shrink-0 border-t border-cinema-700 sm:border-t-0 sm:border-l sm:pl-4 pt-3 sm:pt-0">
                                            <button
                                                onClick={() => handleStatusChange(d.id, 'COLLECTE')}
                                                className={`flex-1 sm:w-8 h-8 rounded flex items-center justify-center transition-colors ${d.status === 'COLLECTE' ? 'bg-emerald-500/20 text-emerald-400 opacity-50 cursor-not-allowed' : 'bg-cinema-700 text-slate-300 hover:bg-emerald-500 hover:text-white'}`}
                                                title="Marquer comme collecté"
                                                disabled={d.status === 'COLLECTE'}
                                            >
                                                <CheckCircle size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(d.id)}
                                                className="flex-1 sm:w-8 h-8 bg-cinema-700 hover:bg-red-500 text-slate-300 hover:text-white rounded flex items-center justify-center transition-colors"
                                                title="Supprimer"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
