import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import { ProjectManager } from './components/ProjectManager';
import { InventoryManager } from './components/InventoryManager';
import { CateringWidget } from './components/CateringWidget';
import { TimesheetWidget } from './components/TimesheetWidget';
import { RenfortsWidget } from './components/RenfortsWidget';
import { LogisticsWidget } from './components/LogisticsWidget';
import { MemoWidget } from './components/MemoWidget';
import { CircularEconomy } from './components/CircularEconomy';
import { ImpactReport } from './components/ImpactReport';
import { GlobalStock } from './components/GlobalStock';
import { ExpenseReports } from './components/ExpenseReports';
import { BuyBackMarketplace } from './components/BuyBackMarketplace';
import { SocialFeed } from './components/SocialFeed';
import { UserProfilePage } from './components/UserProfilePage';
import { TeamDirectory } from './components/TeamDirectory';
import { CallSheetView } from './components/CallSheetView';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { LoginPage } from './components/LoginPage';
import { ProjectSelection } from './components/ProjectSelection';
import { ProjectConfigurationModal } from './components/ProjectConfigurationModal';
import { AdminDashboard } from './components/AdminDashboard';
import { FallbackErrorBoundary } from './components/FallbackErrorBoundary';
import { DebugFooter } from './components/DebugFooter';
import { Bell, LogOut, User as UserIcon, Menu, Calendar, X, Check, Trash2, Settings } from 'lucide-react';
import { Department } from './types';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  /* Notification State */
  const [showNotifications, setShowNotifications] = useState(false);
  const {
    user,
    currentDept,
    unreadCount,
    unreadSocialCount,
    unreadNotificationCount,
    notifications, // Added
    markAsRead, // Added
    deleteNotification, // Added
    markAllAsRead, // Added
    logout,
    t,
    project, setCurrentDept, updateProjectDetails, setSocialAudience, setSocialTargetDept, setSocialTargetUserId, socialPosts, userProfiles } = useProject();



  // Global Notification Indicator
  // Logic: Inventory Items (unreadCount) OR Social Posts (unreadSocialCount) OR Notifications (unreadNotificationCount)
  const hasUnread = unreadCount > 0 || unreadSocialCount > 0 || unreadNotificationCount > 0;

  // Filter notifications for display (Only unread? Or recent? Let's show unread + recent 5)
  // Actually, user wants to see "Red Dot" gone. So show unread first.
  const displayNotifications = React.useMemo(() => {
    // Filter relevant like ProjectContext does but sorted
    const relevant = notifications.filter(n => {
      if (user?.department === 'PRODUCTION' || user?.department === 'Régie') return true;
      return n.targetDept === user?.department || n.targetDept === undefined;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return relevant.slice(0, 10); // Show top 10
  }, [notifications, user]);

  const handleNotificationClick = (n: any) => {
    markAsRead(n.id);
    setShowNotifications(false);

    // Routing Logic
    // Routing Logic
    const msg = n.message.toLowerCase();

    // 1. Reinforcements
    if (msg.includes('renfort')) {
      setActiveTab('renforts');

      // 2. Logistics & Transport
    } else if (msg.includes('transport') || msg.includes('course') || msg.includes('logistique')) {
      setActiveTab('logistics');

      // 3. Expenses
    } else if (msg.includes('frais') || msg.includes('dépense') || msg.includes('remboursement')) {
      setActiveTab('expenses');

      // 4. Social Wall
    } else if (msg.includes('social') || msg.includes('message') || n.itemId?.startsWith('post_')) {
      setActiveTab('social');

      // 5. BuyBack / Marketplace (Achat/Vente)
    } else if (
      msg.includes('vendre') ||
      msg.includes('vente') ||
      msg.includes('transaction') ||
      msg.includes('achat') ||
      msg.includes('rachat')
    ) {
      setActiveTab('buyback');

      // 6. Inventory (New Items)
    } else if (msg.includes('article') || msg.includes('stock') || msg.includes('inventaire')) {
      setActiveTab('inventory');

      // 7. Call Sheets
    } else if (msg.includes('feuille de service') || msg.includes('call sheet')) {
      setActiveTab('callsheets');

    } else {
      // Default fallback (Dashboard or stay)
      // setActiveTab('dashboard'); // Safer default?
      setActiveTab('renforts'); // Current fallback, maybe change if "unknown"
    }
  };

  // We want to mark ALL distinct unread notifications visible (or theoretically visible) as read
  const markAllNofiticationsRead = async () => {
    // Collect IDs of ALL unread notifications for this user, not just the top 10 displayed
    const allUnread = notifications.filter(n => {
      if (n.read) return false;
      if (user?.department === 'PRODUCTION' || user?.department === 'Régie') return true;
      return n.targetDept === user?.department || n.targetDept === undefined;
    });

    if (allUnread.length > 0) {
      await markAllAsRead(allUnread.map(n => n.id));
    }
    setShowNotifications(false);
  };

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
        return <ProjectManager activeTab={activeTab} setActiveTab={setActiveTab} />;
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
      case 'catering':
        return <CateringWidget />;
      case 'timesheet':
        return <TimesheetWidget />;
      case 'renforts':
        return <RenfortsWidget />;
      case 'logistics':
        return <LogisticsWidget />;
      case 'memo':
        return <MemoWidget setActiveTab={setActiveTab} />;
      case 'callsheets':
        return <CallSheetView />;
      case 'admin':
        return <AdminDashboard />;

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
              <button
                onClick={() => user?.department === 'PRODUCTION' && setIsConfigModalOpen(true)}
                className={`flex items-center gap-3 text-left group ${user?.department === 'PRODUCTION' ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <h2 className={`text-white font-bold text-lg ${user?.department === 'PRODUCTION' ? 'group-hover:text-blue-400 transition-colors' : ''}`}>
                  {user.filmTitle}
                </h2>
                {project.projectType && (
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 whitespace-nowrap">
                    {project.projectType}
                  </span>
                )}
                {user?.department === 'PRODUCTION' && (
                  <Settings className="h-4 w-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
              <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wider">
                <span className="truncate max-w-[150px] md:max-w-none">{user.productionName}</span>
                {/* Date Display & Edit Logic */}
                {(project.shootingStartDate || user.department === 'PRODUCTION') && (
                  <>
                    <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-slate-600"></span>

                    <div className="relative">
                      <button
                        onClick={() => user.department === 'PRODUCTION' && setIsEditingDates(true)}
                        className={`hidden sm:flex items-center gap-1 text-slate-500 transition-colors ${user.department === 'PRODUCTION' ? 'hover:text-blue-400 cursor-pointer' : ''}`}
                        title={user.department === 'PRODUCTION' ? "Modifier les dates de tournage" : undefined}
                      >
                        <Calendar className="h-3 w-3" />
                        {project.shootingStartDate && project.shootingEndDate ? (
                          <span>
                            {new Date(project.shootingStartDate).toLocaleDateString()} - {new Date(project.shootingEndDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="italic text-slate-600">Définir les dates</span>
                        )}
                      </button>

                      {/* Edit Modal */}
                      {isEditingDates && (
                        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-32" onClick={() => setIsEditingDates(false)}>
                          <div
                            className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 shadow-2xl min-w-[320px] animate-in fade-in slide-in-from-top-4 duration-200"
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="flex justify-between items-center mb-6">
                              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-400" />
                                Dates de Tournage
                              </h3>
                              <button onClick={() => setIsEditingDates(false)} className="text-slate-400 hover:text-white">
                                <X className="h-5 w-5" />
                              </button>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Date de début</label>
                                <input
                                  type="date"
                                  value={project.shootingStartDate || ''}
                                  onChange={e => updateProjectDetails({ shootingStartDate: e.target.value })}
                                  className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                                />
                              </div>

                              <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Date de fin</label>
                                <input
                                  type="date"
                                  value={project.shootingEndDate || ''}
                                  onChange={e => updateProjectDetails({ shootingEndDate: e.target.value })}
                                  className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                                />
                              </div>

                              <div className="pt-4 flex justify-end">
                                <button
                                  onClick={() => setIsEditingDates(false)}
                                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 font-medium transition-colors flex items-center gap-2"
                                >
                                  <Check className="h-4 w-4" />
                                  Valider
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
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

            {/* Notification Bell (Global) */}
            {/* Notification Bell (Global) */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-400 hover:text-white transition-colors"
                title="Notifications"
              >
                <Bell className="h-6 w-6" />
                {hasUnread && (
                  <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-pink-500 rounded-full border-2 border-cinema-900 animate-pulse"></span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-cinema-800 border border-cinema-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="p-3 border-b border-cinema-700 flex justify-between items-center bg-cinema-900/50">
                    <h3 className="font-bold text-white text-sm">Notifications</h3>
                    {unreadNotificationCount > 0 && (
                      <button onClick={markAllNofiticationsRead} className="text-[10px] text-blue-400 hover:text-blue-300 font-medium">
                        Tout marquer lu
                      </button>
                    )}
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {displayNotifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-sm">
                        Aucune notification récente.
                      </div>
                    ) : (
                      <div className="divide-y divide-cinema-700/50">
                        {displayNotifications.map((n: any) => (
                          <div
                            key={n.id}
                            className={`w-full flex items-start gap-3 p-3 hover:bg-white/5 transition-colors border-b border-cinema-700/50 last:border-0 ${!n.read ? 'bg-blue-500/5' : ''}`}
                          >
                            <button
                              onClick={() => handleNotificationClick(n)}
                              className="flex-1 text-left flex gap-3 min-w-0"
                            >
                              <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${!n.read ? 'bg-blue-500' : 'bg-transparent'}`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${!n.read ? 'text-white font-medium' : 'text-slate-400'}`}>
                                  {n.message}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-1">
                                  {new Date(n.date).toLocaleDateString()}
                                </p>
                              </div>
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(n.id);
                              }}
                              className="p-1 text-slate-500 hover:text-red-400 transition-colors opacity-50 hover:opacity-100"
                              title="Supprimer la notification"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

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
      </main >

      {/* Configuration Modal */}
      <ProjectConfigurationModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </div >
  );
};

const App: React.FC = () => {
  // Determine debug state if possible (hacky for root)
  const [debugInfo, setDebugInfo] = useState<any>({});

  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
};

export default App;
