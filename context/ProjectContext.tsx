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
  ProjectSummary,
  ConsumableItem,
  ItemStatus,
  SurplusAction
} from '../types';
import { TRANSLATIONS } from './translations';
import { db, auth } from '../services/firebase';
import { signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  addDoc,
  setDoc,
  getDoc,
  query,
  orderBy,
  arrayUnion
} from 'firebase/firestore';

// Auth State Listener and Functions moved inside Provider


interface ProjectContextType {
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project>>;
  updateProjectDetails: (updates: Partial<Project>) => Promise<void>;

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
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string, dept: Department | 'PRODUCTION') => Promise<void>; // Added
  joinProject: (prod: string, film: string, start?: string, end?: string) => Promise<void>;
  leaveProject: () => Promise<void>; // Added
  logout: () => void;

  // Notifications
  notifications: Notification[];
  addNotification: (msg: string, type: Notification['type'], target?: Department | 'PRODUCTION', itemId?: string) => void;
  markAsRead: (id: string) => void;
  markNotificationAsReadByItemId: (itemId: string) => void;
  unreadCount: number;
  unreadSocialCount: number;
  unreadMarketplaceCount: number;
  markSocialAsRead: () => void;
  markMarketplaceAsRead: () => void;

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
  lastLog: string;
}

