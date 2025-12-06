import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { generateEcoImpactReport } from '../services/geminiService';
import { ImpactMetrics, SurplusAction } from '../types';
import { Loader2, Leaf, Share2, Award, Building, DollarSign, PackageOpen } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const ImpactReport: React.FC = () => {
    const { project } = useProject();
    const [metrics, setMetrics] = useState<ImpactMetrics | null>(null);
    const [loading, setLoading] = useState(false);
    const [chartView, setChartView] = useState<'quantity' | 'money' | 'co2'>('quantity');

    useEffect(() => {
        const fetchMetrics = async () => {
            if (project.items.length > 0) {
                setLoading(true);
                const data = await generateEcoImpactReport(project.items, project.name);
                setMetrics(data);
                setLoading(false);
            }
        };
        fetchMetrics();
    }, [project.name]);

    // Calculate Pie Chart Data (Lifecycle)
    const surplusItems = project.items.filter(i => i.quantityCurrent > 0);

    // Heuristics for Estimation
    const getEstimatedPrice = (item: any) => {
        if (item.price) return item.price;
        switch (item.department) {
            case 'Caméra': return 150;
            case 'Lumière': return 80;
            case 'Son': return 100;
            case 'Machinerie': return 40;
            case 'Décoration': return 30;
            case 'Costume': return 45;
            case 'Régie': return 5;
            default: return 15;
        }
    };

    const getEstimatedCO2 = (item: any) => {
        // kg CO2e per item
        switch (item.department) {
            case 'Régie': return 0.5; // Food/Plastic (Low)
            case 'Décoration': return 2.0; // Wood/Paint (Medium)
            case 'Lumière': return 5.0; // Electronics/Bulbs (High)
            case 'Caméra': return 8.0; // Electronics (Very High)
            case 'Machinerie': return 3.0; // Metal/Heavy
            default: return 1.0;
        }
    };

    const getMetricByAction = (action: SurplusAction, view: 'quantity' | 'money' | 'co2') => {
        return surplusItems
            .filter(i => i.surplusAction === action)
            .reduce((acc, i) => {
                if (view === 'quantity') return acc + i.quantityCurrent;
                if (view === 'money') return acc + (i.quantityCurrent * getEstimatedPrice(i));
                if (view === 'co2') return acc + (i.quantityCurrent * getEstimatedCO2(i));
                return acc;
            }, 0);
    };

    const pieData = [
        { name: 'Don Pédagogique', value: getMetricByAction(SurplusAction.DONATION, chartView), color: '#d946ef' }, // Fuchsia
        { name: 'Stock Virtuel', value: getMetricByAction(SurplusAction.MARKETPLACE, chartView), color: '#06b6d4' }, // Cyan
        { name: 'Court-Métrage', value: getMetricByAction(SurplusAction.SHORT_FILM, chartView), color: '#f59e0b' }, // Amber
        { name: 'Non Valorisé', value: getMetricByAction(SurplusAction.NONE, chartView), color: '#ef4444' }, // Red
    ].filter(d => d.value > 0);

    const formatValue = (value: number) => {
        if (chartView === 'money') return `${value.toFixed(0)} €`;
        if (chartView === 'co2') return `${value.toFixed(1)} kg`;
        return value;
    };

    const handleShare = async () => {
        const element = document.getElementById('impact-report-content');
        if (!element) return;

        try {
            setLoading(true);
            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#0f172a', // Match app background
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            // Add Dark Background
            pdf.setFillColor(15, 23, 42); // #0f172a
            pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), 'F');

            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

            const fileName = `Rapport_RSE_${project.name.replace(/\s+/g, '_')}.pdf`;

            if (navigator.share) {
                const blob = pdf.output('blob');
                const file = new File([blob], fileName, { type: 'application/pdf' });
                await navigator.share({
                    title: `Rapport RSE - ${project.name}`,
                    text: `Voici le rapport d'impact écologique pour le projet ${project.name}.`,
                    files: [file],
                });
            } else {
                pdf.save(fileName);
            }
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Erreur lors de la génération du PDF.');
        } finally {
            setLoading(false);
        }
    };

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
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-medium">
                        <Award className="h-3 w-3" />
                        Conforme AFNOR Spec 2308 (Estimé)
                    </div>
                </div>
                {loading && (
                    <div className="flex items-center gap-2 text-eco-400 bg-eco-900/20 px-4 py-2 rounded-full">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm font-medium">Analyse IA en cours...</span>
                    </div>
                )}
                {!loading && metrics && (
                    <button
                        onClick={handleShare}
                        className="flex items-center gap-2 bg-eco-600 hover:bg-eco-500 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
                    >
                        <Share2 className="h-4 w-4" />
                        <span className="hidden md:inline">Partager / PDF</span>
                    </button>
                )}
            </header>

            {metrics && !loading && (
                <div id="impact-report-content" className="space-y-8 p-4 -m-4">
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
                                    Certification A Better Set
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
                                <span className="text-sm uppercase font-bold">Taux de Valorisation</span>
                            </div>
                            <p className="text-4xl font-bold text-white">{metrics.recyclingRate}%</p>
                            <p className="text-sm text-slate-500">Réemploi &amp; Recyclage (Objectif &gt; 50%)</p>
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
                            <p className="text-sm text-slate-500">CO2 évité (Scope 3 - Base Carbone)</p>
                        </div>
                    </div>

                    <div className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 h-96">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white">Cycle de Vie des Consommables</h3>
                            <div className="flex bg-cinema-900 rounded-lg p-1">
                                <button
                                    onClick={() => setChartView('quantity')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${chartView === 'quantity' ? 'bg-cinema-700 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Quantité
                                </button>
                                <button
                                    onClick={() => setChartView('money')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${chartView === 'money' ? 'bg-cinema-700 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Économie (€)
                                </button>
                                <button
                                    onClick={() => setChartView('co2')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${chartView === 'co2' ? 'bg-cinema-700 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Carbone (CO2)
                                </button>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height="85%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: number) => formatValue(value)}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Consumed Items Table */}
                    <div className="bg-cinema-800 rounded-xl border border-cinema-700 overflow-hidden col-span-full">
                        <div className="bg-cinema-700/40 px-6 py-4 border-b border-cinema-700">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <PackageOpen className="h-5 w-5 text-slate-400" />
                                Articles Entièrement Consommés
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-400">
                                <thead className="bg-cinema-900 uppercase font-medium border-b border-cinema-700 text-xs">
                                    <tr>
                                        <th className="px-6 py-3">Article</th>
                                        <th className="px-6 py-3">Département</th>
                                        <th className="px-6 py-3">Quantité Consommée</th>
                                        <th className="px-6 py-3">Impact CO2 Est.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cinema-700">
                                    {project.items.filter(i => i.quantityCurrent === 0 && i.purchased).length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center italic text-slate-500">
                                                Aucun article entièrement consommé pour le moment.
                                            </td>
                                        </tr>
                                    ) : (
                                        project.items
                                            .filter(i => i.quantityCurrent === 0 && i.purchased)
                                            .sort((a, b) => a.department.localeCompare(b.department))
                                            .map(item => (
                                                <tr key={item.id} className="hover:bg-cinema-700/20 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-white">{item.name}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="bg-cinema-900 text-slate-300 px-2 py-1 rounded text-xs border border-cinema-600">
                                                            {item.department}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-300">
                                                        {item.quantityInitial} {item.unit}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500">
                                                        {(item.quantityInitial * getEstimatedCO2(item)).toFixed(1)} kg
                                                    </td>
                                                </tr>
                                            ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
