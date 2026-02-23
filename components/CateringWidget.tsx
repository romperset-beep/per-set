import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Department } from '../types';
import { Utensils, Edit3, ClipboardList } from 'lucide-react';
import { CateringList } from './CateringList';
import { MenuEditor } from './MenuEditor';
import { CrewMealSelection } from './CrewMealSelection';
import { CrewMealSummary } from './CrewMealSummary';

export const CateringWidget: React.FC = () => {
    const { currentDept, project } = useProject();

    const isProduction = currentDept === 'PRODUCTION';
    const isRegie = currentDept === Department.REGIE || currentDept === 'Régie' || currentDept === 'REGIE' || isProduction;

    const isTraiteur = project.cateringMode === 'TRAITEUR';

    // Determine default tab based on role and mode
    const defaultTab = isTraiteur ? (isRegie ? 'summary' : 'choice') : 'list';
    const [activeTab, setActiveTab] = useState<'choice' | 'menu' | 'list' | 'summary'>(defaultTab);

    if (!isTraiteur) {
        return (
            <div className="h-full w-full overflow-y-auto">
                <CateringList />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-cinema-900 border-l border-cinema-800 lg:border-l-0 w-full overflow-hidden">
            {/* Header / Tabs */}
            <div className="bg-cinema-800 border-b border-cinema-700 px-4 md:px-8 py-4 shrink-0 overflow-x-auto">
                <div className="flex items-center gap-6 min-w-max">
                    <button
                        onClick={() => setActiveTab('choice')}
                        className={`flex items-center gap-2 pb-4 pt-1 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'choice'
                            ? 'border-emerald-500 text-emerald-400'
                            : 'border-transparent text-slate-400 hover:text-white'
                            }`}
                    >
                        <Utensils size={18} />
                        Mon Choix Repas
                    </button>

                    {isRegie && (
                        <>
                            <button
                                onClick={() => setActiveTab('menu')}
                                className={`flex items-center gap-2 pb-4 pt-1 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'menu'
                                    ? 'border-blue-500 text-blue-400'
                                    : 'border-transparent text-slate-400 hover:text-white'
                                    }`}
                            >
                                <Edit3 size={18} />
                                Éditer Repas (Régie)
                            </button>

                            <button
                                onClick={() => setActiveTab('summary')}
                                className={`flex items-center gap-2 pb-4 pt-1 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'summary'
                                    ? 'border-orange-500 text-orange-400'
                                    : 'border-transparent text-slate-400 hover:text-white'
                                    }`}
                            >
                                <ClipboardList size={18} />
                                Récap. Commandes
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                {activeTab === 'choice' && <CrewMealSelection />}
                {activeTab === 'menu' && isRegie && <MenuEditor />}
                {activeTab === 'summary' && isRegie && <CrewMealSummary />}
            </div>
        </div>
    );
};
