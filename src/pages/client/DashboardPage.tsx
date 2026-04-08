import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useNotesStore } from '../../store/notesStore';
import { useCasesStore } from '../../store/casesStore';
import { useBarStore } from '../../store/barStore';
import { useScheduleStore } from '../../store/scheduleStore'; 
import { getGreeting, cn } from '../../lib/utils'; // 🟢 FIX: Imported cn here
import {
  CalendarDays, BookOpen, ArrowRight, Crown, Clock, 
  FileText, Loader2, ClipboardList
} from 'lucide-react';

// 🟢 Import the new Interlocutory Promo Modal
import PromoModal from '../../components/modals/PromoModal';

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const subscription = user?.subscription || 'free';
  
  // 🟢 Safely check if they are on ANY paid tier
  const isPaidTier = subscription === 'premium' || subscription === 'premium_plus';

  const { notes, fetchNotes } = useNotesStore();
  const { cases, fetchCases } = useCasesStore();
  const { questions, fetchQuestions } = useBarStore();
  const { schedules, fetchSchedules } = useScheduleStore(); 

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const fetchCloudData = async () => {
      if (!user?.id) return; 

      try {
        // 🟢 Fetching all real data simultaneously
        await Promise.all([
          fetchNotes(user.id),
          fetchCases(user.id),
          fetchQuestions(),
          fetchSchedules(user.id)
        ]);
      } catch (error) {
        console.error("Failed to sync dashboard:", error);
      } finally {
        setIsReady(true);
      }
    };

    fetchCloudData();
  }, [user?.id, fetchNotes, fetchCases, fetchQuestions, fetchSchedules]);

  // 🟢 Filter the REAL schedules from the database (Not completed, top 4)
  const todaySchedule = schedules?.filter(s => !s.completed).slice(0, 4) || [];
  
  const questionnairesCount = questions.length;

  if (!isReady || !user?.id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-gold-500 mb-4" />
        <h3 className="text-xl font-bold text-navy-900 dark:text-white mb-2">Syncing Vault</h3>
        <p className="text-gray-500 animate-pulse text-sm">Verifying credentials and retrieving Jurisprudence...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* 🟢 The Promo Modal */}
      <PromoModal />

      {/* Greeting Card */}
      <div className="card p-6 bg-gradient-to-r from-navy-800 to-navy-900 dark:from-navy-900 dark:to-navy-950 border-none shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {getGreeting()}, Atty. {user?.name || ''}
            </h2>
            <p className="mt-1 text-navy-300">
              {isPaidTier
                ? `Your ${subscription.replace('_', ' ').toUpperCase()} Access is ACTIVE!`
                : 'Upgrade to Premium to unlock full Bar Practice and Notes.'}
            </p>
          </div>
          {!isPaidTier && (
            <Link to="/billing" className="btn-primary bg-gold-500 hover:bg-gold-400 text-navy-900 whitespace-nowrap border-none shadow-md">
              <Crown className="w-4 h-4" /> Upgrade to Premium
            </Link>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/schedule" className="card-hover p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/10 rounded-xl flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{todaySchedule.length}</span>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">Pending Tasks</p>
        </Link>

        <Link to="/notes" className="card-hover p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-500/10 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{notes.length}</span>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">Personal Notes</p>
        </Link>

        <Link to="/cases" className="card-hover p-5 relative">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{cases.length}</span>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">Case Digests</p>
        </Link>

        <Link to="/practice" className="card-hover p-5 relative">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-500/10 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{questionnairesCount}</span>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">Legal Questionnaires</p>
          <p className="text-[10px] text-gray-400 mt-1">Available for practice</p>
        </Link>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Real Schedule */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title flex items-center gap-2">
              <Clock className="w-5 h-5 text-navy-600 dark:text-gold-400" /> Pending Tasks
            </h3>
            <Link to="/schedule" className="text-sm text-navy-600 dark:text-gold-400 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {todaySchedule.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-navy-800/50">
                <div className={cn('w-2 h-2 rounded-full mt-2 flex-shrink-0', item.type === 'class' ? 'bg-blue-500' : 'bg-emerald-500')} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
                  <p className="text-xs text-gray-500 truncate">{item.time || 'No specific time'}</p>
                </div>
              </div>
            ))}
            {todaySchedule.length === 0 && (
              <p className="text-sm text-gray-400 italic py-4 text-center">No pending tasks. You are fully caught up, Atty.!</p>
            )}
          </div>
        </div>

        {/* Recent Case Digests */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title flex items-center gap-2">
              <FileText className="w-5 h-5 text-navy-600 dark:text-gold-400" /> Latest Case Digests
            </h3>
            <Link to="/cases" className="text-sm text-gold-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {cases.slice(0, 3).map((caseItem) => (
              <div key={caseItem.id} className="p-3 rounded-lg bg-gray-50 dark:bg-navy-800/50 border-l-2 border-gold-500">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{caseItem.title}</p>
                <p className="text-xs text-gray-500 mt-1 italic">{caseItem.grNo}</p>
              </div>
            ))}
            {cases.length === 0 && <p className="text-sm text-gray-400 italic py-4 text-center">No digests saved yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;