import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Department, CallSheet } from '../types';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { analyzeCallSheetPDF } from '../services/aiService'; // Static Import
import { FileText, Upload, Calendar, Download, Eye, Trash2 } from 'lucide-react';
import { CallSheetBuilder } from './CallSheetBuilder';

export const CallSheetView: React.FC = () => {
    const { user, currentDept, callSheets, addCallSheet, deleteCallSheet, t } = useProject();
    const [isUploading, setIsUploading] = useState(false);
    const [mode, setMode] = useState<'UPLOAD' | 'BUILDER'>('UPLOAD');

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

    const canUpload = user?.department === 'PRODUCTION' || user?.department === Department.MISE_EN_SCENE;

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

    // ... (File handlers remain same) ...
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
            if (!uploadName) {
                const cleanName = selectedFile.name.replace('.pdf', '').replace(/[-_]/g, ' ');
                setUploadName(cleanName);
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
            // 1. AI Analysis
            let extractedData: Partial<CallSheet> = {};
            try {
                extractedData = await analyzeCallSheetPDF(file);
                console.log("AI Data Extracted:", extractedData);
            } catch (aiError) {
                console.warn("AI extraction failed, proceeding with basic upload.", aiError);
            }
            const storageRef = ref(storage, `callsheets/${Date.now()}_${file.name}`);
            const metadata = { customMetadata: { uploadedBy: user?.name || 'Unknown', department: user?.department || 'Unknown' } };

            const uploadTask = uploadBytes(storageRef, file, metadata);
            await uploadTask;
            const downloadUrl = await getDownloadURL(storageRef);

            await addCallSheet({
                id: '',
                date: uploadDate,
                uploadDate: new Date().toISOString(),
                name: uploadName,
                url: downloadUrl,
                uploadedBy: user?.name || 'Inconnu',
                department: user?.department as any,

                // Fallback / Manual - Use NULL instead of undefined for Firestore
                callTime: extractedData.callTime || callTime,
                endTime: extractedData.endTime || endTime,
                location1: extractedData.location1 || location1 || null,

                ...extractedData, // Merge AI data

                location2: extractedData.location2 || location2 || null,
                cateringLocation: extractedData.cateringLocation || cateringLocation || null
            });

            // Reset
            setFile(null);
            setUploadName('');
            setCallTime('');
            setEndTime('');
            setLocation1('');
            setLocation2('');
            setCateringLocation('');
            setIsUploading(false);
        } catch (err: any) {
            console.error(err);
            const errorMessage = err?.message || "Erreur inconnue";
            setError(`Erreur lors de l'upload: ${errorMessage}`);
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: string, url?: string) => {
        if (window.confirm('Voulez-vous vraiment supprimer cette feuille de service ?')) {
            try {
                await deleteCallSheet(id, url || '');
            } catch (e) {
                console.error(e);
            }
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

            {/* BUILDER MODE */}
            {canUpload && mode === 'BUILDER' && (
                <CallSheetBuilder
                    onSave={handleDigitalSave}
                    onCancel={handleCancel}
                    initialData={editingSheet}
                />
            )}

            {/* UPLOAD MODE */}
            {canUpload && mode === 'UPLOAD' && (
                <form onSubmit={handleUpload} className="bg-cinema-800 p-6 rounded-2xl border border-cinema-700 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* File Drop */}
                        <div className="border-2 border-dashed border-cinema-600 rounded-xl p-8 flex flex-col items-center justify-center gap-4 hover:border-eco-500/50 hover:bg-cinema-700/30 transition-all group relative">
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="p-4 bg-cinema-700 rounded-full group-hover:scale-110 transition-transform">
                                <Upload className="h-8 w-8 text-eco-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-medium">
                                    {file ? file.name : "Glissez votre PDF ici"}
                                </p>
                                <p className="text-sm text-slate-500 mt-1">
                                    ou cliquez pour parcourir
                                </p>
                            </div>
                        </div>

                        {/* Metadata */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Date du document</label>
                                <input
                                    type="date"
                                    value={uploadDate}
                                    onChange={(e) => setUploadDate(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg bg-cinema-900 border border-cinema-700 text-white focus:outline-none focus:ring-2 focus:ring-eco-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Nom du fichier</label>
                                <input
                                    type="text"
                                    value={uploadName}
                                    onChange={(e) => setUploadName(e.target.value)}
                                    placeholder="ex: FDS J12 - Lundi 24 Oct"
                                    className="w-full px-3 py-2 rounded-lg bg-cinema-900 border border-cinema-700 text-white focus:outline-none focus:ring-2 focus:ring-eco-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">P.A.T</label>
                                    <input type="time" value={callTime} onChange={e => setCallTime(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-cinema-900 border border-cinema-700 text-white focus:outline-none focus:ring-2 focus:ring-eco-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Fin Est.</label>
                                    <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-cinema-900 border border-cinema-700 text-white focus:outline-none focus:ring-2 focus:ring-eco-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Lieu Principal</label>
                                <input type="text" value={location1} onChange={e => setLocation1(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-cinema-900 border border-cinema-700 text-white focus:outline-none focus:ring-2 focus:ring-eco-500" />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-900/30 text-red-400 text-sm rounded-lg border border-red-500/30">
                            {error}
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

            {/* LIST (Only show if NOT in Builder mode) */}
            {mode !== 'BUILDER' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {callSheets.map((sheet) => (
                        <div key={sheet.id} className="bg-cinema-800 rounded-xl p-4 border border-cinema-700 flex flex-col justify-between group hover:border-eco-500/50 transition-all">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-eco-400 bg-eco-400/10 px-2 py-1 rounded-full border border-eco-500/20">
                                        {new Date(sheet.date).toLocaleDateString()}
                                    </span>
                                    {canUpload && (
                                        <button
                                            onClick={() => handleDelete(sheet.id, sheet.url)}
                                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                            title="Supprimer la feuille"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">{sheet.name}</h3>
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                    <Upload className="w-3 h-3" /> {sheet.uploadedBy}
                                </p>

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
                                            <Eye className="w-4 h-4" /> Voir
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
                                    // Use handleEdit here
                                    <button
                                        onClick={() => handleEdit(sheet)}
                                        className="flex-1 bg-blue-600/20 text-blue-400 py-2 rounded-lg text-sm font-medium hover:bg-blue-600/30 transition-colors flex items-center justify-center gap-2 border border-blue-500/30"
                                    >
                                        <FileText className="w-4 h-4" /> Digital / Éditer
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {callSheets.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-500 bg-cinema-800/30 rounded-xl border border-dashed border-cinema-700">
                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Aucune feuille de service disponible.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
