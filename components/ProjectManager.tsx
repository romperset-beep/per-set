import React from 'react';
import { Department, SurplusAction } from '../types';
import { Users, RefreshCw, GraduationCap, ShoppingBag, MessageSquare, Film, Calendar, FileText, Receipt, Utensils, Clock } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

interface ProjectManagerProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({
    setActiveTab,
}) => {
    const { project, setProject, updateProjectDetails, currentDept, setCurrentDept, setCircularView, buyBackItems, socialPosts, addSocialPost, unreadSocialCount, userProfiles, user, t, error, testConnection, debugStatus, lastLog, expenseReports } = useProject();



    // Filter items based on current view (Department vs Production)
    const filteredItems = currentDept === 'PRODUCTION'
        ? project.items
        : project.items.filter(i => i.department === currentDept);

    // Memos Widget State
    const [memoContent, setMemoContent] = React.useState('');
    const [memoTarget, setMemoTarget] = React.useState<'GLOBAL' | 'DEPARTMENT' | 'USER'>('DEPARTMENT');
    const [memoTargetDept, setMemoTargetDept] = React.useState<Department | 'PRODUCTION'>(user?.department || 'PRODUCTION');
    const [memoTargetUserId, setMemoTargetUserId] = React.useState<string>('');
    const [memoSearchTerm, setMemoSearchTerm] = React.useState('');
    const [showMemoSuggestions, setShowMemoSuggestions] = React.useState(false);

    const handleSendMemo = (e: React.FormEvent) => {
        e.preventDefault();
        if (!memoContent.trim() || !user || !addSocialPost) return;

        const myProfile = userProfiles.find(p => p.email === user.email);

        // Cast to any to avoid strict type checking issues if types.ts isn't fully updated in all contexts yet, 
        // though we checked types.ts and it looked good.
        // Actually, let's trust the types.
        const newPost: any = {
            id: `post_${Date.now()}`,
            authorId: myProfile?.id,
            authorName: user.name,
            authorDepartment: user.department,
            content: memoContent,
            date: new Date().toISOString(),
            likes: 0,
            targetAudience: memoTarget,
            targetDept: memoTarget === 'DEPARTMENT' ? memoTargetDept : undefined,
            targetUserId: memoTarget === 'USER' ? memoTargetUserId : undefined
        };

        addSocialPost(newPost);
        setMemoContent('');
        alert('Mémo envoyé sur le Mur Social !');
    };

    return (
        <div className="space-y-6">
            {/* Department Selection Header */}

            <div className="bg-cinema-800 rounded-xl p-6 border border-cinema-700 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">{t('sidebar.dashboard')}</h2>
                    <p className="text-slate-400 text-sm">{t('login.welcome')}</p>
                </div>
                <div className="flex items-center gap-3 bg-cinema-900 p-2 rounded-lg border border-cinema-700">
                    <Users className="text-eco-400 h-5 w-5" />
                    <select
                        value={currentDept}
                        onChange={(e) => setCurrentDept(e.target.value)}
                        disabled={user?.department !== 'PRODUCTION'}
                        className={`bg-transparent text-white font-medium focus:outline-none ${user?.department === 'PRODUCTION' ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'}`}
                    >
                        <option value="PRODUCTION">VUE PRODUCTION (Admin)</option>
                        <option disabled>──────────</option>
                        {Object.values(Department).map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Shooting Dates Banner REMOVED as per user request */}

            {/* Project Config (Read only for departments maybe? kept editable for now) */}


            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 1. Mon Stock */}
                <button
                    onClick={() => setActiveTab && setActiveTab('inventory')}
                    className="bg-gradient-to-br from-eco-600 to-eco-800 p-6 rounded-xl text-white shadow-lg text-left hover:scale-[1.02] transition-transform"
                >
                    <h3 className="text-lg font-semibold opacity-90">Mon Stock {currentDept !== 'PRODUCTION' && `(${currentDept})`}</h3>
                    <p className="text-4xl font-bold mt-2">
                        {filteredItems.filter(i => i.purchased && (!i.surplusAction || i.surplusAction === SurplusAction.NONE) && i.quantityCurrent > 0).length} <span className="text-lg opacity-50 font-normal">articles</span>
                    </p>
                    <p className="text-xs mt-2 opacity-70">Cliquez pour voir l'inventaire</p>
                </button>

                {/* 2. Feuilles de Service */}
                <button
                    onClick={() => setActiveTab && setActiveTab('callsheets')}
                    className="bg-cinema-800 p-6 rounded-xl text-white shadow-lg border border-cinema-700 text-left hover:bg-cinema-700 transition-colors group"
                >
                    <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold opacity-70">Feuilles de Service</h3>
                        <FileText className="h-6 w-6 text-blue-300 group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-4xl font-bold mt-2 text-blue-300">
                        <span className="text-2xl">PDF</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Planning journalier</p>
                </button>

                {/* 3. Les Heures */}
                <button
                    onClick={() => setActiveTab && setActiveTab('timesheet')}
                    className="bg-cinema-800 p-6 rounded-xl text-white shadow-lg border border-cinema-700 text-left hover:bg-cinema-700 transition-colors group"
                >
                    <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold opacity-70">Les Heures</h3>
                        <Clock className="h-6 w-6 text-blue-400 group-hover:scale-110 transition-transform" />
                    </div>
                    {/* Calculate current week hours */}
                    <div className="mt-2">
                        {(() => {
                            const now = new Date();
                            const getWeekNumber = (d: Date) => {
                                d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
                                d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
                                const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
                                const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
                                return { week: weekNo, year: d.getUTCFullYear() };
                            };

                            const currentWeek = getWeekNumber(now);
                            const currentWeekLogs = project.timeLogs?.filter(l => {
                                if (l.userId !== user?.email) return false;
                                const logDate = new Date(l.date);
                                const logWeek = getWeekNumber(logDate);
                                return logWeek.week === currentWeek.week && logWeek.year === currentWeek.year;
                            }) || [];

                            const total = currentWeekLogs.reduce((acc, l) => acc + l.totalHours, 0);

                            const hours = Math.floor(total);
                            const minutes = Math.round((total - hours) * 60);
                            const formatted = `${hours}h${minutes > 0 ? minutes.toString().padStart(2, '0') : ''}`;

                            return <p className="text-4xl font-bold text-blue-400">{formatted}</p>;
                        })()}
                    </div>

                    <p className="text-xs text-slate-400 mt-1">Total Semaine en cours</p>
                </button>

                {/* 4. Memos Widget (NEW) */}
                <div className="bg-cinema-800 p-6 rounded-xl text-white shadow-lg border border-cinema-700 md:col-span-2 relative">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-semibold opacity-70 flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-pink-500" />
                            Mémos Rapides
                        </h3>
                        <select
                            value={memoTarget}
                            onChange={(e) => setMemoTarget(e.target.value as any)}
                            className="bg-cinema-900 border border-cinema-600 text-xs rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-pink-500"
                        >
                            <option value="DEPARTMENT">Mon Dept.</option>
                            <option value="GLOBAL">Tout le monde</option>
                            <option value="USER">Une personne</option>
                        </select>
                    </div>

                    <form onSubmit={handleSendMemo} className="space-y-3">
                        {/* Secondary Target Selector */}
                        {memoTarget === 'DEPARTMENT' && user?.department === 'PRODUCTION' && (
                            <select
                                value={memoTargetDept}
                                onChange={(e) => setMemoTargetDept(e.target.value as any)}
                                className="w-full bg-cinema-900 border border-cinema-600 rounded px-3 py-2 text-sm text-white mb-2"
                            >
                                {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                                <option value="PRODUCTION">PRODUCTION</option>
                            </select>
                        )}

                        {memoTarget === 'USER' && (
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Rechercher..."
                                    value={memoSearchTerm}
                                    onChange={(e) => {
                                        setMemoSearchTerm(e.target.value);
                                        setShowMemoSuggestions(true);
                                    }}
                                    onFocus={() => setShowMemoSuggestions(true)}
                                    className="w-full bg-cinema-900 border border-cinema-600 rounded px-3 py-2 text-sm text-white"
                                />
                                {showMemoSuggestions && memoSearchTerm && (
                                    <div className="absolute top-full left-0 w-full bg-cinema-800 border border-cinema-600 rounded-b-lg shadow-xl z-50 max-h-40 overflow-y-auto">
                                        {userProfiles
                                            .filter(u => `${u.firstName} ${u.lastName}`.toLowerCase().includes(memoSearchTerm.toLowerCase()))
                                            .map(u => (
                                                <div
                                                    key={u.id}
                                                    onClick={() => {
                                                        setMemoTargetUserId(u.id);
                                                        setMemoSearchTerm(`${u.firstName} ${u.lastName}`);
                                                        setShowMemoSuggestions(false);
                                                    }}
                                                    className="px-3 py-2 hover:bg-cinema-700 cursor-pointer text-sm"
                                                >
                                                    {u.firstName} {u.lastName}
                                                </div>
                                            ))
                                        }
                                    </div>
                                )}
                            </div>
                        )}

                        <textarea
                            value={memoContent}
                            onChange={(e) => setMemoContent(e.target.value)}
                            placeholder="Écrivez votre mémo ici..."
                            className="w-full bg-cinema-900 border border-cinema-600 rounded-lg p-3 text-sm text-white resize-none h-24 focus:ring-1 focus:ring-pink-500 outline-none"
                        />
                        <button
                            type="submit"
                            disabled={!memoContent.trim()}
                            className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                        >
                            Envoyer
                        </button>
                    </form>
                </div>

                {/* 5. Catering Card (Régie & Prod) */}
                {(currentDept === 'Régie' || currentDept === 'PRODUCTION') && (
                    <button
                        onClick={() => setActiveTab && setActiveTab('catering')}
                        className="bg-cinema-800 p-6 rounded-xl text-white shadow-lg border border-cinema-700 text-left hover:bg-cinema-700 transition-colors group"
                    >
                        <div className="flex justify-between items-start">
                            <h3 className="text-lg font-semibold opacity-70">Cantine</h3>
                            <Utensils className="h-6 w-6 text-orange-400 group-hover:scale-110 transition-transform" />
                        </div>
                        <p className="text-4xl font-bold mt-2 text-orange-400">
                            {project.cateringLogs?.filter(l => l.date === new Date().toISOString().split('T')[0] && l.hasEaten).length || 0}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">Repas d'aujourd'hui</p>
                    </button>
                )}

                {/* 5. Note de Frais */}
                <button
                    onClick={() => setActiveTab && setActiveTab('expenses')}
                    className="bg-cinema-800 p-6 rounded-xl text-white shadow-lg border border-cinema-700 text-left hover:bg-cinema-700 transition-colors group"
                >
                    <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold opacity-70">Note de Frais</h3>
                        <Receipt className="h-6 w-6 text-purple-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-4xl font-bold mt-2 text-purple-400">
                        {currentDept === 'PRODUCTION'
                            ? (expenseReports?.length || 0)
                            : (expenseReports?.filter(r => r.submittedBy === user?.name).length || 0)
                        }
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Justificatifs & Remboursements</p>
                </button>

                {/* 6. Équipe */}
                {currentDept === 'PRODUCTION' && (
                    <button
                        onClick={() => setActiveTab && setActiveTab('team')}
                        className="bg-cinema-800 p-6 rounded-xl text-white shadow-lg border border-cinema-700 text-left hover:bg-cinema-700 transition-colors group"
                    >
                        <div className="flex justify-between items-start">
                            <h3 className="text-lg font-semibold opacity-70">Équipe</h3>
                            <Users className="h-6 w-6 text-green-400 group-hover:scale-110 transition-transform" />
                        </div>
                        <p className="text-4xl font-bold mt-2 text-green-400">
                            {userProfiles?.length || 0}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">Annuaire & Fiches</p>
                    </button>
                )}

                {/* 7. À Racheter */}
                <button
                    onClick={() => setActiveTab && setActiveTab('buyback')}
                    className="bg-cinema-800 p-6 rounded-xl text-white shadow-lg border border-cinema-700 text-left hover:bg-cinema-700 transition-colors group"
                >
                    <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold opacity-70">À Racheter</h3>
                        <ShoppingBag className="h-6 w-6 text-yellow-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-4xl font-bold mt-2 text-yellow-400">
                        {buyBackItems?.filter(i => i.status === 'AVAILABLE').length || 0}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Zone de réemploi interne</p>
                </button>

                {/* 8. Mur Social */}
                <button
                    onClick={() => setActiveTab && setActiveTab('social')}
                    className="bg-cinema-800 p-6 rounded-xl text-white shadow-lg border border-cinema-700 text-left hover:bg-cinema-700 transition-colors group"
                >
                    <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold opacity-70">Mur Social</h3>
                        <MessageSquare className="h-6 w-6 text-pink-500 group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-4xl font-bold mt-2 text-pink-500">
                        {unreadSocialCount}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Nouveaux messages</p>
                </button>

            </div>


        </div>
    );
};