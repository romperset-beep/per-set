import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { ExpenseReport, ExpenseStatus } from '../types';
import { FileText, CheckCircle2, XCircle, Clock, Receipt, Users, User, PlusCircle, ChevronDown, ChevronUp, Download, FolderOpen, Trash2 } from 'lucide-react';
import { ExpenseReportModal } from './ExpenseReportModal';
import { generateExpenseReportPDF, generateSummaryPDF } from '../services/pdfService';

export const ExpenseReports: React.FC = () => {
    const { expenseReports, updateExpenseReportStatus, deleteExpenseReport, user } = useProject();
    const [viewMode, setViewMode] = useState<'PERSONAL' | 'TEAM'>('PERSONAL');
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null); // Quick View State

    // Accordion states
    const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
    const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});

    const isAdmin = user?.department === 'PRODUCTION';

    // Toggle Helpers
    const toggleDept = (dept: string) => setExpandedDepts(prev => ({ ...prev, [dept]: !prev[dept] }));
    const toggleUser = (uName: string) => setExpandedUsers(prev => ({ ...prev, [uName]: !prev[uName] }));

    // Determine effective view mode
    const currentViewMode = isAdmin ? viewMode : 'PERSONAL';

    // 1. Get Personal Reports (Sorted Date Desc)
    const myReports = expenseReports
        .filter(r => r.submittedBy === user?.name)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 2. Get Team Reports (Admin Mode)
    // 2a. Pending Reports (Flat List)
    const pendingReports = expenseReports
        .filter(r => r.status === ExpenseStatus.PENDING)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 2b. Validated/Rejected Reports (Grouped by Dept > User)
    const processedReports = expenseReports
        .filter(r => r.status !== ExpenseStatus.PENDING)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Grouping Logic
    const groupedReports = processedReports.reduce((acc, report) => {
        const dept = report.department || 'Inconnu';
        if (!acc[dept]) acc[dept] = {};

        const userName = report.submittedBy;
        if (!acc[dept][userName]) acc[dept][userName] = [];

        acc[dept][userName].push(report);
        return acc;
    }, {} as Record<string, Record<string, ExpenseReport[]>>);

    const departments = Object.keys(groupedReports).sort();

    // Helper: Compute Total Validate for a User's reports (in the archive list)
    const getUserTotal = (reports: ExpenseReport[]) =>
        reports
            .filter(r => r.status === ExpenseStatus.APPROVED)
            .reduce((sum, r) => sum + r.amountTTC, 0);

    // --- Render Components ---

    const StatusBadge = ({ status }: { status: ExpenseStatus }) => {
        switch (status) {
            case ExpenseStatus.APPROVED:
                return (
                    <span className="text-green-400 bg-green-900/20 border border-green-500/30 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Validé
                    </span>
                );
            case ExpenseStatus.REJECTED:
                return (
                    <span className="text-red-400 bg-red-900/20 border border-red-500/30 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> Refusé
                    </span>
                );
            default:
                return (
                    <span className="text-orange-400 bg-orange-900/20 border border-orange-500/30 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" /> En attente
                    </span>
                );
        }
    };
    const ReportCard = ({ report, showActions = false }: { report: ExpenseReport; showActions?: boolean }) => (
        <div className="bg-cinema-800 p-4 rounded-lg border border-cinema-700 flex flex-col md:flex-row gap-4 hover:bg-cinema-700/30 transition-colors">
            {/* Info */}
            <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                    <StatusBadge status={report.status} />
                    <span className="text-slate-400 text-sm">
                        {new Date(report.date).toLocaleDateString('fr-FR')}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-200 font-bold">
                        {report.merchantName || 'Commerçant inconnu'}
                    </span>
                </div>

                <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
                    <span className="bg-cinema-900 px-2 py-0.5 rounded text-slate-300">
                        {report.submittedBy}
                    </span>
                    {/* Quick View Button (Eye) */}
                    {report.receiptUrl && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (report.receiptUrl?.toLowerCase().includes('.pdf')) {
                                    window.open(report.receiptUrl, '_blank');
                                } else {
                                    setPreviewImage(report.receiptUrl || null);
                                }
                            }}
                            className="bg-cinema-700 hover:bg-cinema-600 text-slate-300 p-1 rounded-full transition-colors ml-2"
                            title="Voir le justificatif"
                        >
                            <Receipt className="h-3 w-3" />
                        </button>
                    )}
                </div>

                {report.mode === 'ADVANCED' && report.lines && report.lines.length > 0 ? (
                    <div className="mt-2 space-y-1">
                        <div className="text-[10px] text-indigo-300 font-medium mb-1">
                            {report.lines.length} ligne{report.lines.length > 1 ? 's' : ''} détaillée{report.lines.length > 1 ? 's' : ''} :
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {report.lines.slice(0, 3).map((line, idx) => (
                                <span key={idx} className="text-[10px] text-slate-400 bg-cinema-900/50 px-2 py-1 rounded border border-cinema-700/50 flex items-center gap-1">
                                    <span className="text-white">{line.merchant}</span>
                                    <span className="opacity-50">- {line.amountTTC.toFixed(0)}€</span>
                                </span>
                            ))}
                            {report.lines.length > 3 && (
                                <span className="text-[10px] text-slate-500 px-1 py-1">+{report.lines.length - 3} autres...</span>
                            )}
                        </div>
                    </div>
                ) : (
                    report.items && report.items.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {report.items.map((item, idx) => (
                                <span key={idx} className="text-[10px] text-slate-400 bg-cinema-900/50 px-2 py-1 rounded border border-cinema-700/50">
                                    {item}
                                </span>
                            ))}
                        </div>
                    )
                )}
            </div>

            {/* Amounts & Actions */}
            <div className="flex flex-col items-end gap-3 min-w-[120px]">
                <div className="text-right">
                    <div className="text-lg font-bold text-white">{report.amountTTC.toFixed(2)} €</div>
                    <div className="text-[10px] text-slate-500">
                        HT: {(report.amountHT || 0).toFixed(2)} € | TVA: {report.amountTVA.toFixed(2)} €
                    </div>
                </div>

                <div className="flex gap-2">
                    {/* Quick View (Eye) - Clean Button */}
                    {report.receiptUrl && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (report.receiptUrl?.toLowerCase().includes('.pdf')) {
                                    window.open(report.receiptUrl, '_blank');
                                } else {
                                    setPreviewImage(report.receiptUrl || null);
                                }
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors"
                            title="Aperçu rapide"
                        >
                            {/* Eye Icon or FileText for PDF */}
                            {report.receiptUrl?.toLowerCase().includes('.pdf') ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                            )}
                        </button>
                    )}

                    {/* PDF Download */}
                    <button
                        onClick={() => generateExpenseReportPDF(report)}
                        className="p-1.5 text-slate-400 hover:text-eco-400 transition-colors"
                        title="Télécharger PDF"
                    >
                        <Download className="h-4 w-4" />
                    </button>

                    {/* Delete Action (Restricted: Pending or Rejected only) */}
                    {(report.submittedBy === user?.name || isAdmin) && report.status !== ExpenseStatus.APPROVED && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm("Voulez-vous vraiment supprimer cette note de frais ?")) {
                                    deleteExpenseReport(report.id, report.receiptUrl);
                                }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                            title="Supprimer la demande"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}

                    {/* Validate Actions */}
                    {showActions && isAdmin && report.status === ExpenseStatus.PENDING && (
                        <>
                            <button
                                onClick={() => updateExpenseReportStatus(report.id, ExpenseStatus.REJECTED)}
                                className="px-2 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs transition-colors"
                            >
                                Refuser
                            </button>
                            <button
                                onClick={() => updateExpenseReportStatus(report.id, ExpenseStatus.APPROVED)}
                                className="px-2 py-1 rounded bg-green-600 hover:bg-green-500 text-white text-xs font-medium transition-colors"
                            >
                                Valider
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );


    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <ExpenseReportModal
                isOpen={isExpenseModalOpen}
                onClose={() => setIsExpenseModalOpen(false)}
            />

            {/* Preview Image Modal */}
            {previewImage && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={() => setPreviewImage(null)}>
                    <div className="relative max-w-full max-h-full">
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute -top-10 right-0 text-white hover:text-red-400"
                        >
                            <XCircle className="h-8 w-8" />
                        </button>
                        <img
                            src={previewImage}
                            alt="Justificatif"
                            className="max-h-[85vh] max-w-[95vw] object-contain rounded-lg shadow-2xl border border-cinema-700"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}

            {/* --- Header --- */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white">Notes de Frais</h2>
                    <p className="text-slate-400 mt-1">
                        {currentViewMode === 'TEAM'
                            ? "Administration et comptabilité des dépenses."
                            : "Gérez vos remboursements."}
                    </p>
                </div>

                <div className="flex gap-3">
                    {isAdmin && (
                        <div className="flex p-1 bg-cinema-800 rounded-lg border border-cinema-700">
                            <button
                                onClick={() => setViewMode('PERSONAL')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'PERSONAL' ? 'bg-cinema-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                            >
                                Personnel
                            </button>
                            <button
                                onClick={() => setViewMode('TEAM')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'TEAM' ? 'bg-cinema-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                            >
                                Production
                            </button>
                        </div>
                    )}

                    {currentViewMode === 'PERSONAL' && (
                        <button
                            onClick={() => setIsExpenseModalOpen(true)}
                            className="bg-eco-600 hover:bg-eco-500 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-eco-900/20 flex items-center gap-2 transition-all hover:scale-105"
                        >
                            <PlusCircle className="h-5 w-5" />
                            Note de Frais
                        </button>
                    )}
                </div>
            </header>

            {/* --- PERSONAL VIEW --- */}
            {currentViewMode === 'PERSONAL' && (
                <div className="bg-cinema-800/50 rounded-xl border border-cinema-700 overflow-hidden">
                    <div className="p-4 border-b border-cinema-700 flex justify-between items-center bg-cinema-900/30">
                        <div className="flex items-center gap-3">
                            <User className="h-5 w-5 text-eco-400" />
                            <h3 className="font-bold text-white">Mes demandes ({myReports.length})</h3>
                        </div>
                        <div className="text-right text-sm">
                            <span className="text-slate-400">Total Validé: </span>
                            <span className="text-white font-bold text-lg">
                                {getUserTotal(myReports).toFixed(2)} €
                            </span>
                        </div>
                    </div>
                    <div className="p-4 space-y-3">
                        {myReports.length === 0 ? (
                            <p className="text-center text-slate-500 py-8">Aucune note de frais.</p>
                        ) : (
                            myReports.map(report => <ReportCard key={report.id} report={report} />)
                        )}
                    </div>
                </div>
            )}


            {/* --- TEAM / ADMIN VIEW --- */}
            {currentViewMode === 'TEAM' && (
                <div className="space-y-8">

                    {/* SECTION 1: À VALIDER */}
                    <div className="rounded-xl border border-orange-500/20 bg-orange-900/10 overflow-hidden">
                        <div className="p-4 border-b border-orange-500/20 bg-orange-900/20 flex items-center gap-3">
                            <Clock className="h-5 w-5 text-orange-400" />
                            <h3 className="font-bold text-orange-100">À Valider ({pendingReports.length})</h3>
                        </div>
                        <div className="p-4 space-y-3">
                            {pendingReports.length === 0 ? (
                                <p className="text-center text-slate-500 py-4 italic">Aucune note de frais en attente.</p>
                            ) : (
                                pendingReports.map(report => <ReportCard key={report.id} report={report} showActions={true} />)
                            )}
                        </div>
                    </div>

                    {/* SECTION 2: DOSSIERS PAR DEPT */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <FolderOpen className="h-5 w-5 text-slate-400" />
                            Dossiers Départements
                        </h3>

                        {departments.length === 0 && (
                            <p className="text-slate-500 italic">Aucune note de frais archivée.</p>
                        )}

                        {departments.map(dept => (
                            <div key={dept} className="rounded-xl border border-cinema-700 bg-cinema-800/50 overflow-hidden">
                                <button
                                    onClick={() => toggleDept(dept)}
                                    className="w-full flex items-center justify-between p-4 bg-cinema-900/50 hover:bg-cinema-800 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <Users className="h-5 w-5 text-purple-400" />
                                        <span className="font-bold text-white text-lg">{dept}</span>
                                        <span className="text-sm text-slate-500 bg-cinema-800 px-2 py-0.5 rounded-full border border-cinema-700">
                                            {Object.keys(groupedReports[dept]).length} membres
                                        </span>
                                    </div>
                                    {expandedDepts[dept] ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                                </button>

                                {/* Users List */}
                                {expandedDepts[dept] && (
                                    <div className="border-t border-cinema-700">
                                        {Object.keys(groupedReports[dept]).sort().map(userName => {
                                            const userReports = groupedReports[dept][userName];
                                            const total = getUserTotal(userReports);
                                            const isExpanded = expandedUsers[userName];

                                            return (
                                                <div key={userName} className="border-b border-cinema-700/50 last:border-0">
                                                    <button
                                                        onClick={() => toggleUser(userName)}
                                                        className="w-full flex items-center justify-between p-3 pl-8 hover:bg-cinema-700/20 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <User className="h-4 w-4 text-slate-400" />
                                                            <span className="text-slate-200 font-medium">{userName}</span>
                                                            <span className="text-xs text-slate-500">
                                                                {userReports.length} notes
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="text-right">
                                                                <div className="text-xs text-slate-400">Total à Rembourser</div>
                                                                <div className="text-sm font-bold text-green-400">{total.toFixed(2)} €</div>
                                                            </div>
                                                            {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                                                        </div>
                                                    </button>

                                                    {/* User Reports List */}
                                                    {isExpanded && (
                                                        <div className="bg-cinema-900/50 p-3 pl-12 space-y-3 border-t border-cinema-700/30">
                                                            <div className="flex justify-end">
                                                                <button
                                                                    onClick={async (e) => { e.stopPropagation(); await generateSummaryPDF(userReports, userName, dept); }}
                                                                    className="flex items-center gap-2 text-xs bg-cinema-800 hover:bg-cinema-700 text-white px-3 py-1.5 rounded border border-cinema-600 transition-colors"
                                                                >
                                                                    <FileText className="h-3 w-3" />
                                                                    Télécharger Récapitulatif PDF
                                                                </button>
                                                            </div>
                                                            {userReports.map(report => (
                                                                <ReportCard key={report.id} report={report} />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                </div>
            )}
        </div>
    );
};
