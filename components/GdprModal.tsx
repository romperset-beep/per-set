import React from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface GdprModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const GdprModal: React.FC<GdprModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-cinema-800 border border-cinema-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">

                {/* Header */}
                <div className="p-6 border-b border-cinema-700 flex justify-between items-center bg-cinema-900/50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-eco-500/10 rounded-lg">
                            <ShieldCheck className="h-6 w-6 text-eco-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Protection des Données (RGPD)</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto text-slate-300 space-y-4 text-sm leading-relaxed">
                    <p>
                        Conformément au Règlement Général sur la Protection des Données (RGPD), nous nous engageons à protéger la confidentialité et la sécurité de vos données personnelles.
                    </p>

                    <h3 className="text-white font-bold text-lg mt-4">1. Collecte des Données</h3>
                    <p>
                        Nous collectons uniquement les informations nécessaires au fonctionnement de l'application "Per Set" et à la gestion de votre participation aux projets de production :
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Informations d'identité (Nom, Prénom, Email professionnel).</li>
                            <li>Informations professionnelles (Département, Rôle).</li>
                            <li>Données administratives nécessaires à la gestion des contrats et notes de frais (si renseignées volontairement dans votre profil).</li>
                        </ul>
                    </p>

                    <h3 className="text-white font-bold text-lg mt-4">2. Utilisation des Données</h3>
                    <p>
                        Vos données sont utilisées exclusivement pour :
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>La gestion des accès et de la sécurité de l'application.</li>
                            <li>L'organisation logistique des tournages (feuilles de service, cantine, transports).</li>
                            <li>La communication interne liée aux projets.</li>
                        </ul>
                        Aucune donnée n'est revendue à des tiers.
                    </p>

                    <h3 className="text-white font-bold text-lg mt-4">3. Vos Droits</h3>
                    <p>
                        Vous disposez des droits suivants concernant vos données personnelles :
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li><strong>Droit d'accès</strong> : Vous pouvez consulter vos informations personnelles à tout moment via votre profil.</li>
                            <li><strong>Droit de rectification</strong> : Vous pouvez modifier vos informations inexactes directement dans l'application.</li>
                            <li><strong>Droit à l'effacement</strong> : Vous pouvez demander la suppression de votre compte et de vos données personnelles.</li>
                            <li><strong>Droit à la limitation</strong> : Vous pouvez demander la limitation du traitement de vos données.</li>
                        </ul>
                    </p>

                    <h3 className="text-white font-bold text-lg mt-4">4. Contact</h3>
                    <p>
                        Pour exercer vos droits ou pour toute question relative à vos données, vous pouvez contacter l'administrateur de production ou notre délégué à la protection des données à l'adresse suivante : <strong>romain.perset@per-set.com</strong>.
                    </p>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-cinema-700 bg-cinema-900/50 rounded-b-2xl flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-eco-600 hover:bg-eco-500 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                    >
                        J'ai compris
                    </button>
                </div>
            </div>
        </div>
    );
};
