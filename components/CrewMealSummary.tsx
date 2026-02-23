import React, { useState, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { Users, Utensils, Check, Coffee } from 'lucide-react';
import { UserProfile, User } from '../types';
import { useTeam } from '../context/TeamContext';

export const CrewMealSummary: React.FC = () => {
    const { project, updateProjectDetails, userProfiles } = useProject();
    const { offlineMembers } = useTeam();
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const toggleDept = (dept: string) => {
        setExpandedDepts(prev => ({ ...prev, [dept]: !prev[dept] }));
    };

    const toggleRow = (choiceId: string) => {
        setExpandedRows(prev => ({ ...prev, [choiceId]: !prev[choiceId] }));
    };

    // Current menu context matching the date
    const existingMenu = useMemo(() => {
        return project.dailyMenus?.find(m => m.date === selectedDate);
    }, [project.dailyMenus, selectedDate]);

    // Choices Data
    const dailyChoices = useMemo(() => {
        return (project.mealChoices || []).filter(c => c.date === selectedDate);
    }, [project.mealChoices, selectedDate]);

    // Active project members
    const activeProjectMembers = useMemo(() => {
        const onlineMembers = userProfiles.filter(profile => {
            const p = profile as any;
            if (!project?.id) return false;
            if (p.currentProjectId === project.id) return true;
            if (p.projectHistory && Array.isArray(p.projectHistory)) {
                if (p.projectHistory.some((h: any) => h.projectId === project.id || h.id === project.id)) return true;
            }
            if (project.members && project.members[profile.id]) return true;
            return false;
        });
        return [...onlineMembers, ...offlineMembers];
    }, [userProfiles, project.id, project.members, offlineMembers]);

    // Missing members
    const missingMembers = useMemo(() => {
        const choiceEmails = dailyChoices.map(c => c.userId);
        return activeProjectMembers.filter(member => {
            const email = member.email || (member as any).id;
            return !choiceEmails.includes(email);
        });
    }, [activeProjectMembers, dailyChoices]);

    const handleToggleReceived = async (choiceId: string, currentStatus: boolean) => {
        const newChoices = (project.mealChoices || []).map(c =>
            c.id === choiceId ? { ...c, hasReceived: !currentStatus } : c
        );
        await updateProjectDetails({ mealChoices: newChoices });
    };

    return (
        <div className="space-y-6 animate-in fade-in h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-cinema-800 p-6 rounded-xl border border-cinema-700 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-500/20 rounded-xl text-orange-400">
                        <Users className="h-8 w-8" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Récapitulatif des Commandes</h2>
                        <div className="flex items-center gap-2 text-slate-400 mt-1">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent border-none text-white focus:ring-0 p-0 text-sm font-medium"
                            />
                        </div>
                    </div>
                </div>

                {/* Validation Stats */}
                <div className="flex gap-4 items-center">
                    <div className="text-center px-4">
                        <span className="block text-2xl font-bold text-white">{activeProjectMembers.length}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-500">Équipe Totale</span>
                    </div>
                    <div className="w-px h-10 bg-cinema-700"></div>
                    <div className="text-center px-4">
                        <span className="block text-2xl font-bold text-emerald-400">{dailyChoices.length}</span>
                        <span className="text-[10px] uppercase font-bold text-emerald-500/70">Ont commandé</span>
                    </div>
                    <div className="w-px h-10 bg-cinema-700"></div>
                    <div className="text-center px-4">
                        <span className="block text-2xl font-bold text-orange-400">{missingMembers.length}</span>
                        <span className="text-[10px] uppercase font-bold text-orange-500/70">Manquants</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
                {/* Submitted Choices Table */}
                <div className="lg:col-span-3 bg-cinema-800 rounded-xl border border-cinema-700 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-cinema-700 flex justify-between items-center bg-cinema-800/50 shrink-0">
                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                            Choix de l'équipe ({dailyChoices.length})
                        </h3>
                        <div className="text-sm font-medium text-slate-400">
                            <span className="text-emerald-400">{dailyChoices.filter(c => c.hasReceived).length}</span> / {dailyChoices.length} servis
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto custom-scrollbar relative">
                        {dailyChoices.length === 0 ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                                <div className="p-4 bg-cinema-900 rounded-full mb-4">
                                    <Utensils size={32} className="text-slate-600" />
                                </div>
                                <p className="text-slate-400">Aucun choix n'a encore été soumis pour cette date.</p>
                                {!existingMenu?.isPublished && (
                                    <p className="text-xs text-orange-400 mt-2">N'oubliez pas de publier le menu pour que l'équipe puisse choisir.</p>
                                )}
                            </div>
                        ) : (
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-400 uppercase tracking-wider bg-cinema-900/50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-4 py-3 font-bold w-12 text-center">Pointé</th>
                                        <th className="px-4 py-3 font-bold">Nom</th>
                                        <th className="px-4 py-3 font-bold">Département</th>
                                        <th className="px-4 py-3 font-bold text-right">Détails</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cinema-700/50">
                                    {dailyChoices.map(c => {
                                        // Retrieve the user profile to get dietary habits
                                        const profile = activeProjectMembers.find(m => {
                                            const email = (m as any).email || m.id;
                                            return email === c.userId;
                                        }) as any;
                                        const isVeggie = profile?.dietaryHabits && profile.dietaryHabits.trim() !== '';
                                        const isExpanded = expandedRows[c.id];

                                        return (
                                            <React.Fragment key={c.id}>
                                                <tr className={`hover:bg-white/5 transition-colors group cursor-pointer ${isExpanded ? 'bg-white/5' : ''}`} onClick={() => toggleRow(c.id)}>
                                                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            onClick={() => handleToggleReceived(c.id, c.hasReceived)}
                                                            className={`w-6 h-6 mx-auto rounded flex items-center justify-center transition-colors border ${c.hasReceived ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-cinema-900 border-cinema-600 text-transparent hover:border-slate-400'}`}
                                                        >
                                                            <Check size={14} className={c.hasReceived ? 'opacity-100' : 'opacity-0'} />
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-white whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <span className={c.hasReceived ? 'text-slate-400 line-through' : ''}>{c.userName}</span>
                                                            {isVeggie && (
                                                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded" title={profile.dietaryHabits}>
                                                                    végé
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-400">{c.department}</td>
                                                    <td className="px-4 py-3 text-right text-slate-500">
                                                        <span className="text-[10px]">{isExpanded ? '▼' : '►'}</span>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr className="bg-black/20 border-t-0">
                                                        <td colSpan={4} className="p-0">
                                                            <div className="px-4 py-3 text-xs border-l-2 border-cinema-500 ml-4 mb-2 mt-1 space-y-1 rounded-r-lg bg-cinema-900/40 text-slate-300">
                                                                <div className="flex flex-wrap gap-x-6 gap-y-2">
                                                                    <div><span className="text-slate-500 uppercase font-bold mr-1 text-[10px]">Entrée:</span> <span className="font-medium">{c.starter || '-'}</span></div>
                                                                    <div><span className="text-slate-500 uppercase font-bold mr-1 text-[10px]">Plat:</span> <span className="font-medium inline-block text-white">{c.main || '-'}</span></div>
                                                                    <div><span className="text-slate-500 uppercase font-bold mr-1 text-[10px]">Dessert:</span> <span className="font-medium">{c.dessert || '-'}</span></div>
                                                                    <div><span className="text-slate-500 uppercase font-bold mr-1 text-[10px]">Boisson:</span> <span className="font-medium">{c.drink || '-'}</span></div>
                                                                    {c.wantsCoffee && (
                                                                        <div className="flex items-center gap-1 text-amber-500 font-medium">
                                                                            <Coffee size={12} /> Café
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Missing Members Sidebar */}
                <div className="lg:col-span-1 bg-cinema-800 rounded-xl border border-cinema-700 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-cinema-700 bg-orange-500/10 shrink-0">
                        <h3 className="font-bold text-orange-400 text-sm flex items-center justify-between">
                            <span>Manquants</span>
                            <span className="bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded text-xs">{missingMembers.length}</span>
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                        {missingMembers.length === 0 ? (
                            <div className="text-center text-emerald-500 text-sm py-4">
                                Toute l'équipe a validé ! 🎉
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(
                                    missingMembers.reduce((acc, m) => {
                                        const dept = m.department || 'Non assigné';
                                        if (!acc[dept]) acc[dept] = [];
                                        acc[dept].push(m);
                                        return acc;
                                    }, {} as Record<string, typeof missingMembers>)
                                )
                                    .sort(([deptA], [deptB]) => deptA.localeCompare(deptB))
                                    .map(([dept, members]) => {
                                        const isExpanded = expandedDepts[dept];
                                        return (
                                            <div key={dept} className="space-y-1 bg-cinema-900/40 rounded-lg border border-cinema-700/30 overflow-hidden">
                                                <button
                                                    onClick={() => toggleDept(dept)}
                                                    className="w-full flex items-center justify-between p-2 hover:bg-white/5 transition-colors"
                                                >
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                        {dept} <span className="text-slate-500 font-medium">({members.length})</span>
                                                    </h4>
                                                    <span className="text-slate-500 text-[10px]">{isExpanded ? '▼' : '►'}</span>
                                                </button>

                                                {isExpanded && (
                                                    <ul className="p-2 pt-0 space-y-2">
                                                        {members.map((m, idx) => {
                                                            const isVeggie = (m as any).dietaryHabits && (m as any).dietaryHabits.trim() !== '';
                                                            return (
                                                                <li key={idx} className="flex flex-col bg-cinema-900/80 p-2 rounded border border-cinema-700/50">
                                                                    <span className="text-sm font-medium text-slate-200 flex items-center gap-2">
                                                                        {m.firstName && m.lastName ? `${m.firstName} ${m.lastName}` : ((m as any).name || m.email)}
                                                                        {isVeggie && (
                                                                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded" title={(m as any).dietaryHabits}>
                                                                                végé
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
