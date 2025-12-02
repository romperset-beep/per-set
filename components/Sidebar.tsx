import React from 'react';
import { LayoutDashboard, Package, Recycle, Settings, Leaf, FileText, X, Globe, Receipt, ShoppingBag, MessageSquare } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen = false, onClose }) => {
  const { user } = useProject();

  // Define all possible menu items
  const allMenuItems = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard, allowed: ['PRODUCTION'] },
    { id: 'inventory', label: 'Stock & Achats', icon: Package, allowed: ['ALL'] },
    { id: 'circular', label: 'Économie Circulaire', icon: Recycle, allowed: ['ALL'] },
    { id: 'report', label: 'Rapport RSE', icon: FileText, allowed: ['PRODUCTION'] },
    { id: 'expenses', label: 'Notes de frais', icon: Receipt, ShoppingBag, MessageSquare, allowed: ['ALL'] },
        { id: 'buyback', label: 'Zone de Rachat', icon: ShoppingBag, MessageSquare, allowed: ['ALL'] },
        { id: 'social', label: 'Mur Social', icon: MessageSquare, allowed: ['ALL'] },
    { id: 'global-stock', label: 'Stock Global', icon: Globe, allowed: ['PRODUCTION'] },
  ];

  // Filter based on user role
  const menuItems = allMenuItems.filter(item => {
    if (item.allowed.includes('ALL')) return true;
    if (user?.department === 'PRODUCTION' && item.allowed.includes('PRODUCTION')) return true;
    return false;
  });

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-cinema-800 border-r border-cinema-700 flex flex-col transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center justify-between border-b border-cinema-700">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Logo" className="h-14 w-auto object-contain" />
            <h1 className="text-xl font-bold text-white tracking-tight">CinéStock</h1>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (onClose) onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                  ? 'bg-gradient-to-r from-eco-600 to-eco-500 text-white shadow-lg shadow-eco-900/20'
                  : 'text-slate-400 hover:bg-cinema-700 hover:text-white'
                  }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-cinema-700">
          <div className="bg-cinema-800 rounded-lg p-4 text-xs text-slate-400">
            <p className="font-semibold text-slate-200 mb-1">Statut Production</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-eco-500 animate-pulse"></span>
              Tournage en cours
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};