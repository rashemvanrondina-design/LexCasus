import { create } from 'zustand';
import { db } from '../lib/firebase';
import { 
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, limit, startAfter, DocumentData 
} from 'firebase/firestore';

interface ScheduleItem {
  id: string;
  userId?: string;
  title: string;
  description: string;
  date: string;
  time: string;
  type: 'class' | 'task' | 'exam' | 'review';
  completed: boolean;
  createdAt?: number;
}

interface ScheduleState {
  schedules: ScheduleItem[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  lastDoc: DocumentData | null;
  hasFetched: boolean; // 🟢 SECURITY GUARD: Prevent duplicate billing reads

  fetchSchedules: (userId: string) => Promise<void>;
  fetchMoreSchedules: () => Promise<void>;
  addSchedule: (schedule: Omit<ScheduleItem, 'id'> & { userId: string }) => Promise<void>;
  updateSchedule: (id: string, data: Partial<ScheduleItem>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  clearSchedules: () => void; // 🟢 DATA WIPE: For safe logouts
}

const PAGE_LIMIT = 20;

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedules: [],
  loading: false,
  loadingMore: false,
  hasMore: true,
  lastDoc: null,
  hasFetched: false,

  fetchSchedules: async (userId: string) => {
    // 🟢 THE BYPASS: Prevent redundant database reads
    if (get().hasFetched) return;

    set({ loading: true });
    try {
      const q = query(
        collection(db, 'schedules'),
        where('userId', '==', userId),
        orderBy('date', 'asc'),
        orderBy('time', 'asc'),
        limit(PAGE_LIMIT)
      );
      const snapshot = await getDocs(q);
      const schedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ScheduleItem[];
      
      set({ 
        schedules, 
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === PAGE_LIMIT,
        loading: false,
        hasFetched: true // 🟢 Lock the gate
      });
    } catch (error: any) {
      console.error('Error fetching schedules:', error);
      // 🟢 THE INDEX CATCHER
      if (error?.code === 'failed-precondition') {
        console.error("Firebase requires a Composite Index for userId + date + time. Check the Firebase link above this error.");
      }
      set({ loading: false });
    }
  },

  fetchMoreSchedules: async () => {
    const { schedules, lastDoc, hasMore, loadingMore } = get();
    if (!hasMore || loadingMore || !lastDoc) return;

    set({ loadingMore: true });
    try {
      const userId = schedules[0]?.userId;
      if (!userId) return;

      const q = query(
        collection(db, 'schedules'),
        where('userId', '==', userId),
        orderBy('date', 'asc'),
        orderBy('time', 'asc'),
        startAfter(lastDoc),
        limit(PAGE_LIMIT)
      );
      
      const snapshot = await getDocs(q);
      const newSchedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ScheduleItem[];
      
      set({ 
        schedules: [...schedules, ...newSchedules],
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === PAGE_LIMIT,
        loadingMore: false 
      });
    } catch (error) {
      console.error('Error fetching more schedules:', error);
      set({ loadingMore: false });
    }
  },

  addSchedule: async (schedule) => {
    try {
      const newSchedule = { ...schedule, createdAt: Date.now() };
      const docRef = await addDoc(collection(db, 'schedules'), newSchedule);
      
      // 🟢 Keep array strictly sorted upon addition
      set((state) => ({
        schedules: [...state.schedules, { id: docRef.id, ...newSchedule }].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      }));
    } catch (error) {
      console.error('Error adding schedule:', error);
    }
  },

  updateSchedule: async (id, data) => {
    try {
      await updateDoc(doc(db, 'schedules', id), data);
      set((state) => ({
        schedules: state.schedules.map(s => s.id === id ? { ...s, ...data } : s)
      }));
    } catch (error) {
      console.error('Error updating schedule:', error);
    }
  },

  deleteSchedule: async (id) => {
    try {
      await deleteDoc(doc(db, 'schedules', id));
      set((state) => ({
        schedules: state.schedules.filter(s => s.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  },

  // 🟢 SAFELY WIPE DATA ON LOGOUT
  clearSchedules: () => set({ 
    schedules: [], 
    loading: false, 
    loadingMore: false, 
    hasMore: true, 
    lastDoc: null, 
    hasFetched: false 
  })
}));