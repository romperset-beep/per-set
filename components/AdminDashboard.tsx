import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { User } from '../types';
import { useProject } from '../context/ProjectContext';
import { ShieldCheck, Search, Users, Building2, Calendar, Film, Trash2, ArrowLeft, Edit2, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type ViewMode = 'DASHBOARD' | 'USERS' | 'PRODUCTIONS' | 'PROJECTS';

export const AdminDashboard: React.FC = () => {
    const [view, setView] = useState<ViewMode>('DASHBOARD');
    const [users, setUsers] = useState<User[]>([]);
    const [projectsList, setProjectsList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { deleteProject } = useProject();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<any>({});

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
    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.productionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.filmTitle.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
    }).filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const stats = {
        totalUsers: users.length,
        activeProductions: productions.length,
        activeFilms: projectsList.length
    };

    // Actions
    const handleDeleteUser = async (userId: string, userName: string) => {
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${userName}" ?`)) {
            try {
                await deleteDoc(doc(db, 'users', userId));
                setUsers(prev => prev.filter(u => (u as any).id !== userId));
            } catch (err: any) {
                alert(`Erreur: ${err.message}`);
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
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-cinema-900 border border-cinema-700 text-white text-sm rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-eco-500 focus:outline-none w-full md:w-64"
                />
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
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-cinema-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-cinema-700">
                                        <th className="px-6 py-4 font-semibold">Identité</th>
                                        <th className="px-6 py-4 font-semibold">Département</th>
                                        <th className="px-6 py-4 font-semibold">Projet</th>
                                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cinema-700 text-sm">
                                    {filteredUsers.map((u: any) => (
                                        <tr key={u.id} className="hover:bg-cinema-700/30 transition-colors group">
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
                                                        <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white">
                                                            {u.name?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-white">{u.name}</div>
                                                            <div className="text-xs text-slate-500">{u.email}</div>
                                                        </div>
                                                    </div>
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
                                                            <button onClick={() => startEditing('USER', u)} className="text-slate-400 hover:text-white p-2"><Edit2 className="h-4 w-4" /></button>
                                                            <button onClick={() => handleDeleteUser(u.id, u.name)} className="text-red-500 hover:bg-red-500/20 p-2 rounded"><Trash2 className="h-4 w-4" /></button>
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

            </div>
        </div>
    );
};
