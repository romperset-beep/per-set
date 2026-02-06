
import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2, Calendar, Eye, Download } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { useToast } from '../hooks/useToast';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// We'll implement the actual parser service next
// import { parsePDT } from '../services/pdtService'; 

export const PDTManager: React.FC = () => {
    const { project, updateProjectDetails } = useProject();
    const toast = useToast();
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isUploading, setIsUploading] = useState(false); // New state
    const [analysisResult, setAnalysisResult] = useState<{
        dates: number;
        sequences: number;
        period: string;
        text?: string;
        startDayInfo?: string;
        startDayOffset?: number;
        debugExtract?: string;
        debugDates?: string;
        debugYear?: string;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Editable State
    const [editDates, setEditDates] = useState<number>(0);
    const [editSequences, setEditSequences] = useState<number>(0);
    const [editStartDate, setEditStartDate] = useState<string>('');
    const [editEndDate, setEditEndDate] = useState<string>('');

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            validateAndSetFile(files[0]);
        }
    }, []);

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const validateAndSetFile = (f: File) => {
        if (f.type === 'application/pdf' || f.name.endsWith('.xlsx')) {
            setFile(f);
            setError(null);
            setAnalysisResult(null);
        } else {
            setError("Format non supporté. Veuillez utiliser un PDF ou un fichier Excel (.xlsx).");
        }
    };

    const handleValidate = async () => {
        if (!analysisResult || !file) return;

        setIsUploading(true);
        try {
            // 1. Upload File
            const storage = getStorage();
            const storageRef = ref(storage, `projects/${project.id}/pdt/${file.name}`);

            // Upload
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);

            // 2. Update Project with Dates AND File URL
            const updates: any = {
                pdtUrl: downloadUrl,
                pdtName: file.name
            };

            // Use Editable Values
            if (editStartDate) updates.shootingStartDate = editStartDate;
            if (editEndDate) updates.shootingEndDate = editEndDate;

            // Update Carbon Context with corrected shooting days if needed
            if (editDates > 0) {
                updates.carbonContext = {
                    ...project.carbonContext,
                    shootingDays: editDates
                };
            }

            await updateProjectDetails(updates);

            toast.success("Plan de travail importé et sauvegardé !");

            // Clear state to show "done"
            setFile(null);
            setAnalysisResult(null);

        } catch (e: any) {
            console.error(e);
            toast.error("Erreur lors de la sauvegarde du fichier");
            setError(`Erreur technique: ${e.message || 'Inconnue'}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleAnalyze = async () => {
        if (!file) return;

        setIsAnalyzing(true);
        setError(null);
        setAnalysisResult(null);

        try {
            // Import dynamically to avoid SSR issues if any (though client-side only here)
            const { parsePDT } = await import('../services/pdtService');

            const result = await parsePDT(file);

            setAnalysisResult({
                dates: result.dates,
                sequences: result.sequences,
                period: result.period,
                text: result.text.substring(0, 500) + "...", // Preview for debug
                startDayInfo: result.startDayInfo,
                startDayOffset: result.startDayOffset,
                debugExtract: result.debugExtract,
                debugDates: result.debugDates,
                debugYear: result.debugYear
            });

            // Initialize Editable State
            const totalDays = result.dates + (result.startDayOffset || 0);
            setEditDates(totalDays);
            setEditSequences(result.sequences);

            if (result.period && result.period.includes(' - ')) {
                const [startStr, endStr] = result.period.split(' - ');
                // Helper to convert DD/MM/YYYY to YYYY-MM-DD
                const toIso = (d: string) => {
                    const parts = d.trim().split('/');
                    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
                    return '';
                };
                setEditStartDate(toIso(startStr));
                setEditEndDate(toIso(endStr));
            } else {
                setEditStartDate('');
                setEditEndDate('');
            }
        } catch (err: any) {
            setError(`Erreur lors de l'analyse du fichier: ${err.message || 'Erreur inconnue'}`);
            console.error(err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Calendar className="w-8 h-8 text-emerald-500" />
                    Gestion du Plan de Travail
                </h1>
                <p className="text-slate-400">
                    Importez votre Plan de Travail (PDF ou Excel) pour générer automatiquement la logistique et pré-remplir les feuilles de service.
                </p>

                {/* EXISTING PDT DISPLAY */}
                {project.pdtUrl && (
                    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center border border-red-500/20 flex-shrink-0">
                                <FileText className="w-5 h-5 text-red-500" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-white truncate max-w-[200px] md:max-w-md">
                                    {project.pdtName || "Plan de Travail Actuel.pdf"}
                                </p>
                                <p className="text-xs text-slate-500">Document actif</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => window.open(project.pdtUrl, '_blank')}
                                className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <Eye className="w-4 h-4" />
                                <span className="hidden sm:inline">Consulter</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Upload Area */}
            <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`
                    border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer
                    ${isDragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/50 hover:bg-slate-800/50'}
                    ${file ? 'border-emerald-500/50' : ''}
                `}
            >
                <input
                    type="file"
                    id="pdt-upload"
                    className="hidden"
                    accept=".pdf,.xlsx,.xls"
                    onChange={onFileSelect}
                />

                {!file ? (
                    <label htmlFor="pdt-upload" className="flex flex-col items-center gap-4 cursor-pointer w-full h-full">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-2">
                            <Upload className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-medium text-white">Glissez-déposez votre PDT ici</h3>
                        <p className="text-slate-500">ou cliquez pour parcourir vos fichiers</p>
                        <div className="mt-4 flex gap-2">
                            <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-mono font-bold">PDF</span>
                            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-mono font-bold">EXCEL</span>
                        </div>
                    </label>
                ) : (
                    <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                        <FileText className="w-16 h-16 text-emerald-500" />
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-white max-w-md truncate">{file.name}</h3>
                            <p className="text-sm text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>

                        <div className="flex gap-4 mt-4">
                            <button
                                onClick={() => setFile(null)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Changer de fichier
                            </button>
                            <button
                                onClick={handleAnalyze}
                                disabled={isAnalyzing}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Analyse en cours...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4" />
                                        Lancer l'analyse
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 animate-in slide-in-from-top-2">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Analysis Result Preview */}
            {analysisResult && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                            Analyse terminée avec succès
                        </h3>
                        {analysisResult.text?.includes("Analyzed by Gemini AI") && (
                            <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-bold border border-purple-500/30 flex items-center gap-1">
                                ✨ Analysé par IA
                            </span>
                        )}
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Editable Dates Count */}
                        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                            <label className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2 block">
                                Jours de Tournage
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={editDates}
                                    onChange={(e) => setEditDates(Number(e.target.value))}
                                    className="bg-slate-900 border border-slate-600 text-white font-bold text-xl rounded px-3 py-2 w-full focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                />
                                <span className="text-sm font-medium text-slate-500">jours</span>
                            </div>
                            {analysisResult.startDayOffset && analysisResult.startDayOffset > 0 && (
                                <div className="text-xs text-orange-400 mt-1 font-medium">
                                    Dont {analysisResult.startDayOffset} déjà effectués (inclus)
                                </div>
                            )}
                        </div>

                        {/* Editable Sequences Count */}
                        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                            <label className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2 block">
                                Séquences Détectées
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={editSequences}
                                    onChange={(e) => setEditSequences(Number(e.target.value))}
                                    className="bg-slate-900 border border-slate-600 text-white font-bold text-xl rounded px-3 py-2 w-full focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                />
                                <span className="text-sm font-medium text-slate-500">scènes</span>
                            </div>
                        </div>

                        {/* Editable Date Range */}
                        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                            <label className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2 block">
                                Période (Début - Fin)
                            </label>
                            <div className="flex flex-col gap-2">
                                <input
                                    type="date"
                                    value={editStartDate}
                                    onChange={(e) => setEditStartDate(e.target.value)}
                                    className="bg-slate-900 border border-slate-600 text-white font-medium text-sm rounded px-3 py-1.5 w-full focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                                <input
                                    type="date"
                                    value={editEndDate}
                                    onChange={(e) => setEditEndDate(e.target.value)}
                                    className="bg-slate-900 border border-slate-600 text-white font-medium text-sm rounded px-3 py-1.5 w-full focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Start Day Info Alert */}
                    {analysisResult.startDayInfo && (
                        <div className="mx-6 mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-3 text-blue-300">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center font-bold text-xs">
                                INFO
                            </div>
                            <p className="text-sm font-medium">{analysisResult.startDayInfo}</p>
                        </div>
                    )}

                    {/* DEBUG SECTION */}
                    {(analysisResult.debugExtract || analysisResult.debugDates) && (
                        <div className="mx-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Context Debug */}
                            {analysisResult.debugExtract && (
                                <div className="p-4 bg-black/50 rounded-lg border border-slate-700">
                                    <p className="text-xs font-bold text-slate-400 mb-2">DEBUG - CONTEXTE 'TOURNAGE':</p>
                                    <pre className="text-[10px] font-mono text-slate-300 whitespace-pre-wrap overflow-x-auto max-h-40">
                                        {analysisResult.debugExtract}
                                    </pre>
                                </div>
                            )}
                            {/* Dates Debug */}
                            {analysisResult.debugDates && (
                                <div className="p-4 bg-black/50 rounded-lg border border-slate-700">
                                    <p className="text-xs font-bold text-slate-400 mb-2">DEBUG - DATES TROUVÉES:</p>
                                    <pre className="text-[10px] font-mono text-slate-300 whitespace-pre-wrap overflow-x-auto max-h-40">
                                        {analysisResult.debugDates}
                                    </pre>
                                    <p className="text-xs font-bold text-slate-400 mt-4 mb-2">DEBUG - CONTEXTE 'ANNÉE':</p>
                                    <pre className="text-[10px] font-mono text-amber-300 whitespace-pre-wrap overflow-x-auto max-h-40">
                                        {analysisResult.debugYear}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="p-4 bg-emerald-500/5 border-t border-emerald-500/10 flex justify-end gap-3">
                        <button className="px-4 py-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg text-sm font-bold transition-colors">
                            Voir le détail
                        </button>
                        <button
                            onClick={handleValidate}
                            disabled={isUploading}
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait">
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Sauvegarde...
                                </>
                            ) : (
                                "Valider et Importer"
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
