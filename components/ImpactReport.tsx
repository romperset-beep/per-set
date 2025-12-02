import React, { useEffect, useState } from 'react';
import { Project, ImpactMetrics } from '../types';
import { generateEcoImpactReport } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2, Award, Leaf, DollarSign, Building } from 'lucide-react';

interface ImpactReportProps {
    project: Project;
}

export const ImpactReport: React.FC<ImpactReportProps> = ({ project }) => {
    const [metrics, setMetrics] = useState<ImpactMetrics | null>(null);
    const [loading, setLoading] = useState(false);

    // Avoid infinite loop by checking if items changed meaningfully or if we already have data for this session
    // In a real app, we'd trigger this manually or store it in state more persistently
    useEffect(() => {
        const fetchReport = async () => {
            if (project.items.some(i => i.quantityCurrent > 0)) {
                setLoading(true);
                const data = await generateEcoImpactReport(project.items, project.name);
                setMetrics(data);
                setLoading(false);
            }
        };

        // Only fetch if we haven't yet, or make a manual refresh button. 
        // For demo, we fetch on mount if there is data.
        if (!metrics) {
            fetchReport();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project.name]);

    const chartData = metrics ? [
        { name: 'Déchets évités (kg)', value: metrics.wasteDivertedKg, color: '#34d399' },
        { name: 'CO2 économisé (kg)', value: metrics.co2SavedKg, color: '#10b981' },
    ] : [];

    if (!project.items.some(i => i.quantityCurrent > 0)) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-500">
                <Leaf className="h-16 w-16 mb-4 text-slate-700" />
                <p className="text-lg">Aucun surplus à analyser pour le moment.</p>
                <p className="text-sm">Complétez l'inventaire de fin de tournage pour générer le rapport RSE.</p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold text-white">Rapport d'Impact RSE</h2>
                    <p className="text-slate-400 mt-1">Performance écologique et sociale de la production {project.productionCompany}. Film {project.name}</p>
                </div>
                {loading && (
                    <div className="flex items-center gap-2 text-eco-400 bg-eco-900/20 px-4 py-2 rounded-full">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm font-medium">Analyse IA en cours...</span>
                    </div>
                )}
            </header>

            {metrics && !loading && (
                <>
                    <div className="bg-gradient-to-r from-eco-900 to-cinema-900 rounded-2xl p-8 border border-eco-800 relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-eco-500 blur-[100px] opacity-20"></div>

                        <div className="flex flex-col md:flex-row gap-8 items-center">
                            <div className="relative">
                                <svg className="w-32 h-32 transform -rotate-90">
                                    <circle
                                        className="text-cinema-700"
                                        strokeWidth="8"
                                        stroke="currentColor"
                                        fill="transparent"
                                        r="58"
                                        cx="64"
                                        cy="64"
                                    />
                                    <circle
                                        className="text-eco-500"
                                        strokeWidth="8"
                                        strokeDasharray={365}
                                        strokeDashoffset={365 - (365 * metrics.sustainabilityScore) / 100}
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="transparent"
                                        r="58"
                                        cx="64"
                                        cy="64"
                                    />
                                </svg>
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                                    <span className="text-3xl font-bold text-white">{metrics.sustainabilityScore}</span>
                                    <span className="block text-[10px] text-eco-400 uppercase font-bold">Eco Score</span>
                                </div>
                            </div>

                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                    <Award className="text-yellow-400 h-6 w-6" />
                                    Certification CinéStock Vert
                                </h3>
                                <p className="text-slate-300 leading-relaxed italic">
                                    "{metrics.aiAnalysis}"
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-cinema-800 p-6 rounded-xl border border-cinema-700">
                            <div className="flex items-center gap-3 mb-2 text-slate-400">
                                <Building className="h-5 w-5" />
                                <span className="text-sm uppercase font-bold">Impact Social</span>
                            </div>
                            <p className="text-4xl font-bold text-white">{metrics.schoolsHelped}</p>
                            <p className="text-sm text-slate-500">Écoles soutenues par vos dons</p>
                        </div>
                        <div className="bg-cinema-800 p-6 rounded-xl border border-cinema-700">
                            <div className="flex items-center gap-3 mb-2 text-slate-400">
                                <DollarSign className="h-5 w-5" />
                                <span className="text-sm uppercase font-bold">Économies</span>
                            </div>
                            <p className="text-4xl font-bold text-eco-400">{metrics.moneySaved} €</p>
                            <p className="text-sm text-slate-500">Valeur réinjectée (Circularité)</p>
                        </div>
                        <div className="bg-cinema-800 p-6 rounded-xl border border-cinema-700">
                            <div className="flex items-center gap-3 mb-2 text-slate-400">
                                <Leaf className="h-5 w-5" />
                                <span className="text-sm uppercase font-bold">Environnement</span>
                            </div>
                            <p className="text-4xl font-bold text-blue-400">{metrics.co2SavedKg} kg</p>
                            <p className="text-sm text-slate-500">CO2 évité grâce au réemploi</p>
                        </div>
                    </div>

                    <div className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 h-80">
                        <h3 className="text-lg font-bold text-white mb-6">Visualisation d'Impact</h3>
                        <ResponsiveContainer width="100%" height="80%">
                            <BarChart data={chartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#334155" />
                                <XAxis type="number" stroke="#94a3b8" />
                                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={120} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}
        </div>
    );
};