import React from 'react';
import { useProject } from '../context/ProjectContext';
import { ExpenseStatus } from '../types';
import { FileText, CheckCircle2, XCircle, Clock, Receipt, Users, User, PlusCircle } from 'lucide-react';
import { ExpenseReportModal } from './ExpenseReportModal';

export const ExpenseReports: React.FC = () => {
    const { expenseReports, updateExpenseReportStatus, user } = useProject();
    const [viewMode, setViewMode] = React.useState<'PERSONAL' | 'TEAM'>('PERSONAL');
    const [isExpenseModalOpen, setIsExpenseModalOpen] = React.useState(false);

    const isAdmin = user?.department === 'PRODUCTION';

    // Determine effective view mode
    // Non-admins always see PERSONAL
    const currentViewMode = isAdmin ? viewMode : 'PERSONAL';

    // Filter reports
    const filteredReports = expenseReports.filter(report => {
        if (currentViewMode === 'TEAM') {
            return true; // Show all
        } else {
            // Personal view: show only own reports
            return report.submittedBy === user?.name;
        }
    });

    // Sort by date desc
    const sortedReports = [...filteredReports].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const getStatusColor = (status: ExpenseStatus) => {
        switch (status) {
            case ExpenseStatus.APPROVED: return 'text-green-400 bg-green-900/20 border-green-500/30';
            case ExpenseStatus.REJECTED: return 'text-red-400 bg-red-900/20 border-red-500/30';
            default: return 'text-orange-400 bg-orange-900/20 border-orange-500/30';
        }
    };

    const getStatusIcon = (status: ExpenseStatus) => {
        switch (status) {
            case ExpenseStatus.APPROVED: return <CheckCircle2 className="h-4 w-4" />;
            case ExpenseStatus.REJECTED: return <XCircle className="h-4 w-4" />;
            default: return <Clock className="h-4 w-4" />;
        }
    };

    return (
        <div className="space-y-8">
            <ExpenseReportModal
                isOpen={isExpenseModalOpen}
                onClose={() => setIsExpenseModalOpen(false)}
            />

            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white">Notes de Frais</h2>
                    <p className="text-slate-400 mt-1">
                        {currentViewMode === 'TEAM'
                            ? "Gestion et validation des notes de frais de l'équipe."
                            : "Gérez vos propres notes de frais."}
                    </p>
                </div>

                {currentViewMode === 'PERSONAL' && (
                    <button
                        onClick={() => setIsExpenseModalOpen(true)}
                        className="bg-eco-600 hover:bg-eco-500 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-eco-900/20 flex items-center gap-2 transition-all hover:scale-105"
                    >
                        <PlusCircle className="h-5 w-5" />
                        Nouvelle Note de Frais
                    </button>
                )}
            </header>

            {/* Admin Tabs */}
            {isAdmin && (
                <div className="flex p-1 bg-cinema-800 rounded-xl border border-cinema-700 w-fit">
                    <button
                        onClick={() => setViewMode('PERSONAL')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${viewMode === 'PERSONAL'
                                ? 'bg-cinema-700 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <User className="h-4 w-4" />
                        Personnel
                    </button>
                    <button
                        onClick={() => setViewMode('TEAM')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${viewMode === 'TEAM'
                                ? 'bg-cinema-700 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <Users className="h-4 w-4" />
                        Équipe
                    </button>
                </div>
            )}

            <div className="bg-cinema-800 rounded-xl border border-cinema-700 overflow-hidden">
                <div className="p-6 border-b border-cinema-700 flex justify-between items-center bg-cinema-900/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                            <Receipt className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">
                                {currentViewMode === 'TEAM' ? 'Toutes les demandes' : 'Mes demandes'}
                            </h3>
                            <p className="text-xs text-slate-400">
                                {sortedReports.length} notes de frais
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-slate-400">Total Validé</div>
                        <div className="text-2xl font-bold text-white">
                            {sortedReports
                                .filter(r => r.status === ExpenseStatus.APPROVED)
                                .reduce((acc, r) => acc + r.amountTTC, 0)
                                .toFixed(2)} €
                        </div>
                    </div>
                </div>

                <div className="divide-y divide-cinema-700">
                    {sortedReports.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            {currentViewMode === 'TEAM'
                                ? "Aucune note de frais à valider."
                                : "Vous n'avez aucune note de frais."}
                        </div>
                    ) : (
                        sortedReports.map(report => (
                            <div key={report.id} className="p-6 hover:bg-cinema-700/20 transition-colors">
                                <div className="flex flex-col md:flex-row justify-between gap-4">

                                    {/* Left: Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-2 py-1 rounded text-xs font-medium border flex items-center gap-1 ${getStatusColor(report.status)}`}>
                                                {getStatusIcon(report.status)}
                                                {report.status}
                                            </span>
                                            <span className="text-slate-400 text-sm">
                                                {new Date(report.date).toLocaleDateString('fr-FR')}
                                            </span>
                                            <span className="text-slate-500 text-sm">•</span>
                                            <span className="text-slate-300 text-sm font-medium">
                                                {report.merchantName || 'Commerçant inconnu'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-white font-bold">{report.submittedBy}</span>
                                            <span className="text-xs bg-cinema-900 text-slate-400 px-2 py-0.5 rounded">
                                                {report.department}
                                            </span>
                                        </div>

                                        {report.items.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {report.items.map((item, idx) => (
                                                    <span key={idx} className="text-xs text-slate-400 bg-cinema-900/50 px-2 py-1 rounded">
                                                        {item}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Amount & Actions */}
                                    <div className="flex flex-col items-end gap-3 min-w-[150px]">
                                        <div className="text-right">
                                            <div className="text-xl font-bold text-white">{report.amountTTC.toFixed(2)} €</div>
                                            <div className="text-xs text-slate-500">dont {report.amountTVA.toFixed(2)} € TVA</div>
                                        </div>

                                        {/* Validation buttons only visible in TEAM mode (or if admin wants to validate own? usually no, but let's stick to TEAM mode for validation) */}
                                        {isAdmin && currentViewMode === 'TEAM' && report.status === ExpenseStatus.PENDING && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => updateExpenseReportStatus(report.id, ExpenseStatus.REJECTED)}
                                                    className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm transition-colors"
                                                >
                                                    Refuser
                                                </button>
                                                <button
                                                    onClick={() => updateExpenseReportStatus(report.id, ExpenseStatus.APPROVED)}
                                                    className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors shadow-lg shadow-green-900/20"
                                                >
                                                    Valider
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
