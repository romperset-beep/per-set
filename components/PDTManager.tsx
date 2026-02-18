
import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2, Calendar, Eye, Download } from 'lucide-react';
import { Project, PDTAnalysisResult, User, PDTSequence, PDTDay } from '../types';
import { useProject } from '../context/ProjectContext';
import { useNotification } from '../context/NotificationContext';
import { useToast } from '../hooks/useToast';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { parsePDT } from '../services/pdtService';
import { generatePDTTemplate, parsePDTMatrix } from '../services/matrixService';
import * as XLSX from 'xlsx';

export const PDTManager: React.FC = () => {
    const { project, updateProjectDetails, addLogisticsRequest, addReinforcement } = useProject();
    const { addNotification } = useNotification();
    const toast = useToast();
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<PDTAnalysisResult | null>(null);
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

    const handleDownloadTemplate = (demoMode: boolean = false) => {
        const wb = generatePDTTemplate(
            project.shootingStartDate,
            project.shootingEndDate,
            demoMode
        );
        const fileName = demoMode ? "Modele_PDT_DEMO.xlsx" : "Modele_PDT_ABetterSet.xlsx";
        XLSX.writeFile(wb, fileName);

        if (demoMode) {
            toast.success("PDT de DÉMO généré avec succès !");
        } else if (project.shootingStartDate && project.shootingEndDate) {
            toast.success("Modèle généré avec les dates du projet !");
        } else {
            toast.success("Modèle vierge téléchargé (Dates projet manquantes)");
        }
    };

    const validateAndSetFile = (f: File) => {
        if (f.type === 'application/pdf' || f.name.endsWith('.xlsx') || f.name.endsWith('.xls')) {
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

            // 2. Prepare Updates
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

            // 3. Persist Sequences & Auto-Update Logistics
            if (analysisResult.extractedSequences) {
                updates.pdtSequences = analysisResult.extractedSequences;
            }
            // NEW: Store rich day data if available
            if (analysisResult.pdtDays) {
                updates.pdtDays = analysisResult.pdtDays;
            }

            // Auto-Sync Logic: Logistics (write to subcollection)
            if (project.logistics && project.logistics.length > 0) {
                // Prepare Map of Location -> {start, end} from NEW pdtDays
                const locationDates: Record<string, { start: Date, end: Date }> = {};
                if (updates.pdtDays) {
                    updates.pdtDays.forEach((d: any) => {
                        const loc = d.linkedLocation || d.location;
                        if (!loc) return;
                        const date = new Date(d.date);
                        if (!locationDates[loc]) {
                            locationDates[loc] = { start: date, end: date };
                        } else {
                            if (date < locationDates[loc].start) locationDates[loc].start = date;
                            if (date > locationDates[loc].end) locationDates[loc].end = date;
                        }
                    });
                }

                // Update Logistics — write each changed item to subcollection
                for (const req of project.logistics) {
                    let updatedReq = { ...req };
                    let changed = false;

                    // 1. Sync Sequence
                    if (req.linkedSequenceId && req.autoUpdateDates && analysisResult.extractedSequences) {
                        const relatedSeq = analysisResult.extractedSequences.find((s: any) => s.id === req.linkedSequenceId);
                        if (relatedSeq) {
                            const seqDate = new Date(relatedSeq.date);

                            // Calculate correct date based on item type
                            // NOTE: dayOffset is for LOCATION links, not sequence links.
                            // For sequence links, pickup = J-1, usage = J, dropoff = J+1 (hardcoded).
                            let newDate = new Date(seqDate);
                            if (req.type === 'pickup' || req.type === 'pickup_set') {
                                newDate.setDate(seqDate.getDate() - 1); // Always J-1
                            } else if (req.type === 'dropoff' || req.type === 'dropoff_set') {
                                newDate.setDate(seqDate.getDate() + 1); // Always J+1
                            }
                            // else: usage stays on seqDate (J)

                            // Skip Sundays
                            if (newDate.getDay() === 0) {
                                if (req.type === 'pickup' || req.type === 'pickup_set') {
                                    newDate.setDate(newDate.getDate() - 1); // Saturday
                                } else {
                                    newDate.setDate(newDate.getDate() + 1); // Monday
                                }
                            }

                            const newDateStr = newDate.toISOString().split('T')[0];
                            if (newDateStr !== req.date) {
                                // Store as PENDING proposal, don't change actual date
                                updatedReq = { ...updatedReq, pendingDate: newDateStr };
                                changed = true;
                            }
                        }
                    }

                    // 2. Sync Location
                    if (req.linkedLocation && locationDates[req.linkedLocation]) {
                        const { start, end } = locationDates[req.linkedLocation];
                        let newDate = new Date(start);
                        if (req.linkType === 'DEMONTAGE') {
                            newDate = new Date(end);
                        }
                        const offset = req.dayOffset || 0;
                        newDate.setDate(newDate.getDate() + offset);

                        const newDateStr = newDate.toISOString().split('T')[0];
                        if (newDateStr !== req.date) {
                            // Store as PENDING proposal, don't change actual date
                            updatedReq = { ...updatedReq, pendingDate: newDateStr };
                            changed = true;
                        }
                    }

                    if (changed) {
                        await addLogisticsRequest(updatedReq);

                        // Notify the owning department about the proposed change
                        const oldDateDisplay = new Date(req.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
                        const newDateDisplay = new Date(updatedReq.pendingDate!).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
                        const typeLabel = req.type === 'pickup' ? 'Enlèvement' : req.type === 'dropoff' ? 'Retour' : req.type === 'usage' ? 'Utilisation' : req.type;
                        await addNotification(
                            `📦 Déplacement proposé : ${typeLabel} "${req.description}" du ${oldDateDisplay} → ${newDateDisplay} — Validation requise`,
                            'LOGISTICS',
                            req.department,
                            req.id
                        );
                    }
                }
            }

            // Auto-Sync Logic: Renforts (write to subcollection)
            if (project.reinforcements && project.reinforcements.length > 0) {
                const locationDates: Record<string, { start: Date, end: Date }> = {};
                if (updates.pdtDays) {
                    updates.pdtDays.forEach((d: any) => {
                        const loc = d.linkedLocation || d.location;
                        if (!loc) return;
                        const date = new Date(d.date);
                        if (!locationDates[loc]) {
                            locationDates[loc] = { start: date, end: date };
                        } else {
                            if (date < locationDates[loc].start) locationDates[loc].start = date;
                            if (date > locationDates[loc].end) locationDates[loc].end = date;
                        }
                    });
                }

                // Flatten, update dates, regroup, and write changed reinforcements
                let allStaff: { staff: any, dept: string, date: string }[] = [];
                project.reinforcements.forEach(r => {
                    if (r.staff) {
                        r.staff.forEach(s => {
                            allStaff.push({ staff: s, dept: r.department, date: r.date });
                        });
                    }
                });

                let hasRenfortChanges = false;
                const updatedStaffList = allStaff.map(item => {
                    let newDate = item.date;
                    let changed = false;

                    if (item.staff.linkedSequenceId && analysisResult.extractedSequences) {
                        const seq = analysisResult.extractedSequences.find((s: any) => s.id === item.staff.linkedSequenceId);
                        if (seq && seq.date !== item.date) {
                            newDate = seq.date;
                            changed = true;
                        }
                    }

                    if (item.staff.linkedLocation && locationDates[item.staff.linkedLocation]) {
                        const { start, end } = locationDates[item.staff.linkedLocation];
                        let targetDateObj = new Date(start);
                        if (item.staff.linkType === 'DEMONTAGE') {
                            targetDateObj = new Date(end);
                        }
                        const offset = item.staff.dayOffset || 0;
                        targetDateObj.setDate(targetDateObj.getDate() + offset);
                        const targetDateStr = targetDateObj.toISOString().split('T')[0];
                        if (targetDateStr !== item.date) {
                            newDate = targetDateStr;
                            changed = true;
                        }
                    }

                    if (changed) {
                        hasRenfortChanges = true;
                        return { ...item, date: newDate };
                    }
                    return item;
                });

                if (hasRenfortChanges) {
                    const newReinforcementsMap: Record<string, any> = {};
                    updatedStaffList.forEach(item => {
                        const key = `${item.date}_${item.dept}`;
                        if (!newReinforcementsMap[key]) {
                            newReinforcementsMap[key] = {
                                id: key,
                                date: item.date,
                                department: item.dept,
                                staff: []
                            };
                        }
                        newReinforcementsMap[key].staff.push(item.staff);
                    });

                    // Write each updated reinforcement to subcollection
                    for (const reinforcement of Object.values(newReinforcementsMap)) {
                        await addReinforcement(reinforcement);
                    }
                }
            }

            await updateProjectDetails(updates);

            toast.success("Plan de travail importé et logistique synchronisée !");

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
        if (!file) {
            setError('Veuillez sélectionner un fichier.');
            return;
        }

        setIsAnalyzing(true);
        setError(null);
        setAnalysisResult(null);

        try {
            let result: PDTAnalysisResult;

            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                // Try Matrix Parse First
                try {
                    const matrixData = await parsePDTMatrix(file);
                    if (matrixData.days.length > 0) {
                        // Success! Convert to PDTAnalysisResult format for UI
                        const shootDays = matrixData.days.filter(d => d.type === 'SHOOT').length;
                        const dates = matrixData.days.filter(d => d.type === 'SHOOT').map(d => d.date);

                        result = {
                            dates: shootDays,
                            sequences: matrixData.sequences.length,
                            period: dates.length > 0 ? `${dates[0]} - ${dates[dates.length - 1]}` : "N/A",
                            text: "Import Matrice Standard",
                            startDayInfo: "Import Excel Standard",
                            startDayOffset: 0,
                            extractedSequences: matrixData.sequences,
                            pdtDays: matrixData.days
                        };

                        setAnalysisResult(result);

                        // Initialize Editable State
                        setEditDates(shootDays);
                        setEditSequences(matrixData.sequences.length);
                        if (dates.length > 0) {
                            setEditStartDate(dates[0]);
                            setEditEndDate(dates[dates.length - 1]);
                        }

                        setIsAnalyzing(false);
                        return;
                    }
                } catch (e) {
                    console.log("Not a standard matrix, falling back to AI/Legacy parser");
                }
            }

            // Legacy / AI Parse
            // Import dynamically to avoid SSR issues if any (though client-side only here)
            // const { parsePDT } = await import('../services/pdtService');
            result = await parsePDT(file);

            setAnalysisResult({
                dates: result.dates,
                sequences: result.sequences,
                period: result.period,
                text: result.text.substring(0, 500) + "...", // Preview for debug
                startDayInfo: result.startDayInfo,
                startDayOffset: result.startDayOffset,
                debugExtract: result.debugExtract,
                debugDates: result.debugDates,
                debugYear: result.debugYear,
                extractedSequences: result.extractedSequences
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

            {/* Template Download Button - Only show if no file is selected */}
            {!file && (
                <div className="flex justify-center gap-4">
                    <button
                        onClick={() => handleDownloadTemplate(false)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-bold transition-all shadow-lg shadow-emerald-900/20"
                    >
                        <Download className="w-4 h-4" />
                        1. Télécharger le Modèle Excel à Remplir
                    </button>

                    <button
                        onClick={() => handleDownloadTemplate(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-900/30 hover:bg-purple-900/50 text-purple-400 border border-purple-500/30 rounded-lg text-sm font-bold transition-all shadow-lg shadow-purple-900/20"
                    >
                        <span className="text-lg">🧪</span>
                        Générer PDT Démo (Test)
                    </button>
                </div>
            )}

            {/* Upload Area - Hide if analysis result is present to focus on validation */}
            {!analysisResult && (
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
                            <h3 className="text-xl font-medium text-white">2. Glissez-déposez le fichier rempli ici</h3>
                            <p className="text-slate-500">ou cliquez pour parcourir vos fichiers (PDF ou Excel Standard)</p>
                            <div className="mt-4 flex gap-2">
                                <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-mono font-bold">PDF (IA)</span>
                                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-mono font-bold">Matrice Excel</span>
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
            )}

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
                        <div className="flex gap-2">
                            {analysisResult.text?.includes("Standard") && (
                                <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs font-bold border border-green-500/30 flex items-center gap-1">
                                    🚀 Matrice Standard
                                </span>
                            )}
                            {analysisResult.text?.includes("Analyzed by Gemini AI") && (
                                <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-bold border border-purple-500/30 flex items-center gap-1">
                                    ✨ Analysé par IA
                                </span>
                            )}
                        </div>
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
                            {analysisResult.startDayOffset && analysisResult.startDayOffset > 0 ? (
                                <div className="text-xs text-orange-400 mt-1 font-medium">
                                    Dont {analysisResult.startDayOffset} déjà effectués (inclus)
                                </div>
                            ) : null}
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

                    {/* Sequences Breakdown - NEW VERIFICATION TABLE */}
                    {analysisResult.extractedSequences && analysisResult.extractedSequences.length > 0 && (
                        <div className="mx-6 mb-6">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Détail Séquences par Jour
                            </h4>
                            <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden max-h-96 overflow-y-auto">
                                <table className="w-full text-left text-sm text-slate-300">
                                    <thead className="bg-slate-900 text-xs uppercase text-slate-500 font-bold sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 w-32">Date</th>
                                            <th className="px-4 py-2">Séquences Identifiées</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {Array.from(new Set(analysisResult.extractedSequences.map(s => s.date))).sort().map(dateStr => {
                                            const daySeqs = analysisResult.extractedSequences?.filter(s => s.date === dateStr) || [];
                                            const displayDate = new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });

                                            // Optional: Find extra rich data for this day from pdtDays if available
                                            const dayInfo = analysisResult.pdtDays?.find((d: any) => d.date === dateStr);

                                            // Sort numerical/alphanumerical
                                            const sortedSeqs = daySeqs.sort((a, b) => {
                                                const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
                                                const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
                                                return numA - numB;
                                            });

                                            return (
                                                <tr key={dateStr} className="hover:bg-slate-700/50">
                                                    <td className="px-4 py-2 font-mono text-emerald-400 whitespace-nowrap">
                                                        {displayDate}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <div className="flex flex-wrap gap-1">
                                                            {sortedSeqs.map(seq => (
                                                                <span key={seq.id} className="px-1.5 py-0.5 bg-slate-700 rounded text-xs text-white border border-slate-600">
                                                                    {seq.id}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        {dayInfo && dayInfo.set && (
                                                            <div className="text-xs text-slate-500 mt-1 italic">
                                                                Sets: {dayInfo.set}
                                                            </div>
                                                        )}
                                                        {dayInfo && dayInfo.cast && dayInfo.cast.length > 0 && (
                                                            <div className="text-xs text-slate-500 mt-0.5">
                                                                Cast: {dayInfo.cast.join(', ')}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* CONFIRM ACTIONS */}
                    <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end gap-3 rounded-b-xl">
                        <button
                            onClick={() => setAnalysisResult(null)}
                            className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleValidate}
                            disabled={isUploading}
                            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Sauvegarde...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    Valider et Importer
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
