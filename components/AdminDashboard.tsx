import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, doc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../services/firebase';
import { User } from '../types';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Search, Users, Building2, Calendar, Film, Trash2, ArrowLeft, Edit2, Save, X, ShoppingCart, FileText, CheckCircle, Download, Filter, AlertTriangle } from 'lucide-react';
import { generateInvoice } from '../utils/invoiceGenerator';
import { Transaction } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type ViewMode = 'DASHBOARD' | 'USERS' | 'PRODUCTIONS' | 'PROJECTS' | 'RESALES' | 'RESET';

export const AdminDashboard: React.FC = () => {
    const [view, setView] = useState<ViewMode>('DASHBOARD');
    const [users, setUsers] = useState<User[]>([]);
    const [projectsList, setProjectsList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { user } = useAuth(); // Get current logged-in user
    const { deleteProject, deleteUser, deleteAllData } = useProject();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [resalesGroupBy, setResalesGroupBy] = useState<'seller' | 'buyer' | 'date'>('seller'); // Default to seller as requested
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [resetConfirm, setResetConfirm] = useState("");

    const [showGhostsOnly, setShowGhostsOnly] = useState(false); // Added for ghost filtering

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch Users
            const usersQ = query(collection(db, 'users'));
            const usersSnap = await getDocs(usersQ);
            // We need to store doc ID for users to delete them using deleteDoc
            setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User & { id: string })));

            // Fetch Projects
            const projectsQ = query(collection(db, 'projects'));
            const projectsSnap = await getDocs(projectsQ);
            setProjectsList(projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            // Fetch Transactions
            const transQ = query(collection(db, 'transactions'));
            const transSnap = await getDocs(transQ);
            setTransactions(transSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));

        } catch (error) {
            console.error("Error fetching data:", error);
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

        if (showGhostsOnly) {
            const isGhost = !u.firstName || !u.lastName;
            return matchesSearch && isGhost;
        }

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
        const targetUser = users.find(u => (u as any).id === userId);

        // Block Deletion of Super Admin
        if (targetUser?.email === 'romperset@gmail.com') {
            alert("🛑 ACTION INTERDITE 🛑\n\nCe compte est le SUPER ADMIN du système.\nIl ne peut pas être supprimé.");
            return;
        }

        // PROTECTION B: Prevent deleting a ghost profile that is actually YOUR account
        // Note: user object usually has 'id' in our app, 'uid' might be from Firebase User object directly.
        // We check both to be safe, but safely.
        const currentUserId = user?.id || (user as any)?.uid;
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
        const targetProfile = users.find(u => (u as any).id === userId);

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
                setUsers(prev => prev.filter(u => (u as any).id !== userId));
            } catch (err: any) {
                alert(`Erreur lors de la suppression: ${err.message}`);
            }
        }
    };

    const handleDeleteProject = async (projectId: string, projectName: string) => {
        if (window.confirm(`ATTENTION: Voulez-vous vraiment supprimer le projet "${projectName}" ?\n\nCette action est irréversible.`)) {
            try {
                await deleteProject(projectId);
                setProjectsList(prev => prev.filter(p => p.id !== projectId));
            } catch (err: any) {
                alert(`Erreur: ${err.message}`);
            }
        }
    };

    const handleValidateTransaction = async (transaction: Transaction) => {
        if (transaction.status !== 'PENDING') return;
        try {
            await updateDoc(doc(db, 'transactions', transaction.id), {
                status: 'VALIDATED',
                invoicedAt: new Date().toISOString()
            });
            setTransactions(prev => prev.map(t => t.id === transaction.id ? { ...t, status: 'VALIDATED', invoicedAt: new Date().toISOString() } : t));
            alert("Transaction validée et prête pour facturation !");
        } catch (e: any) {
            alert("Erreur validation: " + e.message);
        }
    };

    const handleRejectTransaction = async (transaction: Transaction) => {
        if (!window.confirm("Voulez-vous vraiment refuser cette vente ? Le stock sera remis en vente.")) return;

        try {
            // 1. Update Transaction Status
            await updateDoc(doc(db, 'transactions', transaction.id), {
                status: 'CANCELLED'
            });

            // 2. Restore Stock
            await Promise.all(transaction.items.map(async (item) => {
                try {
                    const itemRef = doc(db, 'projects', transaction.sellerId, 'items', item.id);
                    await updateDoc(itemRef, {
                        quantityCurrent: increment(item.quantity)
                    });
                } catch (e) {
                    console.error("Error restoring stock for item", item.id, e);
                }
            }));

            // 3. Update Local State
            setTransactions(prev => prev.map(t => t.id === transaction.id ? { ...t, status: 'CANCELLED' } : t));

            alert("Transaction refusée et stock restauré.");
        } catch (e: any) {
            alert("Erreur rejet: " + e.message);
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
            await updateDoc(doc(db, 'users', userId), { status: 'approved' });
            // Update local state
            setUsers(prev => prev.map(u => (u as any).id === userId ? { ...u, status: 'approved' } : u));
        } catch (err: any) {
            alert("Erreur validation : " + err.message);
        }
    };

    const handleRejectUser = async (userId: string) => {
        if (!window.confirm("Voulez-vous vraiment refuser cet utilisateur ? Il ne pourra pas accéder à l'application.")) return;
        try {
            await updateDoc(doc(db, 'users', userId), { status: 'rejected' });
            // Update local state
            setUsers(prev => prev.map(u => (u as any).id === userId ? { ...u, status: 'rejected' } : u));
        } catch (err: any) {
            alert("Erreur rejet : " + err.message);
        }
    };

    const startEditing = (type: 'USER' | 'PROJECT', item: any) => {
        setEditingId(item.id);
        setEditForm({ ...item });
    };

    const saveEdit = async (type: 'USER' | 'PROJECT') => {
        try {
            const collectionName = type === 'USER' ? 'users' : 'projects';
            const ref = doc(db, collectionName, editingId!);

            // Clean up localized fields that shouldn't be in DB if present
            const { id, ...dataToSave } = editForm;

            await updateDoc(ref, dataToSave);

            // Update local state
            if (type === 'USER') {
                setUsers(prev => prev.map(u => (u as any).id === editingId ? { ...u, ...dataToSave } : u));
            } else {
                setProjectsList(prev => prev.map(p => p.id === editingId ? { ...p, ...dataToSave } : p));
            }

            setEditingId(null);
            setEditForm({});
        } catch (err: any) {
            console.error("Update error", err);
            alert("Erreur de sauvegarde : " + err.message);
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
                    <>
                        {renderHeader('Gestion Utilisateurs', `${filteredUsers.length} utilisateurs trouvés`, <Users className="h-6 w-6 text-eco-500" />)}

                        {/* Ghost Filter Toggle */}
                        <div className="bg-cinema-800 border-b border-cinema-700 px-6 py-2 flex items-center justify-end">
                            <label className="flex items-center space-x-2 cursor-pointer text-sm text-slate-300 hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={showGhostsOnly}
                                    onChange={(e) => setShowGhostsOnly(e.target.checked)}
                                    className="rounded border-cinema-600 bg-cinema-700 text-eco-500 focus:ring-eco-500/50"
                                />
                                <span className={showGhostsOnly ? "text-yellow-400 font-bold" : ""}>
                                    Afficher uniquement les profils FANTÔMES 👻
                                </span>
                            </label>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-cinema-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-cinema-700">
                                        <th className="px-6 py-4 font-semibold">Identité</th>
                                        <th className="px-6 py-4 font-semibold">Statut</th>
                                        <th className="px-6 py-4 font-semibold">Département</th>
                                        <th className="px-6 py-4 font-semibold">Projet</th>
                                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cinema-700 text-sm">
                                    {filteredUsers
                                        .sort((a, b) => (a.status === 'pending' === (b.status === 'pending')) ? 0 : a.status === 'pending' ? -1 : 1)
                                        .map((u: any) => {
                                            const isGhost = !u.firstName || !u.lastName;
                                            const isSelf = u.id === user?.id;
                                            const isSuperAdmin = u.email === 'romperset@gmail.com';
                                            // Safely get current user ID
                                            const currentUserId = user?.id || (user as any)?.uid;
                                            const isLinkedToMe = u.email === user?.email || u.id === currentUserId;

                                            return (
                                                <tr key={u.id} className={`hover:bg-cinema-700/30 transition-colors group ${u.status === 'pending' ? 'bg-yellow-500/5' : ''} ${isGhost ? 'bg-yellow-900/10' : ''} ${isSuperAdmin ? 'bg-purple-900/20 border-l-4 border-purple-500' : ''} ${isLinkedToMe && isGhost ? 'border-l-4 border-orange-500 bg-orange-900/10' : ''}`}>
                                                    <td className="px-6 py-4">
                                                        {editingId === u.id ? (
                                                            <div className="space-y-2">
                                                                <input
                                                                    className="bg-cinema-900 border border-cinema-600 rounded px-2 py-1 w-full text-white"
                                                                    value={editForm.name || ''}
                                                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                                />
                                                                <input
                                                                    className="bg-cinema-900 border border-cinema-600 rounded px-2 py-1 w-full text-xs text-slate-400"
                                                                    value={editForm.email || ''}
                                                                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-3">
                                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-white relative ${isSuperAdmin ? 'bg-purple-600 ring-2 ring-purple-400' : 'bg-slate-700'}`}>
                                                                    {u.name?.charAt(0)}
                                                                    {u.status === 'pending' && <span className="absolute -top-1 -right-1 h-3 w-3 bg-yellow-500 rounded-full border-2 border-cinema-800"></span>}
                                                                </div>
                                                                <div>
                                                                    <div className="font-medium text-white flex items-center gap-2">
                                                                        {u.name}
                                                                        {isSuperAdmin && (
                                                                            <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-bold rounded border border-purple-500/30 flex items-center gap-1">
                                                                                👑 SUPER ADMIN
                                                                            </span>
                                                                        )}
                                                                        {isLinkedToMe && isGhost && (
                                                                            <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] font-bold rounded border border-orange-500/30 flex items-center gap-1">
                                                                                ⚠️ LIÉ À VOTRE COMPTE
                                                                            </span>
                                                                        )}
                                                                        {isGhost && !isSuperAdmin && !isLinkedToMe && (
                                                                            <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] font-bold rounded border border-yellow-500/30">
                                                                                👻 FANTÔME
                                                                            </span>
                                                                        )}
                                                                        {isSelf && (
                                                                            <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded border border-blue-500/30">
                                                                                VOUS
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-xs text-slate-500">{u.email}</div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {u.status === 'pending' ? (
                                                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 animate-pulse">
                                                                En attente
                                                            </span>
                                                        ) : u.status === 'rejected' ? (
                                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                                                                Rejeté
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                                                                Approuvé
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {editingId === u.id ? (
                                                            <input
                                                                className="bg-cinema-900 border border-cinema-600 rounded px-2 py-1 w-full text-white"
                                                                value={editForm.department || ''}
                                                                onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                                                            />
                                                        ) : (
                                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-cinema-700 text-slate-300 border border-cinema-600">
                                                                {u.department}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-300">
                                                        {u.filmTitle || 'Aucun'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {editingId === u.id ? (
                                                                <>
                                                                    <button onClick={() => saveEdit('USER')} className="text-eco-400 hover:bg-eco-500/20 p-2 rounded"><Save className="h-4 w-4" /></button>
                                                                    <button onClick={() => setEditingId(null)} className="text-red-400 hover:bg-red-500/20 p-2 rounded"><X className="h-4 w-4" /></button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {u.status === 'pending' && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => handleApproveUser(u.id)}
                                                                                className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs font-bold mr-2 transition-colors"
                                                                            >
                                                                                Valider
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleRejectUser(u.id)}
                                                                                className="bg-red-600/20 hover:bg-red-600/40 text-red-400 px-3 py-1 rounded text-xs font-bold mr-2 transition-colors border border-red-600/20"
                                                                            >
                                                                                Refuser
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                    <button onClick={() => startEditing('USER', u)} className="text-slate-400 hover:text-white p-2"><Edit2 className="h-4 w-4" /></button>
                                                                    {(!isSelf && !isSuperAdmin && !isLinkedToMe) ? (
                                                                        <button onClick={() => handleDeleteUser(u.id, u.name)} className="text-red-500 hover:bg-red-500/20 p-2 rounded"><Trash2 className="h-4 w-4" /></button>
                                                                    ) : (
                                                                        <button disabled className="text-slate-600 p-2 rounded cursor-not-allowed opacity-50" title={isLinkedToMe ? "NE PAS SUPPRIMER : Lié à votre compte" : (isSuperAdmin ? "Super Admin protégé" : "Vous ne pouvez pas vous supprimer vous-même")}><Trash2 className="h-4 w-4" /></button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* PROJECTS VIEW */}
                {view === 'PROJECTS' && (
                    <>
                        {renderHeader('Gestion Projets', `${filteredProjects.length} projets actifs`, <Film className="h-6 w-6 text-blue-500" />)}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-cinema-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-cinema-700">
                                        <th className="px-6 py-4 font-semibold">Titre</th>
                                        <th className="px-6 py-4 font-semibold">Production</th>
                                        <th className="px-6 py-4 font-semibold">Équipe</th>
                                        <th className="px-6 py-4 font-semibold">ID</th>
                                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cinema-700 text-sm">
                                    {filteredProjects.map((p) => (
                                        <tr key={p.id} className="hover:bg-cinema-700/30 transition-colors">
                                            <td className="px-6 py-4 text-white font-medium">
                                                {editingId === p.id ? (
                                                    <input
                                                        className="bg-cinema-900 border border-cinema-600 rounded px-2 py-1 w-full text-white"
                                                        value={editForm.name || ''}
                                                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                    />
                                                ) : p.name}
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">
                                                {editingId === p.id ? (
                                                    <input
                                                        className="bg-cinema-900 border border-cinema-600 rounded px-2 py-1 w-full text-white"
                                                        value={editForm.productionCompany || ''}
                                                        onChange={e => setEditForm({ ...editForm, productionCompany: e.target.value })}
                                                    />
                                                ) : p.productionCompany}
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-eco-500" />
                                                    <span>
                                                        {users.filter(u => (u as any).currentProjectId === p.id).length}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-500 font-mono">{p.id}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {editingId === p.id ? (
                                                        <>
                                                            <button onClick={() => saveEdit('PROJECT')} className="text-eco-400 hover:bg-eco-500/20 p-2 rounded"><Save className="h-4 w-4" /></button>
                                                            <button onClick={() => setEditingId(null)} className="text-red-400 hover:bg-red-500/20 p-2 rounded"><X className="h-4 w-4" /></button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => startEditing('PROJECT', p)} className="text-slate-400 hover:text-white p-2"><Edit2 className="h-4 w-4" /></button>
                                                            <button onClick={() => handleDeleteProject(p.id, p.name)} className="text-red-500 hover:bg-red-500/20 p-2 rounded"><Trash2 className="h-4 w-4" /></button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* PRODUCTIONS VIEW */}
                {view === 'PRODUCTIONS' && (
                    <>
                        {renderHeader('Productions', `${productions.length} sociétés référencées`, <Building2 className="h-6 w-6 text-purple-500" />)}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-cinema-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-cinema-700">
                                        <th className="px-6 py-4 font-semibold">Nom de la Production</th>
                                        <th className="px-6 py-4 font-semibold">Nombre de projets</th>
                                        <th className="px-6 py-4 font-semibold">Projets associés</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cinema-700 text-sm">
                                    {productions.map((prod, idx) => (
                                        <tr key={idx} className="hover:bg-cinema-700/30 transition-colors">
                                            <td className="px-6 py-4 text-white font-medium">{prod.name}</td>
                                            <td className="px-6 py-4 text-slate-300">{prod.projectCount}</td>
                                            <td className="px-6 py-4 text-slate-400 text-xs">
                                                {prod.projects.map(p => p.name).join(', ')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* RESALES VIEW */}
                {view === 'RESALES' && (
                    <>
                        {renderHeader('Gestion des Reventes (Inter-Prod)', `${filteredTransactions.length} transactions affichées`, <ShoppingCart className="h-6 w-6 text-yellow-500" />)}

                        <div className="p-4 bg-cinema-900/30 border-b border-cinema-700 flex flex-col md:flex-row justify-between gap-4 items-center">
                            {/* Grouping Controls */}
                            <div className="flex gap-2">
                                <span className="text-slate-400 text-sm flex items-center gap-2 mr-2">
                                    <Filter className="h-4 w-4" /> Grouper par :
                                </span>
                                <button
                                    onClick={() => setResalesGroupBy('seller')}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${resalesGroupBy === 'seller' ? 'bg-yellow-500 text-black' : 'bg-cinema-800 text-slate-400 hover:text-white'}`}
                                >
                                    Vendeur
                                </button>
                                <button
                                    onClick={() => setResalesGroupBy('buyer')}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${resalesGroupBy === 'buyer' ? 'bg-yellow-500 text-black' : 'bg-cinema-800 text-slate-400 hover:text-white'}`}
                                >
                                    Acheteur
                                </button>
                                <button
                                    onClick={() => setResalesGroupBy('date')}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${resalesGroupBy === 'date' ? 'bg-yellow-500 text-black' : 'bg-cinema-800 text-slate-400 hover:text-white'}`}
                                >
                                    Date
                                </button>
                            </div>

                            {/* Export Controls */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => exportTransactionsCSV('seller')}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-cinema-700 hover:bg-cinema-600 text-white rounded-lg text-xs font-medium transition-colors border border-cinema-600"
                                >
                                    <Download className="h-3 w-3" />
                                    CSV (Par Vendeur)
                                </button>
                                <button
                                    onClick={() => exportTransactionsCSV('buyer')}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-cinema-700 hover:bg-cinema-600 text-white rounded-lg text-xs font-medium transition-colors border border-cinema-600"
                                >
                                    <Download className="h-3 w-3" />
                                    CSV (Par Acheteur)
                                </button>
                            </div>
                        </div>

                        {searchTerm ? (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* VENTES (Sales) - When searched entity is SELLER */}
                                <div className="bg-cinema-800/50 rounded-xl overflow-hidden border border-cinema-700">
                                    <div className="bg-emerald-900/30 px-6 py-4 border-b border-emerald-500/20 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                                <Building2 className="h-5 w-5 text-emerald-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white text-lg">Ses Ventes / Recettes</h3>
                                                <p className="text-sm text-emerald-400/70">Transactions où "{searchTerm}" est vendeur</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => exportTransactionsCSV('date', filteredTransactions.filter(t => (t.sellerName || '').toLowerCase().includes(searchTerm.toLowerCase())), `ventes_${searchTerm}`)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium transition-colors"
                                        >
                                            <Download className="h-3 w-3" />
                                            Export Ventes
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-cinema-900/50 text-emerald-400/70 text-xs uppercase tracking-wider border-b border-cinema-700">
                                                    <th className="px-6 py-4 font-semibold w-32">Date</th>
                                                    <th className="px-6 py-4 font-semibold">Acheteur</th>
                                                    <th className="px-6 py-4 font-semibold">Articles</th>
                                                    <th className="px-6 py-4 font-semibold">Montant</th>
                                                    <th className="px-6 py-4 font-semibold">Statut</th>
                                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-cinema-700 text-sm">
                                                {filteredTransactions
                                                    .filter(t => (t.sellerName || '').toLowerCase().includes(searchTerm.toLowerCase()))
                                                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                                    .map((t) => (
                                                        <tr key={t.id} className="hover:bg-cinema-700/30 transition-colors">
                                                            <td className="px-6 py-4 text-slate-300">
                                                                {new Date(t.createdAt).toLocaleDateString()}
                                                                <div className="text-xs text-slate-500">{new Date(t.createdAt).toLocaleTimeString()}</div>
                                                            </td>
                                                            <td className="px-6 py-4 text-white font-medium">{t.buyerName}</td>
                                                            <td className="px-6 py-4 text-slate-300 text-xs">
                                                                <ul className="list-disc list-inside">
                                                                    {t.items.slice(0, 2).map((i, idx) => (
                                                                        <li key={idx}>{i.quantity}x {i.name} ({i.price}€)</li>
                                                                    ))}
                                                                    {t.items.length > 2 && <li>... (+{t.items.length - 2})</li>}
                                                                </ul>
                                                            </td>
                                                            <td className="px-6 py-4 text-yellow-400 font-bold font-mono">{t.totalAmount.toFixed(2)} €</td>
                                                            <td className="px-6 py-4">
                                                                {t.status === 'PENDING' ? (
                                                                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 animate-pulse">En attente</span>
                                                                ) : t.status === 'CANCELLED' ? (
                                                                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-500 border border-red-500/30 flex items-center w-fit gap-1"><X className="h-3 w-3" /> Refusé</span>
                                                                ) : (
                                                                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-500 border border-green-500/30 flex items-center w-fit gap-1"><CheckCircle className="h-3 w-3" /> Validé</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                {/* ACTIONS SAME AS BEFORE */}
                                                                <div className="flex justify-end gap-2">
                                                                    {t.status === 'PENDING' && (
                                                                        <>
                                                                            <button onClick={() => handleValidateTransaction(t)} className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-lg shadow-green-600/20"><CheckCircle className="h-3 w-3" /> Valider</button>
                                                                            <button onClick={() => handleRejectTransaction(t)} className="flex items-center gap-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/30 px-3 py-1.5 rounded text-xs font-bold transition-colors"><X className="h-3 w-3" /> Refuser</button>
                                                                        </>
                                                                    )}
                                                                    {t.status === 'VALIDATED' && (
                                                                        <button onClick={() => generateInvoice(t)} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-lg shadow-blue-600/20"><FileText className="h-3 w-3" /> Facture</button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                {filteredTransactions.filter(t => (t.sellerName || '').toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">Aucune vente trouvée pour cette recherche.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* ACHATS (Purchases) - When searched entity is BUYER */}
                                <div className="bg-cinema-800/50 rounded-xl overflow-hidden border border-cinema-700">
                                    <div className="bg-blue-900/30 px-6 py-4 border-b border-blue-500/20 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                                <ShoppingCart className="h-5 w-5 text-blue-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white text-lg">Ses Achats / Dépenses</h3>
                                                <p className="text-sm text-blue-400/70">Transactions où "{searchTerm}" est acheteur</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => exportTransactionsCSV('date', filteredTransactions.filter(t => (t.buyerName || '').toLowerCase().includes(searchTerm.toLowerCase())), `achats_${searchTerm}`)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium transition-colors"
                                        >
                                            <Download className="h-3 w-3" />
                                            Export Achats
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-cinema-900/50 text-blue-400/70 text-xs uppercase tracking-wider border-b border-cinema-700">
                                                    <th className="px-6 py-4 font-semibold w-32">Date</th>
                                                    <th className="px-6 py-4 font-semibold">Vendeur</th>
                                                    <th className="px-6 py-4 font-semibold">Articles</th>
                                                    <th className="px-6 py-4 font-semibold">Montant</th>
                                                    <th className="px-6 py-4 font-semibold">Statut</th>
                                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-cinema-700 text-sm">
                                                {filteredTransactions
                                                    .filter(t => (t.buyerName || '').toLowerCase().includes(searchTerm.toLowerCase()))
                                                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                                    .map((t) => (
                                                        <tr key={t.id} className="hover:bg-cinema-700/30 transition-colors">
                                                            <td className="px-6 py-4 text-slate-300">
                                                                {new Date(t.createdAt).toLocaleDateString()}
                                                                <div className="text-xs text-slate-500">{new Date(t.createdAt).toLocaleTimeString()}</div>
                                                            </td>
                                                            <td className="px-6 py-4 text-white font-medium">{t.sellerName}</td>
                                                            <td className="px-6 py-4 text-slate-300 text-xs">
                                                                <ul className="list-disc list-inside">
                                                                    {t.items.slice(0, 2).map((i, idx) => (
                                                                        <li key={idx}>{i.quantity}x {i.name} ({i.price}€)</li>
                                                                    ))}
                                                                    {t.items.length > 2 && <li>... (+{t.items.length - 2})</li>}
                                                                </ul>
                                                            </td>
                                                            <td className="px-6 py-4 text-yellow-400 font-bold font-mono">{t.totalAmount.toFixed(2)} €</td>
                                                            <td className="px-6 py-4">
                                                                {t.status === 'PENDING' ? (
                                                                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 animate-pulse">En attente</span>
                                                                ) : t.status === 'CANCELLED' ? (
                                                                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-500 border border-red-500/30 flex items-center w-fit gap-1"><X className="h-3 w-3" /> Refusé</span>
                                                                ) : (
                                                                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-500 border border-green-500/30 flex items-center w-fit gap-1"><CheckCircle className="h-3 w-3" /> Validé</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    {t.status === 'PENDING' && (
                                                                        <>
                                                                            <button onClick={() => handleValidateTransaction(t)} className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-lg shadow-green-600/20"><CheckCircle className="h-3 w-3" /> Valider</button>
                                                                            <button onClick={() => handleRejectTransaction(t)} className="flex items-center gap-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/30 px-3 py-1.5 rounded text-xs font-bold transition-colors"><X className="h-3 w-3" /> Refuser</button>
                                                                        </>
                                                                    )}
                                                                    {t.status === 'VALIDATED' && (
                                                                        <button onClick={() => generateInvoice(t)} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-lg shadow-blue-600/20"><FileText className="h-3 w-3" /> Facture</button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                {filteredTransactions.filter(t => (t.buyerName || '').toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">Aucun achat trouvé pour cette recherche.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 space-y-8">
                                {(() => {
                                    let groups: Record<string, Transaction[]> = {};

                                    if (resalesGroupBy === 'date') {
                                        // Single group "Tout" (but filtered)
                                        groups['Toutes les transactions'] = filteredTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                                    } else {
                                        // Group by Seller or Buyer (filtered)
                                        groups = filteredTransactions.reduce((acc, t) => {
                                            const key = resalesGroupBy === 'seller' ? t.sellerName : t.buyerName;
                                            if (!acc[key]) acc[key] = [];
                                            acc[key].push(t);
                                            return acc;
                                        }, {} as Record<string, Transaction[]>);
                                    }

                                    const sortedGroupKeys = Object.keys(groups).sort();

                                    return sortedGroupKeys.map(groupKey => (
                                        <div key={groupKey} className="bg-cinema-800/50 rounded-xl overflow-hidden border border-cinema-700">
                                            <div className="bg-cinema-700/50 px-6 py-3 border-b border-cinema-600 flex justify-between items-center">
                                                <div className="flex items-center gap-4">
                                                    <h3 className="font-bold text-white flex items-center gap-2">
                                                        {resalesGroupBy === 'seller' ? <Building2 className="h-4 w-4 text-blue-400" /> :
                                                            resalesGroupBy === 'buyer' ? <ShoppingCart className="h-4 w-4 text-green-400" /> :
                                                                <Calendar className="h-4 w-4 text-slate-400" />}
                                                        {groupKey}
                                                    </h3>
                                                    <span className="text-xs bg-cinema-900 text-slate-400 px-2 py-0.5 rounded-full">
                                                        {groups[groupKey].length} transactions
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => exportTransactionsCSV(resalesGroupBy, groups[groupKey], `export_${groupKey.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`)}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-cinema-600 hover:bg-cinema-500 text-slate-200 rounded text-xs font-medium transition-colors border border-cinema-500 shadow-sm"
                                                    title={`Exporter les transactions de ${groupKey}`}
                                                >
                                                    <Download className="h-3 w-3" />
                                                    CSV
                                                </button>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-cinema-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-cinema-700">
                                                            <th className="px-6 py-4 font-semibold w-32">Date</th>
                                                            {resalesGroupBy !== 'seller' && <th className="px-6 py-4 font-semibold">Vendeur</th>}
                                                            {resalesGroupBy !== 'buyer' && <th className="px-6 py-4 font-semibold">Acheteur</th>}
                                                            <th className="px-6 py-4 font-semibold">Articles</th>
                                                            <th className="px-6 py-4 font-semibold">Montant</th>
                                                            <th className="px-6 py-4 font-semibold">Statut</th>
                                                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-cinema-700 text-sm">
                                                        {groups[groupKey]
                                                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                                            .map((t) => (
                                                                <tr key={t.id} className="hover:bg-cinema-700/30 transition-colors">
                                                                    <td className="px-6 py-4 text-slate-300">
                                                                        {new Date(t.createdAt).toLocaleDateString()}
                                                                        <div className="text-xs text-slate-500">{new Date(t.createdAt).toLocaleTimeString()}</div>
                                                                    </td>
                                                                    {resalesGroupBy !== 'seller' && (
                                                                        <td className="px-6 py-4 text-white font-medium">
                                                                            {t.sellerName}
                                                                        </td>
                                                                    )}
                                                                    {resalesGroupBy !== 'buyer' && (
                                                                        <td className="px-6 py-4 text-white font-medium">
                                                                            {t.buyerName}
                                                                        </td>
                                                                    )}
                                                                    <td className="px-6 py-4 text-slate-300 text-xs">
                                                                        <ul className="list-disc list-inside">
                                                                            {t.items.slice(0, 2).map((i, idx) => (
                                                                                <li key={idx}>{i.quantity}x {i.name} ({i.price}€)</li>
                                                                            ))}
                                                                            {t.items.length > 2 && <li>... (+{t.items.length - 2})</li>}
                                                                        </ul>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-yellow-400 font-bold font-mono">
                                                                        {t.totalAmount.toFixed(2)} €
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        {t.status === 'PENDING' ? (
                                                                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 animate-pulse">
                                                                                En attente
                                                                            </span>
                                                                        ) : t.status === 'CANCELLED' ? (
                                                                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-500 border border-red-500/30 flex items-center w-fit gap-1">
                                                                                <X className="h-3 w-3" /> Refusé
                                                                            </span>
                                                                        ) : (
                                                                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-500 border border-green-500/30 flex items-center w-fit gap-1">
                                                                                <CheckCircle className="h-3 w-3" /> Validé
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right">
                                                                        <div className="flex justify-end gap-2">
                                                                            {t.status === 'PENDING' && (
                                                                                <>
                                                                                    <button
                                                                                        onClick={() => handleValidateTransaction(t)}
                                                                                        className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-lg shadow-green-600/20"
                                                                                        title="Valider la vente"
                                                                                    >
                                                                                        <CheckCircle className="h-3 w-3" /> Valider
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleRejectTransaction(t)}
                                                                                        className="flex items-center gap-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/30 px-3 py-1.5 rounded text-xs font-bold transition-colors"
                                                                                        title="Refuser et Restocker"
                                                                                    >
                                                                                        <X className="h-3 w-3" /> Refuser
                                                                                    </button>
                                                                                </>
                                                                            )}
                                                                            {t.status === 'VALIDATED' && (
                                                                                <button
                                                                                    onClick={() => generateInvoice(t)}
                                                                                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-lg shadow-blue-600/20"
                                                                                    title="Télécharger Facture PDF"
                                                                                >
                                                                                    <FileText className="h-3 w-3" /> Facture
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        )}
                    </>
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
