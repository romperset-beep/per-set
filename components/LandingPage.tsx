
import React from 'react';
import { Building2, Users, ArrowRight, TrendingUp, ShieldCheck, Leaf, ShoppingBag, MessageSquare, Clapperboard, FileText, Package, RefreshCw } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

interface LandingPageProps {
    onStart: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
    const { language } = useProject();

    const translations = {
        fr: {
            title: "Per-Set",
            subtitle: "La première solution tout-en-un qui simplifie la vie de la production et des équipes techniques.",
            production: {
                title: "Pour la Production",
                points: [
                    {
                        title: "Centralisation & Économies",
                        desc: "Gérez toutes les commandes et dépenses en un seul endroit. Réduisez les coûts grâce à la réutilisation."
                    },
                    {
                        title: "Impact RSE Automatisé",
                        desc: "Générez automatiquement votre bilan carbone et social. Valorisez vos efforts écologiques sans effort."
                    },
                    {
                        title: "Gestion Simplifiée",
                        desc: "Suivez les stocks, les fiches de renseignements et les notes de frais en temps réel."
                    },
                    {
                        title: "Revente entre Productions",
                        desc: "Achetez moins cher vos consommables, gagnez des points RSE et revendez vos surplus en fin de tournage."
                    }
                ]
            },
            teams: {
                title: "Pour les Équipes",
                points: [
                    {
                        title: "Gestion Simplifiée",
                        desc: "Commandez vos consommables et gérez vos stocks facilement."
                    },
                    {
                        title: "Administratif Centralisé",
                        desc: "Vos notes de frais et feuilles de service accessibles au même endroit."
                    },
                    {
                        title: "Achats & Seconde Vie",
                        desc: "Accédez aux ventes de fin de tournage (Déco, Costumes, Prod)."
                    },
                    {
                        title: "Fiche de Renseignements",
                        desc: "Vos infos vous suivent sur tous les projets (plus de paperasse !)."
                    }
                ]
            },
            cta: "Découvrir l'expérience",
            ctaProd: "Connexion Production",
            ctaTeam: "Connexion Équipes",
            footer: "Une production plus verte, une équipe plus heureuse."
        },
        en: {
            title: "Per-Set",
            subtitle: "The first all-in-one solution simplifying life for production and technical teams.",
            production: {
                title: "For Production",
                points: [
                    {
                        title: "Centralization & Savings",
                        desc: "Manage all orders and expenses in one place. Reduce costs through reuse."
                    },
                    {
                        title: "Automated CSR Impact",
                        desc: "Automatically generate your carbon and social report. Valorize your ecological efforts effortlessly."
                    },
                    {
                        title: "Simplified Management",
                        desc: "Track stocks, information sheets, and expense reports in real time."
                    },
                    {
                        title: "Resale between Productions",
                        desc: "Buy consumables cheaper, earn CSR points, and resell your surplus at the end of filming."
                    }
                ]
            },
            teams: {
                title: "For Teams",
                points: [
                    {
                        title: "Simplified Management",
                        desc: "Order consumables and manage your stocks easily."
                    },
                    {
                        title: "Centralized Admin",
                        desc: "Your expense reports and call sheets accessible in one place."
                    },
                    {
                        title: "Purchases & Second Life",
                        desc: "Access end-of-shoot sales (Decor, Costumes, Prod)."
                    },
                    {
                        title: "Information Sheet",
                        desc: "Your info follows you on every project (no more paperwork!)."
                    }
                ]
            },
            cta: "Discover the experience",
            ctaProd: "Production Login",
            ctaTeam: "Team Login",
            footer: "A greener production, a happier team."
        },
        es: {
            title: "Per-Set",
            subtitle: "La primera solución todo en uno que simplifica la vida de la producción y los equipos técnicos.",
            production: {
                title: "Para la Producción",
                points: [
                    {
                        title: "Centralización y Ahorros",
                        desc: "Gestiona todos los pedidos y gastos en un solo lugar. Reduce costos gracias a la reutilización."
                    },
                    {
                        title: "Impacto RSE Automatizado",
                        desc: "Genera automáticamente tu balance de carbono y social. Valoriza tus esfuerzos ecológicos sin esfuerzo."
                    },
                    {
                        title: "Gestión Simplificada",
                        desc: "Sigue los stocks, las fichas de información y los informes de gastos en tiempo real."
                    },
                    {
                        title: "Reventa entre Producciones",
                        desc: "Compra consumibles más baratos, gana puntos RSE y revende tus excedentes al final del rodaje."
                    }
                ]
            },
            teams: {
                title: "Para los Equipos",
                points: [
                    {
                        title: "Gestión Simplificada",
                        desc: "Pide tus consumibles y gestiona tus stocks fácilmente."
                    },
                    {
                        title: "Administrativo Centralizado",
                        desc: "Tus informes de gastos y hojas de servicio accesibles en el mismo lugar."
                    },
                    {
                        title: "Compras y Segunda Vida",
                        desc: "Accede a las ventas de fin de rodaje (Decoración, Vestuario, Prod)."
                    },
                    {
                        title: "Ficha de Información",
                        desc: "Tus datos te siguen en todos los proyectos (¡se acabó el papeleo!)."
                    }
                ]
            },
            cta: "Descubrir la experiencia",
            ctaProd: "Conexión Producción",
            ctaTeam: "Conexión Equipos",
            footer: "Una producción más verde, un equipo más feliz."
        }
    };

