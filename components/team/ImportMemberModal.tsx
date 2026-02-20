import React, { useState } from 'react';
import { useTeam } from '../../context/TeamContext';
import { Department } from '../../types';
import { Upload } from 'lucide-react';
import { extractTextFromPdf } from '../../utils/pdfHelpers';

export const ImportMemberModal = ({ onClose }: { onClose: () => void }) => {
    const { addOfflineMember } = useTeam();
    const [mode, setMode] = useState<'MANUAL' | 'BULK'>('MANUAL');
    const [manualData, setManualData] = useState({
        firstName: '',
        lastName: '',
        role: '',
        phone: '',
        department: Department.REGIE
    });
    const [bulkText, setBulkText] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert('Veuillez sélectionner un fichier PDF.');
            return;
        }

        setIsAnalyzing(true);
        try {
            const text = await extractTextFromPdf(file);
            setBulkText(prev => prev + '\n' + text);
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la lecture du PDF");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleManualSubmit = async () => {
        if (!manualData.firstName || !manualData.lastName) return;
        await addOfflineMember({
            ...manualData,
            department: manualData.department as any
        });
        onClose();
    };

    const handleBulkSubmit = async () => {
        const lines = bulkText.split('\n').filter(l => l.trim().length > 0);

        for (const line of lines) {
            const parts = line.split(/[ \t,;]+/);
            let phone = '';
            let names = [];
            let role = 'Renfort';

            for (const p of parts) {
                if (/^[\d\+\.\-]+$/.test(p) && p.length > 8) {
                    phone = p;
                } else {
                    names.push(p);
                }
            }

            if (names.length > 0) {
                await addOfflineMember({
                    firstName: names[0],
                    lastName: names.slice(1).join(' ') || '',
                    role: role,
                    phone: phone,
                    department: Department.REGIE
                });
            }
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-cinema-800 border border-cinema-700 rounded-2xl w-full max-w-2xl shadow-xl" onClick={e => e.stopPropagation()}>
                <header className="p-6 border-b border-cinema-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">Ajouter un membre (Hors Ligne)</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">&times;</button>
                </header>
                <div className="p-6">
                    <div className="flex gap-4 mb-6 border-b border-cinema-700/50">
                        <button
                            onClick={() => setMode('MANUAL')}
                            className={`pb-2 px-2 ${mode === 'MANUAL' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-400'}`}
                        >
                            Manuel
                        </button>
                        <button
                            onClick={() => setMode('BULK')}
                            className={`pb-2 px-2 ${mode === 'BULK' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-400'}`}
                        >
                            Import Liste
                        </button>
                    </div>

                    {mode === 'MANUAL' ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    placeholder="Prénom"
                                    className="bg-cinema-900 border-cinema-700 rounded p-2 text-white w-full"
                                    value={manualData.firstName}
                                    onChange={e => setManualData({ ...manualData, firstName: e.target.value })}
                                />
                                <input
                                    placeholder="Nom"
                                    className="bg-cinema-900 border-cinema-700 rounded p-2 text-white w-full"
                                    value={manualData.lastName}
                                    onChange={e => setManualData({ ...manualData, lastName: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    placeholder="Rôle (ex: Machiniste)"
                                    className="bg-cinema-900 border-cinema-700 rounded p-2 text-white w-full"
                                    value={manualData.role}
                                    onChange={e => setManualData({ ...manualData, role: e.target.value })}
                                />
                                <input
                                    placeholder="Téléphone"
                                    className="bg-cinema-900 border-cinema-700 rounded p-2 text-white w-full"
                                    value={manualData.phone}
                                    onChange={e => setManualData({ ...manualData, phone: e.target.value })}
                                />
                            </div>
                            <select
                                className="bg-cinema-900 border-cinema-700 rounded p-2 text-white w-full"
                                value={manualData.department}
                                onChange={e => setManualData({ ...manualData, department: e.target.value as any })}
                            >
                                {Object.values(Department).map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleManualSubmit}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded"
                            >
                                Créer Fiche
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-cinema-900/50 border border-dashed border-cinema-600 rounded-lg p-4 text-center">
                                <p className="text-sm text-slate-400 mb-2">
                                    Optionnel : Importez un PDF (Feuille de service, Liste équipe...)
                                </p>
                                <label className="cursor-pointer inline-flex items-center gap-2 bg-cinema-700 hover:bg-cinema-600 px-4 py-2 rounded text-sm text-white transition-colors">
                                    <Upload className="h-4 w-4" />
                                    {isAnalyzing ? 'Analyse en cours...' : 'Choisir un PDF'}
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                        disabled={isAnalyzing}
                                    />
                                </label>
                            </div>

                            <p className="text-sm text-slate-400">
                                Collez une liste de noms (et numéros optionnels). Un par ligne.<br />
                                Ex: <code>Jean Dupont 0612345678</code>
                            </p>
                            <textarea
                                className="w-full h-48 bg-cinema-900 border-cinema-700 rounded p-2 text-white font-mono text-sm"
                                placeholder="Jean Dupont 0600000000&#10;Marie Curie"
                                value={bulkText}
                                onChange={e => setBulkText(e.target.value)}
                            />
                            <button
                                onClick={handleBulkSubmit}
                                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded"
                            >
                                Importer la liste
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
