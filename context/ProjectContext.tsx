import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Project,
  User,
  Notification,
  Department,
  ExpenseReport,
  ExpenseStatus,
  BuyBackItem,
  SocialPost,
  UserProfile,
  Language,
  ConsumableItem,
  ItemStatus,
  SurplusAction
} from '../types';

import { db } from '../services/firebase';
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  addDoc,
  setDoc,
  query,
  orderBy,
  arrayUnion
} from 'firebase/firestore';

interface ProjectContextType {
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project>>;

  // Firestore Actions
  addItem: (item: ConsumableItem) => Promise<void>;
  updateItem: (item: ConsumableItem) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;

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

  // Language
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const DEFAULT_PROJECT: Project = {
  id: 'default-project',
  name: 'CinéStock Demo',
  productionCompany: 'Horizon Productions',
  startDate: '2023-10-15',
  shootingStartDate: '2023-11-01',
  shootingEndDate: '2023-12-20',
  status: 'Shooting',
  items: []
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Persist user in localStorage for better DX
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('cineStockUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [project, setProject] = useState<Project>(DEFAULT_PROJECT);
  const [currentDept, setCurrentDept] = useState<string>('PRODUCTION');
  const [circularView, setCircularView] = useState<'overview' | 'marketplace' | 'donations'>('overview');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [expenseReports, setExpenseReports] = useState<ExpenseReport[]>([]);
  const [language, setLanguage] = useState<Language>('fr');
  const [buyBackItems, setBuyBackItems] = useState<BuyBackItem[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);

  const t = (key: string): string => {
    return key;
  };

  // --- Firestore Sync ---

  // 1. Sync Project Items
  useEffect(() => {
    // Listen to the 'items' subcollection of the project
    // For simplicity in this demo, we use a fixed project ID 'demo-project'
    const projectId = 'demo-project';
    const itemsRef = collection(db, 'projects', projectId, 'items');

    const unsubscribe = onSnapshot(itemsRef, (snapshot) => {
      const items: ConsumableItem[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as ConsumableItem);
      });

      setProject(prev => ({ ...prev, items }));
    }, (error) => {
      console.error("Firestore Error:", error);
      // We need to use a timeout or similar because addNotification isn't defined yet in this scope?
      // Actually addNotification is defined below. We should move it up or use a ref.
      // For now let's just log. The UI will show empty list which is a hint.
      // Better: set a state.
      alert(`Erreur de connexion à la base de données : ${error.message}. Vérifiez vos règles de sécurité Firestore.`);
    });

    return () => unsubscribe();
  }, []);

  // Firestore Actions
  const addItem = async (item: ConsumableItem) => {
    const projectId = 'demo-project';
    const itemsRef = collection(db, 'projects', projectId, 'items');
    // Remove id if present to let Firestore generate one
    const { id, ...itemData } = item;
    await addDoc(itemsRef, itemData);

    addNotification(
      `Nouvel article ajouté : ${item.name}`,
      'INFO',
      item.department
    );
  };

  const updateItem = async (item: ConsumableItem) => {
    if (!item.id) return;
    const projectId = 'demo-project';
    const itemRef = doc(db, 'projects', projectId, 'items', item.id);
    const { id, ...itemData } = item;
    await updateDoc(itemRef, itemData);
  };

  const deleteItem = async (itemId: string) => {
    // Implementation for delete would go here
    // await deleteDoc(doc(db, 'projects', 'demo-project', 'items', itemId));
  };


  // --- Legacy Local State Actions (To be migrated) ---

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
        if (item.reservedBy === department) {
          return { ...item, reservedBy: null, status: 'AVAILABLE' };
        }
        if (item.reservedBy) return item;
        return { ...item, reservedBy: department, status: 'RESERVED' };
      }
      return item;
    }));
  };

  useEffect(() => {
    if (user) {
      setCurrentDept(user.department);
      // We don't overwrite project name from user anymore, we trust Firestore
    }
  }, [user]);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('cineStockUser', JSON.stringify(userData));
    addNotification(`Bienvenue ${userData.name} !`, 'INFO', userData.department);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('cineStockUser');
    setCurrentDept('PRODUCTION');
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

  const userNotifications = notifications.filter(n => {
    if (!user) return false;
    if (user.department === 'PRODUCTION' || user.department === 'Régie') return true;
    return n.targetDept === user.department || n.targetDept === undefined;
  });

  const addSocialPost = (post: SocialPost) => {
    setSocialPosts(prev => [post, ...prev]);
    addNotification(
      `Nouveau message de ${post.authorName} sur le mur social`,
      'INFO',
      'PRODUCTION'
    );
  };

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
    (user?.department === 'PRODUCTION' || user?.department === 'Régie' || i.department === user?.department)
  ).length;

  return (
    <ProjectContext.Provider value={{
      project,
      setProject,
      addItem,
      updateItem,
      deleteItem,
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
      updateUserProfile,
      language,
      setLanguage,
      t
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
