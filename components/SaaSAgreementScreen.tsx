import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { ShieldCheck, FileText, CheckCircle, LogOut } from 'lucide-react';

export const SaaSAgreementScreen: React.FC = () => {
    const { updateUser, logout, user } = useProject();
    const [submitting, setSubmitting] = useState(false);

    const handleAccept = async () => {
        setSubmitting(true);
        try {
            await updateUser({ hasAcceptedSaaSTerms: true });
            // The App.tsx check will pass, and the user will see the dashboard immediately
        } catch (error) {
            console.error("Error accepting terms:", error);
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-cinema-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="bg-cinema-800 border border-cinema-700 rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-8 border-b border-cinema-700 bg-cinema-900/50 rounded-t-2xl flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-xl">
                        <FileText className="h-8 w-8 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Conditions Générales d'Utilisation</h1>
                        <p className="text-slate-400 text-sm">Validations requises pour le compte Production</p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6 text-slate-300 overflow-y-auto max-h-[60vh]">
                    <p className="text-lg text-white font-medium">
                        Bonjour {user?.name},
                    </p>
                    <p>
                        Avant d'accéder à votre tableau de bord de Production, vous devez prendre connaissance et accepter les conditions financières liées à l'utilisation de la plateforme <strong>Per Set</strong>.
                    </p>

                    <div className="bg-cinema-900/50 rounded-xl p-6 border border-cinema-700 space-y-4">
                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            Frais de Service (Take Rate)
                        </h3>
                        <p className="leading-relaxed">
                            L'utilisation du service SaaS "Per Set" pour la gestion des surplus, des reventes et de la circulaire de production est soumise à une commission sur les transactions réalisées.
                        </p>
                        <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-lg">
                            <p className="text-indigo-200 font-bold">
                                Per Set prélève une commission de 10% sur le montant total des ventes (Take Rate) réalisées via la plateforme.
                            </p>
                        </div>
                        <p className="text-sm text-slate-400">
                            Cette commission permet de financer le développement de la plateforme, l'hébergement sécurisé des données et le support technique dédié aux productions.
                        </p>
                    </div>

                    <p className="text-sm text-slate-500 italic">
                        En cliquant sur "Accepter et Continuer", vous reconnaissez avoir lu, compris et accepté ces conditions. Ce consentement sera enregistré et lié à votre compte utilisateur.
                    </p>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-cinema-700 bg-cinema-900/50 rounded-b-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 text-slate-400 hover:text-white px-4 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm"
                    >
                        <LogOut className="h-4 w-4" />
                        Refuser et se déconnecter
                    </button>

                    <button
                        onClick={handleAccept}
                        disabled={submitting}
                        className={`bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-indigo-500/20 transition-all transform hover:scale-105 active:scale-95 ${submitting ? 'opacity-75 cursor-wait' : ''}`}
                    >
                        {submitting ? 'Validation...' : 'Accepter et Continuer'}
                    </button>
                </div>
            </div>
        </div>
    );
};
