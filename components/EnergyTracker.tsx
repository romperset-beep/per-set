import React, { useState, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { EnergyLog, Department } from '../types';
import { Zap, Droplet, Activity, Save, AlertTriangle, Calendar, Camera, FileText, Loader2, Upload, CheckCircle2 } from 'lucide-react';
import { analyzeReceipt } from '../services/geminiService';
import { compressImage, applyScanEffect } from '../utils/imageUtils';
import { storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ExpenseReport, ExpenseStatus } from '../types';

export const EnergyTracker: React.FC = () => {
    const { project, updateProjectDetails, user, addExpenseReport } = useProject();
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // Form State
    const [generatorHours, setGeneratorHours] = useState('');
    const [fuelLiters, setFuelLiters] = useState('');
    const [gridKwh, setGridKwh] = useState('');
    const [notes, setNotes] = useState('');

    // Receipt Scan State
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisData, setAnalysisData] = useState<{ amount: number } | null>(null);

    const isAuthorized = user?.department === 'PRODUCTION' || user?.department === Department.LUMIERE;

    // Get current log
    const currentLog = useMemo(() => {
        return (project.energyLogs || []).find(l => l.date === selectedDate);
    }, [project.energyLogs, selectedDate]);

    // Load form when date changes
    React.useEffect(() => {
        if (currentLog) {
            setGeneratorHours(currentLog.generatorHours.toString());
            setFuelLiters(currentLog.fuelLiters.toString());
            setGridKwh(currentLog.gridKwh.toString());
            setNotes(currentLog.notes || '');
        } else {
            setGeneratorHours('');
            setFuelLiters('');
            setGridKwh('');
            setNotes('');
        }
        // Reset receipt state on date change
        setReceiptFile(null);
        setPreviewUrl(null);
        setAnalysisData(null);
    }, [currentLog, selectedDate]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 1. Preview
        setPreviewUrl(URL.createObjectURL(file));
        setIsAnalyzing(true);
        setAnalysisData(null);

        try {
            let fileToProcess = file;
            if (file.type.startsWith('image/')) {
                // Compress & Scan Effect
                fileToProcess = await compressImage(file);
                // Optional: fileToProcess = await applyScanEffect(fileToProcess);
            }

            setReceiptFile(fileToProcess);

            // 2. AI Analysis
            const result = await analyzeReceipt(fileToProcess);
            if (result.data) {
                const amount = parseFloat(result.data.amountTTC) || 0;
                setAnalysisData({ amount });
                // Auto-fill fuel liters if empty (rough estimation or just leave manual)
                // if (!fuelLiters) setFuelLiters((amount / 1.8).toFixed(0)); // Optional heuristic
            }
        } catch (err) {
            console.error("Analysis failed", err);
            alert("Erreur analyse image. Saisie manuelle requise.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSave = async () => {
        if (!isAuthorized) return;

        // 1. Save Energy Log
        const newLog: EnergyLog = {
            id: currentLog?.id || `${selectedDate}_energy`,
            date: selectedDate,
            generatorHours: parseFloat(generatorHours) || 0,
            fuelLiters: parseFloat(fuelLiters) || 0,
            gridKwh: parseFloat(gridKwh) || 0,
            notes,
            submittedBy: user?.name
        };

        const otherLogs = (project.energyLogs || []).filter(l => l.date !== selectedDate);
        await updateProjectDetails({ energyLogs: [...otherLogs, newLog] });

        // 2. Create Expense Report if Receipt Attached
        if (receiptFile && user) {
            try {
                // Upload
                const fileExt = receiptFile.name.split('.').pop();
                const fileName = `fuel_${Date.now()}.${fileExt}`;
                const storagePath = `production/${user.productionName}/energy/${fileName}`;
                const storageRef = ref(storage, storagePath);
                await uploadBytes(storageRef, receiptFile);
                const url = await getDownloadURL(storageRef);

                // Create Expense
                const expense: ExpenseReport = {
                    id: Math.random().toString(36).substr(2, 9),
                    date: selectedDate,
                    amountTTC: analysisData?.amount || 0,
                    amountTVA: 0, // Simplified
                    amountHT: analysisData?.amount || 0,
                    merchantName: "Station Service (Auto)",
                    items: ["Carburant Groupe Électrogène"],
                    status: ExpenseStatus.PENDING,
                    receiptUrl: url,
                    submittedBy: user.name,
                    department: user.department,
                    productionName: user.productionName,
                    filmTitle: user.filmTitle
                };
                addExpenseReport(expense);
                alert('Données Énergie sauvegardées + Note de Frais créée !');
            } catch (err) {
                console.error("Expense creation failed", err);
                alert("Données sauvegardées, mais échec de la note de frais.");
            }
        } else {
            alert('Données Énergie sauvegardées.');
        }
    };

    // Calculate Totals
    const totals = useMemo(() => {
        return (project.energyLogs || []).reduce((acc, log) => ({
            hours: acc.hours + log.generatorHours,
            fuel: acc.fuel + log.fuelLiters,
            grid: acc.grid + log.gridKwh
        }), { hours: 0, fuel: 0, grid: 0 });
    }, [project.energyLogs]);

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full text-slate-500">
                <AlertTriangle className="h-12 w-12 mb-4" />
                <p>Accès réservé à l'équipe Lumière et à la Production.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
            {/* Header */}
            <div className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-yellow-500/20 rounded-xl text-yellow-400">
                        <Zap className="h-8 w-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Suivi Énergie</h2>
                        <p className="text-slate-400">Groupes Électrogènes & Réseau</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-cinema-900 p-1.5 rounded-lg border border-cinema-700">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-transparent border-none text-white focus:ring-0 p-0 text-sm font-bold"
                    />
                </div>
            </div>

            {/* Dashboard Mini */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-cinema-800 p-4 rounded-xl border border-cinema-700">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Activity className="h-4 w-4" /> Total Heures Groupe
                    </div>
                    <div className="text-2xl font-bold text-white">{totals.hours} h</div>
                </div>
                <div className="bg-cinema-800 p-4 rounded-xl border border-cinema-700">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Droplet className="h-4 w-4" /> Total Carburant
                    </div>
                    <div className="text-2xl font-bold text-yellow-500">{totals.fuel} L</div>
                </div>
                <div className="bg-cinema-800 p-4 rounded-xl border border-cinema-700">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Zap className="h-4 w-4" /> Total Réseau
                    </div>
                    <div className="text-2xl font-bold text-blue-400">{totals.grid} kWh</div>
                </div>
            </div>

            {/* Form */}
            <div className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 space-y-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-400" />
                    Saisie Journalière ({new Date(selectedDate).toLocaleDateString()}):
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-yellow-500 uppercase tracking-wider">Groupe Électrogène</h4>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Heures de Fonctionnement</label>
                            <input
                                type="number"
                                value={generatorHours}
                                onChange={e => setGeneratorHours(e.target.value)}
                                placeholder="0"
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-3 text-white focus:border-yellow-500/50 outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Carburant Consommé (Litres)</label>
                            <input
                                type="number"
                                value={fuelLiters}
                                onChange={e => setFuelLiters(e.target.value)}
                                placeholder="0"
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-3 text-white focus:border-yellow-500/50 outline-none transition-colors"
                            />
                        </div>

                        {/* RECEIPT SCANNER */}
                        <div className="bg-cinema-900/50 border border-dashed border-cinema-700 rounded-xl p-4 mt-4">
                            <label className="block text-sm text-slate-400 mb-3 flex items-center justify-between">
                                <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Justificatif Essence</span>
                                {analysisData && <span className="text-green-400 text-xs font-bold bg-green-900/30 px-2 py-0.5 rounded">Reçu détecté : {analysisData.amount} €</span>}
                            </label>

                            {!previewUrl ? (
                                <div className="text-center">
                                    <input
                                        type="file"
                                        id="fuel-receipt"
                                        accept="image/*,application/pdf"
                                        className="hidden"
                                        capture="environment"
                                        onChange={handleFileChange}
                                    />
                                    <label htmlFor="fuel-receipt" className="cursor-pointer inline-flex items-center gap-2 bg-cinema-800 hover:bg-cinema-700 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors border border-cinema-600">
                                        <Camera className="h-4 w-4" />
                                        Scanner Ticket
                                    </label>
                                </div>
                            ) : (
                                <div className="relative">
                                    <img src={previewUrl} alt="Justificatif" className="w-full h-32 object-cover rounded-lg border border-cinema-700 opacity-70" />
                                    {isAnalyzing && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-lg">
                                            <div className="flex items-center gap-2 text-eco-400 font-bold text-sm animate-pulse">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Analyse IA...
                                            </div>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => {
                                            setPreviewUrl(null);
                                            setReceiptFile(null);
                                            setAnalysisData(null);
                                        }}
                                        className="absolute top-2 right-2 bg-black/60 hover:bg-red-500/80 text-white p-1 rounded-full transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                    </button>
                                </div>
                            )}
                            <p className="text-[10px] text-slate-500 mt-2 text-center">
                                {receiptFile ? (
                                    analysisData ? "✅ Montant extrait. Sera ajouté aux notes de frais." : "Image prête. Sauvegardez pour envoyer."
                                ) : "Prenez une photo pour générer la note de frais auto."}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Réseau Électrique</h4>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Consommation Relevée (kWh)</label>
                            <input
                                type="number"
                                value={gridKwh}
                                onChange={e => setGridKwh(e.target.value)}
                                placeholder="0"
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-3 text-white focus:border-blue-500/50 outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Notes / Observations</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Ex: Groupe B en panne..."
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-3 text-white focus:border-blue-500/50 outline-none transition-colors h-[120px]"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-cinema-700 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-green-600/20 transition-all"
                    >
                        <Save className="h-5 w-5" />
                        {receiptFile ? "Enregistrer + Note de Frais" : "Enregistrer"}
                    </button>
                </div>
            </div>
        </div>
    );
};
