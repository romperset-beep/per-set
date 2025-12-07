import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import { ProjectManager } from './components/ProjectManager';
import { InventoryManager } from './components/InventoryManager';
import { CircularEconomy } from './components/CircularEconomy';
import { ImpactReport } from './components/ImpactReport';
import { GlobalStock } from './components/GlobalStock';
import { ExpenseReports } from './components/ExpenseReports';
import { BuyBackMarketplace } from './components/BuyBackMarketplace';
import { SocialFeed } from './components/SocialFeed';
import { UserProfilePage } from './components/UserProfilePage';
import { TeamDirectory } from './components/TeamDirectory';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { LoginPage } from './components/LoginPage';
import { ProjectSelection } from './components/ProjectSelection';
import { FallbackErrorBoundary } from './components/FallbackErrorBoundary';
import { DebugFooter } from './components/DebugFooter';
import { Bell, LogOut, User as UserIcon, Menu } from 'lucide-react';
import { Department } from './types';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, logout, unreadCount, project, setCurrentDept } = useProject();

  if (!user) {
    return <LoginPage />;
  }

  // If project is default/empty, we always go to selection screen
  // The selection screen itself will handle "Welcome Back" vs "New Form" logic
  const needsProjectSelection = project.id === 'default-project' || !project.id;

  if (needsProjectSelection) {
    return (
      <div className="min-h-screen bg-cinema-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Reuse background from Login for consistency */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-eco-500/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cinema-500/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="relative z-10 w-full flex justify-center">
          <FallbackErrorBoundary>
            <ProjectSelection onProjectSelected={() => { /* Context updates state */ }} />
          </FallbackErrorBoundary>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ProjectManager setActiveTab={setActiveTab} />;
      case 'inventory':
        return <InventoryManager />;
      case 'marketplace':
        return <BuyBackMarketplace />;
      case 'donations':
        return <CircularEconomy />;
      case 'circular':
        return <CircularEconomy />;
      case 'report':
        return <ImpactReport />;
      case 'global-stock':
        return <GlobalStock />;
      case 'expenses':
        return <ExpenseReports />;
      case 'buyback':
        return <BuyBackMarketplace />;
      case 'social':
        return <SocialFeed />;
      case 'profile':
        return <UserProfilePage />;
      case 'team':
        return <TeamDirectory />;

      default:
        return <ProjectManager activeTab={activeTab} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-cinema-900 text-slate-200 font-sans overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 overflow-y-auto relative">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-cinema-900/80 backdrop-blur-md border-b border-cinema-700 px-4 md:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-slate-400 hover:text-white"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div>
              <h2 className="text-white font-bold text-lg">{user.filmTitle}</h2>
              <p className="text-xs text-slate-400 uppercase tracking-wider">{user.productionName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">

            {/* Connection Status (Mobile & Desktop) */}
            <div className="hidden md:flex items-center gap-2 text-xs text-gray-400 bg-cinema-800 px-3 py-1.5 rounded-full border border-cinema-700">
              <div className={`w-2 h-2 rounded-full ${typeof navigator !== 'undefined' && navigator.onLine ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="hidden lg:inline">{typeof navigator !== 'undefined' && navigator.onLine ? 'En ligne' : 'Hors ligne'}</span>
            </div>
            {/* Mobile simplified indicator */}
            <div className={`md:hidden w-3 h-3 rounded-full ${typeof navigator !== 'undefined' && navigator.onLine ? 'bg-green-500' : 'bg-red-500'} border border-cinema-900`} title={typeof navigator !== 'undefined' && navigator.onLine ? 'En ligne' : 'Hors ligne'} />

            <button
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-3 bg-cinema-800 px-3 py-1.5 rounded-full border border-cinema-700 hover:bg-cinema-700 transition-colors cursor-pointer"
            >
              <div className="bg-eco-500/20 p-1 rounded-full">
                <UserIcon className="h-4 w-4 text-eco-400" />
              </div>
              <div className="hidden md:block text-right">
                <p className="text-sm text-white font-medium leading-none">{user.name}</p>
                <p className="text-[10px] text-slate-400 leading-none mt-1">{user.department}</p>
              </div>
            </button>

            {(user.department === 'PRODUCTION' || user.department === Department.REGIE) && (
              <button
                onClick={() => {
                  setActiveTab('inventory');
                  setCurrentDept('PRODUCTION');
                }}
                className="relative p-2 text-slate-400 hover:text-white transition-colors"
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-cinema-900"></span>
                )}
              </button>
            )}

            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-red-400 transition-colors"
              title="Se déconnecter"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {renderContent()}
        </div>
    </div>
      </main >
  <DebugFooter />
    </div >
  );
};

const App: React.FC = () => {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
};

export default App;
