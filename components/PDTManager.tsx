
import React, { useState, useCallback, useMemo } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2, Calendar, Eye, Download, Check, X, Edit2 } from 'lucide-react';
import { Project, PDTAnalysisResult, User, PDTSequence, PDTDay } from '../types';
import { useProject } from '../context/ProjectContext';
import { useNotification } from '../context/NotificationContext';
import { useLogistics } from '../context/LogisticsContext';
import { useToast } from '../hooks/useToast';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { parsePDT } from '../services/pdtService';
import { generatePDTTemplate, parsePDTMatrix } from '../services/matrixService';
import * as XLSX from 'xlsx';

export const PDTManager: React.FC = () => {
    const { project, updateProjectDetails, addReinforcement } = useProject();
    const { logistics, addLogisticsRequest } = useLogistics();
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
    const [editingDay, setEditingDay] = useState<string | null>(null);
    const [editingDayValue, setEditingDayValue] = useState<string>('');

    // Explicit Dates State
    const [manualDates, setManualDates] = useState<string[]>([]);

    const [isAddingDate, setIsAddingDate] = useState(false);
    const [newDateValue, setNewDateValue] = useState('');

    const [editingDateObj, setEditingDateObj] = useState<string | null>(null);
    const [editingDateNewValue, setEditingDateNewValue] = useState<string>('');

    const [editingSetObj, setEditingSetObj] = useState<string | null>(null);
    const [editingSetNewValue, setEditingSetNewValue] = useState<string>('');

    const [editingDetailsObj, setEditingDetailsObj] = useState<string | null>(null);
    const [detailsForm, setDetailsForm] = useState<Partial<PDTDay>>({});

    // Compute logistics changes preview: one line per sequence (not per item type)
    const logisticsChangesPreview = useMemo(() => {
        if (!analysisResult || !logistics || logistics.length === 0) return [];

        // Deduplicate: one line per sequence showing the sequence date change
        const seenSequences = new Set<string>();
        const changes: { seqId: string; oldSeqDate: string; newSeqDate: string }[] = [];

        for (const req of logistics) {
            // Only consider sequence-linked items, skip duplicates
            if (!req.linkedSequenceId || !req.autoUpdateDates || !analysisResult.extractedSequences) continue;
            if (seenSequences.has(req.linkedSequenceId)) continue;

            const relatedSeq = analysisResult.extractedSequences.find((s: any) => s.id === req.linkedSequenceId);
            if (!relatedSeq) continue;

            // Find the current sequence date from existing PDT data
            const oldSeq = project.pdtSequences?.find((s: any) => s.id === req.linkedSequenceId);
            const oldSeqDate = oldSeq?.date || req.date;
            const newSeqDate = relatedSeq.date;

            if (oldSeqDate !== newSeqDate) {
                seenSequences.add(req.linkedSequenceId);
                changes.push({ seqId: req.linkedSequenceId, oldSeqDate, newSeqDate });
            }
        }

        return changes;
    }, [analysisResult, logistics, project.pdtSequences]);

    const saveDaySequences = (dateStr: string) => {
        if (!analysisResult || !analysisResult.extractedSequences) return;

        const newIds = editingDayValue.split(',').map(s => s.trim()).filter(s => s.length > 0);
        const newSeqs = newIds.map(id => ({ id, date: dateStr }));

        const otherSeqs = analysisResult.extractedSequences.filter(s => s.date !== dateStr);

        setAnalysisResult({
            ...analysisResult,
            extractedSequences: [...otherSeqs, ...newSeqs]
        });

        setEditingDay(null);
        setEditingDayValue('');

        // Ensure date is retained in manualDates so it doesn't disappear if empty
        if (!manualDates.includes(dateStr)) {
            setManualDates([...manualDates, dateStr]);
        }
    };

    const handleAddDate = () => {
        if (!newDateValue) return;
        if (!manualDates.includes(newDateValue)) {
            setManualDates([...manualDates, newDateValue]);
        }
        setIsAddingDate(false);
        setNewDateValue('');
    };

    const saveDateChange = (oldDate: string) => {
        if (!editingDateNewValue || editingDateNewValue === oldDate) {
            setEditingDateObj(null);
            return;
        }

        if (analysisResult?.extractedSequences) {
            setAnalysisResult({
                ...analysisResult,
                extractedSequences: analysisResult.extractedSequences.map(s =>
                    s.date === oldDate ? { ...s, date: editingDateNewValue } : s
                )
            });
        }

        setManualDates(prev => {
            const next = prev.filter(d => d !== oldDate);
            if (!next.includes(editingDateNewValue)) next.push(editingDateNewValue);
            return next;
        });

        setEditingDateObj(null);
    };

    const saveSetChange = (dateStr: string) => {
        if (!analysisResult) return;

        const currentDays = analysisResult.pdtDays || [];
        const existingDayIndex = currentDays.findIndex((d: any) => d.date === dateStr);

        let newDays = [...currentDays];
        if (existingDayIndex >= 0) {
            newDays[existingDayIndex] = { ...newDays[existingDayIndex], set: editingSetNewValue };
        } else {
            // Create a new day entry just for the set if it doesn't exist
            newDays.push({ date: dateStr, set: editingSetNewValue, type: 'SHOOT' });
        }

        setAnalysisResult({
            ...analysisResult,
            pdtDays: newDays
        });

        setEditingSetObj(null);
    };

    const openDetailsEditor = (dateStr: string, dayInfo: any) => {
        setEditingDetailsObj(dateStr);
        setDetailsForm(dayInfo ? { ...dayInfo } : { date: dateStr, type: 'SHOOT' });
    };

    const saveDetailsForm = () => {
        if (!editingDetailsObj || !analysisResult) return;
        const currentDays = analysisResult.pdtDays || [];
        const index = currentDays.findIndex((d: any) => d.date === editingDetailsObj);
        let newDays = [...currentDays];

        // cast string to array if typed specifically
        const processedForm = { ...detailsForm };
        if (typeof processedForm.cast === 'string') {
            processedForm.cast = (processedForm.cast as string).split(',').map(s => s.trim()).filter(Boolean);
        }

        if (index >= 0) {
            newDays[index] = { ...newDays[index], ...processedForm };
        } else {
            newDays.push({ date: editingDetailsObj, type: 'SHOOT', ...processedForm } as PDTDay);
        }

        setAnalysisResult({ ...analysisResult, pdtDays: newDays });
        setEditingDetailsObj(null);
    };

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
        if (!analysisResult) return;

        setIsUploading(true);
        try {
            const updates: any = {};

            if (file) {
                // 1. Upload File
                const storage = getStorage();
                const storageRef = ref(storage, `projects/${project.id}/pdt/${file.name}`);

                // Upload
                await uploadBytes(storageRef, file);
                const downloadUrl = await getDownloadURL(storageRef);

                updates.pdtUrl = downloadUrl;
                updates.pdtName = file.name;
            }

            // 2. Prepare Updates
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
            if (logistics && logistics.length > 0) {
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
                for (const req of logistics) {
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
                                // Also store the actual sequence date for the explanatory phrase
                                updatedReq = { ...updatedReq, pendingDate: newDateStr, pendingSequenceDate: relatedSeq.date };
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

    const handleLoadCurrentPDT = () => {
        if (!project.pdtDays || project.pdtDays.length === 0) {
            toast.error("Aucun jour de PDT enregistré en base.");
            return;
        }

        setIsAnalyzing(true);

        try {
            const shootDays = project.pdtDays.filter(d => d.type === 'SHOOT').length;
            const dates = project.pdtDays.filter(d => d.type === 'SHOOT').map(d => d.date).sort();

            const result: PDTAnalysisResult = {
                dates: shootDays,
                sequences: project.pdtSequences?.length || 0,
                period: dates.length > 0 ? `${dates[0]} - ${dates[dates.length - 1]}` : "N/A",
                text: "Édition du PDT Actuel",
                startDayInfo: "Chargé depuis la base de données",
                startDayOffset: 0,
                extractedSequences: project.pdtSequences || [],
                pdtDays: JSON.parse(JSON.stringify(project.pdtDays)) // Deep copy
            };

            setAnalysisResult(result);

            // Initialize Editable State
            setEditDates(shootDays);
            setEditSequences(project.pdtSequences?.length || 0);
            if (dates.length > 0) {
                setEditStartDate(dates[0]);
                setEditEndDate(dates[dates.length - 1]);
            }
            // Clear any selected file to indicate we are editing the DB version
            setFile(null);

            toast.success("PDT actuel chargé pour édition !");
        } catch (e) {
            console.error(e);
            toast.error("Erreur lors du chargement");
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
                                onClick={handleLoadCurrentPDT}
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-blue-500/20"
                                title="Modifier le PDT actuel sans tout réimporter"
                            >
                                <Edit2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Éditer PDT</span>
                            </button>
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
                                        {Array.from(new Set([
                                            ...(analysisResult.extractedSequences?.map(s => s.date) || []),
                                            ...manualDates
                                        ])).sort().map(dateStr => {
                                            const daySeqs = analysisResult.extractedSequences?.filter(s => s.date === dateStr) || [];
                                            const displayDate = new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });

                                            // Optional: Find extra rich data for this day from pdtDays if available
                                            const dayInfo = analysisResult.pdtDays?.find((d: any) => d.date === dateStr);

                                            // Keep original order so manual edits are preserved
                                            const sortedSeqs = daySeqs;

                                            return (
                                                <React.Fragment key={dateStr}>
                                                    <tr className="hover:bg-slate-700/50">
                                                        <td className="px-4 py-2 font-mono text-emerald-400 whitespace-nowrap group">
                                                            {editingDateObj === dateStr ? (
                                                                <div className="flex items-center gap-1">
                                                                    <input
                                                                        type="date"
                                                                        value={editingDateNewValue}
                                                                        onChange={(e) => setEditingDateNewValue(e.target.value)}
                                                                        className="bg-slate-900 border border-emerald-500/50 text-white text-xs rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                                        autoFocus
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') saveDateChange(dateStr);
                                                                            if (e.key === 'Escape') setEditingDateObj(null);
                                                                        }}
                                                                    />
                                                                    <button onClick={() => saveDateChange(dateStr)} className="text-emerald-500 hover:text-emerald-400"><Check className="w-3 h-3" /></button>
                                                                    <button onClick={() => setEditingDateObj(null)} className="text-slate-400 hover:text-slate-300"><X className="w-3 h-3" /></button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2">
                                                                    <span>{displayDate}</span>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingDateObj(dateStr);
                                                                            setEditingDateNewValue(dateStr);
                                                                        }}
                                                                        className="opacity-0 md:opacity-100 lg:opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-emerald-400 transition-opacity"
                                                                        title="Modifier la date"
                                                                    >
                                                                        <Edit2 className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            {editingDay === dateStr ? (
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={editingDayValue}
                                                                        onChange={(e) => setEditingDayValue(e.target.value)}
                                                                        className="bg-slate-900 border border-emerald-500/50 text-white text-sm rounded px-3 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                                        placeholder="ex: 1, 7, 29"
                                                                        autoFocus
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') saveDaySequences(dateStr);
                                                                            if (e.key === 'Escape') {
                                                                                setEditingDay(null);
                                                                                setEditingDayValue('');
                                                                            }
                                                                        }}
                                                                    />
                                                                    <button
                                                                        onClick={() => saveDaySequences(dateStr)}
                                                                        className="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded transition-colors"
                                                                        title="Sauvegarder"
                                                                    >
                                                                        <Check className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingDay(null);
                                                                            setEditingDayValue('');
                                                                        }}
                                                                        className="p-1.5 bg-slate-700/50 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                                                                        title="Annuler"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col gap-1 items-start">
                                                                    <div className="flex flex-wrap gap-1 items-center group">
                                                                        {sortedSeqs.length > 0 ? sortedSeqs.map(seq => (
                                                                            <span key={seq.id} className="px-1.5 py-0.5 bg-slate-700 rounded text-xs text-white border border-slate-600 shadow-sm">
                                                                                {seq.id}
                                                                            </span>
                                                                        )) : (
                                                                            <span className="text-xs text-slate-500 italic">Aucune séquence</span>
                                                                        )}
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingDay(dateStr);
                                                                                setEditingDayValue(sortedSeqs.map(s => s.id).join(', '));
                                                                            }}
                                                                            className="ml-2 p-1 text-slate-500 hover:text-emerald-400 opacity-0 md:opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            title="Modifier les séquences"
                                                                        >
                                                                            <Edit2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                    {dayInfo && dayInfo.set ? (
                                                                        <div className="text-xs text-slate-500 mt-1 font-medium group/set flex items-center gap-2">
                                                                            <span className="truncate max-w-[200px] md:max-w-xs">{dayInfo.set}</span>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setEditingSetObj(dateStr);
                                                                                    setEditingSetNewValue(dayInfo.set || '');
                                                                                }}
                                                                                className="opacity-0 md:opacity-100 lg:opacity-0 group-hover/set:opacity-100 p-0.5 text-slate-500 hover:text-emerald-400 transition-opacity"
                                                                                title="Modifier le décor"
                                                                            >
                                                                                <Edit2 className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingSetObj(dateStr);
                                                                                setEditingSetNewValue('');
                                                                            }}
                                                                            className="text-[10px] mt-1 text-slate-500 hover:text-emerald-400 border border-dashed border-slate-700/50 hover:border-emerald-500/30 rounded px-1.5 py-0.5 flex items-center gap-1 transition-colors w-fit"
                                                                        >
                                                                            + Ajouter un décor
                                                                        </button>
                                                                    )}

                                                                    {/* Full details display */}
                                                                    {dayInfo && (dayInfo.cast?.length > 0 || dayInfo.silhouettes || dayInfo.extras || dayInfo.schedule || dayInfo.stunts || dayInfo.extraCrew || dayInfo.hasDrone || dayInfo.notes) && (
                                                                        <div className="text-[10px] text-slate-400 mt-2 p-2 bg-slate-900/50 rounded flex flex-col gap-1 w-fit max-w-sm border border-slate-700/50">
                                                                            {dayInfo.schedule && <div><span className="font-bold text-slate-500">Horaire:</span> {dayInfo.schedule}</div>}
                                                                            {dayInfo.cast && dayInfo.cast.length > 0 && <div><span className="font-bold text-slate-500">Comédiens:</span> {dayInfo.cast.join(', ')}</div>}
                                                                            {dayInfo.silhouettes && <div><span className="font-bold text-slate-500">Silhouettes:</span> {dayInfo.silhouettes}</div>}
                                                                            {dayInfo.extras && <div><span className="font-bold text-slate-500">Figurants:</span> {dayInfo.extras}</div>}
                                                                            {dayInfo.stunts && <div><span className="font-bold text-slate-500">Cascadeurs:</span> {dayInfo.stunts}</div>}
                                                                            {dayInfo.extraCrew && <div><span className="font-bold text-slate-500">Extra Équipe:</span> {dayInfo.extraCrew}</div>}
                                                                            {dayInfo.hasDrone && <div className="text-amber-400 font-bold flex items-center gap-1"><span className="text-xs">🛸</span> Drone prévu</div>}
                                                                            {dayInfo.notes && <div><span className="font-bold text-slate-500">Note:</span> {dayInfo.notes}</div>}
                                                                        </div>
                                                                    )}
                                                                    <button
                                                                        onClick={() => openDetailsEditor(dateStr, dayInfo)}
                                                                        className="text-[10px] mt-1 text-slate-500 hover:text-blue-400 border border-dashed border-slate-700/50 hover:border-blue-500/30 rounded px-1.5 py-0.5 flex items-center gap-1 transition-colors w-fit"
                                                                    >
                                                                        + Modifier infos jour (Horaire, Cast, Figuration...)
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {/* EDITING SET UI */}
                                                            {editingSetObj === dateStr && (
                                                                <div className="flex items-center gap-1 mt-1.5 w-full max-w-sm">
                                                                    <input
                                                                        type="text"
                                                                        value={editingSetNewValue}
                                                                        onChange={(e) => setEditingSetNewValue(e.target.value)}
                                                                        className="bg-slate-900 border border-emerald-500/50 text-white text-xs rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                                        placeholder="Nom du décor..."
                                                                        autoFocus
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') saveSetChange(dateStr);
                                                                            if (e.key === 'Escape') setEditingSetObj(null);
                                                                        }}
                                                                    />
                                                                    <button onClick={() => saveSetChange(dateStr)} className="text-emerald-500 hover:text-emerald-400 p-1"><Check className="w-3.5 h-3.5" /></button>
                                                                    <button onClick={() => setEditingSetObj(null)} className="text-slate-400 hover:text-slate-300 p-1"><X className="w-3.5 h-3.5" /></button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>

                                                    {editingDetailsObj === dateStr && (
                                                        <tr>
                                                            <td colSpan={2} className="px-4 py-3 bg-slate-800/80 border-t border-slate-700">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                                    <div>
                                                                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Horaire Prévu</label>
                                                                        <input type="text" value={detailsForm.schedule || ''} onChange={e => setDetailsForm({ ...detailsForm, schedule: e.target.value })} className="bg-slate-900 border border-slate-700 text-white text-xs rounded px-2 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="ex: 08:00 - 18:00" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Comédiens (séparés par des virgules)</label>
                                                                        <input type="text" value={Array.isArray(detailsForm.cast) ? detailsForm.cast.join(', ') : (detailsForm.cast || '')} onChange={e => setDetailsForm({ ...detailsForm, cast: e.target.value as any })} className="bg-slate-900 border border-slate-700 text-white text-xs rounded px-2 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="ex: Omar Sy, François Cluzet" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Nb Silhouettes</label>
                                                                        <input type="text" value={detailsForm.silhouettes || ''} onChange={e => setDetailsForm({ ...detailsForm, silhouettes: e.target.value })} className="bg-slate-900 border border-slate-700 text-white text-xs rounded px-2 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="ex: 5" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Nb Figurants</label>
                                                                        <input type="text" value={detailsForm.extras || ''} onChange={e => setDetailsForm({ ...detailsForm, extras: e.target.value })} className="bg-slate-900 border border-slate-700 text-white text-xs rounded px-2 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="ex: 20 passants" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Nb Cascadeurs</label>
                                                                        <input type="text" value={detailsForm.stunts || ''} onChange={e => setDetailsForm({ ...detailsForm, stunts: e.target.value })} className="bg-slate-900 border border-slate-700 text-white text-xs rounded px-2 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="ex: 3" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Nb Extra Équipe</label>
                                                                        <input type="text" value={detailsForm.extraCrew || ''} onChange={e => setDetailsForm({ ...detailsForm, extraCrew: e.target.value })} className="bg-slate-900 border border-slate-700 text-white text-xs rounded px-2 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="ex: 2 (SFX, chauf...)" />
                                                                    </div>
                                                                    <div className="col-span-1 md:col-span-2">
                                                                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Note / Infos Utiles</label>
                                                                        <input type="text" value={detailsForm.notes || ''} onChange={e => setDetailsForm({ ...detailsForm, notes: e.target.value })} className="bg-slate-900 border border-slate-700 text-white text-xs rounded px-2 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="ex: Nuit américaine, etc." />
                                                                    </div>
                                                                    <div className="col-span-1 md:col-span-2 flex items-center justify-between mt-2 pt-2 border-t border-slate-700">
                                                                        <label className="flex items-center gap-2 text-xs text-white cursor-pointer hover:text-emerald-400 group">
                                                                            <input type="checkbox" checked={!!detailsForm.hasDrone} onChange={e => setDetailsForm({ ...detailsForm, hasDrone: e.target.checked })} className="form-checkbox bg-slate-900 border-slate-600 text-emerald-500 rounded focus:ring-1 focus:ring-emerald-500 w-4 h-4 cursor-pointer" />
                                                                            <span className="font-bold flex items-center gap-1 group-hover:text-emerald-400 transition-colors"><span>🛸</span> Drone prévu ce jour ?</span>
                                                                        </label>
                                                                        <div className="flex gap-2">
                                                                            <button onClick={() => setEditingDetailsObj(null)} className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors">Annuler</button>
                                                                            <button onClick={saveDetailsForm} className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-400 rounded transition-colors flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Sauvegarder</button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Add missed Day UI */}
                            <div className="p-3 border-t border-slate-700 bg-slate-900/30 flex justify-center">
                                {isAddingDate ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="date"
                                            value={newDateValue}
                                            onChange={(e) => setNewDateValue(e.target.value)}
                                            className="bg-slate-900 border border-emerald-500/50 text-white text-sm rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleAddDate();
                                                if (e.key === 'Escape') setIsAddingDate(false);
                                            }}
                                        />
                                        <button
                                            onClick={handleAddDate}
                                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded text-sm font-bold transition-colors"
                                        >
                                            Ajouter
                                        </button>
                                        <button
                                            onClick={() => setIsAddingDate(false)}
                                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-bold transition-colors"
                                        >
                                            Annuler
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setIsAddingDate(true)}
                                        className="text-sm text-emerald-500 hover:text-emerald-400 font-bold flex items-center gap-2 transition-colors py-1 px-4 border border-dashed border-emerald-500/30 rounded-lg hover:bg-emerald-500/10"
                                    >
                                        + Ajouter un jour manquant
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* LOGISTICS CHANGES PREVIEW */}
                    {logisticsChangesPreview.length > 0 && (
                        <div className="p-4 border-t border-amber-500/20 bg-amber-900/10">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                <h4 className="text-sm font-bold text-amber-400">Changements logistiques détectés ({logisticsChangesPreview.length})</h4>
                            </div>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {logisticsChangesPreview.map((change, idx) => (
                                    <div key={idx} className="text-xs text-slate-300 bg-cinema-900/80 rounded-lg px-3 py-2 border border-amber-500/10">
                                        Séquence ({change.seqId}) anciennement <span className="text-red-400">({new Date(change.oldSeqDate).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })})</span> déplacée <span className="text-green-400 font-bold">({new Date(change.newSeqDate).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })})</span>
                                    </div>
                                ))}
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
