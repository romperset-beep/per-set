import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext'; // Added

import {
  Project,
  User,
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
  UserTemplate, // Added
  OfflineMember, // Added
  Reinforcement // Added
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
  where, // Added
  startAfter, // Added
  QueryDocumentSnapshot,
  DocumentData
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
  error: string | null;

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
  joinProject: (prod: string, film: string, start?: string, end?: string, type?: string, convention?: string, features?: Record<string, boolean>) => Promise<void>;
  leaveProject: () => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  removeProjectFromHistory: (projectId: string) => Promise<void>; // Added

  logout: () => Promise<void>;

  // Notifications handled by NotificationContext
  unreadCount: number;
  itemsToReceiveCount: number; // Added

  // Expense Reports
  expenseReports: ExpenseReport[];
  addExpenseReport: (report: ExpenseReport & { receiptFile?: File }) => Promise<void>;
  updateExpenseReportStatus: (id: string, status: ExpenseStatus) => void;
  deleteExpenseReport: (reportId: string, receiptUrl?: string) => Promise<void>; // Added

  userProfiles: UserProfile[];
  updateUserProfile: (profile: UserProfile) => void;

  // Pagination
  hasMoreItems: boolean;
  loadMoreItems: () => Promise<void>;

  // Personal Templates
  saveUserTemplate: (name: string, items: Partial<ConsumableItem>[], type?: 'CONSUMABLE' | 'MATERIAL') => Promise<void>;
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
  deleteMyAccount: () => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  deleteAllData: () => Promise<void>;
  addReinforcement: (reinforcement: Reinforcement) => Promise<void>; // Added
  updateReinforcement: (reinforcement: Reinforcement) => Promise<void>; // Added
  deleteReinforcement: (id: string) => Promise<void>; // Added

  // Logistics
  // Deprecated: logistics moved to LogisticsContext

  // Deprecated: offline members and team logic moved to TeamContext
}

