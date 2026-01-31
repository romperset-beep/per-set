import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext'; // Added

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
  SurplusAction,
  CallSheet,
  CatalogItem,
  LogisticsRequest, // Added
  UserTemplate // Added
} from '../types';
import { TRANSLATIONS } from './translations';
import { db } from '../services/firebase';
// auth import removed
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
  collectionGroup, // Added
  limit, // Added
  getDocs,
  deleteDoc,
  where // Added
} from 'firebase/firestore';

import { getStorage, ref, deleteObject, uploadString, getDownloadURL, uploadBytes } from 'firebase/storage';

// Auth State Listener and Functions moved inside Provider


interface ProjectContextType {
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project>>;
  updateProjectDetails: (updates: Partial<Project>) => Promise<void>;
  updateEcoprodChecklist: (checklist: Record<string, boolean>) => Promise<void>;

  // Firestore Actions
  addItem: (item: ConsumableItem) => Promise<void>;
  updateItem: (item: Partial<ConsumableItem> & { id: string }) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;

  // Global Market moved to MarketplaceContext

  currentDept: string;
  setCurrentDept: (dept: string) => void;
  circularView: 'overview' | 'marketplace' | 'donations' | 'shortFilm' | 'sales_abs' | 'storage';
  setCircularView: (view: 'overview' | 'marketplace' | 'donations' | 'shortFilm' | 'sales_abs' | 'storage') => void;

