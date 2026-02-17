import React, { useState, useRef } from 'react';
import { useProject } from '@/context/ProjectContext';
import { Department, CallSheet } from '../types';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { analyzeCallSheetPDF } from '@/services/aiService'; // Static Import
import { FileText, Upload, Calendar, Download, Eye, Trash2, AlertTriangle, ChevronRight, ChevronDown, Folder, Edit2, Check, X, LayoutGrid } from 'lucide-react';
import { CallSheetBuilder } from './CallSheetBuilder';
import { CallSheetCalendar } from './CallSheetCalendar';
import { format, getISOWeek, startOfISOWeek, endOfISOWeek, parseISO, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

export const CallSheetView: React.FC = () => {
    const { user, currentDept, callSheets, addCallSheet, deleteCallSheet, t, project, updateProjectDetails } = useProject();
    const [isUploading, setIsUploading] = useState(false);
    const [mode, setMode] = useState<'UPLOAD' | 'BUILDER'>('UPLOAD');
    const [viewLayout, setViewLayout] = useState<'FOLDERS' | 'CALENDAR'>('FOLDERS');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- UPLOAD STATE ---
    const [uploadDate, setUploadDate] = useState(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [uploadName, setUploadName] = useState('');
    const [callTime, setCallTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [location1, setLocation1] = useState('');
    const [location2, setLocation2] = useState('');
    const [cateringLocation, setCateringLocation] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [editingSheet, setEditingSheet] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [uploadWarning, setUploadWarning] = useState<string | null>(null);

    // New UX States
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiData, setAiData] = useState<Partial<CallSheet>>({});
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string, url: string } | null>(null);

    // Folder State
    const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
    const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

    // Week Renaming State
    const [editingWeek, setEditingWeek] = useState<string | null>(null);
    const [tempWeekName, setTempWeekName] = useState('');

    // Initialize Current Week as Expanded
    React.useEffect(() => {
        const currentWeek = `W${getISOWeek(new Date())}-${new Date().getFullYear()}`;
        setExpandedWeeks(prev => new Set(prev).add(currentWeek));
    }, []);

    const toggleWeek = (weekKey: string) => {
        const newSet = new Set(expandedWeeks);
        if (newSet.has(weekKey)) newSet.delete(weekKey);
        else newSet.add(weekKey);
        setExpandedWeeks(newSet);
    };

    const toggleDay = (dayKey: string) => {
        const newSet = new Set(expandedDays);
        if (newSet.has(dayKey)) newSet.delete(dayKey);
        else newSet.add(dayKey);
        setExpandedDays(newSet);
    };

    const handleStartEditWeek = (weekKey: string, currentLabel: string) => {
        setEditingWeek(weekKey);
        setTempWeekName(project?.weekMapping?.[weekKey] || currentLabel);
    };

    const handleSaveWeekName = async (weekKey: string) => {
        if (!project) return;
        try {
            await updateProjectDetails({
                weekMapping: {
                    ...project.weekMapping,
                    [weekKey]: tempWeekName
                }
            });
            setEditingWeek(null);
        } catch (error) {
            console.error("Failed to save week name", error);
        }
    };

    const canUpload = user?.department === 'PRODUCTION' || user?.department === Department.MISE_EN_SCENE;
    const canEditStructure = canUpload; // Same permissions for structural edits

    // --- HANDLERS ---

    const handleDigitalSave = async (data: any) => {
        try {
            await addCallSheet({
                id: editingSheet ? editingSheet.id : '', // Use existing ID if editing
                department: user?.department as any || 'PRODUCTION',
                uploadedBy: user?.name || 'Inconnu',
                uploadDate: new Date().toISOString(),
                url: '', // Digital => Empty URL
                ...data
            });
            setMode('UPLOAD');
            setEditingSheet(null);
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la sauvegarde.");
        }
    };

    const handleEdit = (sheet: any) => {
        setEditingSheet(sheet);
        setMode('BUILDER');
    };

    const handleCancel = () => {
        setMode('UPLOAD');
        setEditingSheet(null);
    };

    // ... (File handlers
    const handleMoveSheet = async (sheetId: string, newDate: string) => {
        if (!project || !sheetId) return;

        try {
            const sheetRef = doc(db, 'projects', project.id, 'callSheets', sheetId);
            await updateDoc(sheetRef, {
                date: newDate
            });
        } catch (error) {
            console.error("Error moving sheet:", error);
            alert("Erreur lors du déplacement de la feuille.");
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type !== 'application/pdf') {
                setError('Seuls les fichiers PDF sont acceptés.');
                return;
            }
            if (selectedFile.size > 10 * 1024 * 1024) {
                setError('Le fichier est trop volumineux (max 10Mo).');
                return;
            }
            setFile(selectedFile);
            setError(null);

            // Auto-fill name if empty
            if (!uploadName) {
                const cleanName = selectedFile.name.replace('.pdf', '').replace(/[-_]/g, ' ');
                setUploadName(cleanName);
            }

            // AUTO-ANALYSIS
            setIsAnalyzing(true);
            setUploadWarning(null);
            setAiData({}); // Reset previous AI data

            try {
                const extractedData = await analyzeCallSheetPDF(selectedFile);
                console.log("AI Auto-Analysis:", extractedData);
                setAiData(extractedData);

                // Auto-fill form fields
                if (extractedData.callTime) setCallTime(extractedData.callTime);
                if (extractedData.endTime) setEndTime(extractedData.endTime);
                if (extractedData.location1) setLocation1(extractedData.location1);

                // Warning Check
                if (!extractedData || Object.keys(extractedData).length === 0) {
                    setUploadWarning("L'analyse IA a échoué ou n'a rien trouvé. Vous pouvez remplir manuellement.");
                } else if (!extractedData.callTime || !extractedData.location1) {
                    setUploadWarning("Certaines données (P.A.T, Lieu) n'ont pas été trouvées. Veuillez compléter manuellement.");
                }

            } catch (err: any) {
                console.warn("Analysis Error", err);
                const errorMsg = err?.message || String(err);
                if (errorMsg.includes("API key")) {
                    setUploadWarning("Clé API manquante. L'analyse automatique est désactivée.");
                } else if (errorMsg.includes("404") || errorMsg.includes("not found")) {
                    setUploadWarning("Modèle IA non trouvé (404). Contactez le support.");
                } else if (errorMsg.includes("overloaded") || errorMsg.includes("503")) {
                    setUploadWarning("Service IA surchargé. Réessayez dans un instant.");
                } else if (errorMsg.includes("No JSON")) {
                    setUploadWarning("L'IA n'a pas pu lire le document correctement.");
                } else {
                    setUploadWarning(`Erreur d'analyse : ${errorMsg}`);
                }
            } finally {
                setIsAnalyzing(false);
            }
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !uploadName || !uploadDate) return;

        setIsUploading(true);
        setError(null);

        try {
            const { storage } = await import('../services/firebase');

            // Note: AI Analysis is already done in handleFileChange and stored in aiData state

            const storageRef = ref(storage, `callsheets/${Date.now()}_${file.name}`);
            const metadata = { customMetadata: { uploadedBy: user?.name || 'Unknown', department: user?.department || 'Unknown' } };

            const uploadTask = uploadBytes(storageRef, file, metadata);
            await uploadTask;
            const downloadUrl = await getDownloadURL(storageRef);

            await addCallSheet({
                id: '',
                uploadDate: new Date().toISOString(),
                name: uploadName,
                url: downloadUrl,
                uploadedBy: user?.name || 'Inconnu',
                department: user?.department as any,

                ...aiData, // Merge AI data first

                // Overwrite with Manual Inputs (State wins)
                date: uploadDate, // MOVED HERE: Ensures manual date overrides AI date
                callTime: callTime || null,
                endTime: endTime || null,
                location1: location1 || null,
                location2: location2 || null,
                cateringLocation: cateringLocation || null,

                // Specific overwrites if needed for nested fields would go here, 
                // but top-level fields are safely handled above.
            });

            // Reset
            setFile(null);
            setUploadName('');
            setCallTime('');
            setEndTime('');
            setLocation1('');
            setLocation2('');
            setCateringLocation('');
            setLocation2('');
            setCateringLocation('');
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err: any) {
            console.error(err);
            const errorMessage = err?.message || "Erreur inconnue";
            setError(`Erreur lors de l'upload: ${errorMessage}`);
            setIsUploading(false);
        }
    };

    const handleDeleteClick = (id: string, url?: string) => {
        setDeleteTarget({ id, url: url || '' });
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteCallSheet(deleteTarget.id, deleteTarget.url);
            setShowDeleteModal(false);
            setDeleteTarget(null);
        } catch (e) {
            console.error(e);
            alert("Erreur lors de la suppression");
        }
    };

    const handleCalendarUpload = async (file: File, targetDate: string) => {
        // Reuse handleUpload logic but with forced date
        if (!file || !project) return;

        // 1. Set uploading state (local or global? global 'isUploading' might block UI, but that's ok)
        // Actually, let's keep it silent or use toast?
        // Or reuse component state? The calendar has its own spinner UI.
        // We just need to perform the logic.

        try {
            const storage = getStorage(); // Get storage instance
            // Generate Storage Path
            const storageRef = ref(storage, `projects/${project.id}/callSheets/${Date.now()}_${file.name}`);

            // Upload
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            // AI Analysis (Optional/Silent?)
            // User wants quick drag drop. Maybe skip AI or do it silently?
            // Let's do a quick Analyze to at least get the name if possible, or default to filename.
            let aiData = {};
            try {
                // If we want AI we need to read file as base64 first for Gemini helper if it needs it,
                // but our service takes URL usually?
                // analyzeCallSheetPDF takes a Blob.
                const analysis = await analyzeCallSheetPDF(file);
                aiData = analysis || {};
            } catch (e) {
                console.warn("AI Analysis failed for calendar drop", e);
            }

            // Create Sheet Object
            const newSheet: CallSheet = {
                id: Date.now().toString(), // Temp ID, real one from firestore? addCallSheet generates ID usually? No, addCallSheet in context usually uses addDoc.
                date: targetDate, // FORCED DATE
                uploadDate: new Date().toISOString(),
                name: (aiData as any).date ? `FDS J${(aiData as any).seqCount || '?'}` : file.name.replace('.pdf', ''),
                // Better naming strategy: "FDS - [Date]"
                // Or keep simple:
                // name: file.name,
                url: downloadURL,
                uploadedBy: user?.name || 'Inconnu',
                department: 'PRODUCTION', // Default
                ...aiData // Spread AI results (callTime, etc)
            };

            // If AI didn't give a good name, use standard format
            if (!newSheet.name || newSheet.name === file.name.replace('.pdf', '')) {
                newSheet.name = `Feuille de Service du ${new Date(targetDate).toLocaleDateString('fr-FR')}`;
            }

            await addCallSheet(newSheet);

        } catch (error) {
            console.error("Calendar Upload Error", error);
            throw error; // Let Calendar component handle UI feedback
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white">Feuilles de Service</h2>
                    <p className="text-slate-400">Consultez et téléchargez les FDS quotidiennes.</p>
                </div>
            </header>

            {canUpload && (
                <div className="bg-cinema-800/50 p-1 rounded-xl flex gap-1 w-full max-w-md mx-auto border border-cinema-700">
                    <button
                        onClick={() => { setMode('UPLOAD'); setEditingSheet(null); }}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'UPLOAD' ? 'bg-cinema-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Importer PDF
                    </button>
                    <button
                        onClick={() => { setMode('BUILDER'); setEditingSheet(null); }}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'BUILDER' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        {editingSheet ? 'Mode Édition' : 'Créer Digitale'}
                    </button>
                </div>
            )}

            {/* View Layout Toggle */}
            {mode !== 'BUILDER' && (
                <div className="bg-cinema-800/50 p-1 rounded-xl flex gap-1 w-full max-w-md mx-auto border border-cinema-700">
                    <button
                        onClick={() => setViewLayout('FOLDERS')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${viewLayout === 'FOLDERS' ? 'bg-cinema-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Folder className="w-4 h-4" /> Vue Dossiers
                    </button>
                    <button
                        onClick={() => setViewLayout('CALENDAR')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${viewLayout === 'CALENDAR' ? 'bg-cinema-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Calendar className="w-4 h-4" /> Vue Calendrier
                    </button>
                </div>
            )}

            {/* CALENDAR VIEW */}
            {mode !== 'BUILDER' && viewLayout === 'CALENDAR' && (
                <CallSheetCalendar
                    callSheets={callSheets || []}
                    onUpload={handleCalendarUpload}
                    onViewSheet={(sheet) => {
                        window.open(sheet.url, '_blank');
                    }}
                    onMoveSheet={handleMoveSheet}
                    shootingStartDate={project.shootingStartDate}
                />
            )}

            {/* BUILDER MODE */}
            {canUpload && mode === 'BUILDER' && (
                <CallSheetBuilder
                    onSave={handleDigitalSave}
                    onCancel={handleCancel}
                    initialData={editingSheet}
                />
            )}

            {/* UPLOAD MODE - Only show in FOLDERS view (Calendar has its own drop zones) */}
            {canUpload && mode === 'UPLOAD' && viewLayout !== 'CALENDAR' && (
                <form onSubmit={handleUpload} className="bg-cinema-800 p-6 rounded-2xl border border-cinema-700 space-y-6 max-w-2xl mx-auto">
                    <div className="flex flex-col gap-6">
                        {/* File Drop - Compact Version */}
                        <div className={`border-2 border-dashed border-cinema-600 rounded-xl flex flex-col items-center justify-center gap-4 hover:border-eco-500/50 hover:bg-cinema-700/30 transition-all group relative ${file ? 'p-4' : 'p-12'}`}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {file ? (
                                <div className="flex items-center gap-4 w-full px-4">
                                    <div className="p-3 bg-eco-500/20 rounded-lg">
                                        <FileText className="h-6 w-6 text-eco-400" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-white font-bold truncate">{file.name}</p>
                                        <p className="text-xs text-eco-400">
                                            {isAnalyzing ? "✨ Analyse en cours..." : "Fichier prêt"}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setFile(null);
                                            setAiData({});
                                            setUploadWarning(null);
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                        }}
                                        className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg z-10 relative"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="p-4 bg-cinema-700 rounded-full group-hover:scale-110 transition-transform">
                                        <Upload className="h-8 w-8 text-eco-400" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-white font-medium">Glissez votre PDF ici</p>
                                        <p className="text-sm text-slate-500 mt-1">ou cliquez pour parcourir</p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Metadata - Only Visible when File Selected */}
                        {file && (
                            <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                                <div className="p-4 bg-cinema-900/50 rounded-lg border border-cinema-700 mb-4">
                                    <h4 className="text-sm font-bold text-eco-400 mb-3 flex items-center gap-2">
                                        <Eye className="w-4 h-4" /> Vérifiez les informations extraites
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1">Date du document</label>
                                            <input
                                                type="date"
                                                value={uploadDate}
                                                onChange={(e) => setUploadDate(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg bg-cinema-800 border border-cinema-700 text-white focus:outline-none focus:ring-2 focus:ring-eco-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1">Nom du fichier</label>
                                            <input
                                                type="text"
                                                value={uploadName}
                                                onChange={(e) => setUploadName(e.target.value)}
                                                placeholder="ex: FDS J12 - Lundi 24 Oct"
                                                className="w-full px-3 py-2 rounded-lg bg-cinema-800 border border-cinema-700 text-white focus:outline-none focus:ring-2 focus:ring-eco-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1">P.A.T</label>
                                            <input type="time" value={callTime} onChange={e => setCallTime(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-cinema-800 border border-cinema-700 text-white focus:outline-none focus:ring-2 focus:ring-eco-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1">Fin Est.</label>
                                            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-cinema-800 border border-cinema-700 text-white focus:outline-none focus:ring-2 focus:ring-eco-500" />
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Lieu Principal</label>
                                        <input type="text" value={location1} onChange={e => setLocation1(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-cinema-800 border border-cinema-700 text-white focus:outline-none focus:ring-2 focus:ring-eco-500" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-900/30 text-red-400 text-sm rounded-lg border border-red-500/30 mb-4">
                            {error}
                        </div>
                    )}
                    {uploadWarning && (
                        <div className="p-3 bg-amber-900/30 text-amber-400 text-sm rounded-lg border border-amber-500/30 mb-4">
                            {uploadWarning}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={!file || isUploading}
                            className={`px-6 py-2 rounded-xl text-white font-medium shadow-sm transition-all flex items-center gap-2
                                ${!file || isUploading
                                    ? 'bg-cinema-700 cursor-not-allowed text-gray-500'
                                    : 'bg-eco-600 hover:bg-eco-500 shadow-md hover:shadow-lg'
                                }`}
                        >
                            {isUploading ? (
                                <>
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                    <span>Analyse & Envoi...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4" />
                                    <span>Publier la feuille</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}

            {/* FOLDER VIEW (Only show if NOT in Builder mode AND in Folders Layout) */}
            {mode !== 'BUILDER' && viewLayout === 'FOLDERS' && (
                <div className="space-y-4">
                    {(() => {
                        // Grouping Logic
                        const grouped = (callSheets || []).reduce((acc, sheet) => {
                            const date = parseISO(sheet.date);
                            const weekKey = `W${getISOWeek(date)}-${date.getFullYear()}`; // e.g. W42-2023
                            const dayKey = sheet.date; // YYYY-MM-DD

                            if (!acc[weekKey]) acc[weekKey] = { sheets: [], days: {} };
                            if (!acc[weekKey].days[dayKey]) acc[weekKey].days[dayKey] = [];

                            acc[weekKey].sheets.push(sheet);
                            acc[weekKey].days[dayKey].push(sheet);
                            return acc;
                        }, {} as Record<string, { sheets: CallSheet[], days: Record<string, CallSheet[]> }>);

                        // Sort Weeks (descending)
                        const sortedWeeks = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

                        if (sortedWeeks.length === 0) {
                            return (
                                <div className="py-12 text-center text-gray-500 bg-cinema-800/30 rounded-xl border border-dashed border-cinema-700">
                                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>Aucune feuille de service disponible.</p>
                                </div>
                            );
                        }

                        return sortedWeeks.map(weekKey => {
                            const weekData = grouped[weekKey];
                            // Get date range for label
                            // Use first sheet date to calculate week range
                            const firstSheetDate = parseISO(weekData.sheets[0].date);
                            const start = startOfISOWeek(firstSheetDate);
                            const end = endOfISOWeek(firstSheetDate);
                            const defaultWeekLabel = `Semaine ${getISOWeek(firstSheetDate)}`;
                            const dateRangeLabel = `(${format(start, 'dd MMM', { locale: fr })} - ${format(end, 'dd MMM', { locale: fr })})`;

                            // Use custom name if available, otherwise default
                            const customName = project?.weekMapping?.[weekKey];
                            const displayLabel = customName || defaultWeekLabel;

                            const isExpanded = expandedWeeks.has(weekKey);
                            const isEditing = editingWeek === weekKey;

                            return (
                                <div key={weekKey} className="border border-cinema-700 rounded-xl overflow-hidden bg-cinema-900/30">
                                    {/* Week Header */}
                                    <div className="w-full flex items-center bg-cinema-800 hover:bg-cinema-700 transition-colors pr-4 group">
                                        <button
                                            onClick={() => toggleWeek(weekKey)}
                                            className="flex-1 flex items-center gap-3 p-4 text-left"
                                        >
                                            {isExpanded ? <ChevronDown className="w-5 h-5 text-eco-400" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                                            <Folder className="w-5 h-5 text-eco-500" />

                                            {isEditing ? (
                                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                    <input
                                                        type="text"
                                                        value={tempWeekName}
                                                        onChange={(e) => setTempWeekName(e.target.value)}
                                                        className="bg-cinema-900 border border-cinema-600 rounded px-2 py-1 text-white text-lg font-bold focus:border-eco-500 outline-none"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => handleSaveWeekName(weekKey)}
                                                        className="p-1 bg-eco-500/20 text-eco-400 rounded hover:bg-eco-500/40"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingWeek(null)}
                                                        className="p-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/40"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="font-bold text-white text-lg">
                                                    {displayLabel} <span className="text-gray-400 font-normal text-base ml-1">{dateRangeLabel}</span>
                                                </span>
                                            )}
                                        </button>

                                        {/* Actions Area */}
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs bg-cinema-900 text-gray-400 px-2 py-1 rounded-full">
                                                {weekData.sheets.length} feuille{weekData.sheets.length > 1 ? 's' : ''}
                                            </span>

                                            {canEditStructure && !isEditing && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStartEditWeek(weekKey, customName || defaultWeekLabel);
                                                    }}
                                                    className="p-2 text-gray-500 hover:text-white hover:bg-cinema-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" // Opacity tweak: Need group on parent
                                                    title="Renommer la semaine"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Week Content */}
                                    {isExpanded && (
                                        <div className="p-4 space-y-4 border-t border-cinema-700">
                                            {Object.keys(weekData.days).sort((a, b) => b.localeCompare(a)).map(dayKey => {
                                                const daySheets = weekData.days[dayKey];
                                                const dayDate = parseISO(dayKey);
                                                const dayLabel = format(dayDate, 'EEEE d MMMM', { locale: fr });
                                                const isDayExpanded = expandedDays.has(dayKey) || true; // Default expanded for days inside open week? Let's make it toggleable but open by default maybe? Or simple list if few?
                                                // User asked for "folders per day". Let's do toggle.

                                                // Actually, to keep it clean, let's just show the day header and the grid of sheets below it.
                                                // Folders inside folders can be too much clicking.
                                                // Let's try a visual grouping first: Header Day -> Grid of Sheets.

                                                return (
                                                    <div key={dayKey} className="ml-4">
                                                        <h4 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-2 capitalize border-b border-cinema-700/50 pb-2">
                                                            <Calendar className="w-4 h-4" /> {dayLabel}
                                                        </h4>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {daySheets.map(sheet => (
                                                                <div key={sheet.id} className="bg-cinema-800 rounded-xl p-4 border border-cinema-700 flex flex-col justify-between group hover:border-eco-500/50 transition-all shadow-sm">
                                                                    <div>
                                                                        <div className="flex justify-between items-start mb-2">
                                                                            {/* Date badge not needed here as we are in day folder, but maybe nice to keep for context if dragged out */}
                                                                            <span className="text-xs font-bold text-eco-400 bg-eco-400/10 px-2 py-1 rounded-full border border-eco-500/20">
                                                                                {sheet.uploadedBy}
                                                                            </span>
                                                                            {canUpload && (
                                                                                <button
                                                                                    onClick={() => handleDeleteClick(sheet.id, sheet.url)}
                                                                                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                                                    title="Supprimer la feuille"
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                        <h3 className="text-base font-bold text-white mb-1 truncate" title={sheet.name}>{sheet.name}</h3>

                                                                        {(sheet.callTime || sheet.location1) && (
                                                                            <div className="mt-3 pt-3 border-t border-cinema-700 grid grid-cols-2 gap-2 text-xs text-gray-300">
                                                                                {sheet.callTime && (
                                                                                    <div className="flex items-center gap-1">
                                                                                        <span className="text-eco-500">P.A.T:</span> {sheet.callTime}
                                                                                    </div>
                                                                                )}
                                                                                {sheet.location1 && (
                                                                                    <div className="col-span-2 truncate">
                                                                                        <span className="text-orange-400">Lieu:</span> {sheet.location1}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="mt-4 pt-4 border-t border-cinema-700 flex gap-2">
                                                                        {sheet.url ? (
                                                                            <>
                                                                                <a
                                                                                    href={sheet.url}
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    className="flex-1 bg-cinema-900 hover:bg-black text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                                                                >
                                                                                    <Eye className="w-4 h-4" />
                                                                                </a>
                                                                                <a
                                                                                    href={sheet.url}
                                                                                    download
                                                                                    className="flex-1 bg-eco-600 hover:bg-eco-500 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                                                                >
                                                                                    <Download className="w-4 h-4" /> PDF
                                                                                </a>
                                                                            </>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => handleEdit(sheet)}
                                                                                className="flex-1 bg-blue-600/20 text-blue-400 py-2 rounded-lg text-sm font-medium hover:bg-blue-600/30 transition-colors flex items-center justify-center gap-2 border border-blue-500/30"
                                                                            >
                                                                                <FileText className="w-4 h-4" /> Éditer
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        });
                    })()}
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-cinema-800 border-2 border-red-500/30 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="bg-red-500/20 rounded-full p-4">
                                <AlertTriangle className="h-12 w-12 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Supprimer ce document ?</h3>
                            <p className="text-slate-300 text-sm">
                                Cette action est irréversible. Le fichier sera définitivement effacé.
                            </p>
                            <div className="flex gap-3 w-full pt-2">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 bg-cinema-700 hover:bg-cinema-600 text-white py-3 rounded-xl font-bold transition-all"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold transition-all"
                                >
                                    Supprimer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