const DEFAULT_PROJECT: Project = {
  id: 'default-project',
  name: 'A Better Set Demo',
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
  const [lastLog, setLastLog] = useState<string>("En attente...");

  // Auto-login replaced by onAuthStateChanged listener below

  // Sync Project Metadata (Dates, Status, etc.)
  useEffect(() => {
    const projectId = project.id;
    if (!projectId || projectId === 'default-project') return;

    const projectRef = doc(db, 'projects', projectId);
    const unsubscribe = onSnapshot(projectRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("[ProjectSync] Metadata received:", data);
        setProject(prev => ({
          ...prev,
          ...data,
          // Ensure ID stays consistent
          id: projectId
        }));
      }
    });

    return () => unsubscribe();
  }, [project.id]);

  const updateProjectDetails = async (updates: Partial<Project>) => {
    try {
      const projectId = project.id;
      if (!projectId || projectId === 'default-project') return;

      const projectRef = doc(db, 'projects', projectId);
      // Optimistic update
      setProject(prev => ({ ...prev, ...updates }));

      await setDoc(projectRef, updates, { merge: true });
      console.log("[ProjectSync] Updated successfully:", updates);
    } catch (err: any) {
      console.error("[ProjectSync] Error updating project:", err);
      setError(`Erreur de sauvegarde : ${err.message}`);
    }
  };

  // Notification State
  const [lastReadSocial, setLastReadSocial] = useState<number>(() => {
    const saved = localStorage.getItem('lastReadSocial');
    return saved ? Number(saved) : Date.now();
  });
  const [lastReadMarketplace, setLastReadMarketplace] = useState<number>(() => {
    const saved = localStorage.getItem('lastReadMarketplace');
    return saved ? Number(saved) : Date.now();
  });

  const unreadSocialCount = socialPosts.filter(p => new Date(p.date).getTime() > lastReadSocial).length;
  const unreadMarketplaceCount = buyBackItems.filter(i => new Date(i.date).getTime() > lastReadMarketplace).length;

  const markSocialAsRead = () => {
    const now = Date.now();
    setLastReadSocial(now);
    localStorage.setItem('lastReadSocial', String(now));
  };

  const markMarketplaceAsRead = () => {
    const now = Date.now();
    setLastReadMarketplace(now);
    localStorage.setItem('lastReadMarketplace', String(now));
  };

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

    // 2. Test SDK with Timeout (WRITE)
    try {
      const { enableNetwork, addDoc, collection } = await import('firebase/firestore');
      // await enableNetwork(db); 

      const testRef = collection(db, '_debug_connection');

      // Race between addDoc and a 5s timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout (5s) - Le SDK bloque en ÉCRITURE")), 5000)
      );

      await Promise.race([
        addDoc(testRef, {
          timestamp: new Date(),
          user: user?.email || 'anonymous',
          device: navigator.userAgent
        }),
        timeoutPromise
      ]);

      setDebugStatus("SUCCÈS TOTAL (REST + SDK ÉCRITURE) ! 🎉");
    } catch (err: any) {
      console.error("SDK Error:", err);
      setDebugStatus(`REST OK mais SDK ÉCRITURE ÉCHEC : ${err.message}`);
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
    console.log(`[ItemsSync] Init listener for project: ${projectId}`);

    if (!projectId || projectId === 'default-project') return;

    const itemsRef = collection(db, 'projects', projectId, 'items');

    const unsubscribe = onSnapshot(itemsRef, (snapshot) => {
      console.log(`[ItemsSync] Snapshot received. Docs: ${snapshot.size}`);
      const items: ConsumableItem[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as ConsumableItem);
      });
      setLastLog(`[ItemsSync] Reçu ${items.length} articles (Source: ${snapshot.metadata.fromCache ? 'Cache' : 'Serveur'})`);
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
    try {
      const projectId = project.id;
      console.log(`[AddItem] Starting add to ${projectId}`);
      setLastLog(`[AddItem] Envoi en cours vers ${projectId}...`);

      const itemsRef = collection(db, 'projects', projectId, 'items');
      // Remove id if present to let Firestore generate one
      const { id, ...itemData } = item;

      // Sanitize undefined values just in case
      const sanitizedData = Object.fromEntries(
        Object.entries(itemData).map(([k, v]) => [k, v === undefined ? null : v])
      );

      await addDoc(itemsRef, sanitizedData);

      setLastLog(`[AddItem] SUCCÈS ! Ajouté dans ${projectId}`);
      console.log(`[AddItem] Success`);

      addNotification(
        `Nouvel article ajouté : ${item.name}`,
        'INFO',
        item.department
      );
    } catch (err: any) {
      console.error("[AddItem] Error:", err);
      setLastLog(`[AddItem] ERREUR: ${err.message}`);
      setError(`Erreur d'ajout : ${err.message}`);
    }
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
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-')     // Replace non-alphanumeric with dash
      .replace(/^-+|-+$/g, '')         // Trim dashes
      || 'demo-project';
  };

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log("Auth State: Logged In", firebaseUser.uid);
        // Fetch User Profile from Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data() as User;
            setUser(userData);

            // Security: Enforce View restriction for non-production users
            if (userData.department !== 'PRODUCTION') {
              setCurrentDept(userData.department);
            } else {
              setCurrentDept('PRODUCTION');
            }
          } else {
            console.log("Auth Logged in but no firestore profile found. Auto-repairing...");
            // Auto-Repair: Create default profile
            const recoveredUser: User = {
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Utilisateur',
              email: firebaseUser.email || '',
              department: 'PRODUCTION', // Default safe fallback
              productionName: 'Demo Prod',
              filmTitle: 'Demo Film'
            };

            await setDoc(userRef, recoveredUser);
            setUser(recoveredUser);
            addNotification("Profil récupéré automatiquement", "INFO", "PRODUCTION");
          }
        } catch (e) {
          console.error("Error fetching user profile", e);
        }
      } else {
        console.log("Auth State: Logged Out");
        setUser(null);
        setProject(DEFAULT_PROJECT);
      }
    });
    return () => unsubscribe();
  }, []);

  const register = async (email: string, pass: string, name: string, dept: Department | 'PRODUCTION') => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      // Create User Profile
      const newUser: User = {
        name,
        email,
        department: dept,
        productionName: '', // Initially empty
        filmTitle: ''       // Initially empty
      };
      await setDoc(doc(db, 'users', cred.user.uid), newUser);

      // FIX: Explicitly set user state here to avoid race condition with onAuthStateChanged
      setUser(newUser);

      addNotification(`Bienvenue ${name} !`, 'INFO', dept);
    } catch (err: any) {
      console.error("Registration Error", err);
      throw err; // Propagate to UI
    }
  };

  const login = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      console.error("Login Error", err);
      throw err;
    }
  };

  const joinProject = async (prod: string, film: string, start?: string, end?: string) => {
    if (!auth.currentUser || !user) return;

    const projectId = generateProjectId(prod, film);

    // 1. Update Local Project State
    setProject(prev => ({
      ...prev,
      id: projectId,
      name: film,
      productionCompany: prod,
      shootingStartDate: start || prev.shootingStartDate,
      shootingEndDate: end || prev.shootingEndDate
    }));

    // 2. Update Persisted User Profile with new current project
    const updatedUser: User = {
      ...user,
      productionName: prod,
      filmTitle: film,
      startDate: start,
      endDate: end
    };
    setUser(updatedUser); // Optimistic

    filmTitle: film,
      startDate: start || null,
        endDate: end || null,
          projectHistory: arrayUnion({
            id: projectId,
            productionName: prod,
            filmTitle: film,
            lastAccess: new Date().toISOString()
          })
  });

  // Update local user state specifically for history
  const newHistoryItem: ProjectSummary = {
    id: projectId,
    productionName: prod,
    filmTitle: film,
    lastAccess: new Date().toISOString()
  };

  // Remove existing entry if present (to avoid duplicates/update date) and add new one
  const currentHistory = user.projectHistory || [];
  const updatedHistory = [
    newHistoryItem,
    ...currentHistory.filter(p => p.id !== projectId)
  ];

  setUser({
    ...updatedUser,
    projectHistory: updatedHistory
  });

  addNotification(`Bienvenue sur le plateau de "${film}" !`, 'INFO', user.department);
};

const leaveProject = async () => {
  if (!auth.currentUser || !user) return;

  // 1. Reset Local State
  setProject(DEFAULT_PROJECT);

  // 2. Clear persisted project info in Firestore
  const updatedUser: User = {
    ...user,
    productionName: '',
    filmTitle: '',
    startDate: undefined,
    endDate: undefined
  };
  setUser(updatedUser);

  await updateDoc(doc(db, 'users', auth.currentUser.uid), {
    productionName: '',
    filmTitle: '',
    startDate: null,
    endDate: null
  });
};

