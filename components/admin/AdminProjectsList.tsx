import React from 'react';
import { Film, Users, Edit2, Save, X, Trash2 } from 'lucide-react';

interface AdminProjectsListProps {
    filteredProjects: any[]; // Consider using a stronger type if Project type is available
    users: any[];
    editingId: string | null;
    editForm: any;
    setEditingId: (id: string | null) => void;
    setEditForm: (form: any) => void;
    saveEdit: (type: 'USER' | 'PROJECT') => void;
    startEditing: (type: 'USER' | 'PROJECT', item: any) => void;
    handleDeleteProject: (projectId: string, projectName: string) => void;
    renderHeader: (title: string, subtitle: string, icon: React.ReactNode) => React.ReactNode;
}

export const AdminProjectsList: React.FC<AdminProjectsListProps> = ({
    filteredProjects,
    users,
    editingId,
    editForm,
    setEditingId,
    setEditForm,
    saveEdit,
    startEditing,
    handleDeleteProject,
    renderHeader
}) => {
    return (
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
                                            {(() => {
                                                const matchedUsers = users.filter(u => {
                                                    const uData = u as any;
                                                    if (uData.currentProjectId === p.id) return true;
                                                    if (uData.projectHistory && Array.isArray(uData.projectHistory)) {
                                                        if (uData.projectHistory.some((h: any) => h.projectId === p.id || h.id === p.id)) return true;
                                                    }
                                                    if (p.members && p.members[u.id]) return true;
                                                    return false;
                                                });

                                                if (p.id === 'crash-test-2026-crash-film') {
                                                    console.log(`[DEBUG ADMIN] Project: ${p.name}`);
                                                    console.log(`Matched Users:`, matchedUsers.map(u => (u as any).email));
                                                    console.log(`Offline Count:`, p.offlineMembersCount);
                                                    console.log(`p.members map:`, p.members);
                                                }

                                                return matchedUsers.length + ((p as any).offlineMembersCount || 0);
                                            })()}
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
    );
};
