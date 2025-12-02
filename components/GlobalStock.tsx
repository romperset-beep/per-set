import React from 'react';
import { useProject } from '../context/ProjectContext';
import { Department, ItemStatus, SurplusAction } from '../types';
import { Globe, TrendingUp, Package, ArrowRight, Building2 } from 'lucide-react';

// Mock Data for Global Stock (simulating other productions)
const MOCK_GLOBAL_STOCK = [
    {
        id: 'g1',
        name: 'Projecteur LED 1000W',
        production: 'Film "Le Dernier Souffle"',
        department: Department.LUMIERE,
        quantity: 4,
        price: 1200, // Price per unit
        status: ItemStatus.NEW,
        availableDate: '2023-11-15'
    },
    {
        id: 'g2',
        name: 'Costumes Époque 1920',
        production: 'Série "Les Années Folles"',
        department: Department.COSTUME,
        quantity: 15,
        price: 350,
        status: ItemStatus.USED,
        availableDate: '2023-12-01'
    },
    {
        id: 'g3',
        name: 'Panneaux Bois Décors',
        production: 'Film "Le Dernier Souffle"',
        department: Department.DECO,
        quantity: 20,
        price: 80,
        status: ItemStatus.USED,
        availableDate: '2023-11-20'
    },
    {
        id: 'g4',
        name: 'Câbles XLR 10m',
        production: 'Pub "EcoDrive"',
        department: Department.SON,
        quantity: 10,
        price: 25,
        status: ItemStatus.NEW,
        availableDate: '2023-10-30'
    },
    {
        id: 'g5',
        name: 'Peinture Verte (Restant)',
        production: 'Série "Les Années Folles"',
        department: Department.DECO,
        quantity: 5,
        price: 45,
        status: ItemStatus.USED,
        availableDate: '2023-12-05'
    }
];

export const GlobalStock: React.FC = () => {
    const { project } = useProject();

    // Get current project's virtual stock
    const currentProjectStock = project.items
        .filter(item => item.surplusAction === SurplusAction.MARKETPLACE)
        .map(item => ({
            id: item.id,
            name: item.name,
            production: project.name, // Use current project name
            department: item.department,
            quantity: item.quantityCurrent,
            price: 0, // Default or calculated if available
            status: item.status,
            availableDate: new Date().toISOString() // Available now
        }));

    // Combine with mock data
    const allStock = [...MOCK_GLOBAL_STOCK, ...currentProjectStock];

    // Calculate Total Savings
    const totalSavings = allStock.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const totalItems = allStock.reduce((acc, item) => acc + item.quantity, 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-blue-500/20 rounded-xl">
                        <Globe className="h-8 w-8 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white">Stock Global Inter-Productions</h2>
                        <p className="text-slate-400">
                            Consultez le stock virtuel disponible de toutes vos productions pour vos futurs projets.
                        </p>
                    </div>
                </div>
            </header>

            {/* Savings Banner */}
            <div className="bg-gradient-to-r from-blue-900/50 to-cinema-800 border border-blue-500/30 rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <TrendingUp className="h-64 w-64 text-blue-400" />
                </div>

                <div className="relative z-10">
                    <h3 className="text-lg font-medium text-blue-300 mb-2">Économies Potentielles Totales</h3>
                    <div className="flex items-baseline gap-4">
                        <span className="text-5xl font-bold text-white">{totalSavings.toLocaleString('fr-FR')} €</span>
                        <span className="text-slate-400">de matériel disponible</span>
                    </div>
                    <p className="mt-4 text-slate-300 max-w-2xl">
                        En réutilisant ces {totalItems} articles stockés virtuellement au lieu de les racheter,
                        votre société de production optimise ses budgets et réduit son empreinte carbone.
                    </p>
                </div>
            </div>

            {/* Stock List */}
            <div className="bg-cinema-800/50 rounded-xl border border-cinema-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-cinema-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Package className="h-5 w-5 text-slate-400" />
                        Inventaire Disponible
                    </h3>
                    <span className="text-xs bg-cinema-900 text-slate-400 px-3 py-1 rounded-full border border-cinema-700">
                        {allStock.length} références
                    </span>
                </div>

                <div className="divide-y divide-cinema-700/50">
                    {allStock.map(item => (
                        <div key={item.id} className="p-6 hover:bg-cinema-700/20 transition-colors group">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h4 className="text-lg font-bold text-white">{item.name}</h4>
                                        <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
                                            {item.department}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                        <Building2 className="h-3 w-3" />
                                        <span>Provenance : {item.production}</span>
                                        <span className="text-cinema-600">•</span>
                                        <span>Dispo : {new Date(item.availableDate).toLocaleDateString('fr-FR')}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8">
                                    <div className="text-right">
                                        <div className="text-sm text-slate-400">Quantité</div>
                                        <div className="text-xl font-bold text-white">{item.quantity}</div>
                                    </div>
                                    <div className="text-right w-32">
                                        <div className="text-sm text-slate-400">Valeur Est.</div>
                                        <div className="text-xl font-bold text-eco-400">
                                            {(item.price * item.quantity).toLocaleString('fr-FR')} €
                                        </div>
                                    </div>
                                    <button className="p-2 rounded-lg bg-cinema-700 text-slate-300 hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0">
                                        <ArrowRight className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
