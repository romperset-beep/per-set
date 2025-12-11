import React, { useState, useEffect } from 'react';
import { OnboardingCarousel } from './OnboardingCarousel';
import { AuthScreen } from './AuthScreen';
import { ProjectSelection } from './ProjectSelection';
import { LandingPage } from './LandingPage'; // Import new component
import { useProject } from '../context/ProjectContext';
import { Globe } from 'lucide-react';
import { LottieAnimation } from './LottieAnimation';
import { Language } from '../types';

export const LoginPage: React.FC = () => {
    const { user, project, language, setLanguage, t } = useProject();

    // Flow State: 'landing' -> 'onboarding' -> 'auth' -> 'selection' (if needed)
    type ViewState = 'landing' | 'onboarding' | 'auth' | 'selection';
    const [view, setView] = useState<ViewState>('landing');

    // Always start at landing page
    useEffect(() => {
        setView('landing');
    }, []);

    // Check if user needs to select a project (Logged in but no project ID)
    useEffect(() => {
        if (user && (!project.id || project.id === 'default-project')) {
            setView('selection');
        } else if (user && project.id && project.id !== 'default-project') {
            // Already active in a project
            // We don't need to do anything, App.tsx will switch to Dashboard
        }
    }, [user, project]);

    const handleLandingStart = () => {
        setView('auth');
    };

    const handleOnboardingComplete = () => {
        // localStorage.setItem('hasSeenOnboarding_v2', 'true'); // We want to show landing every time now
        setView('auth');
    };

    const handleAuthSuccess = () => {
        // User is now logged in (handled by context)
        // Next step is Project Selection (via useEffect) or direct Dashboard if they already had a project
    };

    const handleProjectSelected = () => {
        // Project joined, parent will switch view
    };

    return (
        <div className="min-h-screen bg-cinema-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-eco-500/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cinema-500/10 rounded-full blur-[100px]"></div>
            </div>

            {/* Language Selector (Always visible) */}
            <div className="absolute top-4 right-4 z-50">
                <div className="relative group">
                    <Globe className="h-5 w-5 text-slate-500 absolute left-2 top-2 pointer-events-none" />
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as Language)}
                        className="bg-cinema-900 border border-cinema-700 text-slate-300 text-sm rounded-lg pl-8 pr-2 py-1.5 focus:ring-2 focus:ring-eco-500 focus:outline-none appearance-none cursor-pointer hover:bg-cinema-700 transition-colors"
                    >
                        <option value="fr">FR</option>
                        <option value="en">EN</option>
                        <option value="es">ES</option>
                    </select>
                </div>
            </div>

            {/* Flow Orchestration */}
            {view === 'landing' && (
                <LandingPage onStart={handleLandingStart} />
            )}

            {/* {view === 'onboarding' && (
                <OnboardingCarousel onComplete={handleOnboardingComplete} language={language} />
            )} */}

            {view === 'auth' && !user && (
                <div className="flex flex-col items-center w-full">
                    <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="flex justify-center mb-4">
                            <LottieAnimation
                                url="/animations/clapperboard.json"
                                className="h-32 w-32"
                            />
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">A Better Set</h1>
                    </div>
                    <AuthScreen onSuccess={handleAuthSuccess} />
                </div>
            )}

            {view === 'selection' && user && (
                <ProjectSelection onProjectSelected={handleProjectSelected} />
            )}

            {(view === 'auth' || view === 'selection') && user && !showProjectSelection && !project.id && (
                // Loading state fallback
                <div className="text-white animate-pulse">Chargement...</div>
            )}
        </div>
    );
};
// Helper for fallback state
const showProjectSelection = false; // Just to satisfy the conditional logic visualization above, strictly inside component logic effectively handled by state 'view'

