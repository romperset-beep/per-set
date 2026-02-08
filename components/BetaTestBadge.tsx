import React, { useState } from 'react';
import { HelpCircle, Mail, Phone, X } from 'lucide-react';

export const BetaTestBadge: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Badge */}
            <button
                onClick={() => setIsOpen(true)}
                className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer animate-pulse-slow"
            >
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                BETA TEST
                <HelpCircle className="w-3 h-3" />
            </button>

            {/* Modal */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="bg-cinema-800 border border-cinema-700 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-cinema-700 flex justify-between items-center bg-cinema-900/50">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">BETA</span>
                                Support & Aide
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            <p className="text-sm text-slate-300 leading-relaxed">
                                Vous êtes sur une version de test de l'application <strong>Per-Set</strong>.
                                Si vous rencontrez un problème ou avez une suggestion, n'hésitez pas à me contacter directement.
                            </p>

                            <div className="space-y-3">
                                <div className="p-3 bg-cinema-900/50 rounded-lg border border-cinema-700/50 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                        <Mail className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Email</p>
                                        <a href="mailto:romain.perset@per-set.com" className="text-sm text-blue-300 hover:text-white font-medium truncate block transition-colors">
                                            romain.perset@per-set.com
                                        </a>
                                    </div>
                                </div>

                                <div className="p-3 bg-cinema-900/50 rounded-lg border border-cinema-700/50 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                        <Phone className="w-5 h-5 text-green-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Téléphone</p>
                                        <a href="tel:0680591271" className="text-sm text-green-300 hover:text-white font-medium transition-colors">
                                            06 80 59 12 71
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 text-center">
                                <p className="text-[10px] text-slate-500">
                                    Développé avec ❤️ par Romain Perset
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
