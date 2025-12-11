import React, { useState, useRef } from 'react';
import { X, Upload, Camera, Loader2, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { analyzeReceipt } from '../services/geminiService';
import { ExpenseReport, ExpenseStatus } from '../types';
import { storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from '../utils/imageUtils';

interface ExpenseReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    prefillItemName?: string;
    prefillItemNames?: string[];
}

export const ExpenseReportModal: React.FC<ExpenseReportModalProps> = ({ isOpen, onClose, prefillItemName, prefillItemNames }) => {
    const { user, addExpenseReport } = useProject();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState<'UPLOAD' | 'REVIEW' | 'SUCCESS'>('UPLOAD');
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [newItem, setNewItem] = useState('');

    // Form Data
    const [formData, setFormData] = useState<Partial<ExpenseReport>>({
        amountTTC: 0,
        amountTVA: 0,
        amountHT: 0,
        merchantName: '',
        date: new Date().toISOString().split('T')[0],
        items: prefillItemNames || (prefillItemName ? [prefillItemName] : [])
    });

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (newItem.trim()) {
            setFormData(prev => ({
                ...prev,
                items: [...(prev.items || []), newItem.trim()]
            }));
            setNewItem('');
        }
    };

    const handleRemoveItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items?.filter((_, i) => i !== index)
        }));
    };

    // Reset state when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setStep('UPLOAD');
            setFile(null);
            setPreviewUrl(null);
            setError(null);
            setIsAnalyzing(false);
            setNewItem('');
            setFormData({
                amountTTC: 0,
                amountTVA: 0,
                merchantName: '',
                date: new Date().toISOString().split('T')[0],
                items: prefillItemNames || (prefillItemName ? [prefillItemName] : [])
            });
        }
    }, [isOpen, prefillItemName]);

    // Auto-calculation Handlers
    const handleAmountChange = (field: 'amountHT' | 'amountTTC' | 'amountTVA', value: string) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
            setFormData(prev => ({ ...prev, [field]: 0 }));
            return;
        }

        setFormData(prev => {
            const newData = { ...prev, [field]: numValue };

            // Logic: Calculate missing 3rd value based on 2 knowns
            // TTC = HT + TVA

            const ht = field === 'amountHT' ? numValue : (prev.amountHT || 0);
            const ttc = field === 'amountTTC' ? numValue : (prev.amountTTC || 0);
            const tva = field === 'amountTVA' ? numValue : (prev.amountTVA || 0);

            if (field === 'amountHT') {
                if (tva > 0) {
                    // HT + TVA -> TTC
                    newData.amountTTC = Number((ht + tva).toFixed(2));
                } else if (ttc > 0) {
                    // TTC - HT -> TVA
                    newData.amountTVA = Number((Math.max(0, ttc - ht)).toFixed(2));
                }
            } else if (field === 'amountTTC') {
                if (ht > 0) {
                    // TTC - HT -> TVA
                    newData.amountTVA = Number((Math.max(0, ttc - ht)).toFixed(2));
                } else if (tva > 0) {
                    // TTC - TVA -> HT
                    newData.amountHT = Number((Math.max(0, ttc - tva)).toFixed(2));
                }
            } else if (field === 'amountTVA') {
                if (ht > 0) {
                    // HT + TVA -> TTC
                    newData.amountTTC = Number((ht + numValue).toFixed(2));
                } else if (ttc > 0) {
                    // TTC - TVA -> HT
                    newData.amountHT = Number((Math.max(0, ttc - numValue)).toFixed(2));
                }
            }

            return newData;
        });
    };

    if (!isOpen) return null;

    // Helper for mobile/locale robust number parsing
    const safeParseFloat = (val: any): number => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            // Replace comma with dot, remove currency symbols or spaces if any
            const cleaned = val.replace(',', '.').replace(/[^0-9.-]/g, '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        // 1. Immediate UI Feedback: Show Preview & Form
        setPreviewUrl(URL.createObjectURL(selectedFile));
        setStep('REVIEW');
        setError(null);
        // setIsAnalyzing(true); // AI disabled for stability

        // 2. Background Processing (Compression only)
        setTimeout(async () => {
            try {
                let fileToProcess = selectedFile;

                if (selectedFile.type.startsWith('image/')) {
                    try {
                        fileToProcess = await compressImage(selectedFile);
                    } catch (e) {
                        console.warn("Compression failed, using original", e);
                    }
                }

                setFile(fileToProcess);

                if (fileToProcess.size > 1024 * 1024) {
                    // Non-blocking warning for user awareness
                    // setError("Image volumineuse, compression appliquée.");
                }

                // AI ANALYSIS DISABLED TO PREVENT CRASHES
                /*
                const result = await analyzeReceipt(fileToProcess);
                if (result.data) {
                   ...
                }
                */

            } catch (err) {
                console.error("File processing failed:", err);
                setError("Erreur lors du traitement de l'image.");
            } finally {
                setIsAnalyzing(false);
            }
        }, 500);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsUploading(true);
        try {
            let finalReceiptUrl = previewUrl;

            // Upload file to Firebase Storage if it's a new file (not just a preview URL)
            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `expense_${Date.now()}.${fileExt}`;
                const storagePath = `production/${user.productionName}/${user.name}/expenses/${fileName}`;
                const storageRef = ref(storage, storagePath);

                await uploadBytes(storageRef, file);
                finalReceiptUrl = await getDownloadURL(storageRef);
            }

            const newReport: ExpenseReport = {
                id: Math.random().toString(36).substr(2, 9),
                date: formData.date || new Date().toISOString(),
                amountTTC: Number(formData.amountTTC),
                amountTVA: Number(formData.amountTVA),
                amountHT: Number(formData.amountHT),
                merchantName: formData.merchantName,
                items: formData.items || [],
                status: ExpenseStatus.PENDING,
                receiptUrl: finalReceiptUrl || undefined,
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
                setIsUploading(false);
            }, 2000);
        } catch (error) {
            console.error("Error uploading expense receipt:", error);
            setError("Erreur lors de l'envoi du justificatif.");
            setIsUploading(false);
        }
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
                                <span className="text-sm text-slate-500">Image compressée et jointe au dossier. Saisie des montants manuelle.</span>
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
                                    <div className="w-1/3 relative">
                                        {file?.type === 'application/pdf' ? (
                                            <div className="w-full h-32 bg-cinema-900 border border-cinema-600 rounded-lg flex flex-col items-center justify-center text-slate-400">
                                                <FileText className="h-10 w-10 mb-2" />
                                                <span className="text-xs">Document PDF</span>
                                            </div>
                                        ) : (
                                            <img src={previewUrl} alt="Ticket" className="w-full h-32 object-cover rounded-lg border border-cinema-600" />
                                        )}
                                        {isAnalyzing && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg backdrop-blur-sm">
                                                <Loader2 className="h-8 w-8 text-eco-400 animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <div className="flex justify-between">
                                            <label className="block text-xs text-slate-400 mb-1">Commerçant</label>
                                            {isAnalyzing && <span className="text-xs text-eco-400 animate-pulse">Analyse IA...</span>}
                                        </div>
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

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Montant HT (€)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.amountHT || ''}
                                        onChange={(e) => handleAmountChange('amountHT', e.target.value)}
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2 text-white outline-none focus:border-eco-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Montant TTC (€)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.amountTTC || ''}
                                        onChange={(e) => handleAmountChange('amountTTC', e.target.value)}
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2 text-white font-bold text-lg focus:border-eco-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Dont TVA (€)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.amountTVA || ''}
                                        onChange={(e) => handleAmountChange('amountTVA', e.target.value)}
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2 text-white focus:border-eco-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Articles</label>
                                <div className="bg-cinema-900 border border-cinema-700 rounded-lg p-3 min-h-[60px] space-y-3">
                                    {/* Input Area */}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newItem}
                                            onChange={(e) => setNewItem(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault(); // Prevent form submit
                                                    handleAddItem(e);
                                                }
                                            }}
                                            placeholder="Ajouter un article..."
                                            className="flex-1 bg-cinema-800 border border-cinema-700 rounded px-2 py-1.5 text-sm text-white focus:border-eco-500 outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddItem}
                                            disabled={!newItem.trim()}
                                            className="bg-cinema-700 hover:bg-cinema-600 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50"
                                        >
                                            Ajouter
                                        </button>
                                    </div>

                                    {/* Items List */}
                                    {formData.items?.length === 0 ? (
                                        <span className="text-slate-500 italic text-sm block text-center py-2">Aucun article listé</span>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {formData.items?.map((item, idx) => (
                                                <span key={idx} className="bg-cinema-700 text-slate-200 text-xs px-2 py-1 rounded-full border border-cinema-600 flex items-center gap-2 group">
                                                    {item}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(idx)}
                                                        className="text-slate-400 hover:text-red-400"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
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
                                    {isUploading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" /> Envoi...
                                        </span>
                                    ) : (
                                        "Valider"
                                    )}
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
