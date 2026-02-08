import React, { useState } from 'react';
import { ChevronRight, ArrowRight, LayoutDashboard } from 'lucide-react';
import { LottieAnimation } from './LottieAnimation';
import { Language } from '../types';

interface OnboardingCarouselProps {
    onComplete: () => void;
    language: Language;
}

const translations = {
    fr: {
        skip: "Passer l'intro",
        next: "Suivant",
        create: "Créer mon compte",
        steps: [
            {
                title: "Per-Set",
                description: "Une application pour tout le plateau. Faites vos commandes de consommables, suivez les stocks et participez à l'économie circulaire."
            }
        ]
    },
    en: {
        skip: "Skip Intro",
        next: "Next",
        create: "Create Account",
        steps: [
            {
                title: "Per-Set",
                description: "One app for the entire set. Order consumables, track inventory, and participate in the circular economy."
            }
        ]
    },
    es: {
        skip: "Saltar intro",
        next: "Siguiente",
        create: "Crear cuenta",
        steps: [
            {
                title: "Per-Set",
                description: "Una aplicación para todo el set. Pide consumibles, sigue el inventario y participa en la economía circular."
            }
        ]
    }
};

export const OnboardingCarousel: React.FC<OnboardingCarouselProps> = ({ onComplete, language }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const t = translations[language];

    const steps = [
        {
            icon: LayoutDashboard,
            color: "text-eco-400",
            title: t.steps[0].title,
            description: t.steps[0].description,
            animationUrl: "/animations/eco.json"
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

                {/* Animation */}
                <div className={`mb-6 p-4 rounded-full bg-cinema-900 border border-cinema-700 shadow-xl transform transition-transform duration-500 group-hover:scale-110 flex items-center justify-center`}>
                    <LottieAnimation
                        url={steps[currentStep].animationUrl}
                        className="h-24 w-24 rounded-full overflow-hidden"
                    />
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
                    {t.skip}
                </button>
                <button
                    onClick={handleNext}
                    className="flex-1 bg-eco-600 hover:bg-eco-500 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
                >
                    {currentStep === steps.length - 1 ? (
                        <>{t.create} <ArrowRight className="h-4 w-4" /></>
                    ) : (
                        <>{t.next} <ChevronRight className="h-4 w-4" /></>
                    )}
                </button>
            </div>
        </div>
    );
};
