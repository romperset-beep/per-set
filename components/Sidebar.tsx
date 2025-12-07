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
  ArrowRightLeft
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

  const menuItems = [
    { id: 'dashboard', label: t('sidebar.dashboard'), icon: LayoutDashboard },
    { id: 'inventory', label: t('sidebar.inventory'), icon: Package },
    { id: 'marketplace', label: t('sidebar.marketplace'), icon: ShoppingBag },
    { id: 'donations', label: t('sidebar.donations'), icon: Recycle },
    { id: 'report', label: t('sidebar.report'), icon: FileText },
    { id: 'expenses', label: t('sidebar.expenses'), icon: Euro },
    { id: 'social', label: t('sidebar.social'), icon: MessageSquare },
    { id: 'team', label: t('sidebar.team'), icon: Users },
    { id: 'profile', label: t('sidebar.profile'), icon: Settings },
  ];

  // Filter items based on department
  const filteredItems = menuItems.filter(item => {
    if (item.id === 'profile') return true;
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
        w-64 bg-slate-900 text-white flex flex-col h-dvh
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            A Better Set
          </h1>
          <p className="text-xs text-slate-400 mt-1">{currentDept}</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {filteredItems.map((item) => {
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
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
                {badgeCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-4">
          <button
            onClick={() => {
              const confirm = window.confirm(t('Are you sure you want to switch projects?'));
              if (confirm) leaveProject();
            }}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ArrowRightLeft size={20} />
            <span className="font-medium">Changer de Film</span>
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-red-900/20 hover:text-red-400 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">{t('sidebar.logout')}</span>
          </button>

          {/* Connection Status Indicator - Now in flow */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-2">
            <div className={`w-2 h-2 rounded-full ${typeof navigator !== 'undefined' && navigator.onLine ? 'bg-green-500' : 'bg-red-500'}`} />
            {typeof navigator !== 'undefined' && navigator.onLine ? 'Connecté' : 'Hors ligne'}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