    const t = translations[language];

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-5xl mx-auto p-6">

            {/* Header */}
            <div className="text-center mb-12 space-y-4">
                <img
                    src="/logo.png"
                    alt="Per-Set Logo"
                    className="h-32 w-32 object-contain rounded-2xl shadow-2xl mb-4"
                />
                <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                    {t.title}
                </h1>
                <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                    {t.subtitle}
                </p>
            </div>

            {/* Two Columns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mb-12">

                {/* Production Column */}
                <div className="bg-cinema-800/50 rounded-2xl p-8 border border-cinema-700/50 hover:border-blue-500/50 transition-all group backdrop-blur-sm">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 group-hover:scale-110 transition-transform">
                            <Building2 className="h-8 w-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">{t.production.title}</h2>
                    </div>

                    <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 min-w-[20px]"><TrendingUp className="h-5 w-5 text-blue-400" /></div>
                            <div>
                                <h3 className="font-bold text-slate-200">{t.production.points[0].title}</h3>
                                <p className="text-sm text-slate-400">{t.production.points[0].desc}</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 min-w-[20px]"><Leaf className="h-5 w-5 text-green-400" /></div>
                            <div>
                                <h3 className="font-bold text-slate-200">{t.production.points[1].title}</h3>
                                <p className="text-sm text-slate-400">{t.production.points[1].desc}</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 min-w-[20px]"><ShieldCheck className="h-5 w-5 text-purple-400" /></div>
                            <div>
                                <h3 className="font-bold text-slate-200">{t.production.points[2].title}</h3>
                                <p className="text-sm text-slate-400">{t.production.points[2].desc}</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 min-w-[20px]"><RefreshCw className="h-5 w-5 text-orange-400" /></div>
                            <div>
                                <h3 className="font-bold text-slate-200">{t.production.points[3].title}</h3>
                                <p className="text-sm text-slate-400">{t.production.points[3].desc}</p>
                            </div>
                        </li>
                    </ul>
                </div>

                {/* Users Column */}
                <div className="bg-cinema-800/50 rounded-2xl p-8 border border-cinema-700/50 hover:border-pink-500/50 transition-all group backdrop-blur-sm">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-pink-500/10 rounded-xl text-pink-400 group-hover:scale-110 transition-transform">
                            <Users className="h-8 w-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">{t.teams.title}</h2>
                    </div>

                    <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 min-w-[20px]"><Package className="h-5 w-5 text-pink-400" /></div>
                            <div>
                                <h3 className="font-bold text-slate-200">{t.teams.points[0].title}</h3>
                                <p className="text-sm text-slate-400">{t.teams.points[0].desc}</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 min-w-[20px]"><FileText className="h-5 w-5 text-yellow-400" /></div>
                            <div>
                                <h3 className="font-bold text-slate-200">{t.teams.points[1].title}</h3>
                                <p className="text-sm text-slate-400">{t.teams.points[1].desc}</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 min-w-[20px]"><ShoppingBag className="h-5 w-5 text-cyan-400" /></div>
                            <div>
                                <h3 className="font-bold text-slate-200">{t.teams.points[2].title}</h3>
                                <p className="text-sm text-slate-400">{t.teams.points[2].desc}</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 min-w-[20px]"><ShieldCheck className="h-5 w-5 text-green-400" /></div>
                            <div>
                                <h3 className="font-bold text-slate-200">{t.teams.points[3].title}</h3>
                                <p className="text-sm text-slate-400">{t.teams.points[3].desc}</p>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-6 w-full justify-center">
                {/* Production CTA */}
                <button
                    onClick={onStart}
                    className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-full shadow-2xl shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-105 transition-all duration-300 w-full sm:w-auto min-w-[280px]"
                >
                    <span className="flex items-center justify-center gap-3">
                        <Building2 className="h-6 w-6 opacity-80" />
                        {t.ctaProd}
                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform opacity-70" />
                    </span>
                </button>

                {/* Team CTA */}
                <button
                    onClick={onStart}
                    className="group relative px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold text-lg rounded-full shadow-2xl shadow-pink-600/30 hover:shadow-pink-600/50 hover:scale-105 transition-all duration-300 w-full sm:w-auto min-w-[280px]"
                >
                    <span className="flex items-center justify-center gap-3">
                        <Users className="h-6 w-6 opacity-80" />
                        {t.ctaTeam}
                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform opacity-70" />
                    </span>
                </button>
            </div>

            <p className="mt-6 text-slate-500 text-sm">
                {t.footer}
            </p>
        </div>
    );
};
