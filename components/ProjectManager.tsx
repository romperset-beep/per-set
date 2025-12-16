import React, { useState, useEffect } from 'react';
import { Department, SurplusAction } from '../types';
import { Users, ShoppingBag, MessageSquare, FileText, Receipt, Utensils, Clock, Truck, GripHorizontal } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { DndContext, closestCenter, TouchSensor, MouseSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Widget Components ---

const SortableWidget = ({ id, children }: { id: string, children: React.ReactNode }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.8 : 1,
        height: '100%'
    };
    return (
        <div ref={setNodeRef} style={style} className="h-full relative group/widget">
            {/* Visual Drag Handle - NOW ACTS AS THE TRIGGER */}
            <div
                {...attributes}
                {...listeners}
                className="absolute top-2 left-1/2 -translate-x-1/2 z-20 text-white/50 bg-black/20 rounded-full px-4 py-1 cursor-grab active:cursor-grabbing touch-none hover:bg-black/40 transition-colors"
                title="Déplacer le widget"
            >
                <GripHorizontal className="h-4 w-4" />
            </div>
            {children}
        </div>
    );
};

const InventoryWidget = ({ onClick }: { onClick: () => void }) => {
    const { project, currentDept } = useProject();
    const filteredItems = currentDept === 'PRODUCTION'
        ? project.items
        : project.items.filter(i => i.department === currentDept);

    return (
        <button onClick={onClick} className="w-full h-full bg-gradient-to-br from-eco-600 to-eco-800 p-6 rounded-xl text-white shadow-lg text-left hover:scale-[1.02] transition-transform">
            <h3 className="text-lg font-semibold opacity-90">Mon Stock {currentDept !== 'PRODUCTION' && `(${currentDept})`}</h3>
            <p className="text-4xl font-bold mt-2">
                {filteredItems.filter(i => i.purchased && (!i.surplusAction || i.surplusAction === SurplusAction.NONE) && i.quantityCurrent > 0).length} <span className="text-lg opacity-50 font-normal">articles</span>
            </p>
            <p className="text-xs mt-2 opacity-70">Cliquez pour voir l'inventaire</p>
        </button>
    );
};

const CallSheetWidget = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} className="w-full h-full bg-cinema-800 p-6 rounded-xl text-white shadow-lg border border-cinema-700 text-left hover:bg-cinema-700 transition-colors group">
        <div className="flex justify-between items-start">
            <h3 className="text-lg font-semibold opacity-70">Feuilles de Service</h3>
            <FileText className="h-6 w-6 text-blue-300 group-hover:scale-110 transition-transform" />
        </div>
        <p className="text-4xl font-bold mt-2 text-blue-300"><span className="text-2xl">PDF</span></p>
        <p className="text-xs text-slate-400 mt-1">Planning journalier</p>
    </button>
);

const HoursWidget = ({ onClick }: { onClick: () => void }) => {
    const { project, user } = useProject();
    // Logic extracted
    const formatted = React.useMemo(() => {
        const now = new Date();
        const getWeekNumber = (d: Date) => {
            d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
            d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        };
        const currentWeek = getWeekNumber(now);
        const currentYear = now.getUTCFullYear();

        const currentWeekLogs = project.timeLogs?.filter(l => {
            if (l.userId !== user?.email) return false;
            const logDate = new Date(l.date);
            return getWeekNumber(logDate) === currentWeek && logDate.getUTCFullYear() === currentYear;
        }) || [];

        const total = currentWeekLogs.reduce((acc, l) => acc + l.totalHours, 0);
        const hours = Math.floor(total);
        const minutes = Math.round((total - hours) * 60);
        return `${hours}h${minutes > 0 ? minutes.toString().padStart(2, '0') : ''}`;
    }, [project.timeLogs, user]);

    return (
        <button onClick={onClick} className="w-full h-full bg-cinema-800 p-6 rounded-xl text-white shadow-lg border border-cinema-700 text-left hover:bg-cinema-700 transition-colors group">
            <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold opacity-70">Les Heures</h3>
                <Clock className="h-6 w-6 text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2"><p className="text-4xl font-bold text-blue-400">{formatted}</p></div>
            <p className="text-xs text-slate-400 mt-1">Total Semaine en cours</p>
        </button>
    );
};

