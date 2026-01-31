import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { ExpenseLine } from '../types';
import { X, Upload, Plus, Trash2, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { analyzeReceipt } from '../services/geminiService';

interface ExpenseReportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ExpenseReportModal: React.FC<ExpenseReportModalProps> = ({ isOpen, onClose }) => {
    const { addExpenseReport, user, project } = useProject();

    // Mode Toggle
    const [mode, setMode] = useState<'SIMPLE' | 'ADVANCED'>('SIMPLE');

    // Common State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [receipt, setReceipt] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);

    // SIMPLE Mode State
    const [merchant, setMerchant] = useState('');
    const [description, setDescription] = useState('');
    const [amountTTC, setAmountTTC] = useState('');
    const [amountTVA, setAmountTVA] = useState('');
    const [category, setCategory] = useState<'REPAS' | 'TRANSPORT' | 'HOTEL' | 'REGIE' | 'TECHNIQUE' | 'AUTRE'>('AUTRE');

    // ADVANCED Mode State
    const [lines, setLines] = useState<ExpenseLine[]>([]);

    // New Line State (Advanced)
    const [newLine, setNewLine] = useState<Partial<ExpenseLine>>({
        date: new Date().toISOString().split('T')[0],
        vatRate: 20,
        isVatRecoverable: true,
        category: 'AUTRE'
    });

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            setMode('SIMPLE');
            setLines([]);
            setReceipt(null);
            setReceiptPreview(null);
            setMerchant('');
            setAmountTTC('');
            setAmountTVA('');
            setDescription('');
        }
    }, [isOpen]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setReceipt(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setReceiptPreview(reader.result as string);
            };
            reader.readAsDataURL(file);

            // AI Analysis
            setIsScanning(true);
            try {
                const { data } = await analyzeReceipt(file);
                if (data) {
                    console.log("AI Analysis Result:", data);

                    // Auto-fill Global Date if present
                    if (data.date) setDate(data.date);

                    // SIMPLE MODE Auto-fill
                    if (data.merchantName) setMerchant(data.merchantName);
                    if (data.amountTTC) setAmountTTC(data.amountTTC.toString());
                    if (data.amountTVA) setAmountTVA(data.amountTVA.toString());

                    // Suggest category based on merchant (Simple heuristic)
                    if (data.merchantName) { // Simple logic to be improved
                        const m = data.merchantName.toLowerCase();
                        if (m.includes('sncf') || m.includes('uber') || m.includes('taxi') || m.includes('train')) setCategory('TRANSPORT');
                        else if (m.includes('restaurant') || m.includes('cafe') || m.includes('mcdo') || m.includes('burger')) setCategory('REPAS');
                        else if (m.includes('hotel') || m.includes('ibis') || m.includes('bnb')) setCategory('HOTEL');
                    }

                    // ADVANCED MODE: Pre-fill ONLY (Reverted from Auto-Add)
                    // User wants to see data in inputs. We handle "forgot to add" in handleSubmit.
                    if (data.amountTTC && data.merchantName) {
                        const amountVal = data.amountTTC;
                        const htVal = data.amountHT || (amountVal / 1.2);

                        setNewLine(prev => ({
                            ...prev,
                            date: data.date || prev.date,
                            merchant: data.merchantName,
                            category: 'AUTRE',
                            description: data.items ? data.items.join(', ') : 'Ticket',
                            amountTTC: amountVal,
                            // VAT logic is recalculated in addLine/Submit, pre-fill basic:
                            vatRate: 20
                        }));
                    } else {
                        // Fallback
                        setNewLine(prev => ({
                            ...prev,
                            date: data.date || prev.date,
                            merchant: data.merchantName || prev.merchant,
                            amountTTC: data.amountTTC || prev.amountTTC,
                            description: data.items ? data.items.join(', ') : ''
                        }));
                    }
                }
            } catch (err) {
                console.error("AI Analysis failed:", err);
            } finally {
                setIsScanning(false);
            }
        }
    };

    const addLine = () => {
        if (!newLine.description || !newLine.amountTTC) return;

        const amountTTCVal = parseFloat(newLine.amountTTC as unknown as string);
        const vatRate = newLine.vatRate || 0;
        const amountHT = amountTTCVal / (1 + vatRate / 100);
        const vatAmount = amountTTCVal - amountHT;

        const line: ExpenseLine = {
            id: crypto.randomUUID(),
            date: newLine.date || date,
            description: newLine.description,
            merchant: newLine.merchant || merchant || 'Divers',
            category: newLine.category || 'AUTRE',
            amountTTC: amountTTCVal,
            amountHT,
            vatRate,
            vatAmount,
            isVatRecoverable: newLine.isVatRecoverable ?? true,
            guestNames: newLine.guestNames,
            destination: newLine.destination
        };

        setLines([...lines, line]);

        // Reset line form but keep some logical defaults
        setNewLine({
            date: newLine.date,
            merchant: newLine.merchant,
            vatRate: 20,
            isVatRecoverable: true,
            category: 'AUTRE',
            description: '',
            amountTTC: 0,
            guestNames: '',
            destination: ''
        });
    };

    const removeLine = (id: string) => {
        setLines(lines.filter(l => l.id !== id));
    };

    // Calculated Totals for Advanced Mode
    const totalAdvancedTTC = lines.reduce((sum, l) => sum + l.amountTTC, 0);
    const totalAdvancedTVA = lines.reduce((sum, l) => sum + l.vatAmount, 0);
    const totalAdvancedHT = lines.reduce((sum, l) => sum + l.amountHT, 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            let finalAmountTTC = 0;
            let finalAmountTVA = 0;
            let finalAmountHT = 0;
            let finalLines: ExpenseLine[] = [];

            if (mode === 'SIMPLE') {
                finalAmountTTC = parseFloat(amountTTC);
                finalAmountTVA = amountTVA ? parseFloat(amountTVA) : 0;
                finalAmountHT = finalAmountTTC - finalAmountTVA;

                // Create a single virtual line for backward compatibility / structure uniformity
                finalLines = [{
                    id: crypto.randomUUID(),
                    date: date,
                    description: description || category,
                    merchant: merchant,
                    category: category,
                    amountTTC: finalAmountTTC,
                    amountHT: finalAmountHT,
                    vatRate: 20, // Default assumption or 0, doesn't matter much for simple mode logic
                    vatAmount: finalAmountTVA,
                    isVatRecoverable: true,
                }];

            } else {
                // Check for "Implicit Submission" (Unsaved line in form)
                let effectiveLines = [...lines];
                if (newLine.amountTTC && (newLine.description || newLine.merchant)) {
                    // Logic similar to addLine, but allowing submission of the pending line
                    const amountTTCVal = parseFloat(newLine.amountTTC as unknown as string);
                    if (!isNaN(amountTTCVal) && amountTTCVal > 0) {
                        const vatRate = newLine.vatRate || 0;
                        const amountHT = amountTTCVal / (1 + vatRate / 100);
                        const vatAmount = amountTTCVal - amountHT;

                        const implicitLine: ExpenseLine = {
                            id: crypto.randomUUID(),
                            date: newLine.date || date,
                            description: newLine.description || 'Dépense',
                            merchant: newLine.merchant || merchant || 'Divers',
                            category: newLine.category || 'AUTRE',
                            amountTTC: amountTTCVal,
                            amountHT,
                            vatRate,
                            vatAmount,
                            isVatRecoverable: newLine.isVatRecoverable ?? true,
                            guestNames: newLine.guestNames,
                            destination: newLine.destination
                        };
                        effectiveLines.push(implicitLine);
                    }
                }

                if (effectiveLines.length === 0) {
                    alert("Veuillez ajouter au moins une ligne de dépense.");
                    return;
                }

                // Recalculate totals with implicit line
                finalAmountTTC = effectiveLines.reduce((sum, l) => sum + l.amountTTC, 0);
                finalAmountTVA = effectiveLines.reduce((sum, l) => sum + l.vatAmount, 0);
                finalAmountHT = effectiveLines.reduce((sum, l) => sum + l.amountHT, 0);
                finalLines = effectiveLines;
            }

            // Determine Display Merchant Name
            let displayMerchant = merchant;
            if (mode === 'ADVANCED') {
                const uniqueMerchants = Array.from(new Set(finalLines.map(l => l.merchant.trim())));
                if (uniqueMerchants.length === 1) {
                    displayMerchant = uniqueMerchants[0];
                } else {
                    displayMerchant = 'Multiples';
                }
            }

            await addExpenseReport({
                id: crypto.randomUUID(),
                date: date,
                amountTTC: finalAmountTTC,
                amountTVA: finalAmountTVA,
                amountHT: finalAmountHT,
                merchantName: displayMerchant,
                items: finalLines.map(l => l.description), // Backward compat
                lines: finalLines,
                mode: mode,
                status: 'En attente' as any, // Cast to any to avoid enum issues or import ExpenseStatus checking
                submittedBy: user.name,
                department: user.department,
                productionName: project?.productionCompany || 'N/A', // Context specific
                filmTitle: project?.filmTitle || 'N/A', // Context specific
                receiptFile: receipt || undefined
            });

            onClose();
        } catch (error: any) {
            console.error("Error submitting expense report:", error);
            alert(`Erreur: ${error.message}`);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-cinema-800 rounded-xl border border-cinema-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="p-6 border-b border-cinema-700 flex justify-between items-center sticky top-0 bg-cinema-800 z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Nouvelle Note de Frais</h2>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-slate-400 text-sm">Mode :</span>
                            <div className="flex bg-cinema-900 rounded-lg p-1 border border-cinema-700">
                                <button
                                    type="button"
                                    onClick={() => setMode('SIMPLE')}
                                    className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${mode === 'SIMPLE' ? 'bg-cinema-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Simple
                                </button>
                                <button
                                    type="button"
                                    className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${mode === 'ADVANCED' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Détaillé
                                </button>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-2 hover:bg-cinema-700 rounded-full transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">

                    {/* --- GLOBAL FIELDS --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Date Globale</label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-eco-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Justificatif (Scan/Photo)</label>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="receipt-upload"
                                />
                                <label
                                    htmlFor="receipt-upload"
                                    className="w-full flex items-center gap-2 bg-cinema-900 border border-cinema-700 border-dashed rounded-lg px-4 py-2 text-slate-300 cursor-pointer hover:bg-cinema-800 hover:border-eco-500 transition-colors"
                                >
                                    <Upload className="h-4 w-4" />
                                    {receipt ? (
                                        <span className="truncate max-w-[200px]">{receipt.name}</span>
                                    ) : (
                                        "Cliquez pour ajouter un fichier..."
                                    )}
                                </label>
                            </div>
                            {isScanning && (
                                <div className="mt-2 text-xs text-indigo-400 flex items-center gap-2 animate-pulse">
                                    <Sparkles className="h-3 w-3" />
                                    <span>Analyse IA en cours...</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- SIMPLE MODE FORM --- */}
                    {mode === 'SIMPLE' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Commerçant / Enseigne</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: SNCF, Restaurant..."
                                        value={merchant}
                                        onChange={(e) => setMerchant(e.target.value)}
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-eco-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Catégorie</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value as any)}
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-eco-500"
                                    >
                                        <option value="AUTRE">Autre</option>
                                        <option value="REPAS">Repas</option>
                                        <option value="TRANSPORT">Transport</option>
                                        <option value="HOTEL">Hébergement</option>
                                        <option value="REGIE">Régie</option>
                                        <option value="TECHNIQUE">Matériel Technique</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Description (Optionnel)</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Détails supplémentaires..."
                                    className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-eco-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-white mb-1">Montant TTC (€)</label>
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        min="0"
                                        value={amountTTC}
                                        onChange={(e) => setAmountTTC(e.target.value)}
                                        className="w-full bg-cinema-700/50 border border-cinema-600 rounded-lg px-4 py-2 text-white font-bold text-lg focus:outline-none focus:border-eco-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Dont TVA (€) (Optionnel)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={amountTVA}
                                        onChange={(e) => setAmountTVA(e.target.value)}
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-eco-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- ADVANCED MODE FORM --- */}
                    {mode === 'ADVANCED' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">

                            {/* Warning / Info */}
                            <div className="bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-lg flex gap-3 text-sm text-indigo-200">
                                <AlertCircle className="h-5 w-5 shrink-0 text-indigo-400" />
                                <div>
                                    Ce mode permet de saisir le détail de chaque ligne TVA par TVA, d'indiquer les convives pour les repas, etc.
                                    Le montant total de la note sera calculé automatiquement.
                                </div>
                            </div>

                            {/* Add Line Form */}
                            <div className="bg-cinema-900/50 p-4 rounded-lg border border-cinema-700 space-y-4">
                                <h3 className="tex-sm font-bold text-slate-300 uppercase tracking-wider">Ajouter une ligne</h3>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                    <div className="md:col-span-2">
                                        <label className="text-xs text-slate-500 block mb-1">Date</label>
                                        <input
                                            type="date"
                                            className="w-full bg-cinema-800 border border-cinema-600 rounded p-1.5 text-sm text-white"
                                            value={newLine.date}
                                            onChange={e => setNewLine({ ...newLine, date: e.target.value })}
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="text-xs text-slate-500 block mb-1">Commerçant</label>
                                        <input
                                            type="text"
                                            className="w-full bg-cinema-800 border border-cinema-600 rounded p-1.5 text-sm text-white"
                                            value={newLine.merchant || ''}
                                            onChange={e => setNewLine({ ...newLine, merchant: e.target.value })}
                                            placeholder="Enseigne..."
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="text-xs text-slate-500 block mb-1">Description / Objet</label>
                                        <input
                                            type="text"
                                            className="w-full bg-cinema-800 border border-cinema-600 rounded p-1.5 text-sm text-white"
                                            value={newLine.description || ''}
                                            onChange={e => setNewLine({ ...newLine, description: e.target.value })}
                                            placeholder="Quoi ?"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs text-slate-500 block mb-1">Catégorie</label>
                                        <select
                                            className="w-full bg-cinema-800 border border-cinema-600 rounded p-1.5 text-sm text-white"
                                            value={newLine.category}
                                            onChange={e => setNewLine({ ...newLine, category: e.target.value as any })}
                                        >
                                            <option value="AUTRE">Autre</option>
                                            <option value="REPAS">Repas</option>
                                            <option value="TRANSPORT">Transport</option>
                                            <option value="HOTEL">Hôtel</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs text-white font-bold block mb-1">TTC (€)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full bg-cinema-700 border border-indigo-500/50 rounded p-1.5 text-sm text-white font-bold"
                                            value={newLine.amountTTC || ''}
                                            onChange={e => setNewLine({ ...newLine, amountTTC: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                    <div className="md:col-span-2">
                                        <label className="text-xs text-slate-500 block mb-1">Taux TVA</label>
                                        <select
                                            className="w-full bg-cinema-800 border border-cinema-600 rounded p-1.5 text-sm text-white"
                                            value={newLine.vatRate}
                                            onChange={e => setNewLine({ ...newLine, vatRate: parseFloat(e.target.value) as any })}
                                        >
                                            <option value="20">20%</option>
                                            <option value="10">10%</option>
                                            <option value="5.5">5.5%</option>
                                            <option value="0">0%</option>
                                        </select>
                                    </div>

                                    {/* Conditional fields based on Category */}
                                    {newLine.category === 'REPAS' ? (
                                        <div className="md:col-span-6">
                                            <label className="text-xs text-slate-500 block mb-1">Convives (Prénom NOM)</label>
                                            <input
                                                type="text"
                                                className="w-full bg-cinema-800 border border-cinema-600 rounded p-1.5 text-sm text-white placeholder-slate-600"
                                                value={newLine.guestNames || ''}
                                                onChange={e => setNewLine({ ...newLine, guestNames: e.target.value })}
                                                placeholder="Ex: Romain PERSET, John DOE..."
                                            />
                                        </div>
                                    ) : newLine.category === 'TRANSPORT' ? (
                                        <div className="md:col-span-6">
                                            <label className="text-xs text-slate-500 block mb-1">Destination / Trajet</label>
                                            <input
                                                type="text"
                                                className="w-full bg-cinema-800 border border-cinema-600 rounded p-1.5 text-sm text-white placeholder-slate-600"
                                                value={newLine.destination || ''}
                                                onChange={e => setNewLine({ ...newLine, destination: e.target.value })}
                                                placeholder="Ex: Gare -> Studio"
                                            />
                                        </div>
                                    ) : (
                                        <div className="md:col-span-6"></div>
                                    )}

                                    <div className="md:col-span-2 flex items-center gap-2 pb-2">
                                        <input
                                            type="checkbox"
                                            id="vat-recoverable"
                                            checked={newLine.isVatRecoverable}
                                            onChange={e => setNewLine({ ...newLine, isVatRecoverable: e.target.checked })}
                                            className="w-4 h-4 rounded bg-cinema-800 border-cinema-600 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-cinema-900"
                                        />
                                        <label htmlFor="vat-recoverable" className="text-xs text-slate-300 cursor-pointer">TVA Récup.</label>
                                    </div>

                                    <div className="md:col-span-2">
                                        <button
                                            type="button"
                                            onClick={addLine}
                                            disabled={!newLine.amountTTC || !newLine.description}
                                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-1.5 rounded flex items-center justify-center gap-1 transition-colors"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Ajouter
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Lines Table */}
                            {lines.length > 0 && (
                                <div className="rounded-lg border border-cinema-700 overflow-hidden">
                                    <table className="w-full text-sm text-left text-slate-400">
                                        <thead className="bg-cinema-900 text-xs uppercase font-medium">
                                            <tr>
                                                <th className="px-3 py-2">Date</th>
                                                <th className="px-3 py-2">Objet</th>
                                                <th className="px-3 py-2 text-right">TTC</th>
                                                <th className="px-3 py-2 text-right">TVA</th>
                                                <th className="px-3 py-2 text-center">Récup.</th>
                                                <th className="px-3 py-2 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-cinema-700 bg-cinema-800/30">
                                            {lines.map((line) => (
                                                <tr key={line.id} className="hover:bg-cinema-700/30">
                                                    <td className="px-3 py-2 whitespace-nowrap">{new Date(line.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</td>
                                                    <td className="px-3 py-2">
                                                        <div className="text-white font-medium">{line.merchant}</div>
                                                        <div className="text-xs text-slate-500">{line.description}</div>
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-bold text-white">{line.amountTTC.toFixed(2)} €</td>
                                                    <td className="px-3 py-2 text-right">
                                                        <div>{line.vatAmount.toFixed(2)} €</div>
                                                        <div className="text-[10px] text-slate-600">{line.vatRate}%</div>
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        {line.isVatRecoverable ? (
                                                            <span className="text-green-500">Oui</span>
                                                        ) : (
                                                            <span className="text-red-500">Non</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeLine(line.id)}
                                                            className="text-slate-500 hover:text-red-400 transition-colors"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-cinema-900/80 font-bold text-white border-t border-cinema-700">
                                            <tr>
                                                <td colSpan={2} className="px-3 py-2 text-right text-slate-400">TOTAL</td>
                                                <td className="px-3 py-2 text-right text-indigo-400">{totalAdvancedTTC.toFixed(2)} €</td>
                                                <td className="px-3 py-2 text-right text-slate-400">{totalAdvancedTVA.toFixed(2)} €</td>
                                                <td colSpan={2}></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}

                        </div>
                    )}


                    {/* Actions */}
                    <div className="flex justify-end pt-4 border-t border-cinema-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-slate-400 hover:text-white px-4 py-2 mr-2 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="bg-eco-600 hover:bg-eco-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-eco-900/20 transition-all hover:scale-105"
                        >
                            Soumettre la note ({mode === 'SIMPLE' ? (amountTTC || '0') : totalAdvancedTTC.toFixed(2)} €)
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};
