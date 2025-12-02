import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Project, Department, ItemStatus, SurplusAction, ExpenseReport, ExpenseStatus, BuyBackItem, SocialPost, UserProfile } from '../types';

// --- Types ---

export interface User {
  name: string;
  email: string;
  department: Department | 'PRODUCTION';
  productionName: string;
  filmTitle: string;
}

export interface Notification {
  id: string;
  type: 'ORDER' | 'STOCK_MOVE' | 'INFO';
  message: string;
  date: Date;
  read: boolean;
  targetDept?: Department | 'PRODUCTION'; // Who should see this
  itemId?: string;
}

interface ProjectContextType {
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project>>;
  currentDept: string;
  setCurrentDept: (dept: string) => void;
  circularView: 'overview' | 'marketplace' | 'donations';
  setCircularView: (view: 'overview' | 'marketplace' | 'donations') => void;

  // Auth
  user: User | null;
  login: (user: User) => void;
  logout: () => void;

  // Notifications
  notifications: Notification[];
  addNotification: (msg: string, type: Notification['type'], target?: Department | 'PRODUCTION', itemId?: string) => void;
  markAsRead: (id: string) => void;
  markNotificationAsReadByItemId: (itemId: string) => void;
  unreadCount: number;

  // Expense Reports
  expenseReports: ExpenseReport[];
  addExpenseReport: (report: ExpenseReport) => void;
  updateExpenseReportStatus: (id: string, status: ExpenseStatus) => void;
  buyBackItems: BuyBackItem[];
  addBuyBackItem: (item: BuyBackItem) => void;
  toggleBuyBackReservation: (itemId: string, department: Department | 'PRODUCTION') => void;
  socialPosts: SocialPost[];
  addSocialPost: (post: SocialPost) => void;
  userProfiles: UserProfile[];
  updateUserProfile: (profile: UserProfile) => void;
}

// --- Mock Data ---

const MOCK_PROJECT: Project = {
  id: 'p1',
  name: 'CinéStock Demo',
  productionCompany: 'Horizon Productions',
  startDate: '2023-10-15',
  status: 'Shooting',
  items: [
    { id: '1', name: 'Gaffer Tape', quantityInitial: 10, quantityCurrent: 2, unit: 'rouleaux', status: ItemStatus.USED, department: Department.CAMERA, surplusAction: SurplusAction.NONE, purchased: true },
    { id: '2', name: 'Piles AA', quantityInitial: 50, quantityCurrent: 50, unit: 'unités', status: ItemStatus.NEW, department: Department.SON, surplusAction: SurplusAction.NONE, purchased: true },
    { id: '3', name: 'Projecteur LED', quantityInitial: 2, quantityCurrent: 2, unit: 'unités', status: ItemStatus.NEW, department: Department.LUMIERE, surplusAction: SurplusAction.MARKETPLACE, purchased: true },
  ]
};

// --- Context ---

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Persist user in localStorage for better DX
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('cineStockUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [project, setProject] = useState<Project>(MOCK_PROJECT);
  const [currentDept, setCurrentDept] = useState<string>('PRODUCTION'); // Default view
  const [circularView, setCircularView] = useState<'overview' | 'marketplace' | 'donations'>('overview');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [expenseReports, setExpenseReports] = useState<ExpenseReport[]>([]);

  const [buyBackItems, setBuyBackItems] = useState<BuyBackItem[]>([]);

  const addBuyBackItem = (item: BuyBackItem) => {
    setBuyBackItems(prev => [item, ...prev]);
    addNotification(
      `Nouvel article à vendre : ${item.name} (${item.price}€) par ${item.sellerDepartment}`,
      'INFO',
      'PRODUCTION'
    );
  };

  const toggleBuyBackReservation = (itemId: string, department: Department | 'PRODUCTION') => {
    setBuyBackItems(prev => prev.map(item => {
      if (item.id === itemId) {
        // If already reserved by this dept, unreserve
        if (item.reservedBy === department) {
          return { ...item, reservedBy: null, status: 'AVAILABLE' };
        }
        // If reserved by someone else, do nothing (or error? UI should prevent this)
        if (item.reservedBy) return item;
        
        // Reserve
        return { ...item, reservedBy: department, status: 'RESERVED' };
      }
      return item;
    }));
  };


  // Sync currentDept with User's department on login
  // Sync currentDept and Project Details with User's login info
  useEffect(() => {
    if (user) {
      setCurrentDept(user.department);
      setProject(prev => ({
        ...prev,
        name: user.filmTitle,
        productionCompany: user.productionName
      }));
    }
  }, [user]);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('cineStockUser', JSON.stringify(userData));
    // Welcome notification
    addNotification(`Bienvenue ${userData.name} !`, 'INFO', userData.department);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('cineStockUser');
    setCurrentDept('PRODUCTION'); // Reset to default
  };

  const addNotification = (message: string, type: Notification['type'], target: Department | 'PRODUCTION' = 'PRODUCTION', itemId?: string) => {
    const newNotif: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      type,
      date: new Date(),
      read: false,
      targetDept: target,
      itemId
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markNotificationAsReadByItemId = (itemId: string) => {
    setNotifications(prev => prev.map(n => n.itemId === itemId ? { ...n, read: true } : n));
  };

  const addExpenseReport = (report: ExpenseReport) => {
    setExpenseReports(prev => [report, ...prev]);
    addNotification(
      `Nouvelle note de frais de ${report.submittedBy} (${report.amountTTC}€)`,
      'INFO',
      'PRODUCTION'
    );
  };

  const updateExpenseReportStatus = (id: string, status: ExpenseStatus) => {
    setExpenseReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  // Filter notifications for the current user
  const userNotifications = notifications.filter(n => {
    if (!user) return false;
    if (user.department === 'PRODUCTION') return true; // Prod sees everything (or we can filter specifically for prod alerts)
    return n.targetDept === user.department || n.targetDept === undefined;
  });

  
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);

  const addSocialPost = (post: SocialPost) => {
    setSocialPosts(prev => [post, ...prev]);
    addNotification(
      `Nouveau message de ${post.authorName} sur le mur social`,
      'INFO',
      'PRODUCTION' // Or ALL? For now let's say Production gets notified, or everyone?
    );
  };

  
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);

  const updateUserProfile = (profile: UserProfile) => {
    setUserProfiles(prev => {
      const existingIndex = prev.findIndex(p => p.email === profile.email);
      if (existingIndex >= 0) {
        const newProfiles = [...prev];
        newProfiles[existingIndex] = profile;
        return newProfiles;
      }
      return [...prev, profile];
    });
    addNotification(
      `Mise à jour du profil de ${profile.firstName} ${profile.lastName}`,
      'INFO',
      'PRODUCTION'
    );
  };

  const unreadCount = project.items.filter(i => 
    !i.purchased && 
    (user?.department === 'PRODUCTION' || i.department === user?.department)
  ).length;

  return (
    <ProjectContext.Provider value={{
      project,
      setProject,
      currentDept,
      setCurrentDept,
      circularView,
      setCircularView,
      user,
      login,
      logout,
      notifications: userNotifications,
      addNotification,
      markAsRead,
      markNotificationAsReadByItemId,
      unreadCount,
      expenseReports,
      addExpenseReport,
      updateExpenseReportStatus,
      buyBackItems,
      addBuyBackItem,
      toggleBuyBackReservation,
      socialPosts,
      addSocialPost,
      userProfiles,
      updateUserProfile
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
