import React from 'react';
import {
    LayoutDashboard,
    Package,
    Users,
    Bell,
    Menu,
    Clock,
    FileText,
    type LucideIcon
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';

interface BottomNavProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    unreadCount: number;
    onMenuClick: () => void;
}

interface NavItem {
    id: string;
    icon: LucideIcon;
    label: string;
    badge?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
    activeTab,
    setActiveTab,
    unreadCount,
    onMenuClick
}) => {
    // Only show on mobile
    const isMobile = window.innerWidth < 768;
    const { project } = useProject();

    if (!isMobile) return null;

    const features = project?.features;

    const mainTabs: NavItem[] = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Tableau' },
        features?.['callsheets'] !== false ? { id: 'callsheet-summary', icon: FileText, label: 'FDS' } : null,
        features?.['timesheet'] !== false ? { id: 'timesheet', icon: Clock, label: 'Heures' } : null,
        features?.['inventory'] !== false ? { id: 'inventory', icon: Package, label: 'Stock' } : null,
        features?.['social'] !== false ? { id: 'social', icon: Users, label: 'Social' } : null,
    ].filter(Boolean) as NavItem[];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-cinema-900 border-t border-cinema-700 z-40 md:hidden safe-area-bottom">
            <div className="flex justify-around items-center h-16">
                {/* Menu Button */}
                <button
                    onClick={onMenuClick}
                    className="flex flex-col items-center justify-center flex-1 py-2 text-slate-400 active:bg-cinema-800 transition-colors"
                >
                    <Menu size={24} />
                    <span className="text-xs mt-1">Menu</span>
                </button>

                {/* Main Tabs */}
                {mainTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors relative ${activeTab === tab.id
                            ? 'text-eco-400'
                            : 'text-slate-400 active:bg-cinema-800'
                            }`}
                    >
                        <div className="relative">
                            <tab.icon size={24} />
                            {tab.badge && tab.badge > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                                    {tab.badge > 9 ? '9+' : tab.badge}
                                </span>
                            )}
                        </div>
                        <span className="text-xs mt-1">{tab.label}</span>
                    </button>
                ))}
            </div>
        </nav>
    );
};