const RenfortsWidget = ({ onClick }: { onClick: () => void }) => {
    const { project, currentDept } = useProject();
    const count = React.useMemo(() => {
        const now = new Date();
        const getWeekNumber = (d: Date) => {
            d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
            d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        };
        const currentWeek = getWeekNumber(now);
        const currentYear = now.getUTCFullYear();
        let c = 0;
        (project.reinforcements || []).forEach(r => {
            const rDate = new Date(r.date);
            const rWeek = getWeekNumber(rDate);
            if (rWeek === currentWeek && rDate.getUTCFullYear() === currentYear) {
                if (currentDept === 'PRODUCTION' || r.department === currentDept) {
                    c += (r.staff?.length || r.names?.length || 0);
                }
            }
        });
        return c;
    }, [project.reinforcements, currentDept]);

    return (
        <button onClick={onClick} className="w-full h-full bg-cinema-800 p-6 rounded-xl text-white shadow-lg border border-cinema-700 text-left hover:bg-cinema-700 transition-colors group">
            <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold opacity-70">Renforts</h3>
                <Users className="h-6 w-6 text-indigo-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-4xl font-bold text-indigo-400">{count}</div>
            <p className="text-xs text-slate-400 mt-1">Renforts cette semaine</p>
        </button>
    );
};

const LogisticsWidget = ({ onClick }: { onClick: () => void }) => {
    const { project, currentDept } = useProject();
    const pending = (project.logistics || []).filter(l => {
        const d = new Date(l.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (d < today) return false;

        // Production & Régie see all
        if (currentDept === 'PRODUCTION' || currentDept === 'Régie') return true;

        // Others see only their requests
        return l.department === currentDept;
    }).length;

    return (
        <button onClick={onClick} className="w-full h-full bg-cinema-800 p-6 rounded-xl text-white shadow-lg border border-cinema-700 text-left hover:bg-cinema-700 transition-colors group">
            <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold opacity-70">Aller-Retour Matériel</h3>
                <Truck className="h-6 w-6 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-4xl font-bold text-amber-400">{pending}</div>
            <p className="text-xs text-slate-400 mt-1">À venir</p>
        </button>
    );
};

const MemoWidget = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} className="w-full h-full bg-cinema-800 p-6 rounded-xl text-white shadow-lg border border-cinema-700 text-left hover:bg-cinema-700 transition-colors group">
        <div className="flex justify-between items-start">
            <h3 className="text-lg font-semibold opacity-70">Mémo Rapide</h3>
            <MessageSquare className="h-6 w-6 text-pink-500 group-hover:scale-110 transition-transform" />
        </div>
        <p className="text-4xl font-bold mt-2 text-pink-500">→</p>
        <p className="text-xs text-slate-400 mt-1">Envoyer un message</p>
    </button>
);

const CateringWidget = ({ onClick }: { onClick: () => void }) => {
    const { project } = useProject();
    const todayCount = project.cateringLogs?.filter(l => l.date === new Date().toISOString().split('T')[0] && l.hasEaten).length || 0;
    return (
        <button onClick={onClick} className="w-full h-full bg-cinema-800 p-6 rounded-xl text-white shadow-lg border border-cinema-700 text-left hover:bg-cinema-700 transition-colors group">
            <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold opacity-70">Cantine</h3>
                <Utensils className="h-6 w-6 text-orange-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-4xl font-bold mt-2 text-orange-400">{todayCount}</p>
            <p className="text-xs text-slate-400 mt-1">Repas d'aujourd'hui</p>
        </button>
    );
};

const ExpensesWidget = ({ onClick }: { onClick: () => void }) => {
    const { expenseReports, currentDept, user } = useProject();
    const count = currentDept === 'PRODUCTION'
        ? (expenseReports?.length || 0)
        : (expenseReports?.filter(r => r.submittedBy === user?.name).length || 0);

    return (
        <button onClick={onClick} className="w-full h-full bg-cinema-800 p-6 rounded-xl text-white shadow-lg border border-cinema-700 text-left hover:bg-cinema-700 transition-colors group">
            <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold opacity-70">Note de Frais</h3>
                <Receipt className="h-6 w-6 text-purple-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-4xl font-bold mt-2 text-purple-400">{count}</p>
            <p className="text-xs text-slate-400 mt-1">Justificatifs & Remboursements</p>
        </button>
    );
};

const TeamWidget = ({ onClick }: { onClick: () => void }) => {
    const { userProfiles } = useProject();
    return (
        <button onClick={onClick} className="w-full h-full bg-cinema-800 p-6 rounded-xl text-white shadow-lg border border-cinema-700 text-left hover:bg-cinema-700 transition-colors group">
            <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold opacity-70">Équipe</h3>
                <Users className="h-6 w-6 text-green-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-4xl font-bold mt-2 text-green-400">{userProfiles?.length || 0}</p>
            <p className="text-xs text-slate-400 mt-1">Annuaire & Fiches</p>
        </button>
    );
};

const BuyBackWidget = ({ onClick }: { onClick: () => void }) => {
    const { buyBackItems } = useProject();
    return (
        <button onClick={onClick} className="w-full h-full bg-cinema-800 p-6 rounded-xl text-white shadow-lg border border-cinema-700 text-left hover:bg-cinema-700 transition-colors group">
            <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold opacity-70">À Racheter</h3>
                <ShoppingBag className="h-6 w-6 text-yellow-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-4xl font-bold mt-2 text-yellow-400">{buyBackItems?.filter(i => i.status === 'AVAILABLE').length || 0}</p>
            <p className="text-xs text-slate-400 mt-1">Zone de réemploi interne</p>
        </button>
    );
};

