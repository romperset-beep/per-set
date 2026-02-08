import React, { useState } from 'react';
import { Department } from '../types';
import { Mail, Lock, User, Briefcase, ArrowRight, Loader2, RefreshCw, Send, CheckCircle } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { GdprModal } from './GdprModal';
import { auth } from '../services/firebase';
import { sendEmailVerification } from 'firebase/auth';

interface AuthScreenProps {
    onSuccess: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
    const { login, register, resetPassword, resendVerification, refreshUser, error: authError } = useProject();
    const [isSignUp, setIsSignUp] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);

    // GDPR State
    const [gdprAccepted, setGdprAccepted] = useState(false);
    const [showGdprModal, setShowGdprModal] = useState(false);

    // Verification State
    const [showVerification, setShowVerification] = useState(false);
    const [verificationSent, setVerificationSent] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        department: 'PRODUCTION' as Department | 'PRODUCTION'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (isResettingPassword) {
                await resetPassword(formData.email);
                setResetSuccess(true);
            } else if (isSignUp) {
                if (!gdprAccepted) throw new Error("Veuillez accepter les conditions RGPD.");
                if (formData.password !== formData.confirmPassword) {
                    throw new Error("Les mots de passe ne correspondent pas");
                }
                // @ts-ignore
                await register(formData.email, formData.password, formData.name, formData.department);
                // Don't call onSuccess(), Show Verification Screen
                setShowVerification(true);
            } else {
                // @ts-ignore
                await login(formData.email, formData.password);

                // Check Verification
                if (auth.currentUser && !auth.currentUser.emailVerified) {
                    setShowVerification(true);
                    return;
                }

                onSuccess();
            }
        } catch (err: any) {
            console.error(err);
            // Show visible feedback
            alert(`Erreur: ${err.message || "Une erreur est survenue"}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCheckVerification = async () => {
        setIsLoading(true);
        try {
            if (auth.currentUser) {
                await auth.currentUser.reload();
                if (auth.currentUser.emailVerified) {
                    // Refresh context state to unblock app
                    await refreshUser();
                    onSuccess();
                } else {
                    alert("Email non vérifié. Veuillez cliquer sur le lien reçu par email.");
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        try {
            await resendVerification();
            setVerificationSent(true);
            setTimeout(() => setVerificationSent(false), 5000);
        } catch (e) {
            console.error(e);
            alert("Erreur lors de l'envoi. Veuillez réessayer plus tard.");
        }
    };

    // --- Verification Screen ---
    if (showVerification) {
        return (
            <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-cinema-800 border border-cinema-700 p-8 rounded-2xl shadow-2xl relative z-10 text-center">
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-eco-500/20 rounded-full animate-pulse">
                            <Mail className="h-10 w-10 text-eco-400" />
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-white mb-2">Vérification Requise</h2>
                    <p className="text-slate-400 text-sm mb-6">
                        Un email de vérification a été envoyé à <strong>{formData.email}</strong>.
                        <br />
                        Veuillez cliquer sur le lien pour activer votre compte.
                        <br />
                        <br />
                        <span className="text-yellow-500/80 text-xs font-medium">⚠️ Pensez à vérifier vos courriers indésirables (Spams)</span>
                    </p>

                    <div className="space-y-4">
                        <button
                            onClick={handleCheckVerification}
                            disabled={isLoading}
                            className="w-full bg-eco-600 hover:bg-eco-500 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all"
                        >
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                            J'ai vérifié mon email
                        </button>

                        <button
                            onClick={handleResend}
                            disabled={verificationSent}
                            className="w-full bg-cinema-900 border border-cinema-700 hover:border-eco-500/50 text-slate-300 font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
                        >
                            {verificationSent ? (
                                <>
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    Email envoyé !
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    Renvoyer l'email
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => {
                                setShowVerification(false);
                                // Optional: Sign out if they back out?
                                // signOut(auth);
                            }}
                            className="text-xs text-slate-500 hover:text-white"
                        >
                            Retour
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (isResettingPassword) {
        return (
            <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-cinema-800 border border-cinema-700 p-8 rounded-2xl shadow-2xl relative z-10">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-white mb-2">Mot de passe oublié</h2>
                        <p className="text-slate-400 text-sm">
                            Entrez votre email pour recevoir un lien de réinitialisation.
                        </p>
                    </div>

                    {authError && (
                        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-6 text-red-200 text-sm text-center">
                            {authError}
                        </div>
                    )}

                    {resetSuccess ? (
                        <div className="text-center space-y-4">
                            <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 text-green-400 text-sm">
                                Email envoyé ! Vérifiez votre boîte de réception (et vos spams).
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsResettingPassword(false);
                                    setResetSuccess(false);
                                }}
                                className="text-eco-400 hover:text-eco-300 text-sm font-medium"
                            >
                                Retour à la connexion
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="relative group">
                                <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-eco-400 transition-colors" />
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Email professionnel"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full bg-cinema-900 border border-cinema-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-eco-500 focus:outline-none transition-all"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-eco-600 hover:bg-eco-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-eco-900/20 hover:shadow-eco-900/40 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        Envoyer le lien
                                        <ArrowRight className="h-5 w-5" />
                                    </>
                                )}
                            </button>

                            <div className="text-center mt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsResettingPassword(false)}
                                    className="text-slate-400 hover:text-white text-sm transition-colors"
                                >
                                    Annuler et retour
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-cinema-800 border border-cinema-700 p-8 rounded-2xl shadow-2xl relative z-10">

                {/* Tabs Switcher */}
                <div className="flex p-1 bg-cinema-900/50 rounded-xl mb-8 border border-cinema-700">
                    <button
                        type="button"
                        onClick={() => setIsSignUp(false)}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${!isSignUp
                            ? 'bg-eco-600 text-white shadow-lg shadow-eco-900/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        Se connecter
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsSignUp(true)}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${isSignUp
                            ? 'bg-eco-600 text-white shadow-lg shadow-eco-900/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        Créer un compte
                    </button>
                </div>

                <div className="text-center mb-6">
                    <p className="text-slate-400 text-sm">
                        {isSignUp
                            ? "Rejoignez la communauté Per Set"
                            : "Accédez à vos projets en cours"}
                    </p>
                </div>

                {authError && (
                    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-6 text-red-200 text-sm text-center">
                        {authError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* SignUp Fields */}
                    {isSignUp && (
                        <>
                            <div className="relative group">
                                <User className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-eco-400 transition-colors" />
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Prénom Nom"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full bg-cinema-900 border border-cinema-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-eco-500 focus:outline-none transition-all"
                                    required
                                />
                            </div>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-3 h-5 w-5 text-slate-500 z-10" />
                                <select
                                    name="department"
                                    value={formData.department}
                                    onChange={handleChange}
                                    className="w-full bg-cinema-900 border border-cinema-700 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-eco-500 focus:outline-none appearance-none"
                                >
                                    <option value="PRODUCTION">PRODUCTION (Admin)</option>
                                    {Object.values(Department).map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {/* Common Fields */}
                    <div className="relative group">
                        <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-eco-400 transition-colors" />
                        <input
                            type="email"
                            name="email"
                            placeholder="Email professionnel"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full bg-cinema-900 border border-cinema-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-eco-500 focus:outline-none transition-all"
                            required
                        />
                    </div>

                    <div className="relative group">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-eco-400 transition-colors" />
                        <input
                            type="password"
                            name="password"
                            placeholder={isSignUp ? "Code personnel (6 car. min)" : "Code personnel"}
                            value={formData.password}
                            onChange={handleChange}
                            minLength={6}
                            className="w-full bg-cinema-900 border border-cinema-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-eco-500 focus:outline-none transition-all"
                            required
                        />
                    </div>

                    {!isSignUp && (
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsResettingPassword(true)}
                                className="text-xs text-slate-400 hover:text-eco-400 transition-colors"
                            >
                                Mot de passe oublié ?
                            </button>
                        </div>
                    )}

                    {isSignUp && (
                        <>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-eco-400 transition-colors" />
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    placeholder="Confirmer le code"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    minLength={6}
                                    className="w-full bg-cinema-900 border border-cinema-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-eco-500 focus:outline-none transition-all"
                                    required
                                />
                            </div>

                            <div className="mt-4">
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={gdprAccepted}
                                            onChange={(e) => setGdprAccepted(e.target.checked)}
                                            className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-600 bg-cinema-900 checked:border-eco-500 checked:bg-eco-500 transition-all"
                                        />
                                        <CheckCircle className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 text-white opacity-0 peer-checked:opacity-100" />
                                    </div>
                                    <span className="text-xs text-slate-400 leading-tight group-hover:text-slate-300 transition-colors">
                                        J'accepte les{' '}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent toggling checkbox
                                                setShowGdprModal(true);
                                            }}
                                            className="text-eco-400 hover:underline font-medium hover:text-eco-300"
                                        >
                                            conditions générales d'utilisation (RGPD)
                                        </button>
                                        {' '}et la collecte de mes données professionnelles.
                                    </span>
                                </label>
                            </div>
                        </>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-eco-600 hover:bg-eco-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-eco-900/20 hover:shadow-eco-900/40 transition-all transform hover:scale-[1.02] mt-6 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                {isSignUp ? "Créer mon espace" : "Me connecter"}
                                <ArrowRight className="h-5 w-5" />
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* RGPD Modal */}
            <GdprModal isOpen={showGdprModal} onClose={() => setShowGdprModal(false)} />
        </div>
    );
};