  // Auth
  user: User | null;
  updateUser: (data: Partial<User>) => Promise<void>; // Added
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string, dept: Department | 'PRODUCTION') => Promise<void>;
  resendVerification: () => Promise<void>;
  refreshUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>; // Added
  joinProject: (prod: string, film: string, start?: string, end?: string, type?: string, convention?: string) => Promise<void>;
  leaveProject: () => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  removeProjectFromHistory: (projectId: string) => Promise<void>; // Added

  logout: () => Promise<void>;

  // Notifications
  notifications: Notification[];
  addNotification: (message: string, type: Notification['type'], target?: Department | 'PRODUCTION', itemId?: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>; // Added
  markAllAsRead: (notificationIds: string[]) => Promise<void>; // Added
  markNotificationAsReadByItemId: (itemId: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>; // Added
  unreadCount: number;
  unreadNotificationCount: number;

  // Expense Reports
  expenseReports: ExpenseReport[];
  addExpenseReport: (report: ExpenseReport & { receiptFile?: File }) => Promise<void>;
  updateExpenseReportStatus: (id: string, status: ExpenseStatus) => void;
  deleteExpenseReport: (reportId: string, receiptUrl?: string) => Promise<void>; // Added

  userProfiles: UserProfile[];
  updateUserProfile: (profile: UserProfile) => void;

  // Personal Templates
  saveUserTemplate: (name: string, items: any[], type?: 'CONSUMABLE' | 'MATERIAL') => Promise<void>;
  getUserTemplates: () => Promise<UserTemplate[]>;
  deleteUserTemplate: (templateId: string) => Promise<void>;

  // Search
  searchProjects: (queryStr: string) => Promise<Project[]>;

  // Call Sheets
  callSheets: CallSheet[];
  addCallSheet: (sheet: CallSheet) => Promise<void>;
  deleteCallSheet: (sheetId: string, url?: string) => Promise<void>;

  // Language
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  deleteUser: (userId: string) => Promise<void>;
  deleteAllData: () => Promise<void>;
  addLogisticsRequest: (request: LogisticsRequest) => Promise<void>;
  deleteLogisticsRequest: (requestId: string) => Promise<void>;
}

const DEFAULT_PROJECT: Project = {
  id: 'default-project',
  name: 'A Better Set Demo',
  productionCompany: 'Horizon Productions',
  startDate: '2023-10-15',
  shootingStartDate: '2023-11-01',
  shootingEndDate: '2023-12-20',
  projectType: 'Long Métrage',
  status: 'Shooting',
  items: []
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);
// Context defined

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const {
    user,
    login,
    register,
    logout,
    resetPassword,
    updateUser,
    userProfiles,
    updateUserProfile,
    refreshUser,
    resendVerification,
    deleteUser
  } = useAuth();

  // useNotification removed to avoid circular dependency
  // We will re-implement direct Firestore writes for addNotification/etc 
  // to maintain backward compatibility for actions, but READS must use useNotification() in components.

  // Persist user logic removed (handled by AuthContext)

  const [project, setProject] = useState<Project>(DEFAULT_PROJECT);
  const [currentDept, setCurrentDept] = useState<string>('PRODUCTION');
  const [circularView, setCircularView] = useState<'overview' | 'marketplace' | 'donations' | 'shortFilm' | 'sales_abs' | 'storage'>('overview');
  // notifications state removed (handled by NotificationContext)
  const [expenseReports, setExpenseReports] = useState<ExpenseReport[]>([]);
  const [language, setLanguage] = useState<Language>('fr');
  // buyBackItems and catalogItems moved to MarketplaceContext
  const [callSheets, setCallSheets] = useState<CallSheet[]>([]);
  // userProfiles state removed (handled by AuthContext)

  // Social View State REMOVED (Moved to SocialContext)


  const [error, setError] = useState<string | null>(null);
  const [debugStatus, setDebugStatus] = useState<string>("");
  const [lastLog, setLastLog] = useState<string>("En attente...");
  const [verificationCheck, setVerificationCheck] = useState(0); // Added to force auth re-check


  // resetPassword removed (handled by AuthContext)

  // Sync Project Metadata (Dates, Status, etc.)
  useEffect(() => {
    const projectId = project.id;
    if (!projectId || projectId === 'default-project') return;

    const projectRef = doc(db, 'projects', projectId);
    const unsubscribe = onSnapshot(projectRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // console.log("[ProjectSync] Metadata received:", data);

        setProject(prev => {
          // EXCLUDE 'items' from metadata sync. Items are handled by subcollection listener.
          const { items, ...restData } = data;

          const newProject = {
            ...prev,
            ...restData,
            id: projectId
          };

          // Deep equality check to prevent loops/re-renders
          if (JSON.stringify(prev) === JSON.stringify(newProject)) {
            return prev;
          }
          console.log("[ProjectSync] Project updated (content changed)");
          return newProject;
        });
      }
    });

    return () => unsubscribe();
  }, [project.id]);

  // Sync Project Items (Subcollection)
  useEffect(() => {
    const projectId = project.id;
    if (!projectId || projectId === 'default-project') return;

    const itemsRef = collection(db, 'projects', projectId, 'items');
    const unsubscribe = onSnapshot(itemsRef, (snapshot) => {
      const newItems: ConsumableItem[] = [];
      snapshot.forEach(doc => {
        newItems.push({ id: doc.id, ...doc.data() } as ConsumableItem);
      });

      setProject(prev => {
        // Simple equality check to avoid render loop
        if (prev.items.length === newItems.length && JSON.stringify(prev.items) === JSON.stringify(newItems)) {
          return prev;
        }
        return { ...prev, items: newItems };
      });
    }, (err) => {
      console.error("[ProjectSync] Items Sync Error:", err);
    });

    return () => unsubscribe();
  }, [project.id]);

  const updateProjectDetails = async (updates: Partial<Project>) => {
    try {
      const projectId = project.id;
      if (!projectId || projectId === 'default-project') return;

      // EXCLUDE types 'items' to prevent overwriting subcollection with potentially stale array
      const { items, ...safeUpdates } = updates;

      const projectRef = doc(db, 'projects', projectId);
      // Optimistic update
      setProject(prev => ({ ...prev, ...safeUpdates }));

      await setDoc(projectRef, safeUpdates, { merge: true });
      console.log("[ProjectSync] Updated successfully:", safeUpdates);
    } catch (err: any) {
      console.error("[ProjectSync] Error updating project:", err);
    }
  };

  const updateEcoprodChecklist = async (checklist: Record<string, boolean>) => {
    try {
      const projectId = project.id;
      if (!projectId || projectId === 'default-project') return;

      // Sanitize checklist to remove keys with dots (Firestore crash prevention)
      const sanitizedChecklist = Object.fromEntries(
        Object.entries(checklist).map(([k, v]) => [k.replace(/\./g, '_'), v])
      );

      const projectRef = doc(db, 'projects', projectId);

      // Optimistic
      setProject(prev => ({ ...prev, ecoprodChecklist: sanitizedChecklist }));

      await setDoc(projectRef, { ecoprodChecklist: sanitizedChecklist }, { merge: true });
    } catch (err: any) {
      console.error("Error updating Ecoprod checklist:", err);
      // Don't set global error to avoid blocking UI, just log
      // setError(`Erreur sauvegarde audit: ${err.message}`);
    }
  };

  // Notification State locals removed


  // unreadSocialCount moved to SocialContext
  // unreadMarketplaceCount moved to MarketplaceContext

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

  // FSC: Sync Call Sheets
  useEffect(() => {
    const projectId = project.id;
    if (!projectId || projectId === 'default-project') return;

    const callSheetsRef = collection(db, 'projects', projectId, 'callSheets');
    // Sort by target date descending (closest future/recent past first, or purely chronological?)
    // Usually next day's call sheet is most important. 
    // User likely wants "most recent" relevant one.
    // Let's sort by date desc for now.
    const q = query(callSheetsRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sheets: CallSheet[] = [];
      snapshot.forEach(doc => {
        sheets.push({ id: doc.id, ...doc.data() } as CallSheet);
      });
      setCallSheets(sheets);
    }, (err) => {
      console.error("[CallSheets] Sync Error:", err);
    });

    return () => unsubscribe();
  }, [project.id]);

  const addCallSheet = async (sheet: CallSheet) => {
    try {
      const projectId = project.id;
      const { id, ...data } = sheet;
      const colRef = collection(db, 'projects', projectId, 'callSheets');
      await addDoc(colRef, { ...data, timestamp: new Date() });

      addNotification(
        `Nouvelle feuille de service disponible pour le ${new Date(sheet.date).toLocaleDateString()}`,
        'INFO',
        'PRODUCTION'
      );
    } catch (err: any) {
      console.error("Error adding call sheet:", err);
      throw err;
    }
  };

  const deleteCallSheet = async (sheetId: string, url?: string) => {
    try {
      const projectId = project.id;
      if (!projectId || projectId === 'default-project') return;

      // 1. Delete from Firestore
      const docRef = doc(db, 'projects', projectId, 'callSheets', sheetId);
      await deleteDoc(docRef);

      // 2. Delete from Storage (if URL provided)
      if (url) {
        try {
          const storage = getStorage();
          const fileRef = ref(storage, url);
          await deleteObject(fileRef);
          console.log("[CallSheet] File deleted from storage");
        } catch (storageErr) {
          console.warn("[CallSheet] Storage file deletion failed (might be already gone or permission issue):", storageErr);
          // Don't fail the whole operation if file delete fails, just log
        }
      }

      addNotification("Feuille de service supprimée", "INFO", "PRODUCTION");

    } catch (err: any) {
      console.error("Error deleting call sheet:", err);
      setError(`Erreur suppression: ${err.message}`);
      throw err;
    }
  };



  // Firestore Actions
  const addItem = async (item: ConsumableItem) => {
    try {
      const projectId = project.id;
      console.log(`[AddItem] Starting add to ${projectId}`);
      setLastLog(`[AddItem] Envoi en cours vers ${projectId}...`);

      const itemsRef = collection(db, 'projects', projectId, 'items');
      // Remove id if present to let Firestore generate one
      const { id, ...itemData } = item;

      // Default surplusAction
      if (!itemData.surplusAction) {
        itemData.surplusAction = SurplusAction.NONE;
      }

      // Sanitize undefined values just in case
      const sanitizedData = Object.fromEntries(
        Object.entries(itemData).map(([k, v]) => [k, v === undefined ? null : v])
      );

      await addDoc(itemsRef, sanitizedData);

      setLastLog(`[AddItem] SUCCÈS ! Ajouté dans ${projectId}`);
      console.log(`[AddItem] Success`);

      // Notification Logic: If not purchased (Request) -> Regie. If purchased (Stock) -> Silent/Dept
      if (!itemData.purchased) {
        addNotification(
          `Nouvelle demande : ${item.name} (${item.department})`,
          'INFO',
          Department.REGIE
        );
      } else {
        /* Silenced Stock Move
        addNotification(
          `Nouvel article ajouté : ${item.name}`,
          'INFO',
          item.department
        );
        */
      }
    } catch (err: any) {
      console.error("[AddItem] Error:", err);
      setLastLog(`[AddItem] ERREUR: ${err.message}`);
      setError(`Erreur d'ajout : ${err.message}`);
    }
  };

  // getGlobalMarketplaceItems moved to MarketplaceContext

  const updateItem = async (item: Partial<ConsumableItem> & { id: string }) => {
    if (!item.id) return;
    const projectId = project.id;
    const itemRef = doc(db, 'projects', projectId, 'items', item.id);
    const { id, ...itemData } = item;
    await updateDoc(itemRef, itemData);
  };

  const deleteItem = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, 'projects', project.id, 'items', itemId));
      setProject(prev => ({
        ...prev,
        items: prev.items.filter(i => i.id !== itemId)
      }));
      addNotification('Article supprimé', 'SUCCESS', currentDept as Department);
    } catch (error: any) {
      console.error("Error deleting item:", error);
      addNotification("Erreur lors de la suppression", 'ERROR');
    }
  };



  // Catalog Logic moved to MarketplaceContext

  // --- Legacy Local State Actions (To be migrated) ---

  // BuyBack Logic moved to MarketplaceContext

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

  // Auth State Listener removed (handled by AuthContext)

  // refreshUser, register, resendVerification, login removed (handled by AuthContext)


  const joinProject = async (prod: string, film: string, start?: string, end?: string, type?: string, convention?: string) => {
    try {
      if (!user) return; // auth.currentUser check implicte in user

      const projectId = generateProjectId(prod, film);
      const projectRef = doc(db, 'projects', projectId);

      // Check if project exists to merge or create
      const projectSnap = await getDoc(projectRef);
      const projectData: any = {
        name: `${prod} - ${film}`,
        productionCompany: prod,
        filmTitle: film, // Store film title separately
        lastAccess: new Date().toISOString()
      };
      if (start) projectData.shootingStartDate = start;
      if (end) projectData.shootingEndDate = end;
      if (type) projectData.projectType = type;
      if (convention) projectData.convention = convention;

      if (!projectSnap.exists()) {
        await setDoc(projectRef, {
          ...DEFAULT_PROJECT,
          ...projectData,
          id: projectId,
          items: []
        });
      } else {
        await setDoc(projectRef, projectData, { merge: true });
      }

      // 1. Update Local Project State
      setProject(prev => ({
        ...prev,
        ...projectData,
        id: projectId,
        items: (prev.id === projectId) ? prev.items : []
      }));

      const newHistoryItem: ProjectSummary = {
        id: projectId,
        productionName: prod,
        filmTitle: film,
        lastAccess: new Date().toISOString()
      };

      const currentHistory = user.projectHistory || [];
      const updatedHistory = [newHistoryItem, ...currentHistory.filter(p => p.id !== projectId)];

      // 2. Update User via AuthContext
      await updateUser({
        productionName: prod,
        filmTitle: film,
        startDate: start || user.startDate,
        endDate: end || user.endDate,
        projectType: type || user.projectType,
        convention: convention || user.convention, // Persist convention
        currentProjectId: projectId,
        projectHistory: updatedHistory
      });

      addNotification(`Bienvenue sur le plateau de "${film}" !`, 'INFO', user.department);

    } catch (err) {
      console.error("Join Project Error", err);
    }
  };

  const leaveProject = async () => {
    if (!user) return;

    // 1. Reset Local Project State
    setProject(DEFAULT_PROJECT);

    // 2. Clear persisted project info in User Profile
    await updateUser({
      productionName: '',
      filmTitle: '',
      startDate: null as any, // Cast because Partial<User> expects undefined or Date? User type for date is string|null?
      endDate: null as any,
      currentProjectId: null as any
    });
  };

  const deleteProject = async (projectId: string) => {
    if (!user) return;

    // Safety check: Only romperset@gmail.com can delete
    if (user.email !== 'romperset@gmail.com') {
      throw new Error("Action non autorisée");
    }

    try {
      console.log(`[deleteProject] Deleting project: ${projectId}`);

      // DEEP CLEAN: Delete all subcollections explicitly
      // Note: Firestore does not cascade delete. We must delete documents manually.
      // We skip 'catalog' as it's a root collection, so it naturally remains.

      const SUBCOLLECTIONS = [
        'items',
        'timeLogs',
        'notifications',
        'socialPosts',
        'logistics',
        'expenses',
        'buyBackItems',
        'callSheets'
      ];

      for (const subCol of SUBCOLLECTIONS) {
        console.log(`[deleteProject] Cleaning subcollection: ${subCol}`);
        const subRef = collection(db, 'projects', projectId, subCol);
        const snap = await getDocs(subRef);

        const deletePromises = snap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
      }

      // 1. Delete Project Document
      const projectRef = doc(db, 'projects', projectId);
      await deleteDoc(projectRef);

      // 2. Remove from Current User History (Admin)
      const currentHistory = user.projectHistory || [];
      const updatedHistory = currentHistory.filter(p => p.id !== projectId);

      const userUpdates: Partial<User> = {
        projectHistory: updatedHistory
      };

      // If we are currently ON this project, force switch to default and clear User metadata
      if (project.id === projectId) {
        setProject(DEFAULT_PROJECT);

        if (user.filmTitle === project.name && user.productionName === project.productionCompany) {
          userUpdates.productionName = '';
          userUpdates.filmTitle = '';
          userUpdates.startDate = null as any;
          userUpdates.endDate = null as any;
          userUpdates.projectType = null;
        }
      }

      await updateUser(userUpdates);

      // addNotification("Projet supprimé définitivement", "SUCCESS", "PRODUCTION");

    } catch (err: any) {
      console.error("[deleteProject] Error:", err);
      throw err;
    }
  };

  const removeProjectFromHistory = async (projectId: string) => {
    if (!user) return;

    try {
      const currentHistory = user.projectHistory || [];
      const updatedHistory = currentHistory.filter(p => p.id !== projectId);

      const userRef = doc(db, 'users', user.id);

      // Update via AuthContext helper if possible, or direct update
      // Since user.id is available, direct update is fine but better to use updateUser if it supports overwriting history?
      // updateUser helper takes Partial<User>.
      await updateUser({ projectHistory: updatedHistory });

    } catch (err: any) {
      console.error("[removeProjectFromHistory] Error:", err);
      throw err;
    }
  };

  const deleteAllData = async () => {
    if (!user) return;
    if (user.email !== 'romperset@gmail.com') {
      throw new Error("Action réservée à l'administrateur suprême.");
    }

    try {
      console.log("⚠️ STARTING GLOBAL RESET ⚠️");
      // addNotification("Réinitialisation globale en cours...", "WARNING", "PRODUCTION");

      // 1. DELETE ALL PROJECTS
      const projectsSnap = await getDocs(collection(db, 'projects'));
      console.log(`Found ${projectsSnap.size} projects to delete.`);

      for (const pDoc of projectsSnap.docs) {
        await deleteProject(pDoc.id); // Re-use existing robust logic
      }

      // 2. DELETE ALL TRANSACTIONS
      const transactionsSnap = await getDocs(collection(db, 'transactions'));
      console.log(`Found ${transactionsSnap.size} transactions to delete.`);
      const transactionPromises = transactionsSnap.docs.map(tDoc => deleteDoc(tDoc.ref));
      await Promise.all(transactionPromises);

      // 3. CLEAN ALL USERS (Project History & Current Project)
      // We process ALL users to remove ghosts
      const usersSnap = await getDocs(collection(db, 'users'));
      console.log(`Cleaning profiles for ${usersSnap.size} users.`);

      const userUpdates = usersSnap.docs.map(async (uDoc) => {
        // Reset project fields but KEEP profile data (name, email, role, etc.)
        await updateDoc(uDoc.ref, {
          productionName: '',
          filmTitle: '',
          startDate: null,
          endDate: null,
          projectType: null,
          currentProjectId: null,
          projectHistory: [] // Clear history
        });
      });
      await Promise.all(userUpdates);

      // 4. Force Local State Reset
      setProject(DEFAULT_PROJECT);
      await updateUser({
        productionName: '',
        filmTitle: '',
        startDate: undefined,
        endDate: undefined,
        currentProjectId: undefined,
        projectHistory: []
      });

      // addNotification("Système remis à zéro avec succès.", "SUCCESS", "PRODUCTION");
      console.log("✅ GLOBAL RESET COMPLETED");

    } catch (err: any) {
      console.error("FATAL ERROR during Global Reset:", err);
      setError(`ECHEC RESET: ${err.message}`);
      throw err;
    }
  };



  // logout removed (handled by AuthContext)

  // 3. Sync Notifications
  // Notification Methods (Direct Firestore Access to avoid Circular Dependency)
  const addNotification = async (message: string, type: Notification['type'], target: Department | 'PRODUCTION' = 'PRODUCTION', itemId?: string) => {
    try {
      const projectId = project.id;
      if (!projectId || projectId === 'default-project') return;
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
    try {
      const projectId = project.id;
      const notifRef = doc(db, 'projects', projectId, 'notifications', id);
      await updateDoc(notifRef, { read: true });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const markAllAsRead = async (notificationIds: string[]) => {
    try {
      const projectId = project.id;
      const batchUpdates = notificationIds.map(id => {
        const notifRef = doc(db, 'projects', projectId, 'notifications', id);
        return updateDoc(notifRef, { read: true });
      });
      await Promise.all(batchUpdates);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const clearAllNotifications = async () => {
    try {
      // Cannot clear locally efficiently without state, but can delete all from DB?
      // For safety/complexity, let's leave this as a no-op or simple warn in ProjectContext
      // and force users to use NotificationContext for bulk management.
      // actually, we can just fetch and delete?
      console.warn("clearAllNotifications in ProjectContext is deprecated. Use NotificationContext.");
    } catch (err: any) {
      console.error("Error clearing notifications:", err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const projectId = project.id;
      const notifRef = doc(db, 'projects', projectId, 'notifications', id);
      await deleteDoc(notifRef);
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const markNotificationAsReadByItemId = async (itemId: string) => {
    // We can't query state here easily. So we do a Firestore Query.
    try {
      const projectId = project.id;
      const notifsRef = collection(db, 'projects', projectId, 'notifications');
      const q = query(notifsRef, where('itemId', '==', itemId), where('read', '==', false));
      const snap = await getDocs(q);

      const updatePromises = snap.docs.map(doc => updateDoc(doc.ref, { read: true }));
      await Promise.all(updatePromises);
    } catch (err) {
      console.error("Failed to mark notifications as read by item:", err);
    }
  };

  // 5. Sync Expense Reports
  useEffect(() => {
    const projectId = project.id;
    if (!projectId || projectId === 'default-project') return;

    const expensesRef = collection(db, 'projects', projectId, 'expenses');
    const q = query(expensesRef, orderBy('date', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reports: ExpenseReport[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        reports.push({
          id: doc.id,
          ...data
        } as ExpenseReport);
      });
      setExpenseReports(reports);
    }, (err) => {
      console.error("[ExpenseSync] Sync Error:", err);
    });

    return () => unsubscribe();
  }, [project.id]);

  const addExpenseReport = async (report: ExpenseReport & { receiptFile?: File }) => {
    try {
      const projectId = project.id;
      const reportRef = doc(db, 'projects', projectId, 'expenses', report.id);

      // Extract file and properties
      const { id, receiptFile, ...reportData } = report;
      let finalReportData: any = { ...reportData };

      // Handle File Upload if present
      if (receiptFile) {
        try {
          const storage = getStorage();
          const storageRef = ref(storage, `projects/${projectId}/expenses/${report.id}/${receiptFile.name}`);
          const snapshot = await uploadBytes(storageRef, receiptFile);
          const downloadURL = await getDownloadURL(snapshot.ref);

          finalReportData.receiptUrl = downloadURL;
          console.log("Receipt uploaded to:", downloadURL);
        } catch (uploadErr) {
          console.error("Error uploading receipt:", uploadErr);
          // Continue saving report even if image upload fails, but warn user via notification?
          // For now, just log.
        }
      }

      // Recursive Deep Sanitization Helper
      const sanitizeData = (data: any): any => {
        if (data === undefined) return null;
        if (data === null) return null;
        if (data instanceof Date) return data; // Preserve Dates
        if (Array.isArray(data)) return data.map(sanitizeData);
        if (typeof data === 'object') {
          const sanitized: any = {};
          for (const [key, value] of Object.entries(data)) {
            sanitized[key] = sanitizeData(value);
          }
          return sanitized;
        }
        return data;
      };

      const sanitizedData = sanitizeData(finalReportData);

      await setDoc(reportRef, sanitizedData);

      addNotification(
        `Nouvelle note de frais de ${report.submittedBy} (${report.amountTTC.toFixed(2)}€)`,
        'INFO',
        'PRODUCTION'
      );
    } catch (err: any) {
      console.error("Error adding expense report:", err);
      setError(`Erreur sauvegarde note de frais: ${err.message}`);
      throw err;
    }
  };

  const updateExpenseReportStatus = async (id: string, status: ExpenseStatus) => {
    try {
      const projectId = project.id;
      const reportRef = doc(db, 'projects', projectId, 'expenses', id);
      await updateDoc(reportRef, { status });
    } catch (err: any) {
      console.error("Error updating expense status:", err);
      setError(`Erreur mise à jour status: ${err.message}`);
    }
  };

  const deleteExpenseReport = async (reportId: string, receiptUrl?: string) => {
    try {
      const projectId = project.id;
      if (!projectId || projectId === 'default-project') return;

      console.log(`[Expenses] Deleting report: ${reportId}`);

      // 1. Delete Firestore Document
      const reportRef = doc(db, 'projects', projectId, 'expenses', reportId);
      await deleteDoc(reportRef);

      // 2. Delete Receipt from Storage if exists
      if (receiptUrl && receiptUrl.includes('firebase')) {
        try {
          const storage = getStorage();
          const imageRef = ref(storage, receiptUrl);
          await deleteObject(imageRef);
          console.log("[Expenses] Receipt deleted from storage");
        } catch (storageErr) {
          console.warn("[Expenses] Failed to delete receipt from storage:", storageErr);
        }
      }

      console.log("[Expenses] Report deleted successfully");
      addNotification("Note de frais supprimée", "INFO", "PRODUCTION");

    } catch (err: any) {
      console.error("Error deleting expense report:", err);
      setError(`Erreur suppression note de frais: ${err.message}`);
      throw err;
    }
  };

  // --- User Templates ---
  const saveUserTemplate = async (name: string, items: any[], type: 'CONSUMABLE' | 'MATERIAL' = 'CONSUMABLE') => {
    if (!user?.id) throw new Error("Utilisateur non connecté");

    const newTemplate: UserTemplate = {
      id: `template_${Date.now()}`,
      userId: user.id, // Fixed: Use user.id to match getUserTemplates query
      name,
      department: currentDept as any,
      items: items.map(i => ({
        name: i.name,
        quantity: i.quantityCurrent || i.quantity || 0,
        unit: i.unit || 'unités'
      })),
      type, // Added
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'user_templates', newTemplate.id), newTemplate);
    addNotification(`Modèle "${name}" sauvegardé !`, 'SUCCESS', currentDept as any);
  };

  const getUserTemplates = async (): Promise<UserTemplate[]> => {
    if (!user?.id) return [];
    const q = query(collection(db, 'user_templates'), where('userId', '==', user.id));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as UserTemplate);
  };

  const deleteUserTemplate = async (templateId: string) => {
    if (!user?.id) return;
    await deleteDoc(doc(db, 'user_templates', templateId));
    addNotification("Modèle supprimé.", 'INFO');
  };


  // 2. Sync Social Posts
  useEffect(() => {
    const projectId = project.id;
    console.log(`[SocialWall] Init listener for project: ${projectId}`);

    if (!projectId || projectId === 'default-project') return;

    const postsRef = collection(db, 'projects', projectId, 'socialPosts');
    const q = query(postsRef, orderBy('date', 'desc'), limit(50));

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
      // setSocialPosts(posts); // REMOVED
      console.log('Social posts synced (handled by SocialContext)');
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
      // alert(`Erreur d'envoi : ${err.message}`);
    }
  };

  // deleteSocialPost moved to SocialContext

  // 4. Sync User Profiles (Team Members)
  // TeamSync removed (handled by AuthContext)



  // --- LOGISTICS IMPL ---
  const addLogisticsRequest = async (request: LogisticsRequest) => {
    const currentInfo = project.logistics || [];
    const newLogistics = [...currentInfo, request];

    // Trigger Notification - ALWAYS.
    // Even if Production creates it, we want a record/alert for others (Régie) or just confirmation.
    addNotification(
      `Demande transport (${request.type}) pour ${request.department} le ${new Date(request.date).toLocaleDateString()}`,
      'INFO',
      'PRODUCTION' // Target: Production/Régie usually handle this.
    );

    await updateProjectDetails({ logistics: newLogistics });
  };

  const deleteLogisticsRequest = async (requestId: string) => {
    const currentInfo = project.logistics || [];
    const newLogistics = currentInfo.filter(r => r.id !== requestId);
    await updateProjectDetails({ logistics: newLogistics });
  };

  const searchProjects = async (queryStr: string): Promise<Project[]> => {
    if (!queryStr || queryStr.length < 2) return [];

    // Simple client-side filtering for now or simple query
    // Firestore lacks partial text search natively (needs third party like Algolia).
    // Workaround: We query ALL projects (if list is small) or use startAt/endAt

    const projectsRef = collection(db, 'projects');
    const q = query(projectsRef, orderBy('productionCompany'));
    // Optimization: In a real large app we would needs specific indexing

    try {
      // Fetching all for client-side filtering (assuming < 1000 projects for now)
      // This is safe for MVP.
      const snapshot = await getDocs(q); // Using getDocs (need to import)
      // Wait, I need to check if getDocs is imported. It usually is.
      // Actually checking imports... getDoc is there, getDocs might not be.

      const results: Project[] = [];
      snapshot.forEach(doc => {
        const data = doc.data() as Project;
        // Filter locally
        if (data.productionCompany?.toLowerCase().includes(queryStr.toLowerCase()) ||
          data.name?.toLowerCase().includes(queryStr.toLowerCase())) {
          results.push({ ...data, id: doc.id });
        }
      });
      return results;
    } catch (e) {
      console.error("Search Error", e);
      return [];
    }
  };

  // updateUserProfile, deleteUser, and updateUser removed (handled by useAuth)
  // Social Logic Removed
  const unreadSocialCount = 0;

  const unreadCount = project.items.filter(i =>
    !i.purchased &&
    (
      ((currentDept === 'PRODUCTION' || currentDept === 'Régie' || currentDept === 'REGIE') ? true : i.department === currentDept)
    )
  ).length;

  const value = React.useMemo(() => ({
    project,
    setProject,
    updateProjectDetails,
    updateEcoprodChecklist,
    joinProject,
    leaveProject,
    deleteProject, // Added
    removeProjectFromHistory, // Added
    addItem,
    // getGlobalMarketplaceItems moved to MarketplaceContext
    updateItem,
    deleteItem,
    currentDept,
    setCurrentDept,
    circularView,
    setCircularView,
    user,
    updateUser, // Added
    login,
    register,
    resendVerification,
    refreshUser, // Added
    resetPassword,
    logout,
    notifications: [], // Deprecated: Consumers should use useNotification()
    addNotification,
    markAsRead,
    deleteNotification,
    markAllAsRead,
    markNotificationAsReadByItemId,
    clearAllNotifications,
    unreadCount,
    unreadSocialCount,
    // unreadMarketplaceCount moved
    unreadNotificationCount: 0, // Deprecated: Consumers should use useNotification()
    // markSocialAsRead moved
    // markMarketplaceAsRead moved
    expenseReports,
    addExpenseReport,
    updateExpenseReportStatus,
    deleteExpenseReport, // Added
    addCallSheet,
    deleteCallSheet, // Added

    // Marketplace & Catalog Logic moved to MarketplaceContext

    // Logistics
    addLogisticsRequest,
    deleteLogisticsRequest,
    searchProjects, // Added
    deleteUser, // Added
    deleteAllData, // Added Global Reset

    userProfiles,
    updateUserProfile,
    language,
    setLanguage,
    t,
    error,
    testConnection,
    debugStatus,
    lastLog,
    callSheets, // Exposed

    // Templates
    saveUserTemplate,
    getUserTemplates,
    deleteUserTemplate
  }), [
    project,
    currentDept,
    circularView,
    user,
    callSheets, // Include in dependency array
    unreadCount,
    unreadCount,
    unreadSocialCount,
    expenseReports,
    // Functions are stable or should be assumed stable if defined outside or via useCallback (most aren't but this is a start)
  ]);

  return (
    <ProjectContext.Provider value={value}>
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