const SocialWidget = ({ onClick }: { onClick: () => void }) => {
    const { unreadSocialCount } = useProject();
    return (
        <button onClick={onClick} className="w-full h-full bg-cinema-800 p-6 rounded-xl text-white shadow-lg border border-cinema-700 text-left hover:bg-cinema-700 transition-colors group">
            <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold opacity-70">Mur Social</h3>
                <MessageSquare className="h-6 w-6 text-pink-500 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-4xl font-bold mt-2 text-pink-500">{unreadSocialCount}</p>
            <p className="text-xs text-slate-400 mt-1">Nouveaux messages</p>
        </button>
    );
};


interface ProjectManagerProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({
    setActiveTab,
}) => {
    const { currentDept, setCurrentDept, user, updateUser, t, project, updateProjectDetails } = useProject();

    // --- Dashboard Order Logic ---
    const allWidgets = [
        'inventory', 'callsheets', 'timesheet', 'renforts', 'logistics',
        'memo', 'catering', 'expenses', 'team', 'buyback', 'social'
    ];

    // Default order
    const [widgetOrder, setWidgetOrder] = useState<string[]>(allWidgets);

    // Load user preference on mount/user change
    useEffect(() => {
        if (user?.dashboardOrder && user.dashboardOrder.length > 0) {
            // Merge in any new widgets
            const saved = user.dashboardOrder;
            const missing = allWidgets.filter(w => !saved.includes(w));
            setWidgetOrder([...saved, ...missing]);
        } else {
            setWidgetOrder(allWidgets);
        }
    }, [user?.dashboardOrder]);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }), // Prevent accidental drags
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }) // Long press to drag on specific mobile
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setWidgetOrder((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over?.id as string);
                const newOrder = arrayMove(items, oldIndex, newIndex);

                // Persist order
                updateUser({ dashboardOrder: newOrder });
                return newOrder;
            });
        }
    };

    // Render helper
    const renderWidget = (id: string) => {
        // Permissions checks
        if (id === 'catering' && currentDept !== 'Régie' && currentDept !== 'PRODUCTION') return null;
        if (id === 'team' && currentDept !== 'PRODUCTION') return null;

        switch (id) {
            case 'inventory': return <InventoryWidget onClick={() => setActiveTab('inventory')} />;
            case 'callsheets': return <CallSheetWidget onClick={() => setActiveTab('callsheets')} />;
            case 'timesheet': return <HoursWidget onClick={() => setActiveTab('timesheet')} />;
            case 'renforts': return <RenfortsWidget onClick={() => setActiveTab('renforts')} />;
            case 'logistics': return <LogisticsWidget onClick={() => setActiveTab('logistics')} />;
            case 'memo': return <MemoWidget onClick={() => setActiveTab('memo')} />;
            case 'catering': return <CateringWidget onClick={() => setActiveTab('catering')} />;
            case 'expenses': return <ExpensesWidget onClick={() => setActiveTab('expenses')} />;
            case 'team': return <TeamWidget onClick={() => setActiveTab('team')} />;
            case 'buyback': return <BuyBackWidget onClick={() => setActiveTab('buyback')} />;
            case 'social': return <SocialWidget onClick={() => setActiveTab('social')} />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* Department Selection Header */}
            <div className="bg-cinema-800 rounded-xl p-6 border border-cinema-700 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">{t('sidebar.dashboard')}</h2>
                    <p className="text-slate-400 text-sm">Maintenez appuyé pour réorganiser • {t('login.welcome')}</p>
                </div>
                <div className="flex items-center gap-3 bg-cinema-900 p-2 rounded-lg border border-cinema-700">
                    <Users className="text-eco-400 h-5 w-5" />
                    <select
                        value={currentDept}
                        onChange={(e) => setCurrentDept(e.target.value)}
                        disabled={user?.department !== 'PRODUCTION' && user?.department !== Department.REGIE}
                        className={`bg-transparent text-white font-medium focus:outline-none ${(user?.department === 'PRODUCTION' || user?.department === Department.REGIE) ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'}`}
                    >
                        <option value="PRODUCTION">VUE PRODUCTION (Admin)</option>
                        <option disabled>──────────</option>
                        {Object.values(Department).map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Project Settings moved to Header Modal */}

            {/* Draggable Grid */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={widgetOrder}
                    strategy={rectSortingStrategy}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {widgetOrder.map((id) => {
                            const widget = renderWidget(id);
                            if (!widget) return null;

                            return (
                                <SortableWidget key={id} id={id}>
                                    {widget}
                                </SortableWidget>
                            );
                        })}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
};