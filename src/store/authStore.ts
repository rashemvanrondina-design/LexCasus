import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification
} from 'firebase/auth';
import { 
  doc, getDoc, setDoc, updateDoc, onSnapshot, 
} from 'firebase/firestore'; 
import { auth, db } from '../lib/firebase';
import type { User, SubscriptionPlan, UserUsage } from '../types'; 

import { useCasesStore } from './casesStore'; 
import { useCodalsStore } from './codalsStore';
import { useNotesStore } from './notesStore';
import { useAdminStore } from './adminStore';

const INITIAL_USAGE: UserUsage = {
  dailyChatCount: 0,
  dailyCaseCount: 0,
  monthlyCaseCount: 0,
  aiDeconstructionCount: 0,
  dailyPracticeCount: 0, 
  lastResetDate: new Date().toISOString().split('T')[0], 
  lastMonthlyResetDate: new Date().toISOString().slice(0, 7), 
};

let unsubUser: (() => void) | null = null; 

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  error: string | null; 
  
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>; 
  register: (name: string, email: string, password: string, appliedReferralCode?: string) => Promise<boolean>;
  
  logout: () => Promise<void>;
  setSubscription: (plan: SubscriptionPlan) => Promise<void>;
  initialize: () => void; 
  clearError: () => void; 
  updateUser: (data: Partial<User>) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      loading: true,
      error: null,

      clearError: () => set({ error: null }),

      // --- INITIALIZE: REAL-TIME FIREBASE SYNC ---
      initialize: () => {
        onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            
            // 🟢 STRICT VERIFICATION LOCK
            if (!firebaseUser.emailVerified) {
              set({ loading: false });
              return; 
            }

            const userRef = doc(db, 'users', firebaseUser.uid);

            if (unsubUser) unsubUser(); 
            
            unsubUser = onSnapshot(userRef, async (userDoc) => {
              if (userDoc.exists()) {
                let userData = userDoc.data() as User;
                
                // 🟢 UI-ONLY MIDNIGHT RESET (Display accurate usage without illegal DB writes)
                const today = new Date().toISOString().split('T')[0]; 
                const thisMonth = today.slice(0, 7); 

                if (userData.usage && (userData.usage.lastResetDate !== today || userData.usage.lastMonthlyResetDate !== thisMonth)) {
                  userData = {
                    ...userData,
                    usage: {
                      ...userData.usage,
                      dailyChatCount: userData.usage.lastResetDate !== today ? 0 : userData.usage.dailyChatCount,
                      dailyCaseCount: userData.usage.lastResetDate !== today ? 0 : userData.usage.dailyCaseCount,
                      dailyPracticeCount: userData.usage.lastResetDate !== today ? 0 : userData.usage.dailyPracticeCount,
                      monthlyCaseCount: userData.usage.lastMonthlyResetDate !== thisMonth ? 0 : userData.usage.monthlyCaseCount,
                      lastResetDate: today,
                      lastMonthlyResetDate: thisMonth
                    }
                  };
                }

                set({ 
                  user: userData, 
                  isAuthenticated: true, 
                  isAdmin: userData.role === 'admin' || userData.email === 'rashemvanrondina@gmail.com',
                  loading: false 
                });
              } else {
                set({ loading: false });
              }
            }, (error) => {
              console.error("Real-time sync error:", error);
              set({ loading: false });
            });

          } else {
            if (unsubUser) unsubUser(); 
            set({ 
              user: null, 
              isAuthenticated: false, 
              isAdmin: false, 
              loading: false 
            });
          }
        });
      },

      // --- LOGIN: Real Firebase Auth ---
      login: async (email, password) => {
        set({ error: null });
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          
          if (!userCredential.user.emailVerified) {
            await signOut(auth);
            set({ error: "Please verify your email address first. Check your inbox!" });
            return false;
          }

          const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            set({ 
              user: userData, 
              isAuthenticated: true, 
              isAdmin: userData.role === 'admin' || userData.email === 'rashemvanrondina@gmail.com'
            });
            return true; 
          }
          return false; 
        } catch (error: any) {
          console.error("Login Failed:", error);
          set({ error: "Invalid email or password." });
          return false; 
        }
      },

      // --- GOOGLE LOGIN ---
      loginWithGoogle: async () => {
        set({ error: null });
        try {
          const provider = new GoogleAuthProvider();
          const result = await signInWithPopup(auth, provider);
          const firebaseUser = result.user;

          const userRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userRef);

          let userData: User;

          if (userDoc.exists()) {
            userData = userDoc.data() as User;
            let needsUpdate = false;
            const updatePayload: Partial<User> = {};

            // 🟢 ONLY update legal fields like photoURL
            if (firebaseUser.photoURL && userData.photoURL !== firebaseUser.photoURL) {
              userData.photoURL = firebaseUser.photoURL;
              updatePayload.photoURL = firebaseUser.photoURL;
              needsUpdate = true;
            }

            if (needsUpdate) {
              await updateDoc(userRef, updatePayload);
            }
          } else {
            const myCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            userData = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'Law Student',
              photoURL: firebaseUser.photoURL || undefined,
              role: 'client',
              subscription: 'free',
              isActive: true,
              createdAt: new Date().toISOString(),
              usage: INITIAL_USAGE, 
              referralCode: myCode,
              hasActiveDiscount: false 
            } as any;
            await setDoc(userRef, userData);
          }

          set({ 
            user: userData, 
            isAuthenticated: true, 
            isAdmin: userData.role === 'admin' || userData.email === 'rashemvanrondina@gmail.com'
          });
          return true;
        } catch (error) {
          console.error("Google Login Failed:", error);
          set({ error: "Failed to authenticate with Google." });
          return false;
        }
      },

      // 🟢 REGISTER
      register: async (name, email, password, appliedReferralCode?: string) => {
        set({ error: null });
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          await sendEmailVerification(userCredential.user);

          const myCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          const cleanReferralCode = appliedReferralCode ? appliedReferralCode.trim().toUpperCase() : null;

          const newUser: any = {
            id: userCredential.user.uid,
            email: email.toLowerCase(),
            name,
            role: 'client',
            subscription: 'free', 
            isActive: true,
            createdAt: new Date().toISOString(),
            usage: INITIAL_USAGE, 
            referralCode: myCode,
            referredBy: cleanReferralCode, 
            hasActiveDiscount: false 
          };

          await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
          await signOut(auth);
          set({ user: null, isAuthenticated: false, isAdmin: false });

          return true; 
        } catch (error: any) {
          console.error("Registration Failed:", error);
          if (error.code === 'auth/email-already-in-use') {
             set({ error: "Evidence suggests this email is already registered. Please Login." });
          } else {
             set({ error: error.message || "Motion denied: Could not create account." });
          }
          return false; 
        }
      },

      // --- UPDATE USER (Allowed fields only) ---
      updateUser: async (data: Partial<User>) => {
        const currentUser = get().user;
        if (!currentUser) return false;

        try {
          const userRef = doc(db, 'users', currentUser.id);
          await updateDoc(userRef, data);

          set({ user: { ...currentUser, ...data } });
          return true;
        } catch (error) {
          console.error("Profile Update Failed:", error);
          return false;
        }
      },

      logout: async () => {
        try {
          await signOut(auth);
          
          if (unsubUser) {
            unsubUser();
            unsubUser = null;
          }

          useCasesStore.getState().clearCases();
          useCodalsStore.getState().clearUserNotes();
          useNotesStore.getState().clearNotes();
          useAdminStore.getState().clearAdminData();

          sessionStorage.removeItem('lexcasus_promo_seen');

          set({ user: null, isAuthenticated: false, isAdmin: false });
        } catch (error) {
          console.error("Logout Failed:", error);
        }
      },

      // 🟢 DELEGATED SUBSCRIPTION HANDLER
      setSubscription: async (plan: SubscriptionPlan) => {
        const currentUser = get().user;
        if (currentUser) {
          try {
            // NOTE: Because Firestore rules block users from updating their own subscription,
            // this must eventually call your secure server.js backend!
            // Example: await fetch('/api/upgrade', { method: 'POST', body: JSON.stringify({ plan }) })
            
            // For UI responsiveness while we wait for the backend build:
            set({ user: { ...currentUser, subscription: plan } });

          } catch (error) {
            console.error("Subscription Update Failed:", error);
          }
        }
      },

    }),
    { name: 'lexcasus-auth' }
  )
);