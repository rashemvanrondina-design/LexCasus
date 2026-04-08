export type UserRole = 'admin' | 'client';

export type SubscriptionPlan = 'free' | 'premium' | 'premium_plus';

export const PLAN_LIMITS = {
  free: {
    chatDaily: 10,
    codalNotes: 100,
    aiDeconstruction: 0,
    noteFolders: 5,
    noteSubnotes: 10,
    casesDaily: 5,
    casesMonthly: 30,
    practiceDaily: 5 
  },
  premium: {
    chatDaily: Infinity,
    codalNotes: 2000,
    aiDeconstruction: 2000,
    noteFolders: 500,
    noteSubnotes: 150, 
    casesDaily: 50,
    casesMonthly: 300,
    practiceDaily: 20 
  },
  premium_plus: {
    chatDaily: Infinity,
    codalNotes: Infinity,
    aiDeconstruction: Infinity,
    noteFolders: Infinity,
    noteSubnotes: Infinity,
    casesDaily: Infinity,
    casesMonthly: Infinity,
    practiceDaily: Infinity
  }
};

export interface UserProfile {
  age?: number;
  university?: string;
  state?: string;
  college?: string;
  phone?: string;
  bio?: string;
}

export interface UserUsage {
  dailyChatCount: number;
  dailyCaseCount: number;
  monthlyCaseCount: number;
  aiDeconstructionCount: number;
  dailyPracticeCount: number;
  lastResetDate: string;        // Format: "2026-04-03"
  lastMonthlyResetDate: string; // Format: "2026-04"
  successfulReferrals?: number; // 🟢 NEW: Tracks how many paid users they referred
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  subscription: SubscriptionPlan;
  avatar?: string;
  photoURL?: string; 
  createdAt: string;
  isActive: boolean;
  profile?: UserProfile;
  usage: UserUsage; 
  referralCode?: string;      // 🟢 NEW: Their unique 6-character code
  referredBy?: string;        // 🟢 NEW: The code of the blockmate who invited them
  hasActiveDiscount?: boolean;// 🟢 NEW: Flags if they are owed 25% off
}

export interface BarQuestion {
  id: string;
  subject: string;
  subsubject: string;
  question: string;
  suggestedAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: string;
}

export interface PracticeAnswer {
  questionId: string;
  userId: string;
  answer: string;
  score: number;
  feedback: {
    answer: string;
    legalBasis: string;
    analysis: string;
    conclusion: string;
  };
  submittedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model'; 
  content: string;
  timestamp: string;
}

export interface CaseDigest {
  id: string;
  userId?: string;
  title: string;
  grNo: string;
  date: string;          
  ponente: string;       
  topic: string;         
  facts: string;
  issues: string;
  ratio: string;         
  disposition: string;   
  doctrines: string;     
  barRelevance: string;  
  provisions: string[];
  tags: string[];
  createdAt: string;
}

export interface CodalProvision {
  id: string;
  book: string;          
  bookPart?: string;     // 🟢 NEW: e.g., Book II: Property
  titlePart?: string;    // 🟢 NEW: e.g., Title I: Classification
  chapter?: string;      // 🟢 NEW: e.g., Chapter 1: Immovable Property
  articleNumber: string; 
  title: string;
  content: string;
  notes?: string;        
  linkedCases?: string[];
  createdAt?: string;    
  updatedAt?: string;
  orderIndex?: number;
  aiAnalysis?: string; 
  lastAiUpdate?: string; 
}

export interface Note {
  id: string;
  userId?: string; // 🟢 FIX: Added to match notesStore.ts
  title: string;
  content: string;
  tags: string[];
  linkedCases: string[];
  linkedProvisions: string[];
  type?: 'general' | 'codal_annotation' | string; 
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleItem {
  id: string;
  userId?: string; // 🟢 FIX: Added to match scheduleStore.ts
  title: string;
  description: string;
  date: string;
  time: string;
  type: 'class' | 'task' | 'exam' | 'review';
  completed: boolean;
}

export interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalQuestions: number;
  premiumUsers: number;
  premiumPlusUsers: number; // 🟢 FIX: Added to match adminStore.ts
  basicUsers: number;
}

export interface SubjectCategory {
  id: string;
  name: string;
  subsubjects: string[];
}