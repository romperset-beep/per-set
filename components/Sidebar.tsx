import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Recycle, 
  FileText, 
  Settings, 
  LogOut,
  Users,
  MessageSquare,
  Euro
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { currentDept, logout, unreadCount, user } = useProject();
  const { t } = useTranslation();

  const menuItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'inventory', label: t('nav.inventory'), icon: Package },
    { id: 'marketplace', label: t('nav.marketplace'), icon: ShoppingBag },
    { id: 'donations', label: t('nav.donations'), icon: Recycle },
    { id: 'reports', label: t('nav.reports'), icon: FileText },
    { id: 'expenses', label: t('nav.expenses'), icon: Euro },
    { id: 'social', label: t('nav.social'), icon: MessageSquare },
    { id: 'team', label: t('nav.team'), icon: Users },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ];

  // Filter items based on department
  const filteredItems = menuItems.filter(item => {
    if (item.id === 'settings') return true;
    if (item.id === 'social') return true;
    
    // Production sees everything
    if (currentDept === 'PRODUCTION' || currentDept === 'Régie') return true;

    // Departments see limited view
    if (item.id === 'dashboard') return true;
    if (item.id === 'inventory') return true;
    if (item.id === 'marketplace') return true; // Can buy
    if (item.id === 'donations') return true; // Can see donations
    if (item.id === 'expenses') return true; // Can submit expenses
    if (item.id === 'team') return true; // Can see team

    return false;
  });

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-screen relative">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
          CinéStock Vert
        </h1>
        <p className="text-xs text-slate-400 mt-1">{currentDept}</p>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className=`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-emerald-600 text-white' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
              {item.id === 'inventory' && unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-red-900/20 hover:text-red-400 transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">{t('nav.logout')}</span>
        </button>
      </div>

      {/* Connection Status Indicator */}
      <div className="absolute bottom-2 right-2 flex items-center gap-2 text-xs text-gray-400">
        <div className={`w-2 h-2 rounded-full ${typeof navigator !== 'undefined' && navigator.onLine ? 'bg-green-500' : 'bg-red-500'}`} />
        {typeof navigator !== 'undefined' && navigator.onLine ? 'Connecté' : 'Hors ligne'}
      </div>
    </div>
  );
};

export default Sidebar;
