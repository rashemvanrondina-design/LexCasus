// src/lib/constants.ts

export const BAR_SUBJECTS = [
  {
    id: 'political_law',
    name: 'Political and International Law',
    subsubjects: ['Constitutional Law', 'Administrative Law', 'Election Law', 'Local Government', 'Public International Law']
  },
  {
    id: 'labor_law',
    name: 'Labor and Social Legislation',
    subsubjects: ['Labor Standards', 'Labor Relations', 'Social Legislation']
  },
  {
    id: 'civil_law',
    name: 'Civil Law',
    subsubjects: ['Persons and Family Relations', 'Property', 'Obligations and Contracts', 'Sales', 'Succession', 'Partnership', 'Agency', 'Credit Transactions', 'Torts and Damages']
  },
  {
    id: 'taxation_law',
    name: 'Taxation Law',
    subsubjects: ['General Principles', 'National Internal Revenue Code', 'Local Government Code', 'Tariff and Customs Code']
  },
  {
    id: 'commercial_law',
    name: 'Commercial Law',
    subsubjects: ['Corporation Law', 'Negotiable Instruments', 'Insurance', 'Transportation', 'Banking Laws', 'Intellectual Property']
  },
  {
    id: 'criminal_law',
    name: 'Criminal Law',
    subsubjects: ['Book 1 (General Principles)', 'Book 2 (Specific Crimes)', 'Special Penal Laws']
  },
  {
    id: 'remedial_law',
    name: 'Remedial Law',
    subsubjects: ['Civil Procedure', 'Criminal Procedure', 'Evidence', 'Special Proceedings']
  },
  {
    id: 'legal_ethics',
    name: 'Legal and Judicial Ethics',
    subsubjects: ['Legal Ethics', 'Judicial Ethics', 'Practical Exercises']
  }
];

// --- API CONFIGURATION ---
export const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api' 
  : 'https://lexcasus-backend-n3oj.onrender.com';

// --- PLAN NAMES (For UI Consistency) ---
export const PLAN_NAMES = {
  free: 'Basic (Free)',
  premium: 'Premium (₱199)',
  premium_plus: 'Premium+ (₱499)'
};

// --- SYSTEM LIMITS (For Display in Modals) ---
export const DISPLAY_LIMITS = {
  free: {
    chat: '10 queries/day',
    cases: '5 digests/day (Max 30/mo)',
    practice: '5 answers/day', 
    codal_notes: '100 total notes',
    deconstruct: 'Not Available', // 🚫 Locked
    folders: '5 Folders (10 Subnotes)'
  },
  premium: {
    chat: 'Unlimited',
    cases: '50 digests/day',
    practice: '20 answers/day', 
    codal_notes: '2,000 total notes', // 🟢 ALIGNED
    deconstruct: '2,000 provisions',  // 🟢 ALIGNED
    folders: '500 Folders (150 Subnotes)'
  },
  premium_plus: {
    chat: 'Unlimited',
    cases: 'Unlimited',
    practice: 'Unlimited', 
    codal_notes: 'Unlimited',
    deconstruct: 'Unlimited',
    folders: 'Unlimited'
  }
};