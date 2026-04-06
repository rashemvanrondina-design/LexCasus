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
  query, collection, where, getDocs, increment
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
  
  incrementUsage: (type: 'chat' | 'case' | 'practice' | 'deconstruct') => Promise<void>; 
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

      // --- INITIALIZE: REAL-TIME FIREBASE SYNC WITH AUTO-RESET ---
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
                const userData = userDoc.data() as User;
                
                // 🟢 THE MIDNIGHT RESET LOGIC
                const today = new Date().toISOString().split('T')[0]; 
                const thisMonth = today.slice(0, 7); 

                if (userData.usage && (userData.usage.lastResetDate !== today || userData.usage.lastMonthlyResetDate !== thisMonth)) {
                  const updatedUsage = {
                    ...userData.usage,
                    dailyChatCount: userData.usage.lastResetDate !== today ? 0 : userData.usage.dailyChatCount,
                    dailyCaseCount: userData.usage.lastResetDate !== today ? 0 : userData.usage.dailyCaseCount,
                    dailyPracticeCount: userData.usage.lastResetDate !== today ? 0 : userData.usage.dailyPracticeCount,
                    monthlyCaseCount: userData.usage.lastMonthlyResetDate !== thisMonth ? 0 : userData.usage.monthlyCaseCount,
                    lastResetDate: today,
                    lastMonthlyResetDate: thisMonth
                  };
                  
                  await updateDoc(userRef, { usage: updatedUsage });
                  return; 
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

            if (firebaseUser.photoURL && userData.photoURL !== firebaseUser.photoURL) {
              userData.photoURL = firebaseUser.photoURL;
              updatePayload.photoURL = firebaseUser.photoURL;
              needsUpdate = true;
            }

            if (!userData.usage) {
              userData.usage = INITIAL_USAGE;
              updatePayload.usage = INITIAL_USAGE;
              needsUpdate = true;
            }

            if ((userData.subscription as any) === 'basic') {
              userData.subscription = 'free';
              updatePayload.subscription = 'free';
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

      // 🟢 UPDATED REGISTER: Tagging the Referral (No free premium yet!)
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
            subscription: 'free', // 🟢 Everyone starts on free
            isActive: true,
            createdAt: new Date().toISOString(),
            usage: INITIAL_USAGE, 
            referralCode: myCode,
            referredBy: cleanReferralCode, // 🟢 Save who referred them
            hasActiveDiscount: false // Flag for when THEY refer someone
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

      // --- UPDATE USER ---
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

      // 🟢 UPDATED SUBSCRIPTION: The Reward Trigger
      setSubscription: async (plan: SubscriptionPlan) => {
        const currentUser = get().user;
        if (currentUser) {
          try {
            // 1. Upgrade the current paying user
            await updateDoc(doc(db, 'users', currentUser.id), { subscription: plan }); 
            set({ user: { ...currentUser, subscription: plan } });

            // 2. CHECK FOR REFERRAL REWARD
            // If they bought a paid plan AND they were referred by someone
            if ((plan === 'premium' || plan === 'premium_plus') && (currentUser as any).referredBy) {
              
               // Find the generous blockmate who referred them
               const q = query(collection(db, 'users'), where('referralCode', '==', (currentUser as any).referredBy));
               const snapshot = await getDocs(q);
               
               if (!snapshot.empty) {
                   const referrerDoc = snapshot.docs[0];
                   
                   // 🟢 Grant the Referrer the 25% Discount Flag!
                   await updateDoc(doc(db, 'users', referrerDoc.id), {
                       'usage.successfulReferrals': increment(1),
                       'hasActiveDiscount': true 
                   });
               }
            }

          } catch (error) {
            console.error("Subscription Update Failed:", error);
          }
        }
      },

      // --- USAGE TRACKER ---
      incrementUsage: async (type) => {
        const currentUser = get().user;
        
        if (!currentUser || !currentUser.usage) return;
        if (currentUser.role === 'admin' || currentUser.email === 'rashemvanrondina@gmail.com') return;

        const newUsage = { ...currentUser.usage };

        switch (type) {
          case 'chat':
            newUsage.dailyChatCount += 1;
            break;
          case 'case':
            newUsage.dailyCaseCount += 1;
            newUsage.monthlyCaseCount += 1; 
            break;
          case 'practice':
            newUsage.dailyPracticeCount += 1;
            break;
          case 'deconstruct':
            newUsage.aiDeconstructionCount += 1;
            break;
        }

        try {
          await updateDoc(doc(db, 'users', currentUser.id), { usage: newUsage });
          set({ user: { ...currentUser, usage: newUsage } });
        } catch (error) {
          console.error("Failed to update usage ledger:", error);
        }
      },
    }),
    { name: 'lexcasus-auth' }
  )
);