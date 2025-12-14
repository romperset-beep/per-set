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
  Euro,
  ArrowRightLeft,
  ShieldCheck,
  Utensils,
  Clock,
  Truck // Added
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const { currentDept, logout, leaveProject, unreadCount, user, t, unreadMarketplaceCount, unreadSocialCount, markMarketplaceAsRead, markSocialAsRead } = useProject();

  // Define Category Type
  type Category = {
    title: string;
    items: { id: string; label: string; icon: any; allowedDepts?: any }[];
  };

  const categories: Category[] = [
    {
      title: 'Général',
      items: [
        { id: 'dashboard', label: t('sidebar.dashboard'), icon: LayoutDashboard }
      ]
    },
    {
      title: 'Matériel & RSE',
      items: [
        { id: 'inventory', label: t('sidebar.inventory'), icon: Package },
        { id: 'marketplace', label: t('sidebar.marketplace'), icon: ShoppingBag },
        { id: 'donations', label: t('sidebar.donations'), icon: Recycle },
        { id: 'report', label: t('sidebar.report'), icon: FileText },
      ]
    },
    {
      title: 'Quotidien',
      items: [
        { id: 'callsheets', label: 'Feuilles de Service', icon: FileText },
        { id: 'timesheet', label: 'Les Heures', icon: Clock, allowedDepts: 'ALL' },
        { id: 'renforts', label: 'Renforts', icon: Users, allowedDepts: 'ALL' },
        { id: 'logistics', label: 'Aller-Retour Matériel', icon: Truck, allowedDepts: 'ALL' }, // Added
        { id: 'catering', label: 'Feuille Cantine', icon: Utensils, allowedDepts: ['REGIE', 'PRODUCTION'] },
        { id: 'expenses', label: t('sidebar.expenses'), icon: Euro },
      ]
    },
    {
      title: 'Équipe',
      items: [
        { id: 'social', label: t('sidebar.social'), icon: MessageSquare },
        { id: 'team', label: t('sidebar.team'), icon: Users },
      ]
    },
    {
      title: 'Compte',
      items: [
        { id: 'profile', label: t('sidebar.profile'), icon: Settings },
        { id: 'admin', label: 'Administration', icon: ShieldCheck },
      ]
    }
  ];

  const filterItem = (item: any) => {
    if (item.id === 'profile') return true;
    if (item.id === 'social') return true;
    if (item.id === 'callsheets') return true;
    if (item.id === 'timesheet') return true;
    if (item.id === 'renforts') return true;
    if (item.id === 'logistics') return true; // Added

    // Super Admin
    if (item.id === 'admin') return user?.email === 'romperset@gmail.com';

    // Production sees everything
    if (currentDept === 'PRODUCTION' || currentDept === 'Régie') return true;

    // Standard Department Rules
    if (item.id === 'dashboard') return true;
    if (item.id === 'inventory') return true;
    if (item.id === 'marketplace') return true;
    if (item.id === 'donations') return true;
    if (item.id === 'expenses') return true;
    if (item.id === 'team') return true;
    if (item.id === 'catering') return false; // Production/Regie only

    return false;
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <div className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-slate-900 text-white flex flex-col h-dvh border-r border-slate-800
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            A Better Set
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-bold">{currentDept}</p>
        </div>

        <nav className="flex-1 px-4 overflow-y-auto space-y-6 pb-6">
          {categories.map((cat, index) => {
            const visibleItems = cat.items.filter(filterItem);
            if (visibleItems.length === 0) return null;

            return (
              <div key={index}>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-4">
                  {cat.title}
                </h3>
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    let badgeCount = 0;
                    if (item.id === 'inventory') badgeCount = unreadCount;
                    if (item.id === 'marketplace') badgeCount = unreadMarketplaceCount;
                    if (item.id === 'social') badgeCount = unreadSocialCount;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          if (item.id === 'marketplace') markMarketplaceAsRead();
                          if (item.id === 'social') markSocialAsRead();
                          if (onClose) onClose();
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${isActive
                          ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
                          }`}
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                        {badgeCount > 0 && (
                          <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {badgeCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2 bg-slate-900 z-10">
          <button
            onClick={() => {
              if (window.confirm(t('Are you sure you want to switch projects?'))) leaveProject();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ArrowRightLeft size={18} />
            <span>Changer de Film</span>
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-900/20 hover:text-red-400 transition-colors"
          >
            <LogOut size={18} />
            <span>{t('sidebar.logout')}</span>
          </button>

          <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500 pt-2 uppercase tracking-wider font-bold">
            <div className={`w-1.5 h-1.5 rounded-full ${typeof navigator !== 'undefined' && navigator.onLine ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {typeof navigator !== 'undefined' && navigator.onLine ? 'Connecté' : 'Hors ligne'}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
