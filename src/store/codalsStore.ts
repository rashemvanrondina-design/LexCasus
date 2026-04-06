import { create } from 'zustand';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  writeBatch,
  orderBy
} from 'firebase/firestore';
import { CodalProvision } from '../types';

interface CodalsState {
  codals: CodalProvision[];
  userNotes: Record<string, { content: string, cases: string[], type: string }>; 
  loading: boolean;
  
  // 🟢 SECURITY FLAGS: Protects against duplicate Firebase reads
  hasFetchedCodals: boolean;
  hasFetchedNotes: boolean;
  
  // 🟢 CORE FUNCTIONS
  fetchCodals: () => Promise<void>;
  fetchUserNotes: (userId: string) => Promise<void>;
  
  // 🟢 ADMIN FUNCTIONS
  addCodal: (codal: Partial<CodalProvision>) => Promise<void>;
  updateCodal: (id: string, codal: Partial<CodalProvision>) => Promise<void>;
  deleteCodal: (id: string) => Promise<void>;
  bulkAddCodals: (provisions: Partial<CodalProvision>[]) => Promise<boolean>;

  // 🟢 CLIENT/RESEARCH FUNCTIONS
  savePrivateNote: (
    codalId: string, // This now acts as our universal Target ID (handles AI & Section notes)
    userId: string,
    content: string,
    linkedCases: string[],
    type?: string 
  ) => Promise<void>;

  // 🟢 DATA WIPE: Clears sensitive margin notes on logout
  clearUserNotes: () => void;
}

export const useCodalsStore = create<CodalsState>((set, get) => ({
  codals: [],
  userNotes: {}, 
  loading: false,
  hasFetchedCodals: false,
  hasFetchedNotes: false,

  // 1. Fetch Global Codals (The Public Library)
  fetchCodals: async () => {
    if (get().hasFetchedCodals) return;
    
    set({ loading: true });
    try {
      const q = query(collection(db, 'codals'), orderBy('createdAt', 'asc'));
      const snap = await getDocs(q);
      
      const codals = snap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as CodalProvision[];

      set({ codals, loading: false, hasFetchedCodals: true });
    } catch (error) {
      console.error("Failed to retrieve library:", error);
      set({ loading: false });
    }
  },

  // 2. Fetch User-Specific Notes (The Private Vault)
  fetchUserNotes: async (userId: string) => {
    if (get().hasFetchedNotes) return;

    try {
      const q = query(collection(db, 'codal_notes'), where('userId', '==', userId));
      const snap = await getDocs(q);
      const notesMap: Record<string, any> = {};
      
      snap.forEach(doc => {
        const data = doc.data();
        
        // 🟢 THE FIX: Safely map legacy IDs, composite AI IDs, and standard Codal IDs
        const key = data.targetId || data.codalId || doc.id;
        
        notesMap[key] = { 
          content: data.content || '', 
          cases: data.linkedCases || [], 
          type: data.type || 'codal_annotation'
        };
      });
      
      set({ userNotes: notesMap, hasFetchedNotes: true });
    } catch (err) {
      console.error("Vault retrieval failed:", err);
    }
  },

  // 3. Admin: Add new Provision
  addCodal: async (codal) => {
    try {
      const docRef = await addDoc(collection(db, 'codals'), {
        ...codal,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const newCodal = { id: docRef.id, ...codal } as CodalProvision;

      set((state) => ({
        codals: [newCodal, ...state.codals]
      }));
    } catch (error) {
      console.error("Admin Publishing Error:", error);
    }
  },

  // 4. Admin: Update Provision
  updateCodal: async (id: string, updatedData: Partial<CodalProvision>) => {
    try {
      const { id: _, ...cleanUpdateData } = updatedData;

      const docRef = doc(db, 'codals', id);
      const finalData = {
        ...cleanUpdateData,
        updatedAt: new Date().toISOString(),
        lastAiUpdate: new Date().toISOString()
      };

      await updateDoc(docRef, finalData);

      set((state) => ({
        codals: state.codals.map((c) => (c.id === id ? { ...c, ...finalData } : c)),
      }));
    } catch (error) {
      console.error("Store Update Error:", error);
      throw error;
    }
  },

  // 5. Admin: Delete Provision
  deleteCodal: async (id) => {
    try {
      await deleteDoc(doc(db, 'codals', id));
      set((state) => ({
        codals: state.codals.filter((c) => c.id !== id),
      }));
    } catch (error) {
      console.error("Admin Deletion Error:", error);
    }
  },

  // 6. Client: Save Private Notes
  savePrivateNote: async (codalId, userId, content, linkedCases, type = 'codal_annotation') => {
    try {
      const notesRef = collection(db, 'codal_notes');

      // We query using the universal codalId (which safely handles 'ProvisionID::AI_ANALYSIS' too)
      const q = query(
        notesRef,
        where('codalId', '==', codalId),
        where('userId', '==', userId),
        where('type', '==', type)
      );

      const snap = await getDocs(q);

      const payload = {
        codalId,
        userId,
        content,
        linkedCases: linkedCases || [],
        type, 
        updatedAt: new Date().toISOString()
      };

      if (!snap.empty) {
        const docId = snap.docs[0].id;
        await updateDoc(doc(db, 'codal_notes', docId), payload);
      } else {
        await addDoc(notesRef, {
          ...payload,
          createdAt: new Date().toISOString()
        });
      }

      set((state) => ({
        userNotes: {
          ...state.userNotes,
          [codalId]: { content, cases: linkedCases || [], type }
        }
      }));

    } catch (error) {
      console.error("Vault Sync Error:", error);
      throw error;
    }
  },

  // 7. Admin: Bulk Import
  bulkAddCodals: async (provisions) => {
    set({ loading: true });
    try {
      const batch = writeBatch(db);
      const codalsRef = collection(db, 'codals');

      provisions.forEach((prov) => {
        const newDocRef = doc(codalsRef);
        batch.set(newDocRef, {
          ...prov,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });

      await batch.commit();
      
      set({ hasFetchedCodals: false }); 
      await get().fetchCodals();
      
      set({ loading: false });
      return true;
    } catch (error) {
      console.error("Bulk Import Error:", error);
      set({ loading: false });
      return false;
    }
  },

  // 8. Prevent Data Leaks on Logout
  clearUserNotes: () => set({ userNotes: {}, hasFetchedNotes: false }),
}));