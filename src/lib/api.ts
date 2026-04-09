// src/lib/api.ts
import axios from 'axios';
import { API_URL } from './constants';
import { auth } from './firebase';

// 🟢 1. Create the base Axios client
// It automatically uses the URL we defined in constants.ts (Localhost vs Render)
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🟢 Helper to grab the current user ID for the billing paywall
const getAuthPayload = (isAdmin = false) => {
  return {
    userId: auth.currentUser?.uid || null,
    isAdmin: isAdmin
  };
};

// 🟢 2. Export the official functions to talk to your backend
export const lexCasusAPI = {
  
  // Phase 1: Search Serper API
  searchCases: async (query: string) => {
    const { data } = await apiClient.post('/search', { query });
    return data;
  },

  // Phase 2: Generate Digest (NOW PAYWALL PROTECTED)
  generateDigest: async (query: string, url?: string, focus?: string, isAdmin = false) => {
    const payload = { query, url, focus, ...getAuthPayload(isAdmin) };
    const { data } = await apiClient.post('/digest', payload);
    return data;
  },

  // Phase 3: Grade Bar Answer (PAYWALL PROTECTED)
  gradeBarAnswer: async (question: string, userAnswer: string, suggestedAnswer: string, isAdmin = false) => {
    const payload = { question, userAnswer, suggestedAnswer, ...getAuthPayload(isAdmin) };
    const { data } = await apiClient.post('/grade', payload);
    return data;
  },

  // Phase 4: Legal Chat AI (PAYWALL PROTECTED)
  chatWithAI: async (history: any[], message: string, isAdmin = false) => {
    const payload = { history, message, ...getAuthPayload(isAdmin) };
    const { data } = await apiClient.post('/chat', payload);
    return data;
  },

  // Phase 5: Codal Deconstruction (PAYWALL PROTECTED)
  deconstructCodal: async (title: string, content: string, isAdmin = false) => {
    const payload = { title, content, ...getAuthPayload(isAdmin) };
    const { data } = await apiClient.post('/deconstruct', payload);
    return data;
  },

  // Phase 6: Practice Question Generator
  generatePractice: async (subject: string, topic: string) => {
    const { data } = await apiClient.post('/practice', { subject, topic });
    return data;
  }
};