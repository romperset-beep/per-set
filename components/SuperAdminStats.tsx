import React, { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { fetchAllProjectsAction, fetchAllGlobalItemsAction } from '../services/adminService';
import {
    BarChart3,
    TrendingUp,
    Leaf,
    Utensils,
    Truck,
    Package,
    Recycle,
    Building2,
    Users,
    ArrowUpRight,
    ArrowDownRight,
    Loader2
} from 'lucide-react';
import { ConsumableItem, Project, Department, ItemStatus, SurplusAction } from '../types';

interface GlobalStats {
    totalProjects: number;
    totalKm: number;
    totalMeals: number;
    totalVeggieMeals: number;
    totalItems: number;
    itemsNew: number;
    itemsUsed: number;
    itemsEmpty: number;
    itemsDonated: number;
    itemsSold: number;
    itemsStored: number;
    totalCO2Saved: number; // Placeholder for now
    totalMoneySaved: number; // Placeholder
}

interface ProjectStats extends Project {
    localKm: number;
    localMeals: number;
    localVeggiePercent: number;
    localItemCount: number;
}

export const SuperAdminStats: React.FC = () => {
    const { user } = useProject();
    const [loading, setLoading] = useState(true);
    const [globalStats, setGlobalStats] = useState<GlobalStats>({
        totalProjects: 0,
        totalKm: 0,
        totalMeals: 0,
        totalVeggieMeals: 0,
        totalItems: 0,
        itemsNew: 0,
        itemsUsed: 0,
        itemsEmpty: 0,
        itemsDonated: 0,
        itemsSold: 0,
        itemsStored: 0,
        totalCO2Saved: 0,
        totalMoneySaved: 0
    });
    const [projectList, setProjectList] = useState<ProjectStats[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.isAdmin) return;
            setLoading(true);

            try {
                // 1. Fetch All Projects
                const fetchedProjects = await fetchAllProjectsAction();
                const projectsData: ProjectStats[] = [];

                let gStats = { ...globalStats };
                gStats.totalProjects = fetchedProjects.length;

                // 2. Fetch All Items (Collection Group)
                const allItems = await fetchAllGlobalItemsAction() as ConsumableItem[];

                // Process Items Global
                gStats.totalItems = allItems.length;
                gStats.itemsNew = allItems.filter(i => i.status === ItemStatus.NEW).length;
                gStats.itemsUsed = allItems.filter(i => i.status === ItemStatus.USED).length;
                gStats.itemsEmpty = allItems.filter(i => i.status === ItemStatus.EMPTY).length;

                gStats.itemsDonated = allItems.filter(i => i.surplusAction === SurplusAction.DONATION || i.surplusAction === SurplusAction.SHORT_FILM).length;
                gStats.itemsSold = allItems.filter(i => i.surplusAction === SurplusAction.MARKETPLACE || i.surplusAction === SurplusAction.BUYBACK).length;
                gStats.itemsStored = allItems.filter(i => i.surplusAction === SurplusAction.STORAGE).length;


                // Process Projects & Aggregates
                fetchedProjects.forEach(rawP => {
                    const p = rawP as Project;

                    // Logistics (Km)
                    // Note: This relies on logistics[] array in project doc. 
                    // If subcollection is used for scalable logs, we might miss some, but Project type has it.
                    const logisticsKm = (p.logistics || []).reduce((acc, l) => acc + (l.distanceKm || 0), 0);
                    const timeLogsKm = (p.timeLogs || []).reduce((acc, t) => acc + (t.commuteDistanceKm || 0), 0);
                    const localKm = logisticsKm + timeLogsKm;

                    // Catering
                    const meals = p.cateringLogs || [];
                    const localMeals = meals.length;
                    const localVeggie = meals.filter(m => m.isVegetarian).length;

                    gStats.totalKm += localKm;
                    gStats.totalMeals += localMeals;
                    gStats.totalVeggieMeals += localVeggie;

                    // Project Specific Item Count (Approximation using previously fetched items if possible, or skip)
                    // To do this strictly, we'd need to filter allItems by p.id (if we stored projectId on items)
                    // Currently items are subcollection of project. collectionGroup query results have ref.parent.parent.id
                    // Let's filter allItems by finding those that belong to this project path
                    // Actually, simpler: we already have allItems, let's just create a Map or simple logic?
                    // collectionGroup items don't strictly calculate "ProjectId" field unless we added it manually.
                    // But we can check path.
                    // However, for MVP, let's just update the list.

                    projectsData.push({
                        ...p,
                        localKm,
                        localMeals,
                        localVeggiePercent: localMeals > 0 ? (localVeggie / localMeals) * 100 : 0,
                        localItemCount: 0 // Filled later if needed, or ignored for list view
                    });
                });

                // Correct Item Count per project via Path Ref (Optional optimization)
                // For now, global aggregated stats are most important.

                setGlobalStats(gStats);
                setProjectList(projectsData);

            } catch (err) {
                console.error("Error fetching admin stats:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    if (!user?.isAdmin) return <div className="p-8 text-center text-red-500">Accès Refusé.</div>;

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center p-12">
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                <span className="ml-4 text-slate-400">Chargement des statistiques globales...</span>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Building2 className="h-8 w-8 text-blue-400" />
                    Statistiques Globales (Super Admin)
                </h2>
                <p className="text-slate-400 mt-2">Vue d'ensemble de tous les tournages actifs et archivés.</p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KM */}
                <div className="bg-cinema-800 p-5 rounded-xl border border-cinema-700 shadow-lg relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Truck className="h-24 w-24 text-blue-400" />
                    </div>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Total Déplacements</p>
                    <div className="text-3xl font-bold text-white">{globalStats.totalKm.toLocaleString()} <span className="text-sm font-normal text-slate-500">km</span></div>
                    <div className="mt-4 flex items-center text-xs text-green-400 bg-green-900/20 w-fit px-2 py-1 rounded">
                        <Leaf className="h-3 w-3 mr-1" />
                        ~{(globalStats.totalKm * 0.12).toFixed(1)} kg CO2 (Estimé)
                    </div>
                </div>

                {/* Repas */}
                <div className="bg-cinema-800 p-5 rounded-xl border border-cinema-700 shadow-lg relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Utensils className="h-24 w-24 text-green-400" />
                    </div>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Restauration</p>
                    <div className="text-3xl font-bold text-white">{globalStats.totalMeals.toLocaleString()} <span className="text-sm font-normal text-slate-500">repas</span></div>
                    <div className="mt-4 flex flex-col gap-1">
                        <div className="w-full bg-cinema-900 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500" style={{ width: `${globalStats.totalMeals > 0 ? (globalStats.totalVeggieMeals / globalStats.totalMeals) * 100 : 0}%` }} />
                        </div>
                        <span className="text-xs text-green-400">
                            {globalStats.totalVeggieMeals} Végétariens ({globalStats.totalMeals > 0 ? ((globalStats.totalVeggieMeals / globalStats.totalMeals) * 100).toFixed(0) : 0}%)
                        </span>
                    </div>
                </div>

                {/* Matériel */}
                <div className="bg-cinema-800 p-5 rounded-xl border border-cinema-700 shadow-lg relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Package className="h-24 w-24 text-purple-400" />
                    </div>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Flux Matériel</p>
                    <div className="text-3xl font-bold text-white">{globalStats.totalItems.toLocaleString()} <span className="text-sm font-normal text-slate-500">items</span></div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-cinema-900 rounded p-1">
                            <span className="block font-bold text-white">{globalStats.itemsNew}</span>
                            <span className="block text-slate-500 scale-90">Neuf</span>
                        </div>
                        <div className="bg-cinema-900 rounded p-1">
                            <span className="block font-bold text-yellow-500">{globalStats.itemsUsed}</span>
                            <span className="block text-slate-500 scale-90">Entamé</span>
                        </div>
                        <div className="bg-cinema-900 rounded p-1">
                            <span className="block font-bold text-red-400">{globalStats.itemsEmpty}</span>
                            <span className="block text-slate-500 scale-90">Vide</span>
                        </div>
                    </div>
                </div>

                {/* Circular Loop */}
                <div className="bg-cinema-800 p-5 rounded-xl border border-cinema-700 shadow-lg relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Recycle className="h-24 w-24 text-eco-400" />
                    </div>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Seconde Vie</p>
                    <div className="text-3xl font-bold text-white">{(globalStats.itemsDonated + globalStats.itemsSold).toLocaleString()} <span className="text-sm font-normal text-slate-500">valorisés</span></div>
                    <div className="mt-4 flex gap-4 text-xs font-medium">
                        <span className="flex items-center gap-1 text-purple-400">
                            <ArrowUpRight className="h-3 w-3" />
                            {globalStats.itemsDonated} Dons
                        </span>
                        <span className="flex items-center gap-1 text-green-400">
                            <TrendingUp className="h-3 w-3" />
                            {globalStats.itemsSold} Ventes
                        </span>
                    </div>
                </div>
            </div>

            {/* Detailed Project List */}
            <div className="bg-cinema-800 rounded-xl border border-cinema-700 overflow-hidden">
                <div className="p-6 border-b border-cinema-700 bg-cinema-900/30 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Users className="h-5 w-5 text-slate-400" />
                        Performance par Production
                    </h3>
                    <span className="text-sm text-slate-500 bg-cinema-900 px-3 py-1 rounded-full border border-cinema-700">
                        {projectList.length} projets
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-cinema-700 text-xs font-bold text-slate-500 uppercase tracking-wider bg-cinema-900/50">
                                <th className="p-4">Projet</th>
                                <th className="p-4">Type</th>
                                <th className="p-4 text-right">Déplacements</th>
                                <th className="p-4 text-center">Repas Végétariens</th>
                                <th className="p-4 text-right">Items</th>
                                <th className="p-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-cinema-700/50">
                            {projectList.map(p => (
                                <tr key={p.id} className="hover:bg-cinema-700/20 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-white">{p.filmTitle || p.name}</div>
                                        <div className="text-xs text-slate-400">{p.productionCompany}</div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-300">
                                        {p.projectType || 'N/A'}
                                    </td>
                                    <td className="p-4 text-right text-sm font-medium text-blue-200">
                                        {p.localKm.toLocaleString()} km
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className={`text-sm font-bold ${p.localVeggiePercent > 50 ? 'text-green-400' : 'text-slate-300'}`}>
                                                {p.localVeggiePercent.toFixed(0)}%
                                            </span>
                                            <span className="text-[10px] text-slate-500">{p.localMeals} repas</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right text-sm text-slate-300">
                                        N/A
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs border ${p.status === 'Shooting' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                            p.status === 'Wrap' ? 'bg-slate-700 text-slate-300 border-slate-600' :
                                                'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                            }`}>
                                            {p.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
