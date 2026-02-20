import React, { useEffect, useState } from 'react';
import { User, Project } from '../types';
import { fetchAllUsersAction, fetchAllProjectsAction, fetchAllTransactionsAction, ProjectWithOfflineInfo, approveUserAction, rejectUserAction, updateGenericDocumentAction } from '../services/adminService';
import { validateTransactionAction, rejectTransactionAction } from '../services/transactionService';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Search, Users, Building2, Calendar, Film, Trash2, ArrowLeft, Edit2, Save, X, ShoppingCart, FileText, CheckCircle, Download, Filter, AlertTriangle } from 'lucide-react';
import { generateInvoice } from '../utils/invoiceGenerator';
import { AdminUsersList } from './admin/AdminUsersList';
import { AdminResalesList } from './admin/AdminResalesList';
import { AdminProjectsList } from './admin/AdminProjectsList';
import { AdminProductionsList } from './admin/AdminProductionsList';
import { Transaction } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type ViewMode = 'DASHBOARD' | 'USERS' | 'PRODUCTIONS' | 'PROJECTS' | 'RESALES' | 'RESET';

export type ProjectWithOffline = ProjectWithOfflineInfo;

export const AdminDashboard: React.FC = () => {
    const [view, setView] = useState<ViewMode>('DASHBOARD');
    const [users, setUsers] = useState<User[]>([]);
    const [projectsList, setProjectsList] = useState<ProjectWithOffline[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { user } = useAuth(); // Get current logged-in user
    const { deleteProject, deleteUser, deleteAllData } = useProject();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [resalesGroupBy, setResalesGroupBy] = useState<'seller' | 'buyer' | 'date'>('seller'); // Default to seller as requested
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<User | Project>>({});
    const [resetConfirm, setResetConfirm] = useState("");

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const fetchedUsers = await fetchAllUsersAction();
            setUsers(fetchedUsers);

            const fetchedProjects = await fetchAllProjectsAction();
            setProjectsList(fetchedProjects as ProjectWithOffline[]);

            const fetchedTransactions = await fetchAllTransactionsAction();
            setTransactions(fetchedTransactions);

        } catch (error) {
            console.error("Error fetching admin data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter Logic
    const filteredUsers = users.filter(u => {
        const matchesSearch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.productionName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.filmTitle || '').toLowerCase().includes(searchTerm.toLowerCase());

        return matchesSearch;
    });

    const filteredProjects = projectsList.filter(p =>
        (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.productionCompany || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Grouping for Productions View
    const productions = Array.from(new Set(projectsList.map(p => p.productionCompany))).map(prodName => {
        const prodProjects = projectsList.filter(p => p.productionCompany === prodName);
        return {
            name: prodName,
            projectCount: prodProjects.length,
            projects: prodProjects
        };
    }).filter(p => !searchTerm || (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

    // Get all unique production names for search autocomplete
    const allProductionNames = Array.from(new Set([
        ...transactions.map(t => t.sellerName),
        ...transactions.map(t => t.buyerName),
        ...projectsList.map(p => p.productionCompany)
    ])).filter(Boolean).sort();

    const stats = {
        totalUsers: users.length,
        activeProductions: productions.length,
        activeFilms: projectsList.length
    };

    // Actions
    const handleDeleteUser = async (userId: string, userName: string) => {
        // PROTECTION A: Strict Super Admin Protection
        const targetUser = users.find(u => u.id === userId);

        // Block Deletion of Super Admin
        if (targetUser?.email === 'romperset@gmail.com') {
            alert("🛑 ACTION INTERDITE 🛑\n\nCe compte est le SUPER ADMIN du système.\nIl ne peut pas être supprimé.");
            return;
        }

        // PROTECTION B: Prevent deleting a ghost profile that is actually YOUR account
        // Note: user object usually has 'id' in our app, 'uid' might be from Firebase User object directly.
        // We check both to be safe, but safely.
        const currentUserId = user?.id; // user object already has 'id'
        if (targetUser?.email === user?.email || targetUser?.id === currentUserId) {
            alert("🛑 ACTION INTERDITE 🛑\n\nCe profil fantôme est lié à VOTRE session actuelle.\nLe supprimer couperait votre accès immédiatement.");
            return;
        }

        // PROTECTION 1: Prevent self-deletion (redundant but safe)
        if (userId === user?.id) {
            alert("🚫 Vous ne pouvez pas supprimer votre propre profil !");
            return;
        }

        // Find target user profile for ghost detection
        const targetProfile = users.find(u => u.id === userId);

        // PROTECTION 2: Warn about ghost profiles (incomplete profiles)
        const isGhost = !targetProfile?.firstName || !targetProfile?.lastName;

        let confirmMessage: string;
        if (isGhost) {
            // CONFIRMATION IF UNLINKED (Safe to delete)
            confirmMessage = `👻 PROFIL FANTÔME DÉTECTÉ\n\n` +
                `Statut : Non lié à votre compte administrateur.\n` +
                `Nom: ${userName || 'Non défini'}\n` +
                `Email: ${targetProfile?.email || 'Non défini'}\n\n` +
                `Ce profil semble être une coquille vide ou un ancien accès.\n` +
                `Vous pouvez probablement le supprimer sans risque.\n\n` +
                `Voulez-vous le supprimer définitivement ?`;
        } else {
            confirmMessage = `Êtes-vous sûr de vouloir supprimer l'utilisateur "${userName}" ?`;
        }

        if (window.confirm(confirmMessage)) {
            try {
                // Use centralized deleteUser
                await deleteUser(userId);
                setUsers(prev => prev.filter(u => u.id !== userId));
            } catch (err: unknown) {
                alert(`Erreur lors de la suppression: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
    };

    const handleDeleteProject = async (projectId: string, projectName: string) => {
        if (window.confirm(`ATTENTION: Voulez-vous vraiment supprimer le projet "${projectName}" ?\n\nCette action est irréversible.`)) {
            try {
                await deleteProject(projectId);
                setProjectsList(prev => prev.filter(p => p.id !== projectId));
            } catch (err: unknown) {
                alert(`Erreur: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
    };

    const handleValidateTransaction = async (transaction: Transaction) => {
        if (transaction.status !== 'PENDING') return;
        try {
            await validateTransactionAction(transaction);
            setTransactions(prev => prev.map(t => t.id === transaction.id ? { ...t, status: 'VALIDATED', invoicedAt: new Date().toISOString() } : t));
            alert("Transaction validée et prête pour facturation !");
        } catch (e: unknown) {
            alert("Erreur validation: " + (e instanceof Error ? e.message : String(e)));
        }
    };

    const handleRejectTransaction = async (transaction: Transaction) => {
        if (!window.confirm("Voulez-vous vraiment refuser cette vente ? Le stock sera remis en vente.")) return;

        try {
            await rejectTransactionAction(transaction);
            setTransactions(prev => prev.map(t => t.id === transaction.id ? { ...t, status: 'CANCELLED' } : t));
            alert("Transaction refusée et stock restauré.");
        } catch (e: unknown) {
            alert("Erreur rejet: " + (e instanceof Error ? e.message : String(e)));
        }
    };

    const filteredTransactions = transactions.filter(t =>
        (t.sellerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.buyerName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const exportTransactionsCSV = (groupBy: 'seller' | 'buyer' | 'date', specificData?: Transaction[], filenameSuffix?: string) => {
        const headers = ["ID", "Date", "Vendeur", "Acheteur", "Articles", "Montant Total", "Statut"];

        const dataToExport = specificData || filteredTransactions;

        // Sort based on requested grouping (default date if specific data)
        const sortedTransactions = [...dataToExport].sort((a, b) => {
            if (groupBy === 'seller') return a.sellerName.localeCompare(b.sellerName) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (groupBy === 'buyer') return a.buyerName.localeCompare(b.buyerName) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        const rows = sortedTransactions.map(t => [
            t.id,
            new Date(t.createdAt).toLocaleDateString(),
            t.sellerName,
            t.buyerName,
            t.items.map(i => `${i.quantity}x ${i.name}`).join('; '),
            t.totalAmount + ' €',
            t.status
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `transactions_${filenameSuffix || groupBy}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    const handleApproveUser = async (userId: string) => {
        try {
            await approveUserAction(userId);
            // Update local state
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'approved' } : u));
        } catch (err: unknown) {
            alert("Erreur validation : " + (err instanceof Error ? err.message : String(err)));
        }
    };

    const handleRejectUser = async (userId: string) => {
        if (!window.confirm("Voulez-vous vraiment refuser cet utilisateur ? Il ne pourra pas accéder à l'application.")) return;
        try {
            await rejectUserAction(userId);
            // Update local state
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'rejected' } : u));
        } catch (err: unknown) {
            alert("Erreur rejet : " + (err instanceof Error ? err.message : String(err)));
        }
    };

    const startEditing = (type: 'USER' | 'PROJECT', item: User | Project) => {
        setEditingId(item.id);
        setEditForm({ ...item });
    };

    const saveEdit = async (type: 'USER' | 'PROJECT') => {
        try {
            const collectionName = type === 'USER' ? 'users' : 'projects';

            // Clean up localized fields that shouldn't be in DB if present
            const { id, ...dataToSave } = editForm;

            await updateGenericDocumentAction(collectionName, editingId!, dataToSave);

            // Update local state
            if (type === 'USER') {
                setUsers(prev => prev.map(u => u.id === editingId ? { ...u, ...(dataToSave as Partial<User>) } as User : u));
            } else {
                setProjectsList(prev => prev.map(p => p.id === editingId ? { ...p, ...(dataToSave as Partial<ProjectWithOffline>) } as ProjectWithOffline : p));
            }

            setEditingId(null);
            setEditForm({});
        } catch (err: unknown) {
            console.error("Update error", err);
            alert("Erreur de sauvegarde : " + (err instanceof Error ? err.message : String(err)));
        }
    };

    const renderHeader = (title: string, subtitle: string, icon: React.ReactNode) => (
        <div className="p-6 border-b border-cinema-700 flex flex-col md:flex-row justify-between md:items-center gap-4 bg-cinema-800/50">
            <div className="flex items-center gap-3">
                {view !== 'DASHBOARD' && (
                    <button
                        onClick={() => setView('DASHBOARD')}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors mr-2"
                    >
                        <ArrowLeft className="h-5 w-5 text-slate-400" />
                    </button>
                )}
                <div className="p-2 bg-cinema-700/50 rounded-lg">
                    {icon}
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <p className="text-sm text-slate-400">{subtitle}</p>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                    type="text"
                    list="production-names"
                    placeholder="Rechercher une production..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-cinema-900 border border-cinema-700 text-white text-sm rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-eco-500 focus:outline-none w-full md:w-64"
                />
                <datalist id="production-names">
                    {allProductionNames.map(name => (
                        <option key={name} value={name} />
                    ))}
                </datalist>
            </div>
        </div>

    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* WIDGETS (Always visible but act as navigation) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div
                    onClick={() => setView('USERS')}
                    className={`bg-cinema-800 p-6 rounded-xl border ${view === 'USERS' ? 'border-eco-500 ring-2 ring-eco-500/20' : 'border-cinema-700'} shadow-lg relative overflow-hidden group hover:border-eco-500/50 transition-all cursor-pointer`}
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users className="h-24 w-24 text-eco-500" />
                    </div>
                    <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Membres de l'équipe</h3>
                    <p className="text-4xl font-bold text-white mb-1">{stats.totalUsers}</p>
                    <p className="text-xs text-eco-400 font-medium">Personnes inscrites</p>
                </div>

                <div
                    onClick={() => setView('PRODUCTIONS')}
                    className={`bg-cinema-800 p-6 rounded-xl border ${view === 'PRODUCTIONS' ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-cinema-700'} shadow-lg relative overflow-hidden group hover:border-purple-500/50 transition-all cursor-pointer`}
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Building2 className="h-24 w-24 text-purple-500" />
                    </div>
                    <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Productions Actives</h3>
                    <p className="text-4xl font-bold text-white mb-1">{stats.activeProductions}</p>
                    <p className="text-xs text-purple-400 font-medium">Gérer les productions</p>
                </div>

                <div
                    onClick={() => setView('PROJECTS')}
                    className={`bg-cinema-800 p-6 rounded-xl border ${view === 'PROJECTS' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-cinema-700'} shadow-lg relative overflow-hidden group hover:border-blue-500/50 transition-all cursor-pointer`}
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Film className="h-24 w-24 text-blue-500" />
                    </div>
                    <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Projets / Films</h3>
                    <p className="text-4xl font-bold text-white mb-1">{stats.activeFilms}</p>
                    <p className="text-xs text-blue-400 font-medium">Gérer les projets</p>
                </div>
                <div
                    onClick={() => setView('RESALES')}
                    className={`bg-cinema-800 p-6 rounded-xl border ${view === 'RESALES' ? 'border-yellow-500 ring-2 ring-yellow-500/20' : 'border-cinema-700'} shadow-lg relative overflow-hidden group hover:border-yellow-500/50 transition-all cursor-pointer`}
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ShoppingCart className="h-24 w-24 text-yellow-500" />
                    </div>
                    <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Reventes & Facturation</h3>
                    <p className="text-4xl font-bold text-white mb-1">{transactions.length}</p>
                    <p className="text-xs text-yellow-500 font-medium">Gérer les transactions</p>
                </div>

                <div
                    onClick={() => setView('RESET')}
                    className={`bg-cinema-800 p-6 rounded-xl border ${view === 'RESET' ? 'border-red-600 ring-2 ring-red-600/20' : 'border-cinema-700 bg-red-950/10'} shadow-lg relative overflow-hidden group hover:border-red-600/50 transition-all cursor-pointer`}
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <AlertTriangle className="h-24 w-24 text-red-600" />
                    </div>
                    <h3 className="text-red-400 text-sm font-medium uppercase tracking-wider mb-2">Zone de Danger</h3>
                    <p className="text-4xl font-bold text-white mb-1">RESET</p>
                    <p className="text-xs text-red-500 font-medium">Réinitialisation complète</p>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="bg-cinema-800 border border-cinema-700 rounded-xl overflow-hidden shadow-2xl min-h-[400px]">

                {/* DASHBOARD OVERVIEW */}
                {view === 'DASHBOARD' && (
                    <div className="p-12 text-center text-slate-500">
                        <ShieldCheck className="h-16 w-16 mx-auto mb-4 opacity-20" />
                        <h3 className="text-lg font-medium text-white mb-2">Bienvenue dans l'Administration</h3>
                        <p>Sélectionnez une catégorie ci-dessus pour gérer les données.</p>
                    </div>
                )}

                {/* USERS VIEW */}
                {view === 'USERS' && (
                    <AdminUsersList
                        users={users}
                        projectsList={projectsList}
                        user={user}
                        editingId={editingId}
                        editForm={editForm}
                        setEditingId={setEditingId}
                        setEditForm={setEditForm}
                        saveEdit={saveEdit}
                        startEditing={startEditing}
                        handleApproveUser={handleApproveUser}
                        handleRejectUser={handleRejectUser}
                        handleDeleteUser={handleDeleteUser}
                        renderHeader={renderHeader}
                    />
                )}

                {/* PROJECTS VIEW */}
                {view === 'PROJECTS' && (
                    <AdminProjectsList
                        filteredProjects={filteredProjects}
                        users={users}
                        editingId={editingId}
                        editForm={editForm}
                        setEditingId={setEditingId}
                        setEditForm={setEditForm}
                        saveEdit={saveEdit}
                        startEditing={startEditing}
                        handleDeleteProject={handleDeleteProject}
                        renderHeader={renderHeader}
                    />
                )}

                {/* PRODUCTIONS VIEW */}
                {view === 'PRODUCTIONS' && (
                    <AdminProductionsList
                        productions={productions}
                        renderHeader={renderHeader}
                    />
                )}

                {/* RESALES VIEW */}
                {view === 'RESALES' && (
                    <AdminResalesList
                        filteredTransactions={filteredTransactions}
                        searchTerm={searchTerm}
                        resalesGroupBy={resalesGroupBy}
                        setResalesGroupBy={setResalesGroupBy}
                        exportTransactionsCSV={exportTransactionsCSV}
                        handleValidateTransaction={handleValidateTransaction}
                        handleRejectTransaction={handleRejectTransaction}
                        generateInvoice={generateInvoice}
                        renderHeader={renderHeader}
                    />
                )}
                {/* DANGER ZONE VIEW */}
                {view === 'RESET' && (
                    <div className="p-8 max-w-2xl mx-auto">
                        <div className="border border-red-600/30 bg-red-950/20 rounded-xl p-8 text-center space-y-6">
                            <div className="mx-auto w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mb-4 ring-2 ring-red-600/50 animate-pulse">
                                <AlertTriangle className="h-10 w-10 text-red-500" />
                            </div>

                            <h2 className="text-2xl font-bold text-white">Réinitialisation Globale</h2>

                            <div className="text-red-200 bg-red-950/40 p-4 rounded-lg text-sm text-left">
                                <p className="font-bold mb-2 uppercase flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" /> Attention : Action Irréversible
                                </p>
                                <ul className="list-disc list-inside space-y-1 opacity-90">
                                    <li>Toutes les productions et projets seront supprimés.</li>
                                    <li>Toutes les transactions et reventes seront effacées.</li>
                                    <li>L'historique des projets de tous les utilisateurs sera vidé.</li>
                                    <li><strong className="text-white">Les comptes utilisateurs (Authentification) et leurs profils seront CONSERVÉS.</strong></li>
                                </ul>
                            </div>

                            <div className="space-y-4 pt-4">
                                <p className="text-slate-400 text-sm">
                                    Pour confirmer, veuillez taper <span className="font-mono bg-black px-2 py-0.5 rounded text-white select-all">SUPPRIMER-TOUT</span> ci-dessous :
                                </p>
                                <input
                                    type="text"
                                    className="w-full bg-black border border-red-900 rounded-lg px-4 py-3 text-center text-white font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                                    placeholder="SUPPRIMER-TOUT"
                                    value={resetConfirm}
                                    onChange={(e) => setResetConfirm(e.target.value)}
                                />
                            </div>

                            <button
                                disabled={resetConfirm !== 'SUPPRIMER-TOUT'}
                                onClick={async () => {
                                    if (window.confirm("DERNIÈRE CHANCE : Êtes-vous ABSOLUMENT SÛR ?")) {
                                        try {
                                            await deleteAllData();
                                            setResetConfirm("");
                                            setView('DASHBOARD');
                                            fetchData(); // Refresh local list
                                        } catch (e: any) {
                                            alert(e.message);
                                        }
                                    }
                                }}
                                className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${resetConfirm === 'SUPPRIMER-TOUT'
                                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)] scale-105'
                                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    }`}
                            >
                                <Trash2 className="inline-block mr-2 h-5 w-5" />
                                CONFIRMER LA RÉINITIALISATION
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
