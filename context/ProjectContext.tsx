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
import { TRANSLATIONS } from './translations';
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
  error: string | null;
  testConnection: () => Promise<void>;
  debugStatus: string;
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
  const [error, setError] = useState<string | null>(null);
  const [debugStatus, setDebugStatus] = useState<string>("");

  const testConnection = async () => {
    setDebugStatus("1. Test REST API en cours...");

    // 1. Test REST API immediately (Pure HTTP)
    try {
      const projectId = "studio-4995281481-cbcdb";
      // Use the named database 'cinestock-db' instead of '(default)'
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/cinestock-db/documents/_debug_connection`;
      const response = await fetch(url);

      if (!response.ok && response.status !== 404) { // 404 is fine (collection might be empty), 403/400 is bad
        const text = await response.text();
        setDebugStatus(`ÉCHEC REST API ❌ (${response.status}): ${text}`);
        setError(`REST Error: ${text}`);
        return;
      }
      setDebugStatus("REST API OK ✅. 2. Test SDK (Timeout 5s)...");
    } catch (restErr: any) {
      setDebugStatus(`ÉCHEC RÉSEAU REST ❌: ${restErr.message}`);
      return;
    }

    // 2. Test SDK with Timeout (READ ONLY)
    try {
      const { getDocs, collection } = await import('firebase/firestore');
      // await enableNetwork(db); // Removed to avoid potential hang

      const testRef = collection(db, '_debug_connection');

      // Race between getDocs and a 5s timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout (5s) - Le SDK bloque en LECTURE")), 5000)
      );

      await Promise.race([
        getDocs(testRef),
        timeoutPromise
      ]);

      setDebugStatus("SUCCÈS TOTAL (REST + SDK LECTURE) ! 🎉");
    } catch (err: any) {
      console.error("SDK Error:", err);
      setDebugStatus(`REST OK mais SDK LECTURE ÉCHEC : ${err.message}`);
      setError(err.message);
    }
  };

  const t = (key: string): string => {
    // @ts-ignore
    return TRANSLATIONS[language][key] || key;
  };

  // --- Firestore Sync ---

  // 1. Sync Project Items
  useEffect(() => {
    // Listen to the 'items' subcollection of the project
    // Use dynamic project ID from state (derived from login)
    const projectId = project.id;

    if (!projectId || projectId === 'default-project') return;

    const itemsRef = collection(db, 'projects', projectId, 'items');

    const unsubscribe = onSnapshot(itemsRef, (snapshot) => {
      const items: ConsumableItem[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as ConsumableItem);
      });

      setProject(prev => ({ ...prev, items }));

      // Debug: Check if data is from cache
      const source = snapshot.metadata.fromCache ? "local cache" : "server";
      console.log("Data came from " + source);
      // We could expose this to the UI if needed
      (window as any).firestoreSource = source;
      setError(null); // Clear error on success

    }, (err) => {
      console.error("Firestore Error:", err);
      // Only alert if we have a real project ID
      if (projectId !== 'default-project') {
        // alert(`Erreur de connexion : ${error.message}`);
      }
      setError(err.message);
    });

    return () => unsubscribe();
  }, [project.id]);

  // Firestore Actions
  const addItem = async (item: ConsumableItem) => {
    const projectId = project.id;
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
    const projectId = project.id;
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

  // Helper to generate consistent Project ID
  const generateProjectId = (prod: string, film: string) => {
    const combined = `${prod}-${film}`;
    return combined.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'demo-project';
  };

  useEffect(() => {
    if (user) {
      setCurrentDept(user.department);
      // Update project ID from persisted user data to ensure sync
      const newProjectId = generateProjectId(user.productionName, user.filmTitle);
      setProject(prev => ({
        ...prev,
        id: newProjectId,
        name: user.filmTitle,
        productionCompany: user.productionName
      }));
    }
  }, [user]);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('cineStockUser', JSON.stringify(userData));

    // Force immediate update of project ID
    const newProjectId = generateProjectId(userData.productionName, userData.filmTitle);
    setProject(prev => ({
      ...prev,
      id: newProjectId,
      name: userData.filmTitle,
      productionCompany: userData.productionName
    }));

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
      language,
      setLanguage,
      t,
      error,
      testConnection,
      debugStatus
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