const logout = async () => {
  await signOut(auth);
  localStorage.removeItem('cineStockUser'); // Clean legacy
  setCurrentDept('PRODUCTION');
  setProject(DEFAULT_PROJECT);
};

// 3. Sync Notifications
useEffect(() => {
  const projectId = project.id;
  if (!projectId || projectId === 'default-project') return;

  const notifsRef = collection(db, 'projects', projectId, 'notifications');
  const q = query(notifsRef, orderBy('date', 'desc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const notifs: Notification[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      notifs.push({
        id: doc.id,
        ...data,
        date: data.date?.toDate ? data.date.toDate() : new Date(data.date)
      } as Notification);
    });
    setNotifications(notifs);
  });

  return () => unsubscribe();
}, [project.id]);

const addNotification = async (message: string, type: Notification['type'], target: Department | 'PRODUCTION' = 'PRODUCTION', itemId?: string) => {
  try {
    const projectId = project.id;
    const notifsRef = collection(db, 'projects', projectId, 'notifications');

    await addDoc(notifsRef, {
      message,
      type,
      targetDept: target,
      itemId: itemId || null,
      read: false,
      date: new Date()
    });
  } catch (err) {
    console.error("Failed to send notification:", err);
  }
};

const markAsRead = async (id: string) => {
  // Optimistic update
  setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  try {
    const projectId = project.id;
    const notifRef = doc(db, 'projects', projectId, 'notifications', id);
    await updateDoc(notifRef, { read: true });
  } catch (err) {
    console.error("Failed to mark notification as read:", err);
  }
};

const markNotificationAsReadByItemId = async (itemId: string) => {
  // Find notifications related to this item
  const targetNotifs = notifications.filter(n => n.itemId === itemId && !n.read);

  // Optimistic update
  setNotifications(prev => prev.map(n => n.itemId === itemId ? { ...n, read: true } : n));

  try {
    const projectId = project.id;
    // Update all matching notifications in Firestore
    const updatePromises = targetNotifs.map(n => {
      const notifRef = doc(db, 'projects', projectId, 'notifications', n.id);
      return updateDoc(notifRef, { read: true });
    });
    await Promise.all(updatePromises);
  } catch (err) {
    console.error("Failed to mark notifications as read by item:", err);
  }
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

// 2. Sync Social Posts
useEffect(() => {
  const projectId = project.id;
  console.log(`[SocialWall] Init listener for project: ${projectId}`);

  if (!projectId || projectId === 'default-project') return;

  const postsRef = collection(db, 'projects', projectId, 'socialPosts');
  const q = query(postsRef, orderBy('date', 'desc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    console.log(`[SocialWall] Snapshot received. Docs: ${snapshot.size}`);
    const posts: SocialPost[] = [];
    snapshot.forEach((doc) => {
      // Convert Firestore Timestamp to Date
      const data = doc.data();
      posts.push({
        id: doc.id,
        ...data,
        date: data.date?.toDate ? data.date.toDate() : new Date(data.date)
      } as SocialPost);
    });
    setSocialPosts(posts);
  }, (err) => {
    console.error("[SocialWall] Listener Error:", err);
    setError(`Social Wall Sync Error: ${err.message}`);
  });

  return () => unsubscribe();
}, [project.id]);

const addSocialPost = async (post: SocialPost) => {
  try {
    const projectId = project.id;
    console.log(`[SocialWall] Adding post to project: ${projectId}`);

    const postsRef = collection(db, 'projects', projectId, 'socialPosts');
    const { id, ...postData } = post;

    // Firestore doesn't support 'undefined', replace with null
    const sanitizedData = Object.fromEntries(
      Object.entries(postData).map(([k, v]) => [k, v === undefined ? null : v])
    );

    await addDoc(postsRef, {
      ...sanitizedData,
      date: new Date() // Ensure server timestamp
    });
    console.log("[SocialWall] Post added successfully");

    // Notification is handled by local state for now, or could be synced too
    addNotification(
      `Nouveau message de ${post.authorName} sur le mur social`,
      'INFO',
      'PRODUCTION'
    );
  } catch (err: any) {
    console.error("[SocialWall] Add Error:", err);
    setError(`Erreur d'envoi : ${err.message}`);
    alert(`Erreur d'envoi : ${err.message}`);
  }
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
    updateProjectDetails,
    joinProject,
    leaveProject,
    addItem,
    updateItem,
    deleteItem,
    currentDept,
    setCurrentDept,
    circularView,
    setCircularView,
    user,
    login,
    register,
    logout,
    notifications: userNotifications,
    addNotification,
    markAsRead,
    markNotificationAsReadByItemId,
    unreadCount,
    unreadSocialCount,
    unreadMarketplaceCount,
    markSocialAsRead,
    markMarketplaceAsRead,

    // Expense Reports,
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
    t,
    error,
    testConnection,
    debugStatus,
    lastLog
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
