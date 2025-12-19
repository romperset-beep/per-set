import React from 'react';
import { Clock, ShieldCheck, LogOut } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

export const PendingApprovalScreen: React.FC = () => {
    const { user, logout } = useProject();
    const isRejected = user?.status === 'rejected';

    return (
        <div className="min-h-screen bg-cinema-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-cinema-800 border border-cinema-700 rounded-2xl shadow-2xl p-8 text-center animate-in fade-in zoom-in duration-500">

                <div className="flex justify-center mb-6">
                    <div className={`p-4 rounded-full ring-1 animate-pulse ${isRejected ? 'bg-red-500/10 ring-red-500/30' : 'bg-yellow-500/10 ring-yellow-500/30'}`}>
                        {isRejected ? <ShieldCheck className="h-12 w-12 text-red-500" /> : <Clock className="h-12 w-12 text-yellow-500" />}
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">
                    {isRejected ? "Demande refusée" : "Compte en attente de validation"}
                </h2>
                <p className="text-slate-400 mb-6">
                    Bonjour <strong className="text-white">{user?.name}</strong>,<br />
                    {isRejected
                        ? "Votre demande d'accès a été refusée par l'administrateur."
                        : "Votre demande d'inscription est bien enregistrée."}
                </p>

                <div className="bg-cinema-900/50 rounded-lg p-4 mb-8 text-sm text-left border border-cinema-700">
                    <p className="text-slate-300 mb-2 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-eco-400" />
                        <strong>Sécurité :</strong>
                    </p>
                    <p className="text-slate-400 leading-relaxed">
                        L'accès à cette application est restreint. Un administrateur doit valider votre compte manuellement avant que vous puissiez accéder aux données du projet.
                    </p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-eco-600 hover:bg-eco-500 text-white font-bold py-3 rounded-lg transition-all"
                    >
                        J'ai été validé (Rafraîchir)
                    </button>

                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-white transition-colors py-2"
                    >
                        <LogOut className="h-4 w-4" />
                        Se déconnecter
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-cinema-700 flex flex-col gap-3 items-center">
                    <a
                        href={`mailto:romain.perset@abatterset.com?subject=Demande d'accès CineStock : ${user?.name}&body=Bonjour Romain,%0D%0A%0D%0AJe viens de m'inscrire sur l'application CineStock et je suis en attente de validation.%0D%0AMon email est : ${user?.email}%0D%0A%0D%0AMerci de valider mon accès.`}
                        className="inline-flex items-center gap-2 text-xs text-eco-400 hover:text-eco-300 transition-colors"
                    >
                        Demande directe par email
                    </a>
                    <p className="text-xs text-slate-500">
                        Contact téléphonique : <a href="tel:0680591271" className="text-slate-400 hover:text-white transition-colors decoration-dotted underline underline-offset-4">06 80 59 12 71</a>
                    </p>
                </div>
            </div>
        </div>
    );
};