const DEFAULT_PROJECT: Project = {
  id: 'default-project',
  name: 'Per-Set Demo',
  productionCompany: 'Horizon Productions',
  startDate: '2023-10-15',
  shootingStartDate: '2023-11-01',
  shootingEndDate: '2023-12-20',
  projectType: 'Long Métrage',
  status: 'Shooting',
  items: [],
  members: {} // Init empty
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
    deleteMyAccount
  } = useAuth();

  // useNotification removed to avoid circular dependency
  // We will re-implement direct Firestore writes for addNotification/etc 
  // to maintain backward compatibility for actions, but READS must use useNotification() in components.

  // Persist user logic removed (handled by AuthContext)

  const [project, setProject] = useState<Project>(DEFAULT_PROJECT);
  const [_currentDept, _setCurrentDept] = useState<string>('PRODUCTION');

  // Initialize currentDept to user's department on login
  useEffect(() => {
    if (user?.department) {
      console.log('🔐 Initializing department view:', user.department);
      _setCurrentDept(user.department);
    }
  }, [user?.department]);

  // Wrapper for setCurrentDept that enforces permissions
  const setCurrentDept = useCallback((dept: string) => {
    // Only Production and Régie can change department view
    if (user?.department !== 'PRODUCTION' && user?.department !== Department.REGIE) {
      console.warn('🚫 Permission denied: only Production/Régie can change department view');
      return;
    }
    console.log('✅ Department view changed to:', dept);
    _setCurrentDept(dept);
  }, [user?.department]);

  // Expose currentDept as read-only for non-privileged users
  const currentDept = _currentDept;
  const [circularView, setCircularView] = useState<'overview' | 'marketplace' | 'donations' | 'shortFilm' | 'sales_abs' | 'storage'>('overview');
  // notifications state removed (handled by NotificationContext)
  const [expenseReports, setExpenseReports] = useState<ExpenseReport[]>([]);
  const [language, setLanguage] = useState<Language>('fr');
  // buyBackItems and catalogItems moved to MarketplaceContext
  const [callSheets, setCallSheets] = useState<CallSheet[]>([]);
  // userProfiles state removed (handled by AuthContext)
  const [offlineMembers, setOfflineMembers] = useState<OfflineMember[]>([]); // Added

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
          // CRITICAL FIX: Prevent race condition if user left project
          if (prev.id !== projectId) return prev;

          // EXCLUDE subcollection-managed data from metadata sync.
          // Items, logistics, and reinforcements are handled by their own subcollection listeners.
          const { items, logistics, reinforcements, ...restData } = data;

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

  // Sync Project Items with Pagination
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData, DocumentData> | null>(null);
  const [hasMoreItems, setHasMoreItems] = useState(true);
  const ITEMS_PER_PAGE = 50;

  const loadMoreItems = useCallback(async () => {
    if (!project.id || project.id === 'default-project' || !hasMoreItems) return;

    try {
      let q = query(
        collection(db, 'projects', project.id, 'items'),
        orderBy('name'),
        limit(ITEMS_PER_PAGE)
      );

      if (lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const newItems: ConsumableItem[] = [];
        snapshot.forEach(doc => {
          newItems.push({ id: doc.id, ...doc.data() } as ConsumableItem);
        });

        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);

        setProject(prev => {
          // Avoid duplicates
          const existingIds = new Set(prev.items.map(i => i.id));
          const filteredNewItems = newItems.filter(i => !existingIds.has(i.id));
          return { ...prev, items: [...prev.items, ...filteredNewItems] };
        });

        if (snapshot.docs.length < ITEMS_PER_PAGE) {
          setHasMoreItems(false);
        }
      } else {
        setHasMoreItems(false);
      }
    } catch (error) {
      console.error("Error loading more items:", error);
    }
  }, [project.id, lastVisible, hasMoreItems]);

  // Initial Load Listener (First batch + Realtime updates for visible items)
  useEffect(() => {
    const projectId = project.id;
    if (!projectId || projectId === 'default-project') return;

    setHasMoreItems(true);
    setLastVisible(null);

    // Listener on first batch for realtime updates
    const itemsRef = collection(db, 'projects', projectId, 'items');
    const q = query(itemsRef, orderBy('name'), limit(ITEMS_PER_PAGE));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newItems: ConsumableItem[] = [];
      snapshot.forEach(doc => {
        newItems.push({ id: doc.id, ...doc.data() } as ConsumableItem);
      });

      if (!snapshot.empty) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      }

      setProject(prev => {
        // CRITICAL FIX: Prevent race condition if user left project
        if (prev.id !== projectId) return prev;

        // This listener only handles the FIRST PAGE updates. 
        // For proper realtime pagination, complex logic is needed.
        // For MVP: We replace current items with first page, user needs to 'load more' to see rest.
        // OR we only listen to changes?

        // Simplified approach: Listener updates efficiently, pagination appends.
        // But realtime updates on appended items won't be caught by THIS listener.
        // Recommendation: For large lists in realtime apps, maybe drop realtime for 'Load More' lists
        // or listen to ALL (expensive) or use specialized libraries.

        // Current: Realtime for top 50. Static for rest until reload?
        // Safety: Let's keep existing logic for now but add limit().
        // Wait, previous logic downloaded EVERYTHING.

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
    } catch (err: unknown) {
      console.error("[ProjectSync] Error updating project:", err);
      throw err; // Re-throw to allow caller to handle error
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
    } catch (err: unknown) {
      console.error("Error updating Ecoprod checklist:", err);
      // Don't set global error to avoid blocking UI, just log
      // setError(`Erreur sauvegarde audit: ${err instanceof Error ? err.message : String(err)}`);
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
    } catch (restErr: unknown) {
      setDebugStatus(`ÉCHEC RÉSEAU REST ❌: ${restErr instanceof Error ? restErr.message : String(restErr)}`);
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
    } catch (err: unknown) {
      console.error("SDK Error:", err);
      setDebugStatus(`REST OK mais SDK ÉCRITURE ÉCHEC : ${err instanceof Error ? err.message : String(err)}`);
      setError(err instanceof Error ? err.message : String(err));
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
      setError(err instanceof Error ? err.message : String(err));
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
    } catch (err: unknown) {
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

    } catch (err: unknown) {
      console.error("Error deleting call sheet:", err);
      setError(`Erreur suppression: ${err instanceof Error ? err.message : String(err)}`);
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

      // Validation Logic
      // If purchased (stock) -> validated by default
      // If request -> check settings. If validation required -> false, else true
      if (itemData.purchased) {
        itemData.isValidated = true;
      } else {
        const requireValidation = project.settings?.requireOrderValidation ?? false;
        itemData.isValidated = !requireValidation;
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
    } catch (err: unknown) {
      console.error("[AddItem] Error:", err);
      setLastLog(`[AddItem] ERREUR: ${err instanceof Error ? err.message : String(err)}`);
      setError(`Erreur d'ajout : ${err instanceof Error ? err.message : String(err)}`);
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
    } catch (error: unknown) {
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


  const joinProject = async (prod: string, film: string, start?: string, end?: string, type?: string, convention?: string, features?: Record<string, boolean>) => {
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
      if (features) projectData.features = features;

      // CRITICAL FIX: Add user to members map for Firestore security rules
      // Without this, isMemberOfProject() returns false and user can't access project
      if (!projectSnap.exists()) {
        await setDoc(projectRef, {
          ...DEFAULT_PROJECT,
          ...projectData,
          id: projectId,
          items: [],
          members: {
            [user.id]: true  // Add current user as member
          }
        });
      } else {
        // Merge and ensure user is added to members
        await setDoc(projectRef, {
          ...projectData,
          members: {
            ...(projectSnap.data()?.members || {}),
            [user.id]: true  // Add current user as member
          }
        }, { merge: true });
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

    } catch (err: unknown) {
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

    } catch (err: unknown) {
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
        startDate: null as any,
        endDate: null as any,
        currentProjectId: null as any,
        projectHistory: []
      });

      // addNotification("Système remis à zéro avec succès.", "SUCCESS", "PRODUCTION");
      console.log("✅ GLOBAL RESET COMPLETED");

    } catch (err: unknown) {
      console.error("FATAL ERROR during Global Reset:", err);
      setError(`ECHEC RESET: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  };



  // logout removed (handled by AuthContext)

  // 3. Sync Notifications
  // Notification Methods (Direct Firestore Access to avoid Circular Dependency)
  const addNotification = async (message: string, type: string, target: Department | 'PRODUCTION' = 'PRODUCTION', itemId?: string) => {
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
    } catch (err: unknown) {
      console.error("Error adding expense report:", err);
      setError(`Erreur sauvegarde note de frais: ${err instanceof Error ? err instanceof Error ? err.message : String(err) : String(err)}`);
      throw err;
    }
  };

  const updateExpenseReportStatus = async (id: string, status: ExpenseStatus) => {
    try {
      const projectId = project.id;
      const reportRef = doc(db, 'projects', projectId, 'expenses', id);
      await updateDoc(reportRef, { status });
    } catch (err: unknown) {
      console.error("Error updating expense status:", err);
      setError(`Erreur mise à jour status: ${err instanceof Error ? err instanceof Error ? err.message : String(err) : String(err)}`);
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

    } catch (err: unknown) {
      console.error("Error deleting expense report:", err);
      setError(`Erreur suppression note de frais: ${err instanceof Error ? err instanceof Error ? err.message : String(err) : String(err)}`);
      throw err;
    }
  };

  // --- User Templates ---
  const saveUserTemplate = async (name: string, items: Partial<ConsumableItem>[], type: 'CONSUMABLE' | 'MATERIAL' = 'CONSUMABLE') => {
    if (!user?.id) throw new Error("Utilisateur non connecté");

    const newTemplate: UserTemplate = {
      id: `template_${Date.now()}`,
      userId: user.id, // Fixed: Use user.id to match getUserTemplates query
      name,
      department: currentDept as Department | 'PRODUCTION',
      items: items.map(i => ({
        name: i.name!,
        quantity: i.quantityCurrent || (i as any).quantity || 0,
        unit: i.unit || 'unités'
      })),
      type, // Added
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'user_templates', newTemplate.id), newTemplate);
    addNotification(`Modèle "${name}" sauvegardé !`, 'SUCCESS', currentDept as Department | 'PRODUCTION');
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
      setError(`Social Wall Sync Error: ${err instanceof Error ? err.message : String(err)}`);
    });

    return () => unsubscribe();
  }, [project.id]);

  // ------------------------------------------------------------------
  // 5. SYNC SUBCOLLECTIONS (Renforts)
  // Logistics moved to LogisticsContext
  // ------------------------------------------------------------------

  useEffect(() => {
    const projectId = project.id;
    if (!projectId || projectId === 'default-project') return;

    // A. SYNC REINFORCEMENTS
    const renfortsRef = collection(db, 'projects', projectId, 'reinforcements');
    const unsubRenforts = onSnapshot(renfortsRef, (snapshot) => {
      const reinforcements = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Reinforcement));
      setProject(prev => {
        if (prev.id !== projectId) return prev;
        if (JSON.stringify(prev.reinforcements) === JSON.stringify(reinforcements)) return prev;
        return { ...prev, reinforcements };
      });
    }, (error) => {
      console.error("[RenfortsSync] Error:", error);
    });

    return () => {
      unsubRenforts();
    };
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
    } catch (err: unknown) {
      console.error("[SocialWall] Add Error:", err);
      setError(`Erreur d'envoi : ${err instanceof Error ? err instanceof Error ? err.message : String(err) : String(err)}`);
      // alert(`Erreur d'envoi : ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // deleteSocialPost moved to SocialContext

  // 4. Sync User Profiles (Team Members)
  // TeamSync removed (handled by AuthContext)



  // --- LOGISTICS IMPL ---






  // AUTO-MIGRATION / BACKFILL (Run by Admin)
  useEffect(() => {
    const runBackfill = async () => {
      // Only run if:
      // 1. User is Admin (Hardcoded or verified field)
      // 2. Project is real
      // 3. Project has NO members yet (Migration needed)

      if (!user || user.email !== 'romperset@gmail.com') return;
      if (!project.id || project.id === 'default-project') return;

      // Check if members already exist
      if (project.members && Object.keys(project.members).length > 0) return;

      console.log("🔒 [Security] Starting Member Backfill for", project.id);
      addNotification("Sécurisation du projet en cours...", "INFO");

      try {
        // 1. Find all users who claim to be on this project
        const q = query(collection(db, 'users'), where('currentProjectId', '==', project.id));
        const snap = await getDocs(q);

        if (snap.empty) {
          console.log("No users found to backfill.");
          return;
        }

        const updates: Record<string, unknown> = {};

        snap.forEach(docSnap => {
          const uData = docSnap.data();
          const role = (uData.email === 'romperset@gmail.com') ? 'ADMIN' : 'USER';

          updates[`members.${docSnap.id}`] = {
            role,
            joinedAt: new Date().toISOString(),
            email: uData.email,
            name: uData.name
          };
        });

        // 2. Commit to Project
        const projectRef = doc(db, 'projects', project.id);
        await updateDoc(projectRef, updates); // Merge updates

        console.log(`🔒 [Security] Backfilled ${Object.keys(updates).length} members.`);
        addNotification("Projet sécurisé : Membres importés.", "SUCCESS");

      } catch (err) {
        console.error("Backfill failed", err);
      }
    };

    runBackfill();
  }, [project.id, user?.email /* Re-run if user/project changes */]);


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

  // SAFE DELETE USER (Admin capable)
  const deleteUser = async (userId: string) => {
    if (!user) return;
    try {
      console.log(`[ProjectContext] Safe deleting user: ${userId}`);
      // 1. Delete Firestore User Document
      await deleteDoc(doc(db, 'users', userId));

      // 2. Remove from Project Members if applicable
      // await removeMember(userId); // Optional but good practice

      // Note: usage of auth.currentUser.delete() is NOT POSSIBLE here for other users.
      // Admin SDK or Cloud Functions are required for that.
      // But removing the Firestore doc effectively removes them from the app logic.

      addNotification("Utilisateur supprimé (Données locales).", "INFO", "PRODUCTION");
    } catch (err: unknown) {
      console.error("[ProjectContext] Delete User Error:", err);
      throw err;
    }
  };

  // --- RENFORTS (Atomic Subcollection Updates) ---
  const addReinforcement = async (reinforcement: Reinforcement) => {
    const projectId = project.id;
    if (!projectId) return;

    // Use ID as doc ID to prevent duplicates/ensure idempotency
    const docRef = doc(db, 'projects', projectId, 'reinforcements', reinforcement.id);
    // Sanitize undefined values (Firestore rejects undefined)
    const sanitized = Object.fromEntries(
      Object.entries(reinforcement).filter(([_, v]) => v !== undefined)
    );
    await setDoc(docRef, sanitized, { merge: true });

    // Notification
    if (user?.department !== 'PRODUCTION' && reinforcement.department) {
      addNotification(
        `Nouveau Renfort planifié pour ${reinforcement.department}`,
        'INFO',
        'PRODUCTION'
      );
    }
  };

  const updateReinforcement = async (reinforcement: Reinforcement) => {
    const projectId = project.id;
    if (!projectId) return;
    const docRef = doc(db, 'projects', projectId, 'reinforcements', reinforcement.id);
    // Sanitize undefined values (Firestore rejects undefined)
    const sanitized = Object.fromEntries(
      Object.entries(reinforcement).filter(([_, v]) => v !== undefined)
    );
    await updateDoc(docRef, sanitized);
  };

  const deleteReinforcement = async (reinforcementId: string) => {
    const projectId = project.id;
    if (!projectId) return;
    await deleteDoc(doc(db, 'projects', projectId, 'reinforcements', reinforcementId));
  };



  const unreadCount = project.items.filter(i =>
    !i.purchased &&
    (
      ((currentDept === 'PRODUCTION' || currentDept === 'Régie' || currentDept === 'REGIE') ? true : i.department === currentDept)
    )
  ).length;

  const itemsToReceiveCount = project.items.filter(i =>
    i.isBought && i.department === currentDept
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
    itemsToReceiveCount, // Added
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
    unreadCount,
    unreadSocialCount,
    // unreadMarketplaceCount moved
    // markSocialAsRead moved
    // markMarketplaceAsRead moved
    expenseReports,
    addExpenseReport,
    updateExpenseReportStatus,
    deleteExpenseReport,

    addCallSheet,
    deleteCallSheet, // Added

    // Marketplace & Catalog Logic moved to MarketplaceContext

    // Logistics
    // Renforts
    addReinforcement,
    updateReinforcement,
    deleteReinforcement,



    searchProjects,
    deleteMyAccount,
    deleteUser,
    deleteAllData,
    // Pagination

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
    deleteUserTemplate,
    // Pagination
    hasMoreItems,
    loadMoreItems
  }), [
    project,
    currentDept,
    circularView,
    user,
    callSheets, // Include in dependency array
    offlineMembers, // Added
    unreadCount,
    itemsToReceiveCount, // Added
    unreadSocialCount,
    expenseReports,
    // Pagination
    hasMoreItems,
    loadMoreItems
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
