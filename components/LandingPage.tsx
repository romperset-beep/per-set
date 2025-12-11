import React from 'react';
import { Building2, Users, ArrowRight, TrendingUp, ShieldCheck, Leaf, ShoppingBag, MessageSquare, Clapperboard, FileText, Package } from 'lucide-react';

interface LandingPageProps {
    onStart: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
    return (
        <div className="flex flex-col items-center justify-center w-full max-w-5xl mx-auto p-6 animate-in fade-in duration-700">

            {/* Header */}
            <div className="text-center mb-12 space-y-4">
                <div className="inline-flex items-center justify-center p-4 bg-cinema-800 rounded-full border border-cinema-700 shadow-2xl mb-4">
                    <Clapperboard className="h-12 w-12 text-pink-500" />
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                    A Better Set
                </h1>
                <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                    La première solution tout-en-un qui simplifie la vie de la production et des équipes techniques.
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
                        <h2 className="text-2xl font-bold text-white">Pour la Production</h2>
                    </div>

                    <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 min-w-[20px]"><TrendingUp className="h-5 w-5 text-blue-400" /></div>
                            <div>
                                <h3 className="font-bold text-slate-200">Centralisation & Économies</h3>
                                <p className="text-sm text-slate-400">Gérez toutes les commandes et dépenses en un seul endroit. Réduisez les coûts grâce à la réutilisation.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 min-w-[20px]"><Leaf className="h-5 w-5 text-green-400" /></div>
                            <div>
                                <h3 className="font-bold text-slate-200">Impact RSE Automatisé</h3>
                                <p className="text-sm text-slate-400">Générez automatiquement votre bilan carbone et social. Valorisez vos efforts écologiques sans effort.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 min-w-[20px]"><ShieldCheck className="h-5 w-5 text-purple-400" /></div>
                            <div>
                                <h3 className="font-bold text-slate-200">Gestion Simplifiée</h3>
                                <p className="text-sm text-slate-400">Suivez les stocks, les documents d'équipe et les fiches de service en temps réel.</p>
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
                        <h2 className="text-2xl font-bold text-white">Pour les Équipes</h2>
                    </div>

                    <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 min-w-[20px]"><Package className="h-5 w-5 text-pink-400" /></div>
                            <div>
                                <h3 className="font-bold text-slate-200">Gestion Simplifiée</h3>
                                <p className="text-sm text-slate-400">Commandez vos consommables et gérez vos stocks facilement.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 min-w-[20px]"><FileText className="h-5 w-5 text-yellow-400" /></div>
                            <div>
                                <h3 className="font-bold text-slate-200">Administratif Centralisé</h3>
                                <p className="text-sm text-slate-400">Vos notes de frais et feuilles de service accessibles au même endroit.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 min-w-[20px]"><ShoppingBag className="h-5 w-5 text-cyan-400" /></div>
                            <div>
                                <h3 className="font-bold text-slate-200">Achats & Seconde Vie</h3>
                                <p className="text-sm text-slate-400">Accédez aux ventes de fin de tournage (Déco, Costumes, Prod).</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 min-w-[20px]"><ShieldCheck className="h-5 w-5 text-green-400" /></div>
                            <div>
                                <h3 className="font-bold text-slate-200">Fiche de Renseignements</h3>
                                <p className="text-sm text-slate-400">Vos infos vous suivent sur tous les projets (plus de paperasse !).</p>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>

            {/* CTA */}
            <button
                onClick={onStart}
                className="group relative px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold text-lg rounded-full shadow-2xl shadow-pink-600/30 hover:shadow-pink-600/50 hover:scale-105 transition-all duration-300"
            >
                <span className="flex items-center gap-3">
                    Découvrir l'expérience
                    <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </span>
            </button>

            <p className="mt-6 text-slate-500 text-sm">
                Une production plus verte, une équipe plus heureuse.
            </p>
        </div>
    );
};
