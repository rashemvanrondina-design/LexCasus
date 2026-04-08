import { useAuthStore } from '../store/authStore';
import { PLAN_LIMITS } from '../types'; // Assuming your index.ts is exported here

// This automatically pulls exactly what you wrote in index.ts!
export type UsageFeature = keyof typeof PLAN_LIMITS.free;

export const useUsageGuard = () => {
  const { user } = useAuthStore();

  const checkAccess = (feature: UsageFeature, currentCount?: number): boolean => {
    if (!user) return false;
    
    // Master Admin Bypass
    if (user.role === 'admin' || user.email === 'rashemvanrondina@gmail.com') {
      return true;
    }

    const limits = PLAN_LIMITS[user.subscription || 'free'];
    const usage = user.usage;

    if (!limits || !usage) return false;

    switch (feature) {
      // --- DAILY RESETTING LIMITS (Tracked in Firebase Ledger) ---
      case 'chatDaily':
        if (limits.chatDaily === Infinity) return true;
        return (usage.dailyChatCount || 0) < limits.chatDaily;
        
      case 'aiDeconstruction':
        if (user.subscription === 'free' || limits.aiDeconstruction === 0) return false;
        if (limits.aiDeconstruction === Infinity) return true;
        return (usage.aiDeconstructionCount || 0) < limits.aiDeconstruction;
        
      case 'casesDaily':
        if (limits.casesDaily === Infinity && limits.casesMonthly === Infinity) return true;
        const underDaily = (usage.dailyCaseCount || 0) < limits.casesDaily;
        const underMonthly = (usage.monthlyCaseCount || 0) < limits.casesMonthly;
        return underDaily && underMonthly; 
        
      case 'practiceDaily':
        if (limits.practiceDaily === Infinity) return true;
        return (usage.dailyPracticeCount || 0) < limits.practiceDaily;

      // --- ABSOLUTE INVENTORY LIMITS (Tracked by UI currentCount) ---
      case 'codalNotes':
        if (limits.codalNotes === Infinity) return true;
        return (currentCount || 0) < limits.codalNotes;

      // 🟢 ALIGNED: Now matches 'noteFolders' from index.ts
      case 'noteFolders':
        if (limits.noteFolders === Infinity) return true;
        return (currentCount || 0) < limits.noteFolders;

      // 🟢 ALIGNED: Now matches 'noteSubnotes' from index.ts
      case 'noteSubnotes':
        if (limits.noteSubnotes === Infinity) return true;
        return (currentCount || 0) < limits.noteSubnotes;
        
      default:
        return true; 
    }
  };

  return { checkAccess };
};