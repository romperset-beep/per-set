import React, { useState } from 'react';
import { ChevronRight, ArrowRight, LayoutDashboard, ShoppingBag, MessageSquare, ShieldCheck } from 'lucide-react';

interface OnboardingCarouselProps {
    onComplete: () => void;
}

export const OnboardingCarousel: React.FC<OnboardingCarouselProps> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);

    const steps = [
        {
            icon: LayoutDashboard,
            color: "text-eco-400",
            title: "A Better Set",
            description: "Une application pour tout le plateau. Faites vos commandes de consommables, suivez les stocks et participez à l'économie circulaire."
        },
        {
            icon: ShoppingBag,
            color: "text-yellow-400",
            title: "Point de Revente",
            description: "Accéder aux reventes des objets déco et costumes, réservez ce qui vous intéresse et récupérez les en fin de tournage !"
        },
        {
            icon: ShieldCheck,
            color: "text-blue-400",
            title: "Profil Sécurisé",
            description: "Gardez vos infos (CMB, RIB, Coordonnées) à jour dans un compte unique qui vous suit de production en production."
        },
        {
            icon: MessageSquare,
            color: "text-pink-400",
            title: "Communication Sécurisée",
            description: "Échangez avec toute l'équipe de manière sécurisée et partagez vos photos et vidéos de tournage."
        }
    ];

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            onComplete();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
            {/* Carousel Content */}
            <div className="bg-cinema-800/50 rounded-2xl p-8 border border-cinema-700 backdrop-blur-sm max-w-sm w-full min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden group">

                {/* Background Glow */}
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-${steps[currentStep].color.replace('text-', '')} to-transparent opacity-50`}></div>

                {/* Icon */}
                <div className={`mb-6 p-4 rounded-full bg-cinema-900 border border-cinema-700 shadow-xl transform transition-transform duration-500 group-hover:scale-110`}>
                    {React.createElement(steps[currentStep].icon, {
                        className: `h-12 w-12 ${steps[currentStep].color}`
                    })}
                </div>

                {/* Text */}
                <h2 className="text-2xl font-bold text-white mb-4 transition-all duration-300">
                    {steps[currentStep].title}
                </h2>
                <p className="text-slate-400 leading-relaxed transition-all duration-300">
                    {steps[currentStep].description}
                </p>

                {/* Dots Indicator */}
                <div className="flex gap-2 mt-8">
                    {steps.map((_, index) => (
                        <div
                            key={index}
                            className={`h-2 rounded-full transition-all duration-300 ${index === currentStep ? `w-8 ${steps[currentStep].color.replace('text-', 'bg-')}` : 'w-2 bg-cinema-700'
                                }`}
                        />
                    ))}
                </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-4 mt-8 w-full max-w-sm">
                <button
                    onClick={onComplete}
                    className="flex-1 py-3 text-slate-500 hover:text-white transition-colors text-sm font-medium"
                >
                    Passer l'intro
                </button>
                <button
                    onClick={handleNext}
                    className="flex-1 bg-eco-600 hover:bg-eco-500 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
                >
                    {currentStep === steps.length - 1 ? (
                        <>Créer mon compte <ArrowRight className="h-4 w-4" /></>
                    ) : (
                        <>Suivant <ChevronRight className="h-4 w-4" /></>
                    )}
                </button>
            </div>
        </div>
    );
};
