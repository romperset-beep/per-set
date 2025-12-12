import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { generateEcoImpactReport } from '../services/geminiService';
import { ImpactMetrics, SurplusAction } from '../types';
import { Loader2, Leaf, Share2, Award, Building, DollarSign, PackageOpen, ShoppingBag } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const ImpactReport: React.FC = () => {
    const { project, buyBackItems, language } = useProject();
    const [metrics, setMetrics] = useState<ImpactMetrics | null>(null);
    const [loading, setLoading] = useState(false);
    const [chartView, setChartView] = useState<'quantity' | 'money' | 'co2'>('quantity');

    // Translations
    const t = {
        fr: {
            title: "Rapport d'Impact RSE",
            subtitle: "Performance écologique et sociale de la production {company}. Film {project}.",
            afnor: "Conforme AFNOR Spec 2308 (Estimé)",
            loading: "Analyse IA en cours...",
            share: "Partager / PDF",
            ecoScore: "Eco Score",
            certification: "Certification A Better Set",
            valuationRate: "Taux de Valorisation",
            reuseRecycle: "Réemploi & Recyclage (Objectif > 50%)",
            savings: "Économies",
            injectedValue: "Valeur réinjectée (Circularité)",
            environment: "Environnement",
            avoidedCo2: "CO2 évité (Scope 3 - Base Carbone)",
            lifecycle: "Cycle de Vie des Consommables",
            quantity: "Quantité",
            economy: "Économie (€)",
            carbon: "Carbone (CO2)",
            chart: {
                donation: "Don Pédagogique",
                stock: "Stock Virtuel",
                shortFilm: "Court-Métrage",
                none: "Non Valorisé"
            },
            consumedTitle: "Articles Entièrement Consommés",
            table: {
                item: "Article",
                dept: "Département",
                qtyConsumed: "Quantité Consommée",
                impact: "Impact CO2 Est."
            },
            noConsumed: "Aucun article entièrement consommé pour le moment.",
            virtualStockTitle: "Stock Virtuel & Réemploi",
            recoverable: "Récupérable pour un prochain projet",
            virtualStockDesc: "Les éléments suivants ont été identifiés comme \"Stock Virtuel\". Ils sont stockés numériquement et peuvent être réutilisés directement sur une nouvelle production, évitant ainsi de nouveaux achats et réduisant l'empreinte carbone.",
            available: "Dispo",
            internalSalesTitle: "Réemploi Interne / Ventes",
            circularEconomy: "Économie Circulaire",
            internalSalesDesc: "Ces articles ont été revendus ou transférés entre départements, prolongeant leur durée de vie et générant des revenus pour la production.",
            totalRevenue: "Total Revenus Générés",
            itemsSold: "articles vendus",
            salesTable: {
                item: "Article",
                seller: "Vendeur",
                price: "Prix"
            },
            empty: {
                title: "Aucun surplus à analyser pour le moment.",
                desc: "Complétez l'inventaire de fin de tournage pour générer le rapport RSE."
            },
            pdf: {
                title: "Rapport RSE - {project}",
                text: "Voici le rapport d'impact écologique pour le projet {project}."
            }
        },
        en: {
            title: "CSR Impact Report",
            subtitle: "Ecological and social performance of {company} production. Film {project}.",
            afnor: "Compliant AFNOR Spec 2308 (Estimated)",
            loading: "AI Analysis in progress...",
            share: "Share / PDF",
            ecoScore: "Eco Score",
            certification: "A Better Set Certification",
            valuationRate: "Valuation Rate",
            reuseRecycle: "Reuse & Recycling (Goal > 50%)",
            savings: "Savings",
            injectedValue: "Re-injected Value (Circularity)",
            environment: "Environment",
            avoidedCo2: "Avoided CO2 (Scope 3 - Carbon Base)",
            lifecycle: "Consumables Lifecycle",
            quantity: "Quantity",
            economy: "Savings (€)",
            carbon: "Carbon (CO2)",
            chart: {
                donation: "Educational Donation",
                stock: "Virtual Stock",
                shortFilm: "Short Film",
                none: "Non-Valued"
            },
            consumedTitle: "Fully Consumed Items",
            table: {
                item: "Item",
                dept: "Department",
                qtyConsumed: "Quantity Consumed",
                impact: "Est. CO2 Impact"
            },
            noConsumed: "No fully consumed items yet.",
            virtualStockTitle: "Virtual Stock & Reuse",
            recoverable: "Recoverable for a future project",
            virtualStockDesc: "The following items have been identified as \"Virtual Stock\". They are digitally stored and can be directly reused on a new production, avoiding new purchases and reducing the carbon footprint.",
            available: "Avail.",
            internalSalesTitle: "Internal Reuse / Sales",
            circularEconomy: "Circular Economy",
            internalSalesDesc: "These items have been resold or transferred between departments, extending their lifespan and generating revenue for the production.",
            totalRevenue: "Total Revenue Generated",
            itemsSold: "items sold",
            salesTable: {
                item: "Item",
                seller: "Seller",
                price: "Price"
            },
            empty: {
                title: "No surplus to analyze yet.",
                desc: "Complete the end-of-shoot inventory to generate the CSR report."
            },
            pdf: {
                title: "CSR Report - {project}",
                text: "Here is the ecological impact report for the project {project}."
            }
        },
        es: {
            title: "Informe de Impacto RSE",
            subtitle: "Rendimiento ecológico y social de la producción {company}. Película {project}.",
            afnor: "Conforme AFNOR Spec 2308 (Estimado)",
            loading: "Análisis IA en curso...",
            share: "Compartir / PDF",
            ecoScore: "Eco Puntuación",
            certification: "Certificación A Better Set",
            valuationRate: "Tasa de Valorización",
            reuseRecycle: "Reutilización y Reciclaje (Objetivo > 50%)",
            savings: "Ahorros",
            injectedValue: "Valor reinyectado (Circularidad)",
            environment: "Medio Ambiente",
            avoidedCo2: "CO2 evitado (Alcance 3 - Base Carbono)",
            lifecycle: "Ciclo de Vida de Consumibles",
            quantity: "Cant.",
            economy: "Ahorro (€)",
            carbon: "Carbono (CO2)",
            chart: {
                donation: "Donación Educativa",
                stock: "Stock Virtual",
                shortFilm: "Cortometraje",
                none: "No Valorizado"
            },
            consumedTitle: "Artículos Totalmente Consumidos",
            table: {
                item: "Artículo",
                dept: "Departamento",
                qtyConsumed: "Cantidad Consumida",
                impact: "Impacto CO2 Est."
            },
            noConsumed: "Ningún artículo totalmente consumido por el momento.",
            virtualStockTitle: "Stock Virtual y Reutilización",
            recoverable: "Recuperable para un próximo proyecto",
            virtualStockDesc: "Los siguientes elementos han sido identificados como \"Stock Virtual\". Se almacenan digitalmente y pueden reutilizarse directamente en una nueva producción, evitando nuevas compras y reduciendo la huella de carbono.",
            available: "Disp.",
            internalSalesTitle: "Reutilización Interna / Ventas",
            circularEconomy: "Economía Circular",
            internalSalesDesc: "Estos artículos han sido revendidos o transferidos entre departamentos, extendiendo su vida útil y generando ingresos para la producción.",
            totalRevenue: "Total Ingresos Generados",
            itemsSold: "artículos vendidos",
            salesTable: {
                item: "Artículo",
                seller: "Vendedor",
                price: "Precio"
            },
            empty: {
                title: "Ningún excedente para analizar por el momento.",
                desc: "Complete el inventario de fin de rodaje para generar el informe RSE."
            },
            pdf: {
                title: "Informe RSE - {project}",
                text: "Aquí está el informe de impacto ecológico para el proyecto {project}."
            },
            ecoprod: {
                title: "Répartition Carbon'Clap (Ecoprod)",
                desc: "Estimation des émissions évitées selon la nomenclature standard Carbon'Clap (Scope 3 - Achats).",
                legend: "CO2 Évité (kg)"
            }
        }
    }[language || 'fr'];

    const t_en_ecoprod = {
        title: "Carbon'Clap Breakdown (Ecoprod)",
        desc: "Estimated avoided emissions according to Carbon'Clap standard nomenclature (Scope 3 - Purchasing).",
        legend: "Avoided CO2 (kg)"
    };
    const t_es_ecoprod = {
        title: "Desglose Carbon'Clap (Ecoprod)",
        desc: "Estimación de emisiones evitadas según la nomenclatura estándar Carbon'Clap (Alcance 3 - Compras).",
        legend: "CO2 Evitado (kg)"
    };

    // Quick fix for missing translations in existing objects without rewriting huge blocks
    const tEco = language === 'en' ? t_en_ecoprod : language === 'es' ? t_es_ecoprod : t.ecoprod || {
        title: "Répartition Carbon'Clap (Ecoprod)",
        desc: "Estimation des émissions évitées selon la nomenclature standard Carbon'Clap (Scope 3 - Achats).",
        legend: "CO2 Évité (kg)"
    };

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
        { name: t.chart.donation, value: getMetricByAction(SurplusAction.DONATION, chartView), color: '#d946ef' }, // Fuchsia
        { name: t.chart.stock, value: getMetricByAction(SurplusAction.MARKETPLACE, chartView), color: '#06b6d4' }, // Cyan
        { name: t.chart.shortFilm, value: getMetricByAction(SurplusAction.SHORT_FILM, chartView), color: '#f59e0b' }, // Amber
        { name: t.chart.none, value: getMetricByAction(SurplusAction.NONE, chartView), color: '#ef4444' }, // Red
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
                    title: t.pdf.title.replace('{project}', project.name),
                    text: t.pdf.text.replace('{project}', project.name),
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
                <p className="text-lg">{t.empty.title}</p>
                <p className="text-sm">{t.empty.desc}</p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold text-white">{t.title}</h2>
                    <p className="text-slate-400 mt-1">{t.subtitle.replace('{company}', project.productionCompany).replace('{project}', project.name)}</p>
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-medium">
                        <Award className="h-3 w-3" />
                        {t.afnor}
                    </div>
                </div>
                {loading && (
                    <div className="flex items-center gap-2 text-eco-400 bg-eco-900/20 px-4 py-2 rounded-full">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm font-medium">{t.loading}</span>
                    </div>
                )}
                {!loading && metrics && (
                    <button
                        onClick={handleShare}
                        className="flex items-center gap-2 bg-eco-600 hover:bg-eco-500 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
                    >
                        <Share2 className="h-4 w-4" />
                        <span className="hidden md:inline">{t.share}</span>
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
                                    <span className="block text-[10px] text-eco-400 uppercase font-bold">{t.ecoScore}</span>
                                </div>
                            </div>

                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                    <Award className="text-yellow-400 h-6 w-6" />
                                    {t.certification}
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
                                <span className="text-sm uppercase font-bold">{t.valuationRate}</span>
                            </div>
                            <p className="text-4xl font-bold text-white">{metrics.recyclingRate}%</p>
                            <p className="text-sm text-slate-500">{t.reuseRecycle}</p>
                        </div>
                        <div className="bg-cinema-800 p-6 rounded-xl border border-cinema-700">
                            <div className="flex items-center gap-3 mb-2 text-slate-400">
                                <DollarSign className="h-5 w-5" />
                                <span className="text-sm uppercase font-bold">{t.savings}</span>
                            </div>
                            <p className="text-4xl font-bold text-eco-400">{metrics.moneySaved} €</p>
                            <p className="text-sm text-slate-500">{t.injectedValue}</p>
                        </div>
                        <div className="bg-cinema-800 p-6 rounded-xl border border-cinema-700">
                            <div className="flex items-center gap-3 mb-2 text-slate-400">
                                <Leaf className="h-5 w-5" />
                                <span className="text-sm uppercase font-bold">{t.environment}</span>
                            </div>
                            <p className="text-4xl font-bold text-blue-400">{metrics.co2SavedKg} kg</p>
                            <p className="text-sm text-slate-500">{t.avoidedCo2}</p>
                        </div>
                    </div>

                    <div className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 h-[28rem] md:h-96">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                            <h3 className="text-lg font-bold text-white text-center md:text-left">{t.lifecycle}</h3>
                            <div className="flex bg-cinema-900 rounded-lg p-1 w-full md:w-auto justify-center md:justify-start overflow-x-auto">
                                <button
                                    onClick={() => setChartView('quantity')}
                                    className={`flex-1 md:flex-none px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${chartView === 'quantity' ? 'bg-cinema-700 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    {t.quantity}
                                </button>
                                <button
                                    onClick={() => setChartView('money')}
                                    className={`flex-1 md:flex-none px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${chartView === 'money' ? 'bg-cinema-700 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    {t.economy}
                                </button>
                                <button
                                    onClick={() => setChartView('co2')}
                                    className={`flex-1 md:flex-none px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${chartView === 'co2' ? 'bg-cinema-700 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    {t.carbon}
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

                    {/* Carbon'Clap Breakdown Section */}
                    {metrics.ecoprodBreakdown && (
                        <div className="bg-cinema-800 rounded-xl border border-cinema-700 p-6 h-96">
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Leaf className="h-5 w-5 text-green-400" />
                                    {tEco.title}
                                </h3>
                                <p className="text-sm text-slate-400">
                                    {tEco.desc}
                                </p>
                            </div>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={Object.entries(metrics.ecoprodBreakdown)
                                            .map(([name, value]) => ({ name, value }))
                                            .sort((a, b) => b.value - a.value)
                                            .filter(d => d.value > 0)
                                        }
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={false} />
                                        <XAxis type="number" stroke="#94a3b8" fontSize={10} unit=" kg" />
                                        <YAxis dataKey="name" type="category" stroke="#fff" fontSize={11} width={100} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                            formatter={(value: number) => [`${value.toFixed(1)} kg`, tEco.legend]}
                                        />
                                        <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Consumed Items Table */}
                    <div className="bg-cinema-800 rounded-xl border border-cinema-700 overflow-hidden col-span-full">
                        <div className="bg-cinema-700/40 px-6 py-4 border-b border-cinema-700">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <PackageOpen className="h-5 w-5 text-slate-400" />
                                {t.consumedTitle}
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-400">
                                <thead className="bg-cinema-900 uppercase font-medium border-b border-cinema-700 text-xs">
                                    <tr>
                                        <th className="px-6 py-3">{t.table.item}</th>
                                        <th className="px-6 py-3">{t.table.dept}</th>
                                        <th className="px-6 py-3">{t.table.qtyConsumed}</th>
                                        <th className="px-6 py-3">{t.table.impact}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cinema-700">
                                    {project.items.filter(i => i.quantityCurrent === 0 && i.purchased).length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center italic text-slate-500">
                                                {t.noConsumed}
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

                    {/* Virtual Stock / Recoverable Items Section */}
                    {project.items.some(i => i.surplusAction === SurplusAction.MARKETPLACE) && (
                        <div className="bg-gradient-to-br from-cyan-900/20 to-cinema-800 rounded-xl border border-cyan-700/50 overflow-hidden col-span-full mt-6">
                            <div className="bg-cyan-900/30 px-6 py-4 border-b border-cyan-700/50 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-cyan-100 flex items-center gap-2">
                                    <Share2 className="h-5 w-5 text-cyan-400" />
                                    {t.virtualStockTitle}
                                </h3>
                                <span className="text-xs font-bold bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full border border-cyan-500/30">
                                    {t.recoverable}
                                </span>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-cyan-200/80 mb-4">
                                    {t.virtualStockDesc}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {project.items
                                        .filter(i => i.surplusAction === SurplusAction.MARKETPLACE)
                                        .map(item => (
                                            <div key={item.id} className="bg-cinema-900/50 border border-cinema-700 p-3 rounded-lg flex justify-between items-center group hover:border-cyan-500/50 transition-colors">
                                                <div>
                                                    <div className="font-medium text-white">{item.name}</div>
                                                    <div className="text-xs text-slate-500">{item.department}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-cyan-400 font-bold">{item.quantityCurrent} {item.unit}</div>
                                                    <div className="text-[10px] text-slate-600 uppercase">{t.available}</div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BuyBack Sales Section */}
                    {buyBackItems.some(i => i.status === 'SOLD') && (
                        <div className="bg-cinema-800 rounded-xl border border-cinema-700 overflow-hidden col-span-full mt-6">
                            <div className="bg-green-900/30 px-6 py-4 border-b border-green-700/50 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-green-100 flex items-center gap-2">
                                    <ShoppingBag className="h-5 w-5 text-green-400" />
                                    {t.internalSalesTitle}
                                </h3>
                                <span className="text-xs font-bold bg-green-500/20 text-green-300 px-3 py-1 rounded-full border border-green-500/30">
                                    {t.circularEconomy}
                                </span>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-green-200/80 mb-4">
                                    {t.internalSalesDesc}
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-cinema-900/50 p-6 rounded-lg border border-cinema-700">
                                        <div className="text-sm text-slate-400 uppercase font-bold mb-2">{t.totalRevenue}</div>
                                        <div className="text-3xl font-bold text-green-400">
                                            {buyBackItems.filter(i => i.status === 'SOLD').reduce((acc, i) => acc + i.price, 0)} €
                                        </div>
                                        <div className="text-sm text-slate-500 mt-1">
                                            {buyBackItems.filter(i => i.status === 'SOLD').length} {t.itemsSold}
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm text-slate-400">
                                            <thead className="border-b border-cinema-700">
                                                <tr>
                                                    <th className="pb-2">{t.salesTable.item}</th>
                                                    <th className="pb-2">{t.salesTable.seller}</th>
                                                    <th className="pb-2">{t.salesTable.price}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-cinema-700/50">
                                                {buyBackItems
                                                    .filter(i => i.status === 'SOLD')
                                                    .map(item => (
                                                        <tr key={item.id}>
                                                            <td className="py-2 text-white">{item.name}</td>
                                                            <td className="py-2">{item.sellerDepartment}</td>
                                                            <td className="py-2 text-green-400 font-bold">{item.price} €</td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
