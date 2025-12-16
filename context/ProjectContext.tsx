import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

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
  LogisticsRequest // Added
} from '../types';
import { TRANSLATIONS } from './translations';
import { db, auth } from '../services/firebase';
import { signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
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
  arrayUnion,
  where,
  deleteDoc // Added
} from 'firebase/firestore';

import { getStorage, ref, deleteObject, uploadString, getDownloadURL } from 'firebase/storage';

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

  currentDept: string;
  setCurrentDept: (dept: string) => void;
  circularView: 'overview' | 'marketplace' | 'donations' | 'shortFilm';
  setCircularView: (view: 'overview' | 'marketplace' | 'donations' | 'shortFilm') => void;

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
  unreadCount: number;
  unreadSocialCount: number;
  unreadMarketplaceCount: number;
  unreadNotificationCount: number;
  markSocialAsRead: () => void;
  markMarketplaceAsRead: () => void;

  // Expense Reports
  expenseReports: ExpenseReport[];
  addExpenseReport: (report: ExpenseReport) => void;
  updateExpenseReportStatus: (id: string, status: ExpenseStatus) => void;
  buyBackItems: BuyBackItem[];
  addBuyBackItem: (item: BuyBackItem) => void;
  toggleBuyBackReservation: (itemId: string, department: Department | 'PRODUCTION') => void;
  confirmBuyBackTransaction: (itemId: string) => Promise<void>;
  deleteBuyBackItem: (itemId: string) => Promise<void>;
  deleteExpenseReport: (reportId: string, receiptUrl?: string) => Promise<void>; // Added
  socialPosts: SocialPost[];
  addSocialPost: (post: SocialPost) => void;
  deleteSocialPost: (postId: string, photoUrl?: string) => Promise<void>; // Added
  // Call Sheets
  callSheets: CallSheet[];
  addCallSheet: (item: CallSheet) => Promise<void>;

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

  // Global Catalog
  catalogItems: CatalogItem[];

  addToCatalog: (name: string, dept: string) => Promise<void>;

  // Logistics
  addLogisticsRequest: (request: LogisticsRequest) => Promise<void>;
  deleteLogisticsRequest: (requestId: string) => Promise<void>;

  // Social Nav Control
  socialAudience: 'GLOBAL' | 'DEPARTMENT' | 'USER';
  setSocialAudience: (aud: 'GLOBAL' | 'DEPARTMENT' | 'USER') => void;
  socialTargetDept: Department | 'PRODUCTION';
  setSocialTargetDept: (dept: Department | 'PRODUCTION') => void;
  socialTargetUserId: string;
  setSocialTargetUserId: (id: string) => void;
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

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Persist user in localStorage for better DX
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('aBetterSetUser');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse user from local storage", e);
      return null;
    }
  });

  const [project, setProject] = useState<Project>(DEFAULT_PROJECT);
  const [currentDept, setCurrentDept] = useState<string>('PRODUCTION');
  const [circularView, setCircularView] = useState<'overview' | 'marketplace' | 'donations' | 'shortFilm'>('overview');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [expenseReports, setExpenseReports] = useState<ExpenseReport[]>([]);
  const [language, setLanguage] = useState<Language>('fr');
  const [buyBackItems, setBuyBackItems] = useState<BuyBackItem[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [callSheets, setCallSheets] = useState<CallSheet[]>([]); // New State
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]); // Global Catalog
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  // Social View State (Lifted)
  const [socialAudience, setSocialAudience] = useState<'GLOBAL' | 'DEPARTMENT' | 'USER'>('GLOBAL');
  const [socialTargetDept, setSocialTargetDept] = useState<Department | 'PRODUCTION'>('PRODUCTION');
  const [socialTargetUserId, setSocialTargetUserId] = useState<string>('');


  const [error, setError] = useState<string | null>(null);
  const [debugStatus, setDebugStatus] = useState<string>("");
  const [lastLog, setLastLog] = useState<string>("En attente...");


  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      addNotification("Email de réinitialisation envoyé !", "INFO", "PRODUCTION"); // Using INFO to global
    } catch (err: any) {
      console.error("Reset Password Error", err);
      throw err;
    }
  };

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
      }
    };

    const updateEcoprodChecklist = async (checklist: Record<string, boolean>) => {
      try {
        const projectId = project.id;
        if (!projectId || projectId === 'default-project') return;

        const projectRef = doc(db, 'projects', projectId);
        // Optimistic
        setProject(prev => ({ ...prev, ecoprodChecklist: checklist }));

        await setDoc(projectRef, { ecoprodChecklist: checklist }, { merge: true });
      } catch (err: any) {
        console.error("Error updating Ecoprod checklist:", err);
        setError(`Erreur sauvegarde audit: ${err.message}`);
      }
    };

    // Notification State
    const [lastReadSocial, setLastReadSocial] = useState<number>(() => {
      const saved = localStorage.getItem('lastReadSocial');
      const parsed = saved ? Number(saved) : Date.now();
      const final = isNaN(parsed) ? Date.now() : parsed;
      console.log("[ProjectContext] Initial lastReadSocial:", final, "Raw:", saved);
      return final;
    });
    const [lastReadMarketplace, setLastReadMarketplace] = useState<number>(() => {
      const saved = localStorage.getItem('lastReadMarketplace');
      const parsed = saved ? Number(saved) : Date.now();
      return isNaN(parsed) ? Date.now() : parsed;
    });

    const unreadSocialCount = socialPosts.filter(p => {
      if (!user) return false;
      // 1. Check Date
      if (new Date(p.date).getTime() <= lastReadSocial) return false;

      // 2. Exclude my own posts
      // We need to resolve my ID. 
      const myProfile = userProfiles.find(up => up.email === user.email);
      const myId = myProfile?.id;
      if (myId && p.authorId === myId) return false;
      if (!myId && p.authorName === user.name) return false; // Fallback

      // 3. Relevance Check
      // Global
      if (!p.targetAudience || p.targetAudience === 'GLOBAL') return true;

      // Department
      if (p.targetAudience === 'DEPARTMENT') {
        // Strict matching as requested ("son département")
        return p.targetDept === user.department;
      }

      // User (Private)
      if (p.targetAudience === 'USER') {
        return p.targetUserId === myId;
      }

      return false;
    }).length;
    const unreadMarketplaceCount = buyBackItems.filter(i => new Date(i.date).getTime() > lastReadMarketplace).length;

    const markSocialAsRead = useCallback(() => {
      const now = Date.now();
      setLastReadSocial(now);
      localStorage.setItem('lastReadSocial', String(now));
    }, []);

    const markMarketplaceAsRead = useCallback(() => {
      const now = Date.now();
      setLastReadMarketplace(now);
      localStorage.setItem('lastReadMarketplace', String(now));
    }, []);

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
          'PRODUCTION' // Notify everyone? Or just production? Usually "INFO" to GLOBAL if possible.
          // Current addNotification param says 'target'. 
          // 'PRODUCTION' target is usually restricted??
          // Let's check notification logic.
          // If target is undefined or Global... wait default is PRODUCTION.
          // I should probably make target optional in addNotification signature or handle 'GLOBAL'.
          // For now, let's use 'PRODUCTION' but usually FS concerns everyone.
          // The `userNotifications` filter logic:
          // if (user.department === 'PRODUCTION' || user.department === 'Régie') return true;
          // return n.targetDept === user.department || n.targetDept === undefined;
          // So `undefined` target = GLOBAL.
        );
      } catch (err: any) {
        console.error("Error adding call sheet:", err);
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

    const updateItem = async (item: Partial<ConsumableItem> & { id: string }) => {
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



    // FSC: Sync Catalog
    useEffect(() => {
      // Global collection 'catalog'
      const catalogRef = collection(db, 'catalog');
      const q = query(catalogRef, orderBy('usageCount', 'desc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items: CatalogItem[] = [];
        snapshot.forEach(doc => {
          items.push({ id: doc.id, ...doc.data() } as CatalogItem);
        });
        setCatalogItems(items);
      }, (err) => {
        console.error("[Catalog] Sync Error:", err);
        // Access denied is expected if security rules are tight, but for now we assume open read
      });

      return () => unsubscribe();
    }, []);

    const addToCatalog = async (name: string, dept: string) => {
      if (!name) return;

      // Check if exists (case insensitive check locally first to save read)
      const normalizedName = name.trim();
      const existing = catalogItems.find(i => i.name.toLowerCase() === normalizedName.toLowerCase() && i.department === dept);

      if (existing) {
        // Update usage count
        const itemRef = doc(db, 'catalog', existing.id);
        await updateDoc(itemRef, {
          usageCount: (existing.usageCount || 0) + 1,
          lastUsed: new Date().toISOString()
        });
      } else {
        // Add new
        const catalogRef = collection(db, 'catalog');
        await addDoc(catalogRef, {
          name: normalizedName,
          department: dept,
          usageCount: 1,
          lastUsed: new Date().toISOString()
        } as Omit<CatalogItem, 'id'>);
        console.log(`[Catalog] Added new item: ${normalizedName}`);
      }
    };

    // --- Legacy Local State Actions (To be migrated) ---

    // Sync BuyBack Items
    useEffect(() => {
      const projectId = project.id;
      if (!projectId || projectId === 'default-project') return;

      const itemsRef = collection(db, 'projects', projectId, 'buyBackItems');
      const q = query(itemsRef, orderBy('date', 'desc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items: BuyBackItem[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          items.push({ id: doc.id, ...data } as BuyBackItem);
        });
        setBuyBackItems(items);
      }, (err) => {
        console.error("[BuyBack] Sync Error:", err);
      });

      return () => unsubscribe();
    }, [project.id]);

    const addBuyBackItem = async (item: BuyBackItem) => {
      try {
        const projectId = project.id;
        if (!projectId || projectId === 'default-project') {
          setBuyBackItems(prev => [item, ...prev]);
          return;
        }

        let photoUrl = item.photo;

        // Handle Base64 Image Upload to Storage
        if (item.photo && item.photo.startsWith('data:image')) {
          try {
            const storage = getStorage();
            const storageRef = ref(storage, `projects/${projectId}/buyback/${Date.now()}_${Math.floor(Math.random() * 1000)}`);
            await uploadString(storageRef, item.photo, 'data_url');
            photoUrl = await getDownloadURL(storageRef);
            console.log("[BuyBack] Image uploaded:", photoUrl);
          } catch (uploadErr) {
            console.error("[BuyBack] Image upload failed:", uploadErr);
          }
        }

        const itemsRef = collection(db, 'projects', projectId, 'buyBackItems');
        const { id, ...itemData } = item;

        // Use the generated ID as doc ID
        const docRef = doc(itemsRef, id);

        await setDoc(docRef, {
          ...itemData,
          photo: photoUrl || null,
          date: new Date().toISOString()
        });

        addNotification(
          `Nouvel article à vendre : ${item.name} (${item.price}€) par ${item.sellerDepartment}`,
          'INFO',
          'PRODUCTION'
        );
      } catch (err: any) {
        console.error("[BuyBack] Add Error:", err);
        setError(`Erreur ajout vente: ${err.message}`);
      }
    };

    const toggleBuyBackReservation = async (itemId: string, department: Department | 'PRODUCTION') => {
      const item = buyBackItems.find(i => i.id === itemId);
      if (!item) return;

      try {
        const projectId = project.id;
        const itemRef = doc(db, 'projects', projectId, 'buyBackItems', itemId);

        const isReservedByMe = item.reservedBy === department;
        const newStatus = isReservedByMe ? 'AVAILABLE' : 'RESERVED';
        const newReservedBy = isReservedByMe ? null : department;
        const newReservedByName = isReservedByMe ? null : (user?.name || 'Inconnu');
        const newReservedByUserId = isReservedByMe ? null : (user ? (user as any).uid /* fallback if not in User type yet */ || null : null);

        await updateDoc(itemRef, {
          status: newStatus,
          reservedBy: newReservedBy,
          reservedByName: newReservedByName,
          reservedByUserId: newReservedByUserId
        });

      } catch (err: any) {
        console.error("[BuyBack] Reserve Error:", err);
        setError(`Erreur réservation: ${err.message}`);
      }
    };



    const confirmBuyBackTransaction = async (itemId: string) => {
      try {
        const projectId = project.id;
        const itemRef = doc(db, 'projects', projectId, 'buyBackItems', itemId);
        await updateDoc(itemRef, {
          status: 'SOLD'
        });
        addNotification("Transaction confirmée : Article récupéré", "SUCCESS", "PRODUCTION");
      } catch (err: any) {
        console.error("[BuyBack] Confirm Error:", err);
        setError(`Erreur confirmation: ${err.message}`);
        alert(`Erreur lors de la confirmation : ${err.message}`); // Added for visibility
      }
    };

    const deleteBuyBackItem = async (itemId: string) => {
      try {
        const projectId = project.id;
        const itemRef = doc(db, 'projects', projectId, 'buyBackItems', itemId);
        await deleteDoc(itemRef);
        addNotification("Article supprimé de la vente", "INFO", "PRODUCTION");
      } catch (err: any) {
        console.error("[BuyBack] Delete Error:", err);
        setError(`Erreur suppression: ${err.message}`);
        alert(`Erreur lors de la suppression : ${err.message}`);
      }
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

          // Security: Require Email Verification
          if (!firebaseUser.emailVerified) {
            console.log("Auth: User email not verified. Blocking access.");
            setUser(null);
            return;
          }

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

    const refreshUser = async () => {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setUser(userSnap.data() as User);
          }
        }
      }
    };

    const register = async (email: string, pass: string, name: string, dept: Department | 'PRODUCTION') => {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);

        // Send Verification Email
        await sendEmailVerification(cred.user);

        // Create User Profile
        const newUser: User = {
          name,
          email,
          department: dept,
          productionName: '', // Initially empty
          filmTitle: ''       // Initially empty
        };
        await setDoc(doc(db, 'users', cred.user.uid), newUser);

        // DO NOT set user state here. onAuthStateChanged will handle it AND block unverified users.
        // setUser(newUser); 

        addNotification(`Bienvenue ${name} !`, 'INFO', dept);
      } catch (err: any) {
        console.error("Registration Error", err);
        throw err; // Propagate to UI
      }
    };

    const resendVerification = async () => {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
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


    const joinProject = async (prod: string, film: string, start?: string, end?: string, type?: string, convention?: string) => {
      try {
        if (!auth.currentUser || !user) return;

        const projectId = generateProjectId(prod, film);
        const projectRef = doc(db, 'projects', projectId);

        // Check if project exists to merge or create
        const projectSnap = await getDoc(projectRef);
        const projectData: any = {
          name: `${prod} - ${film}`,
          productionCompany: prod,
          filmTitle: film,
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

        // 2. Update Persisted User Profile
        const updatedUser: User = {
          ...user,
          productionName: prod,
          filmTitle: film,
          startDate: start || user.startDate,
          endDate: end || user.endDate,
          projectType: type || user.projectType,
          convention: convention || user.convention, // Persist convention
          currentProjectId: projectId
        };

        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          productionName: prod,
          filmTitle: film,
          startDate: start || null,
          endDate: end || null,
          projectType: type || null,
          convention: convention || null,
          currentProjectId: projectId,
          projectHistory: arrayUnion({
            id: projectId,
            productionName: prod,
            filmTitle: film,
            lastAccess: new Date().toISOString()
          })
        });

        // Update local user state
        const currentHistory = user.projectHistory || [];
        const newHistoryItem: ProjectSummary = {
          id: projectId,
          productionName: prod,
          filmTitle: film,
          lastAccess: new Date().toISOString()
        };
        const updatedHistory = [
          newHistoryItem,
          ...currentHistory.filter(p => p.id !== projectId)
        ];

        setUser({
          ...updatedUser,
          projectHistory: updatedHistory
        });

        addNotification(`Bienvenue sur le plateau de "${film}" !`, 'INFO', user.department);

      } catch (err) {
        console.error("Join Project Error", err);
      }
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

    const deleteProject = async (projectId: string) => {
      if (!auth.currentUser || !user) return;

      // Safety check: Only romperset@gmail.com can delete
      if (user.email !== 'romperset@gmail.com') {
        throw new Error("Action non autorisée");
      }

      try {
        console.log(`[deleteProject] Deleting project: ${projectId}`);

        // 1. Delete Project Document
        const projectRef = doc(db, 'projects', projectId);
        await deleteDoc(projectRef);

        // 2. Remove from Current User History (Admin)
        const currentHistory = user.projectHistory || [];
        const updatedHistory = currentHistory.filter(p => p.id !== projectId);

        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          projectHistory: updatedHistory,
          // If current project is the deleted one, reset fields
          ...(user.filmTitle === project.name && user.productionName === project.productionCompany ? {
            productionName: '',
            filmTitle: '',
            startDate: null,
            endDate: null,
            projectType: null
          } : {})
        });

        // Update local state
        setUser(prev => prev ? ({ ...prev, projectHistory: updatedHistory }) : null);

        // If we are currently ON this project, force switch to default
        if (project.id === projectId) {
          setProject(DEFAULT_PROJECT);
          setUser(prev => prev ? ({
            ...prev,
            productionName: '',
            filmTitle: '',
            startDate: undefined,
            endDate: undefined
          }) : null);
        }

        addNotification("Projet supprimé définitivement", "SUCCESS", "PRODUCTION");

      } catch (err: any) {
        console.error("[deleteProject] Error:", err);
        throw err;
      }
    };

    const removeProjectFromHistory = async (projectId: string) => {
      if (!auth.currentUser || !user) return;

      try {
        const currentHistory = user.projectHistory || [];
        const updatedHistory = currentHistory.filter(p => p.id !== projectId);

        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          projectHistory: updatedHistory
        });

        // Update local state
        setUser(prev => prev ? ({ ...prev, projectHistory: updatedHistory }) : null);

      } catch (err: any) {
        console.error("[removeProjectFromHistory] Error:", err);
        throw err;
      }
    };



    const logout = async () => {
      await signOut(auth);
      localStorage.removeItem('aBetterSetUser'); // Clean legacy
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

    const markAllAsRead = async (notificationIds: string[]) => {
      // 1. Optimistic Update
      setNotifications(prev => prev.map(n => notificationIds.includes(n.id) ? { ...n, read: true } : n));

      // 2. Batch Update
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

    const deleteNotification = async (id: string) => {
      // Optimistic
      setNotifications(prev => prev.filter(n => n.id !== id));

      try {
        const projectId = project.id;
        const notifRef = doc(db, 'projects', projectId, 'notifications', id);
        await deleteDoc(notifRef);
      } catch (err) {
        console.error("Failed to delete notification:", err);
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

    // 5. Sync Expense Reports
    useEffect(() => {
      const projectId = project.id;
      if (!projectId || projectId === 'default-project') return;

      const expensesRef = collection(db, 'projects', projectId, 'expenses');
      const q = query(expensesRef, orderBy('date', 'desc'));

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

    const addExpenseReport = async (report: ExpenseReport) => {
      try {
        const projectId = project.id;
        // Use setDoc with the ID we generated in the modal, or use addDoc and let firestore generate it?
        // The modal generates an ID. Let's stick to it or overwrite it.
        // Better: Use `setDoc` with `report.id` if we want to keep that ID, OR `addDoc` and update the ID.
        // Since modal generates an ID, let's use it as document ID for consistency.
        const reportRef = doc(db, 'projects', projectId, 'expenses', report.id);
        const { id, ...reportData } = report;

        // Sanitize undefined
        const sanitizedData = Object.fromEntries(
          Object.entries(reportData).map(([k, v]) => [k, v === undefined ? null : v])
        );

        await setDoc(reportRef, sanitizedData);

        addNotification(
          `Nouvelle note de frais de ${report.submittedBy} (${report.amountTTC.toFixed(2)}€)`,
          'INFO',
          'PRODUCTION'
        );
      } catch (err: any) {
        console.error("Error adding expense report:", err);
        setError(`Erreur sauvegarde note de frais: ${err.message}`);
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
        // alert(`Erreur d'envoi : ${err.message}`);
      }
    };

    const deleteSocialPost = async (postId: string, photoUrl?: string) => {
      try {
        const projectId = project.id;
        if (!projectId || projectId === 'default-project') return;

        console.log(`[SocialWall] Deleting post: ${postId}`);

        // 1. Delete Firestore Document
        const postRef = doc(db, 'projects', projectId, 'socialPosts', postId);
        await deleteDoc(postRef);

        // 2. Delete Photo from Storage if exists
        if (photoUrl && photoUrl.includes('firebase')) {
          try {
            const photoRef = ref(getStorage(), photoUrl);
            await deleteObject(photoRef);
            console.log("[SocialWall] Photo deleted from storage");
          } catch (storageErr) {
            console.warn("[SocialWall] Failed to delete photo from storage (might be shared or already gone):", storageErr);
          }
        }

        console.log("[SocialWall] Post deleted successfully");
      } catch (err: any) {
        console.error("[SocialWall] Delete Error:", err);
        setError(`Erreur de suppression : ${err.message}`);
        throw err;
      }
    };

    // 4. Sync User Profiles (Team Members)
    useEffect(() => {
      if (!project.name || project.id === 'default-project') return;

      // We query users who are currently working on this film
      const usersRef = collection(db, 'users');

      // Improved Query: Try matching by ID first (Robust), fallback to name (Legacy)
      // Actually, if we just use 'currentProjectId', only updated users will appear.
      // Given the issue is "users don't see each other", enforcing ID match fixes it.
      // They will just need to re-join the project.

      const q = query(usersRef, where('currentProjectId', '==', project.id));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const profiles: UserProfile[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as User & Partial<UserProfile>; // Cast to union to access profile fields

          // Map User to UserProfile structure, preserving existing data if present
          profiles.push({
            id: doc.id,
            email: data.email,
            firstName: data.firstName || data.name.split(' ')[0] || '',
            lastName: data.lastName || data.name.split(' ').slice(1).join(' ') || '',
            department: data.department,
            role: data.role || 'Membre',

            // Personal Info
            address: data.address || '',
            postalCode: data.postalCode || '',
            city: data.city || '',
            phone: data.phone || '',
            familyStatus: data.familyStatus || '',

            // Admin Info
            ssn: data.ssn || '',
            birthPlace: data.birthPlace || '',
            birthDate: data.birthDate || '',
            birthDepartment: data.birthDepartment || '',
            birthCountry: data.birthCountry || '',
            nationality: data.nationality || '',
            socialSecurityCenterAddress: data.socialSecurityCenterAddress || '',

            // Emergency
            emergencyContactName: data.emergencyContactName || '',
            emergencyContactPhone: data.emergencyContactPhone || '',

            // Professional
            isRetired: data.isRetired || false,
            congeSpectacleNumber: data.congeSpectacleNumber || '',
            lastMedicalVisit: data.lastMedicalVisit || '',

            // Documents
            rib: data.rib,
            cmbCard: data.cmbCard,
            idCard: data.idCard,
            drivingLicense: data.drivingLicense
          });
        });
        setUserProfiles(profiles);
        console.log(`[TeamSync] Found ${profiles.length} team members`);
      }, (err) => {
        console.error("Team Sync Error:", err);
        // Fallback: If index error, might just fail silently or log.
      });

      return () => unsubscribe();
    }, [project.name]);



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

    const updateUserProfile = (profile: UserProfile) => {
      // Legacy local update, keeping it as is but it's less useful now with sync
      setUserProfiles(prev => {
        const existingIndex = prev.findIndex(p => p.email === profile.email);
        if (existingIndex >= 0) {
          const newProfiles = [...prev];
          newProfiles[existingIndex] = profile;
          return newProfiles;
        }
        return [...prev, profile];
      });
    };

    const updateUser = async (data: Partial<User>) => {
      if (!user) return;
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem('aBetterSetUser', JSON.stringify(updatedUser));

      // Sync to Firestore
      if (auth.currentUser) {
        try {
          const userRef = doc(db, 'users', user.id);
          await updateDoc(userRef, data);
        } catch (error) {
          console.error("Failed to update user in Firestore:", error);
        }
      }
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
        updateEcoprodChecklist,
        joinProject,
        leaveProject,
        deleteProject, // Added
        removeProjectFromHistory, // Added
        addItem,
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
        notifications: userNotifications,
        addNotification,
        markAsRead,
        deleteNotification, // Added
        markAllAsRead, // Added
        markNotificationAsReadByItemId,
        unreadCount,
        unreadSocialCount,
        unreadMarketplaceCount,
        unreadNotificationCount: userNotifications.filter(n => !n.read).length,
        markSocialAsRead,
        markMarketplaceAsRead,
        expenseReports,
        addExpenseReport,
        updateExpenseReportStatus,
        deleteExpenseReport, // Added
        buyBackItems,
        addBuyBackItem,
        toggleBuyBackReservation,
        confirmBuyBackTransaction,
        deleteBuyBackItem,
        socialPosts,
        addSocialPost,
        deleteSocialPost, // Added
        callSheets,
        addCallSheet,

        // Catalog
        catalogItems,
        addToCatalog,

        // Logistics
        addLogisticsRequest,
        deleteLogisticsRequest,

        userProfiles,
        updateUserProfile,
        language,
        setLanguage,
        t,
        error,
        testConnection,
        debugStatus,
        lastLog,
        socialAudience, setSocialAudience,
        socialTargetDept, setSocialTargetDept,
        socialTargetUserId, setSocialTargetUserId
      }}>
        {children}
      </ProjectContext.Provider >
    );
  };

  export const useProject = () => {
    const context = useContext(ProjectContext);
    if (context === undefined) {
      throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
  };
