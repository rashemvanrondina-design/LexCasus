import { create } from 'zustand';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs,
  orderBy,
  limit 
} from 'firebase/firestore';
import { Note } from '../types'; 

interface NotesState {
  notes: Note[];
  loading: boolean;
  hasFetched: boolean; 
  
  fetchNotes: (userId?: string) => Promise<void>;
  saveNote: (noteData: Partial<Note>) => Promise<void>; 
  removeNote: (id: string) => Promise<void>;
  
  clearNotes: () => void; 
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  loading: false,
  hasFetched: false,

  fetchNotes: async (passedUserId?: string) => {
    if (get().hasFetched) return; 

    const userId = passedUserId || auth.currentUser?.uid; 
    
    if (!userId) {
      console.warn("Fetch blocked: No user ID provided.");
      return;
    }
    
    set({ loading: true });
    try {
      const q = query(
        collection(db, 'notes'), 
        where('userId', '==', userId),
        where('type', '==', 'general'), // 🟢 OPTIMIZED: Filter at the database level!
        orderBy('title', 'asc'),
        limit(100) 
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedNotes = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as Note[];
      
      // 🟢 Client-side filter removed. Firebase already did the heavy lifting.

      set({ notes: fetchedNotes, loading: false, hasFetched: true });
    } catch (error: any) {
      console.error("Error fetching notes:", error);
      if (error?.code === 'failed-precondition') {
        console.error("Firebase requires a Composite Index for userId + type + title. Check the Firebase link above this error.");
      }
      set({ loading: false });
    }
  },

  saveNote: async (noteData: Partial<Note>) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      const isNewNote = !noteData.id || noteData.id.startsWith('temp-');

      if (isNewNote) {
        // 📝 CREATE NEW
        const { id, ...cleanData } = noteData; 
        const payload = {
          title: noteData.title || "",
          content: noteData.content || "",
          tags: noteData.tags || [],
          linkedCases: noteData.linkedCases || [],
          linkedProvisions: noteData.linkedProvisions || [],
          userId,
          type: 'general', 
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        const docRef = await addDoc(collection(db, 'notes'), payload);
        const createdNote = { id: docRef.id, ...payload } as Note;
        
        // 🟢 UPDATE LOCAL STATE & SORT
        set((state) => ({
          notes: [...state.notes.filter(n => !n.id.startsWith('temp-')), createdNote]
            .sort((a, b) => a.title.localeCompare(b.title))
        }));
      } else {
        // 🖋️ UPDATE EXISTING
        const noteRef = doc(db, 'notes', noteData.id!);
        const updatePayload = {
          ...noteData,
          updatedAt: new Date().toISOString(),
        };
        await updateDoc(noteRef, updatePayload);
        
        set((state) => ({
          notes: state.notes
            .map((n) => (n.id === noteData.id ? { ...n, ...updatePayload } : n))
            .sort((a, b) => a.title.localeCompare(b.title)),
        }));
      }
    } catch (error) {
      console.error("Error saving note:", error);
    }
  },

  removeNote: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notes', id));
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
      }));
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  },

  // 🟢 THE DATA WIPE
  clearNotes: () => set({ notes: [], hasFetched: false, loading: false }),
}));