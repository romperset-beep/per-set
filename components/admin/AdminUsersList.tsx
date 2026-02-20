import React, { useState } from 'react';
import { Users, Save, X, Edit2, Trash2 } from 'lucide-react';
import { User, Project } from '../../types';
import { ProjectWithOffline } from '../AdminDashboard';

interface AdminUsersListProps {
    users: User[];
    projectsList: ProjectWithOffline[];
    user: User | null; // Current logged-in user
    editingId: string | null;
    editForm: Partial<User | Project>;
    setEditingId: (id: string | null) => void;
    setEditForm: (form: Partial<User | Project>) => void;
    saveEdit: (type: 'USER' | 'PROJECT') => void;
    startEditing: (type: 'USER' | 'PROJECT', item: User | Project) => void;
    handleApproveUser: (userId: string) => void;
    handleRejectUser: (userId: string) => void;
    handleDeleteUser: (userId: string, userName: string) => void;
    renderHeader: (title: string, subtitle: string, icon: React.ReactNode) => React.ReactNode;
}

export const AdminUsersList: React.FC<AdminUsersListProps> = ({
    users,
    projectsList,
    user,
    editingId,
    editForm,
    setEditingId,
    setEditForm,
    saveEdit,
    startEditing,
    handleApproveUser,
    handleRejectUser,
    handleDeleteUser,
    renderHeader
}) => {
    const [showGhostsOnly, setShowGhostsOnly] = useState(false);

    const filteredUsers = showGhostsOnly
        ? users.filter(u => (!u.firstName || !u.lastName) && u.email !== 'romperset@gmail.com')
        : users;

    return (
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
                            .map((u: User) => {
                                const isGhost = !u.firstName || !u.lastName;
                                const isSelf = u.id === user?.id;
                                const isSuperAdmin = u.email === 'romperset@gmail.com';
                                const currentUserId = user?.id;
                                const isLinkedToMe = u.email === user?.email || u.id === currentUserId;

                                return (
                                    <tr key={u.id} className={`hover:bg-cinema-700/30 transition-colors group ${u.status === 'pending' ? 'bg-yellow-500/5' : ''} ${isGhost ? 'bg-yellow-900/10' : ''} ${isSuperAdmin ? 'bg-purple-900/20 border-l-4 border-purple-500' : ''} ${isLinkedToMe && isGhost ? 'border-l-4 border-orange-500 bg-orange-900/10' : ''}`}>
                                        <td className="px-6 py-4">
                                            {editingId === u.id ? (
                                                <div className="space-y-2">
                                                    <input
                                                        className="bg-cinema-900 border border-cinema-600 rounded px-2 py-1 w-full text-white"
                                                        value={(editForm as Partial<User>).name || ''}
                                                        onChange={e => setEditForm({ ...editForm, name: e.target.value } as Partial<User>)}
                                                    />
                                                    <input
                                                        className="bg-cinema-900 border border-cinema-600 rounded px-2 py-1 w-full text-xs text-slate-400"
                                                        value={(editForm as Partial<User>).email || ''}
                                                        onChange={e => setEditForm({ ...editForm, email: e.target.value } as Partial<User>)}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-white relative ${isSuperAdmin ? 'bg-purple-600 ring-2 ring-purple-400' : 'bg-slate-700'}`}>
                                                        {u.name?.charAt(0) || u.email?.charAt(0) || '?'}
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
                                                    value={(editForm as Partial<User>).department || ''}
                                                    onChange={e => setEditForm({ ...editForm, department: e.target.value as User['department'] } as Partial<User>)}
                                                />
                                            ) : (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-cinema-700 text-slate-300 border border-cinema-600">
                                                    {u.department}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-300">
                                            {projectsList.filter(p => p.members && p.members[u.id]).map(p => p.name).join(', ') || u.filmTitle || 'Aucun'}
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
    );
};
