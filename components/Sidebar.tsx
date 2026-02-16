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
  Truck, // Added
  Globe, // Added
  Zap, // Added
  ClipboardList, // Added
  BarChart2, // Added
  CalendarRange // Added
} from 'lucide-react';
import { useProject } from '../context/ProjectContext'; // Restored
import { useSocial } from '../context/SocialContext'; // Added
import { useMarketplace } from '../context/MarketplaceContext'; // Added
import { useIsMobile } from '../hooks/useIsMobile'; // Added

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const { currentDept, logout, leaveProject, unreadCount, user, t, itemsToReceiveCount } = useProject();
  const { unreadSocialCount, markSocialAsRead } = useSocial(); // Added
  const { unreadMarketplaceCount, markMarketplaceAsRead } = useMarketplace(); // Added
  const isMobile = useIsMobile();


  // Define Category Type
  type Category = {
    title: string;
    items: { id: string; label: string; icon: any; allowedDepts?: any }[];
  };

  const categories: Category[] = [
    {
      title: 'Général',
      items: [
        { id: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard }
      ]
    },
    {
      title: 'Quotidien',
      items: [
        { id: 'pdt-manager', label: 'Gestion des PDT', icon: CalendarRange, allowedDepts: ['PRODUCTION', 'Régie', 'Mise en Scène'] },
        { id: 'orders', label: 'Gestion Commandes', icon: ClipboardList, allowedDepts: ['REGIE', 'Régie', 'PRODUCTION'] },
        { id: 'callsheets', label: 'Feuilles de Service', icon: FileText },
        { id: 'timesheet', label: "Feuilles d'heures", icon: Clock, allowedDepts: 'ALL' },
        { id: 'energy', label: 'Énergie / Groupe', icon: Zap, allowedDepts: ['PRODUCTION', 'Lumière'] },
        { id: 'catering', label: 'Feuille Cantine', icon: Utensils, allowedDepts: ['REGIE', 'Régie', 'PRODUCTION'] },
      ]
    },
    {
      title: 'Utile',
      items: [
        { id: 'renforts', label: 'Renforts', icon: Users, allowedDepts: 'ALL' },
        { id: 'logistics', label: 'Aller-Retour Matériel', icon: Truck, allowedDepts: 'ALL' },
        { id: 'team', label: 'Bible Équipe Tournage', icon: Users },
        { id: 'inventory', label: 'Consommables', icon: Package },
        { id: 'my-lists', label: 'Mes Listes', icon: ClipboardList },
        { icon: MessageSquare, label: 'Messagerie', id: 'social', path: '/social' },
      ]
    },
    {
      title: 'Production',
      items: [
        { id: 'expenses', label: 'Notes de Frais', icon: Euro },
        { id: 'inter_marketplace', label: 'Revente Inter-Productions', icon: Globe, allowedDepts: ['PRODUCTION', 'REGIE', 'Régie'] },
        { id: 'local_marketplace', label: "Ventes à l'équipe", icon: ShoppingBag, allowedDepts: 'ALL' },
        { id: 'donations', label: 'Économie Circulaire', icon: Recycle },
        { id: 'report', label: 'Rapport RSE+', icon: FileText },
      ]
    },
    {
      title: 'Compte',
      items: [
        { id: 'profile', label: 'Mon Profil', icon: Settings },
        { id: 'admin', label: 'Administration', icon: ShieldCheck },
        { id: 'global-stats', label: 'Statistiques Globales', icon: BarChart2 },
      ]
    }
  ];

  const filterItem = (item: any) => {
    // 1. Admin restricted (Top priority)
    if (item.id === 'admin') return user?.email === 'romperset@gmail.com';

    // 1.5 Mobile restrictions
    // "revente inter-production, economie Circulaire , rapport rse +"
    const mobileRestrictedItems = ['inter_marketplace', 'donations', 'report'];
    if (isMobile && mobileRestrictedItems.includes(item.id)) {
      return false;
    }


    // 2. Production sees everything else
    if (currentDept === 'PRODUCTION') return true;

    // 3. Define Restricted Items Groups
    const prodOnlyItems = ['inter_marketplace', 'donations', 'report'];
    const prodAndRegieItems = ['catering', 'orders'];

    // 4. Check Restrictions
    if (item.id === 'energy') {
      return currentDept === 'PRODUCTION' || currentDept === 'Lumière';
    }

    if (prodOnlyItems.includes(item.id)) return false; // Production caught above, so everyone else returns false here

    if (prodAndRegieItems.includes(item.id)) {
      // Production caught above
      return currentDept === 'REGIE' || currentDept === 'Régie';
    }

    // 5. All other items are visible to everyone (Universal)
    // dashboard, profile, callsheets, timesheet, renforts, logistics, team, inventory, social, expenses, local_marketplace, my-lists
    return true;
  };

  // Re-evaluating filter logic to be more generic if possible, but keeping explicit overrides
  // We should respect item.allowedDepts if present?
  // The current code is a mix. Let's patch the specific Marketplace lines first.

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
            Per-Set
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
                    if (item.id === 'orders') badgeCount = unreadCount; // Moved from inventory
                    if (item.id === 'inventory') badgeCount = itemsToReceiveCount; // Added for reception validation
                    if (item.id === 'inter_marketplace') badgeCount = unreadMarketplaceCount; // Assume global badges go here? 
                    // Or split? For now assign to global checks.
                    if (item.id === 'social') badgeCount = unreadSocialCount;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          if (item.id === 'inter_marketplace') markMarketplaceAsRead();
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

// Memoize to prevent re-renders when props haven't changed
export default React.memo(Sidebar);
