import React, { useState, useRef } from 'react';
import { X, Upload, Camera, Loader2, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { analyzeReceipt } from '../services/geminiService';
import { ExpenseReport, ExpenseStatus } from '../types';

interface ExpenseReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    prefillItemName?: string;
    prefillItemNames?: string[];
}

export const ExpenseReportModal: React.FC<ExpenseReportModalProps> = ({ isOpen, onClose, prefillItemName, prefillItemNames }) => {
    const { user, addExpenseReport } = useProject();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState<'UPLOAD' | 'ANALYZING' | 'REVIEW' | 'SUCCESS'>('UPLOAD');
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Form Data
    const [formData, setFormData] = useState<Partial<ExpenseReport>>({
        amountTTC: 0,
        amountTVA: 0,
        merchantName: '',
        date: new Date().toISOString().split('T')[0],
        items: prefillItemNames || (prefillItemName ? [prefillItemName] : [])
    });

    // Reset state when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setStep('UPLOAD');
            setFile(null);
            setPreviewUrl(null);
            setError(null);
            setFormData({
                amountTTC: 0,
                amountTVA: 0,
                merchantName: '',
                date: new Date().toISOString().split('T')[0],
                items: prefillItemNames || (prefillItemName ? [prefillItemName] : [])
            });
        }
    }, [isOpen, prefillItemName]);

    if (!isOpen) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
        setStep('ANALYZING');
        setError(null);

        try {
            const result = await analyzeReceipt(selectedFile);
            if (result.data) {
                setFormData(prev => ({
                    ...prev,
                    merchantName: result.data.merchantName || '',
                    date: result.data.date || new Date().toISOString().split('T')[0],
                    amountTTC: result.data.amountTTC || 0,
                    amountTVA: result.data.amountTVA || 0,
                    // Merge detected items with prefilled item if any
                    items: [...(prev.items || []), ...(result.data.items || [])]
                }));
                setStep('REVIEW');
            } else {
                throw new Error("Impossible d'analyser le ticket.");
            }
        } catch (err) {
            console.error(err);
            setError("Erreur lors de l'analyse. Veuillez remplir les informations manuellement.");
            setStep('REVIEW');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        const newReport: ExpenseReport = {
            id: Math.random().toString(36).substr(2, 9),
            date: formData.date || new Date().toISOString(),
            amountTTC: Number(formData.amountTTC),
            amountTVA: Number(formData.amountTVA),
            merchantName: formData.merchantName,
            items: formData.items || [],
            status: ExpenseStatus.PENDING,
            receiptUrl: previewUrl || undefined,
            submittedBy: user.name,
            department: user.department,
            productionName: user.productionName,
            filmTitle: user.filmTitle
        };

        addExpenseReport(newReport);
        setStep('SUCCESS');
        setTimeout(() => {
            onClose();
            setStep('UPLOAD');
            setFile(null);
            setPreviewUrl(null);
        }, 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-cinema-800 border border-cinema-700 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-cinema-700 flex justify-between items-center bg-cinema-900/50">
                    <h3 className="text-xl font-bold text-white">Créer une Note de Frais</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">

                    {step === 'UPLOAD' && (
                        <div className="text-center space-y-6 py-8">
                            <div className="w-20 h-20 bg-cinema-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Camera className="h-10 w-10 text-slate-400" />
                            </div>
                            <p className="text-slate-300">
                                Prenez en photo votre ticket de caisse ou importez une image/PDF.
                                <br />
                                <span className="text-sm text-slate-500">L'IA analysera automatiquement les détails.</span>
                            </p>

                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />

                            <div className="flex gap-4 justify-center">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="bg-eco-600 hover:bg-eco-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all hover:scale-105"
                                >
                                    <Upload className="h-5 w-5" />
                                    Importer un ticket
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'ANALYZING' && (
                        <div className="text-center py-12 space-y-4">
                            <Loader2 className="h-12 w-12 text-eco-500 animate-spin mx-auto" />
                            <h4 className="text-xl font-bold text-white">Analyse en cours...</h4>
                            <p className="text-slate-400">Nous extrayons les informations de votre ticket.</p>
                        </div>
                    )}

                    {step === 'REVIEW' && (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-red-900/20 border border-red-500/50 text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm">
                                    <AlertCircle className="h-4 w-4" />
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-4">
                                {previewUrl && (
                                    <div className="w-1/3">
                                        {file?.type === 'application/pdf' ? (
                                            <div className="w-full h-32 bg-cinema-900 border border-cinema-600 rounded-lg flex flex-col items-center justify-center text-slate-400">
                                                <FileText className="h-10 w-10 mb-2" />
                                                <span className="text-xs">Document PDF</span>
                                            </div>
                                        ) : (
                                            <img src={previewUrl} alt="Ticket" className="w-full h-32 object-cover rounded-lg border border-cinema-600" />
                                        )}
                                    </div>
                                )}
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Commerçant</label>
                                        <input
                                            type="text"
                                            value={formData.merchantName}
                                            onChange={e => setFormData({ ...formData, merchantName: e.target.value })}
                                            className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2 text-white focus:border-eco-500 outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Date</label>
                                        <input
                                            type="date"
                                            value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2 text-white focus:border-eco-500 outline-none"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Montant TTC (€)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.amountTTC}
                                        onChange={e => setFormData({ ...formData, amountTTC: parseFloat(e.target.value) })}
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2 text-white font-bold text-lg focus:border-eco-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Dont TVA (€)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.amountTVA}
                                        onChange={e => setFormData({ ...formData, amountTVA: parseFloat(e.target.value) })}
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2 text-white focus:border-eco-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Articles détectés</label>
                                <div className="bg-cinema-900 border border-cinema-700 rounded-lg p-3 min-h-[60px]">
                                    {formData.items?.length === 0 ? (
                                        <span className="text-slate-500 italic text-sm">Aucun article listé</span>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {formData.items?.map((item, idx) => (
                                                <span key={idx} className="bg-cinema-700 text-slate-200 text-xs px-2 py-1 rounded-full border border-cinema-600">
                                                    {item}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 bg-cinema-700 hover:bg-cinema-600 text-white py-3 rounded-xl font-bold transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-eco-600 hover:bg-eco-500 text-white py-3 rounded-xl font-bold transition-colors"
                                >
                                    Valider
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 'SUCCESS' && (
                        <div className="text-center py-12 space-y-4 animate-in zoom-in duration-300">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-500">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <h4 className="text-2xl font-bold text-white">Note de frais créée !</h4>
                            <p className="text-slate-400">Votre demande a été envoyée pour validation.</p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
