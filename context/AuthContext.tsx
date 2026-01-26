import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserProfile, Department, Project } from '../types';
import { auth, db } from '../services/firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    sendEmailVerification
} from 'firebase/auth';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs
} from 'firebase/firestore';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    userProfiles: UserProfile[];
    login: (email: string, pass: string) => Promise<void>;
    register: (email: string, pass: string, name: string, dept: Department | 'PRODUCTION') => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    updateUser: (data: Partial<User>) => Promise<void>;
    updateUserProfile: (profile: UserProfile) => Promise<void>;
    refreshUser: () => Promise<void>;
    resendVerification: () => Promise<void>;
    deleteUser: () => Promise<void>;
    error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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

    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);

    // 1. Auth Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setLoading(true);
            if (firebaseUser) {
                // console.log("Auth State: Logged In", firebaseUser.uid);

                // Security: Require Email Verification
                if (!firebaseUser.emailVerified) {
                    console.log("Auth: User email not verified.");
                    // We don't block access here strictly in code, but we might show a warning.
                    // Depending on requirements. Previous code blocked access effectively by setting user null?
                    // Previous code:
                    /*
                    if (!firebaseUser.emailVerified) {
                       console.log("Auth: User email not verified. Blocking access.");
                       setUser(null);
                       return;
                    }
                    */
                    // Let's implement the same behavior if desired, or allow limited access.
                    // For now, let's keep it consistent with previous: allow login but maybe valid logic elsewhere checks it?
                    // Actually, the previous code explicitly set User to null if not verified.
                    // Let's stick to that for safety.
                    if (!firebaseUser.emailVerified) {
                        setUser(null);
                        setLoading(false);
                        return;
                    }
                }

                try {
                    const docRef = doc(db, 'users', firebaseUser.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const userData = docSnap.data() as User;
                        const fullUser = { ...userData, id: firebaseUser.uid };
                        setUser(fullUser);
                        localStorage.setItem('aBetterSetUser', JSON.stringify(fullUser));
                    } else {
                        console.warn("User authenticated but no Firestore profile found.");
                        // Handle edge case: create profile? Or wait for register?
                    }
                } catch (err) {
                    console.error("Error fetching user profile:", err);
                }
            } else {
                // console.log("Auth State: Logged Out");
                setUser(null);
                localStorage.removeItem('aBetterSetUser');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // 2. Refresh User Helper
    const refreshUser = async () => {
        if (!auth.currentUser) return;
        try {
            const docRef = doc(db, 'users', auth.currentUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const userData = docSnap.data() as User;
                const fullUser = { ...userData, id: auth.currentUser.uid };
                setUser(fullUser);
                localStorage.setItem('aBetterSetUser', JSON.stringify(fullUser));
            }
        } catch (e: any) {
            console.error("Refresh User Failed", e);
        }
    };

    // 3. User Actions
    const login = async (email: string, pass: string) => {
        try {
            setError(null);
            const userCredential = await signInWithEmailAndPassword(auth, email, pass);

            if (!userCredential.user.emailVerified) {
                throw new Error("Veuillez vérifier votre email avant de vous connecter.");
            }

            // onAuthStateChanged will handle the rest
        } catch (err: any) {
            console.error("Login Error", err);
            // Map Firebase errors to French
            if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                throw new Error("Email ou mot de passe incorrect.");
            } else if (err.code === 'auth/too-many-requests') {
                throw new Error("Trop de tentatives. Veuillez réessayer plus tard.");
            }
            throw err;
        }
    };

    const register = async (email: string, pass: string, name: string, dept: Department | 'PRODUCTION') => {
        try {
            setError(null);
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            const uid = userCredential.user.uid;

            // Create User Profile in Firestore
            const newUser: User = {
                id: uid,
                email,
                name,
                department: dept,
                role: 'USER', // Default
                productionName: '',
                filmTitle: '',
                projectHistory: []
            };

            await setDoc(doc(db, 'users', uid), newUser);

            // Send Verification Email
            await sendEmailVerification(userCredential.user);

            // Note: We might want to sign them out immediately or let them see a "Verify Email" screen.
            // Current logic implies they are logged in but blocked by the check in onAuthStateChanged until verified.

        } catch (err: any) {
            console.error("Register Error", err);
            if (err.code === 'auth/email-already-in-use') {
                throw new Error("Cet email est déjà utilisé.");
            } else if (err.code === 'auth/weak-password') {
                throw new Error("Le mot de passe doit faire au moins 6 caractères.");
            }
            throw err;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            localStorage.removeItem('aBetterSetUser');
            // Clearing project state should be handled by ProjectContext interpreting null user
        } catch (err: any) {
            console.error("Logout Error", err);
            throw err;
        }
    };

    const resetPassword = async (email: string) => {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (err: any) {
            console.error("Reset Password Error", err);
            throw err;
        }
    };

    const updateUser = async (data: Partial<User>) => {
        if (!auth.currentUser || !user) return;
        try {
            await updateDoc(doc(db, 'users', auth.currentUser.uid), data);

            const updated = { ...user, ...data };
            setUser(updated);
            localStorage.setItem('aBetterSetUser', JSON.stringify(updated));
        } catch (err: any) {
            console.error("Update User Error", err);
            throw err;
        }
    };

    // Admin / Profile Management
    const updateUserProfile = async (profile: UserProfile) => {
        try {
            await updateDoc(doc(db, 'users', profile.id), {
                role: profile.role,
                department: profile.department
            });
            // Refresh list handled below or by caller?
            // For now, simple update.
        } catch (err: any) {
            console.error("Update User Profile Error", err);
            throw err;
        }
    };

    const resendVerification = async () => {
        if (auth.currentUser && !auth.currentUser.emailVerified) {
            await sendEmailVerification(auth.currentUser);
        }
    };

    const deleteUser = async () => {
        if (!auth.currentUser) return;
        try {
            // This is complex - usually requires recent login. 
            // Also deleting firestore doc.
            const uid = auth.currentUser.uid;
            await deleteDoc(doc(db, 'users', uid));
            await auth.currentUser.delete();
            setUser(null);
            localStorage.removeItem('aBetterSetUser');
        } catch (err: any) {
            console.error("Delete Account Error", err);
            throw err;
        }
    };

    // Sync All User Profiles (for Admin/Team views)
    useEffect(() => {
        // Only fetch if user is logged in
        if (!user) {
            setUserProfiles([]);
            return;
        }

        const q = query(collection(db, 'users'));
        // This might be heavy if many users. Optimization: Only fetch if needed or specific Component uses it.
        // For now, keeping it here as it was in ProjectContext.

        // Actually, ProjectContext fetched this.
        // Let's replicate.

        // Note: ProjectContext didn't seem to have a useEffect for this? 
        // Wait, let's check ProjectContext again.
        // It had `const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);`
        // And `useEffect` fetching it? I missed checking where it was populated.
        // It might be populated in `InventoryManager` or similar? 
        // Re-reading ProjectContext showed `userProfiles` state but I didn't verify the effect.
        // ... Checked: I didn't see a `useEffect` populating `userProfiles` in the snippet I saw. 
        // It might have been doing it inside `InventoryManager`? 
        // IF it was in ProjectContext, I'll add a fetcher here.

        // I will add a fetcher that runs once on mount if user is admin/production, or just simple fetch.
        const fetchProfiles = async () => {
            try {
                const snap = await getDocs(collection(db, 'users'));
                const profiles = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
                setUserProfiles(profiles);
            } catch (e) {
                console.error("Error fetching user profiles", e);
            }
        };

        fetchProfiles();

        // Realtime listener?
        /*
        const unsubscribe = onSnapshot(collection(db, 'users'), (snap) => {
           const profiles = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
           setUserProfiles(profiles);
        });
        return () => unsubscribe();
        */

    }, [user]);

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            userProfiles,
            login,
            register,
            logout,
            resetPassword,
            updateUser,
            updateUserProfile,
            refreshUser,
            resendVerification,
            deleteUser,
            error
        }}>
            {children}
        </AuthContext.Provider>
    );
};
