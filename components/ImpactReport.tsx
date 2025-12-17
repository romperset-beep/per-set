import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { generateEcoImpactReport } from '../services/geminiService';
import { ImpactMetrics, SurplusAction, EcoprodCriterion, CarbonContext } from '../types';
import { Loader2, Leaf, Share2, Award, Building, DollarSign, PackageOpen, ShoppingBag, CheckSquare, Info, ShieldCheck, Settings, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ECOPROD_CRITERIA_RAW, ECOPROD_CRITERIA } from '../data/ecoprodCriteria';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const ImpactReport: React.FC = () => {
    const { project, buyBackItems, language, updateEcoprodChecklist, updateProjectDetails } = useProject();
    const [metrics, setMetrics] = useState<ImpactMetrics | null>(null);
    const [loading, setLoading] = useState(false);
    const [chartView, setChartView] = useState<'quantity' | 'money' | 'co2'>('quantity');
    const [isContextModalOpen, setIsContextModalOpen] = useState(false);
    const [tempContext, setTempContext] = useState<CarbonContext>({
        shootingDays: project.carbonContext?.shootingDays || 30,
        teamSize: project.carbonContext?.teamSize || 50,
        transportMode: project.carbonContext?.transportMode || 'Mixte',
        energySource: project.carbonContext?.energySource || 'Mixte',
        postcode: project.carbonContext?.postcode || '',
        cateringVegPercent: project.carbonContext?.cateringVegPercent || 0,
        totalNights: project.carbonContext?.totalNights || 0,
        locationRatio: project.carbonContext?.locationRatio || 0,
        textilesEcoPercent: project.carbonContext?.textilesEcoPercent || 0
    });

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
                title: "Desglose Ecoprod",
                desc: "Estimación de emisiones evitadas según la nomenclatura estándar Ecoprod (Alcance 3 - Compras).",
                legend: "CO2 Evitado (kg)"
            }
        }
    }[language || 'fr'];

    // Quick fix for missing translations
    const tEco = t.ecoprod || {
        title: "Répartition Ecoprod",
        desc: "Estimation des émissions évitées selon la nomenclature standard Ecoprod (Scope 3 - Achats).",
        legend: "CO2 Évité (kg)"
    };

    // Calculate Real Eco Score
    const calculateRealScore = () => {
        if (!project.ecoprodChecklist) return null;

        let earnedPoints = 0;
        let totalPoints = 0;

        ECOPROD_CRITERIA.forEach(c => {
            const weight = c.impact === 'High' ? 3 : c.impact === 'Medium' ? 2 : 1;
            totalPoints += weight;
            if (project.ecoprodChecklist?.[c.id]) {
                earnedPoints += weight;
            }
        });

        return totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    };

    const auditScore = calculateRealScore();
    const aiScore = metrics?.sustainabilityScore || 0;
    const isAuditActive = auditScore !== null;
    const displayScore = isAuditActive ? auditScore : aiScore;

    const handleToggleCriterion = async (id: string, current: boolean) => {
        try {
            const newChecklist = { ...(project.ecoprodChecklist || {}), [id]: !current };
            await updateEcoprodChecklist(newChecklist);
        } catch (error) {
            console.error("Error toggling criterion:", error);
            alert("Une erreur est survenue lors de la mise à jour de la checklist. Veuillez réessayer.");
        }
    };

    const fetchMetrics = async () => {
        if (project.items.length > 0) {
            setLoading(true);
            try {
                const data = await generateEcoImpactReport(project.items, project.name, project.carbonContext);
                setMetrics(data);
            } catch (error) {
                console.error("Error generating report:", error);
                alert("Erreur lors de l'analyse IA. Veuillez réessayer.");
            } finally {
                setLoading(false);
            }
        }
    };

    // Auto-run ONLY on first mount if data exists and no metrics yet (optional, or just keep manual)
    // For now, completely manual as requested.
    // useEffect(() => { ... }, []);

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

    const generateShareText = () => {
        const donationCount = project.items.filter(i => i.surplusAction === SurplusAction.DONATION).reduce((acc, i) => acc + i.quantityCurrent, 0);
        const shortFilmCount = project.items.filter(i => i.surplusAction === SurplusAction.SHORT_FILM).reduce((acc, i) => acc + i.quantityCurrent, 0);
        const stockCount = project.items.filter(i => i.surplusAction === SurplusAction.MARKETPLACE).reduce((acc, i) => acc + i.quantityCurrent, 0);
        const salesTotal = buyBackItems.filter(i => i.status === 'SOLD').reduce((acc, i) => acc + i.price, 0);

        let text = `🎬 Rapport Impact RSE - ${project.name}\n`;
        text += `Score Durabilité : ${displayScore}/100\n\n`;

        text += `✨ Impact "A Better Set" (Économie Circulaire) :\n`;
        text += `- ${donationCount} dons pédagogiques (écoles)\n`;
        text += `- ${shortFilmCount} dons aux courts-métrages\n`;
        text += `- ${stockCount} articles en stock virtuel (réemploi)\n`;
        text += `- ${salesTotal}€ de ventes internes (rachats)\n\n`;

        if (project.ecoprodChecklist) {
            text += `✅ Audit Ecoprod - Actions Validées :\n`;
            ECOPROD_CRITERIA_RAW.forEach(cat => {
                const activeCriteria = cat.criteria.filter(c => project.ecoprodChecklist?.[c.id]);
                if (activeCriteria.length > 0) {
                    text += `\n📂 ${cat.category} :\n`;
                    activeCriteria.forEach(c => {
                        text += `- ${c.label}\n`;
                    });
                }
            });
        }

        return text;
    };

    const handleShare = async () => {
        const element = document.getElementById('impact-report-combined');
        if (!element) return;

        try {
            setLoading(true);
            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#0f172a', // Match app background
            });

            const imgData = canvas.toDataURL('image/png');

            // Calculate dimensions using a temp PDF instance to get logic or just math
            // Actually we don't need a PDF instance to get aspect ratio, we have canvas.width/height
            // But if we want to be safe with jsPDF's internal logic:
            const tempPdf = new jsPDF();
            const imgProps = tempPdf.getImageProperties(imgData);
            const pdfWidth = 210; // A4 width in mm
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [pdfWidth, pdfHeight], // Dynamic height to fit content
            });

            // Add Dark Background
            pdf.setFillColor(15, 23, 42); // #0f172a
            pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

            const fileName = `Rapport_RSE_${project.name.replace(/\s+/g, '_')}.pdf`;

            if (navigator.share) {
                try {
                    const blob = pdf.output('blob');
                    const file = new File([blob], fileName, { type: 'application/pdf' });
                    const shareText = generateShareText();

                    await navigator.share({
                        title: t.pdf.title.replace('{project}', project.name),
                        text: shareText,
                        files: [file],
                    });
                } catch (shareError) {
                    console.warn('Navigator share failed, falling back to download:', shareError);
                    pdf.save(fileName);
                }
            } else {
                pdf.save(fileName);
            }
        } catch (error: any) {
            console.error('Error generating PDF:', error);
            alert(`Erreur lors de la génération du PDF: ${error.message || error}`);
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
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsContextModalOpen(true)}
                        className="flex items-center gap-2 bg-cinema-800 hover:bg-cinema-700 border border-cinema-600 text-slate-300 px-3 py-2 rounded-lg transition-colors"
                    >
                        <Settings className="h-4 w-4" />
                        <span className="hidden md:inline">Contexte</span>
                    </button>

                    {!loading && !metrics && (
                        <button
                            onClick={fetchMetrics}
                            className="flex items-center gap-2 bg-eco-600 hover:bg-eco-500 text-white px-4 py-2 rounded-lg shadow-lg transition-colors animate-pulse"
                        >
                            <Leaf className="h-4 w-4" />
                            <span className="font-bold">Lancer l'Analyse IA</span>
                        </button>
                    )}

                    {loading && (
                        <div className="flex items-center gap-2 text-eco-400 bg-eco-900/20 px-4 py-2 rounded-full">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="text-sm font-medium">{t.loading}</span>
                        </div>
                    )}
                    {!loading && metrics && (
                        <>
                            <button
                                onClick={fetchMetrics} // Allow re-run
                                className="flex items-center gap-2 bg-cinema-800 hover:bg-cinema-700 border border-cinema-600 text-slate-300 px-3 py-2 rounded-lg transition-colors"
                                title="Relancer l'analyse"
                            >
                                <Leaf className="h-4 w-4" />
                            </button>
                            <button
                                onClick={handleShare}
                                className="flex items-center gap-2 bg-eco-600 hover:bg-eco-500 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
                            >
                                <Share2 className="h-4 w-4" />
                                <span className="hidden md:inline">{t.share}</span>
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* Context Modal */}
            {isContextModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-cinema-800 rounded-xl border border-cinema-700 w-full max-w-md p-6 relative">
                        <button
                            onClick={() => setIsContextModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Settings className="h-5 w-5 text-eco-400" />
                            Contexte Carbone
                        </h3>
                        <p className="text-sm text-slate-400 mb-6">
                            Ces informations permettent à l'IA d'estimer les émissions liées aux transports, à l'énergie et à la vie d'équipe (repas, hébergement).
                        </p>

                        <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-2">
                            {/* Section 1: Général */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-eco-400 border-b border-cinema-700 pb-1">1. Production & Équipe</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Jours de Tournage</label>
                                        <input
                                            type="number"
                                            value={tempContext.shootingDays}
                                            onChange={e => setTempContext({ ...tempContext, shootingDays: Number(e.target.value) })}
                                            className="w-full bg-cinema-900 border border-cinema-700 rounded p-2 text-white focus:border-eco-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Taille Équipe</label>
                                        <input
                                            type="number"
                                            value={tempContext.teamSize}
                                            onChange={e => setTempContext({ ...tempContext, teamSize: Number(e.target.value) })}
                                            className="w-full bg-cinema-900 border border-cinema-700 rounded p-2 text-white focus:border-eco-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Transport & Énergie */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-eco-400 border-b border-cinema-700 pb-1">2. Transport & Énergie</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Transport Principal</label>
                                        <select
                                            value={tempContext.transportMode}
                                            onChange={e => setTempContext({ ...tempContext, transportMode: e.target.value as any })}
                                            className="w-full bg-cinema-900 border border-cinema-700 rounded p-2 text-white focus:border-eco-500 outline-none"
                                        >
                                            <option value="Mixte">Mixte (Défaut)</option>
                                            <option value="Train">Train (Bas Carbone)</option>
                                            <option value="Voiture">Voiture / Camion</option>
                                            <option value="Avion">Avion (Critique)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Source Énergie</label>
                                        <select
                                            value={tempContext.energySource}
                                            onChange={e => setTempContext({ ...tempContext, energySource: e.target.value as any })}
                                            className="w-full bg-cinema-900 border border-cinema-700 rounded p-2 text-white focus:border-eco-500 outline-none"
                                        >
                                            <option value="Mixte">Mixte (Défaut)</option>
                                            <option value="Réseau">Réseau Local</option>
                                            <option value="Groupe Électrogène">Groupe Électro.</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Vie d'Équipe */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-eco-400 border-b border-cinema-700 pb-1">3. Vie d'Équipe & Restauration</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Repas Végétariens (%)</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                step="10"
                                                value={tempContext.cateringVegPercent || 0}
                                                onChange={e => setTempContext({ ...tempContext, cateringVegPercent: Number(e.target.value) })}
                                                className="flex-1 accent-eco-500"
                                            />
                                            <span className="text-sm text-white w-8">{tempContext.cateringVegPercent || 0}%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Total Nuitées Hôtels</label>
                                        <input
                                            type="number"
                                            value={tempContext.totalNights || 0}
                                            onChange={e => setTempContext({ ...tempContext, totalNights: Number(e.target.value) })}
                                            className="w-full bg-cinema-900 border border-cinema-700 rounded p-2 text-white focus:border-eco-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Décors & HMC */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-eco-400 border-b border-cinema-700 pb-1">4. Moyens Techniques & HMC</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ratio Studio/Naturel (%)</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                step="10"
                                                value={tempContext.locationRatio || 0}
                                                onChange={e => setTempContext({ ...tempContext, locationRatio: Number(e.target.value) })}
                                                className="flex-1 accent-eco-500"
                                            />
                                            <span className="text-sm text-white w-8">{tempContext.locationRatio || 0}%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">HMC Éco-responsable (%)</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                step="10"
                                                value={tempContext.textilesEcoPercent || 0}
                                                onChange={e => setTempContext({ ...tempContext, textilesEcoPercent: Number(e.target.value) })}
                                                className="flex-1 accent-eco-500"
                                            />
                                            <span className="text-sm text-white w-8">{tempContext.textilesEcoPercent || 0}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <button
                                onClick={() => setIsContextModalOpen(false)}
                                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={async () => {
                                    await updateProjectDetails({ carbonContext: tempContext });
                                    setIsContextModalOpen(false);
                                    // Trigger re-generation indirectly via project update
                                }}
                                className="bg-eco-600 hover:bg-eco-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                Enregistrer & Recalculer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ALWAYS SHOW CHECKLIST (Section 2), but hide metrics if null */}

            <div className="border-t border-cinema-700 pt-8 mt-8">
                <div className="bg-cinema-800 rounded-xl p-8 border border-cinema-700">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                <ShieldCheck className="h-8 w-8 text-eco-400" />
                                Checklist Ecoprod
                            </h3>
                            <p className="text-slate-400 mt-2">Cochez les actions réalisées pour obtenir votre certification plus précise !</p>
                        </div>
                        <div className="text-right">
                            <div className="text-4xl font-bold text-white">{auditScore !== null ? auditScore : 0}/100</div>
                            <div className="text-sm font-bold uppercase text-eco-400">Score Audit</div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {ECOPROD_CRITERIA_RAW.map((category) => (
                            <div key={category.category} className="bg-cinema-900/50 rounded-lg p-6 border border-cinema-800">
                                <h4 className="font-bold text-xl text-white mb-6 border-b border-cinema-700 pb-2">
                                    {category.category}
                                </h4>
                                <div className="grid gap-4">
                                    {category.criteria.map(criterion => {
                                        const isChecked = project.ecoprodChecklist?.[criterion.id] || false;
                                        return (
                                            <div
                                                key={criterion.id}
                                                onClick={() => handleToggleCriterion(criterion.id, isChecked)}
                                                className={`flex items-start gap-4 p-4 rounded-lg cursor-pointer transition-all border ${isChecked ? 'bg-eco-900/20 border-eco-500/50' : 'bg-cinema-900 border-cinema-700 hover:border-cinema-500'}`}
                                            >
                                                <div className={`mt-1 h-6 w-6 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isChecked ? 'bg-eco-500 border-eco-500 text-white' : 'border-slate-600'}`}>
                                                    {isChecked && <CheckSquare className="h-4 w-4" />}
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`text-base ${isChecked ? 'text-white' : 'text-slate-300'}`}>{criterion.label}</p>
                                                    <div className="flex gap-2 mt-2">
                                                        <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${criterion.impact === 'High' ? 'bg-red-500/20 text-red-300' :
                                                            criterion.impact === 'Medium' ? 'bg-orange-500/20 text-orange-300' :
                                                                'bg-blue-500/20 text-blue-300'
                                                            }`}>
                                                            Impact {criterion.impact}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {
                metrics && !loading && (
                    <div id="impact-report-combined" className="space-y-12 p-4 -m-4">

                        {/* SECTION 1: OVERVIEW METRICS */}
                        <div className="space-y-8">
                            <div className="bg-gradient-to-r from-eco-900 to-cinema-900 rounded-2xl p-8 border border-eco-800 relative overflow-hidden">
                                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-eco-500 blur-[100px] opacity-20"></div>

                                <div className="flex flex-col md:flex-row gap-8 items-center">
                                    <div className="relative">
                                        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 128 128">
                                            {/* Background Circle */}
                                            <circle
                                                className="text-cinema-700"
                                                strokeWidth="8"
                                                stroke="currentColor"
                                                fill="transparent"
                                                r="58"
                                                cx="64"
                                                cy="64"
                                            />
                                            {/* Potential Score Object (Ghost) */}
                                            {isAuditActive && (
                                                <circle
                                                    className="text-eco-800/50"
                                                    strokeWidth="8"
                                                    strokeDasharray={365}
                                                    strokeDashoffset={365 - (365 * aiScore) / 100}
                                                    strokeLinecap="round"
                                                    stroke="currentColor"
                                                    fill="transparent"
                                                    r="58"
                                                    cx="64"
                                                    cy="64"
                                                />
                                            )}
                                            {/* Real/Main Score */}
                                            <circle
                                                className={isAuditActive ? "text-blue-500" : "text-eco-500"}
                                                strokeWidth="8"
                                                strokeDasharray={365}
                                                strokeDashoffset={365 - (365 * displayScore) / 100}
                                                strokeLinecap="round"
                                                stroke="currentColor"
                                                fill="transparent"
                                                r="58"
                                                cx="64"
                                                cy="64"
                                            />
                                        </svg>
                                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full">
                                            <span className="text-3xl font-bold text-white">{displayScore}/100</span>
                                            <span className="block text-[10px] text-slate-400 uppercase font-bold mt-1">
                                                {isAuditActive ? 'Score Audit' : 'Score Potentiel'}
                                            </span>
                                            {isAuditActive && aiScore > displayScore && (
                                                <span className="block text-[10px] text-eco-400 font-bold mt-1">
                                                    Potentiel: {aiScore}
                                                </span>
                                            )}
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

                            {/* Virtual Stock Section */}
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
                    </div>
                )
            }
        </div>
    );
};
