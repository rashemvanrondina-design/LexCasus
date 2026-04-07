import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useBarStore, BarQuestion } from '../../store/barStore'; 
import { cn, truncate } from '../../lib/utils';
import {
  Crown, Send, CheckCircle, Star, BookOpen, ArrowRight,
  ChevronDown, ChevronUp, RotateCcw, AlertCircle, Loader2, Plus, X, Trash2
} from 'lucide-react';

// 🟢 NEW IMPORTS: Usage Guard, Modal, and Firebase Accounting
import { useUsageGuard } from '../../hooks/useUsageGuard';
import UpgradeModal from '../../components/modals/UpgradeModal';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../lib/firebase';

// 🟢 AI SCHEMA INTERFACE
interface AIFeedback {
  score: number;
  feedback?: string;
  answer: string;
  legalBasis: string;
  analysis: string;
  conclusion: string;
}

// 🟢 SAFETY HELPER
const getSafeText = (data: any): string => {
  if (!data) return "No feedback provided.";
  if (typeof data === 'string') return data;
  if (typeof data === 'object') {
    return Object.values(data).filter(val => typeof val === 'string').join('\n\n');
  }
  return String(data);
};

const PracticeBarPage: React.FC = () => {
  const { user } = useAuthStore();
  const { checkAccess } = useUsageGuard(); // 🟢 Initialize Guard
  const [showUpgradeModal, setShowUpgradeModal] = useState(false); // 🟢 Modal State
  const isAdmin = user?.email === 'rashemvanrondina@gmail.com'; 

  const { questions, fetchQuestions, addQuestion, deleteQuestion, loading } = useBarStore();

  const [selectedQ, setSelectedQ] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showSuggested, setShowSuggested] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('all');

  const [isGrading, setIsGrading] = useState(false);
  const [feedback, setFeedback] = useState<AIFeedback | null>(null);

  const [showAdminForm, setShowAdminForm] = useState(false);
  const [formData, setFormData] = useState<Omit<BarQuestion, 'id'>>({
    subject: '', subsubject: '', difficulty: 'medium', question: '', suggestedAnswer: ''
  });

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const subjects = ['all', ...Array.from(new Set(questions.map(q => q.subject)))];

  const filteredQuestions = selectedSubject === 'all'
    ? questions
    : questions.filter(q => q.subject === selectedSubject);

  const currentQuestion = questions.find(q => q.id === selectedQ);

  const handleAdminSave = async () => {
    if (!formData.subject || !formData.question || !formData.suggestedAnswer) {
      alert("Subject, Question, and Suggested Answer are required!");
      return;
    }
    await addQuestion(formData);
    setShowAdminForm(false);
    setFormData({ subject: '', subsubject: '', difficulty: 'medium', question: '', suggestedAnswer: '' });
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this bar question forever?")) {
      await deleteQuestion(id);
    }
  };

  // 🟢 AI SUBMISSION HANDLER WITH GUARD
  const handleSubmit = async () => {
    if (!userAnswer.trim() || !currentQuestion) return;

    // 🟢 ENFORCE THE LAW: Check practice limits (3 for Free, 20 for Premium)
    if (!checkAccess('practiceDaily')) {
      setShowUpgradeModal(true);
      return;
    }

    setIsGrading(true);
    setSubmitted(true);
    try {
      // 🟢 BILLING: Increment the practice count in real-time
      if (user && user.role !== 'admin' && user.email !== 'rashemvanrondina@gmail.com') {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          'usage.dailyPracticeCount': increment(1)
        });
      }

      // 🟢 FIX: Clean URL with proper /api/practice endpoint
      const response = await fetch('https://lexcasus-backend.onrender.com/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: currentQuestion.question, 
          userAnswer: userAnswer, 
          suggestedAnswer: currentQuestion.suggestedAnswer 
        })
      });

      if (!response.ok) throw new Error("Server Error");

      const aiResult = await response.json();
      setFeedback(aiResult);
    } catch (error) {
      console.error(error);
      alert("AI grading failed. Please ensure your backend server is running.");
      setSubmitted(false);
    } finally {
      setIsGrading(false);
    }
  };

  const handleReset = () => {
    setSelectedQ(null);
    setUserAnswer('');
    setSubmitted(false);
    setShowSuggested(false);
    setFeedback(null);
  };

  return (
    <>
      {/* 🟢 THE PAYWALL MODAL */}
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
        featureName="Bar Practice AI" 
        limitText={user?.subscription === 'free' ? "daily limit of 5 submissions" : "daily limit of 20 submissions"} 
      />

      <div className="space-y-6 animate-fade-in text-left">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Practice Bar</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">AI-powered Bar exam practice with ALAC feedback</p>
          </div>
          
          <div className="flex gap-2">
            {selectedQ && (
              <button onClick={handleReset} className="btn-secondary">
                <RotateCcw className="w-4 h-4" /> Choose Another
              </button>
            )}
            {isAdmin && !selectedQ && (
              <button onClick={() => setShowAdminForm(!showAdminForm)} className="btn-primary bg-red-700 hover:bg-red-800 border-none">
                {showAdminForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAdminForm ? 'Close Editor' : 'Publish Question'}
              </button>
            )}
          </div>
        </div>

        {isAdmin && showAdminForm && !selectedQ && (
          <div className="card p-6 border-2 border-red-500/50 bg-red-50/30 space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input className="input-field" placeholder="Subject (e.g. Remedial Law)" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} />
              <input className="input-field" placeholder="Sub-Subject (e.g. Civil Procedure)" value={formData.subsubject} onChange={e => setFormData({...formData, subsubject: e.target.value})} />
              <select className="input-field" value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value as 'easy'|'medium'|'hard'})}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <textarea className="input-field min-h-[100px]" placeholder="The Facts & Question prompt..." value={formData.question} onChange={e => setFormData({...formData, question: e.target.value})} />
            <textarea className="input-field min-h-[150px]" placeholder="Suggested ALAC Answer (The 'perfect' answer for the AI to base grading on)..." value={formData.suggestedAnswer} onChange={e => setFormData({...formData, suggestedAnswer: e.target.value})} />
            <button onClick={handleAdminSave} className="btn-primary bg-red-700 w-full border-none">Publish to Server</button>
          </div>
        )}

        {!selectedQ ? (
          <>
            <div className="flex flex-wrap gap-2">
              {subjects.map(subject => (
                <button
                  key={subject}
                  onClick={() => setSelectedSubject(subject)}
                  className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', selectedSubject === subject ? 'bg-navy-800 text-white dark:bg-gold-500 dark:text-navy-900' : 'bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-400')}
                >
                  {subject === 'all' ? 'All Subjects' : subject}
                </button>
              ))}
            </div>

            {loading ? (
                <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-gold-500" /></div>
            ) : questions.length === 0 ? (
                <div className="text-center p-20 text-gray-500">No bar questions published yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredQuestions.map((q) => (
                  <div key={q.id} className="card-hover p-5 cursor-pointer relative group" onClick={() => setSelectedQ(q.id)}>
                    {isAdmin && (
                      <button onClick={(e) => handleDelete(e, q.id)} className="absolute top-4 right-4 p-2 bg-red-100 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-200">
                        <Trash2 size={16} />
                      </button>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="badge-navy">{q.subject}</span>
                      <span className={cn('badge', q.difficulty === 'easy' ? 'badge-green' : q.difficulty === 'medium' ? 'bg-amber-100 text-amber-800' : 'badge-red')}>
                        <Star className="w-3 h-3 mr-1" /> {q.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{q.subsubject}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{truncate(q.question, 200)}</p>
                    <div className="mt-3 flex items-center gap-1 text-xs text-navy-600 dark:text-gold-400 font-medium">
                      Answer this question <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : !submitted ? (
          currentQuestion && (
            <div className="card p-6 space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="badge-navy">{currentQuestion.subject}</span>
                  <span className="badge-gold">{currentQuestion.subsubject}</span>
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                  {currentQuestion.question}
                </h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your Answer</label>
                <textarea
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  placeholder="Write your answer using the ALAC format: Answer, Legal Basis, Analysis, Conclusion..."
                  rows={10}
                  className="input-field min-h-[200px] resize-y"
                />
              </div>

              <div className="flex items-center justify-between">
                <button onClick={() => setShowSuggested(!showSuggested)} className="text-sm text-gray-500 hover:text-navy-600 flex items-center gap-1">
                  {showSuggested ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {showSuggested ? 'Hide' : 'Show'} Suggested Answer
                </button>
                
                <button onClick={handleSubmit} disabled={!userAnswer.trim() || isGrading} className="btn-primary">
                  {isGrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isGrading ? 'AI is Grading...' : 'Submit Answer'}
                </button>
              </div>

              {showSuggested && (
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 animate-fade-in">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-2">Suggested Answer:</p>
                  <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed whitespace-pre-wrap">{currentQuestion.suggestedAnswer}</p>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="space-y-4 animate-fade-in">
            {isGrading ? (
              <div className="card p-20 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-12 h-12 text-gold-500 animate-spin mb-4" />
                <h3 className="text-lg font-bold text-navy-900 dark:text-white">Evaluating your ALAC structure...</h3>
              </div>
            ) : feedback ? (
              <>
                <div className="card p-6">
                  <div className="flex items-center gap-4">
                    <div className={cn('w-20 h-20 rounded-2xl flex items-center justify-center', feedback.score >= 80 ? 'bg-emerald-100' : feedback.score >= 60 ? 'bg-amber-100' : 'bg-red-100')}>
                      <span className={cn('text-2xl font-bold', feedback.score >= 80 ? 'text-emerald-600' : feedback.score >= 60 ? 'text-amber-600' : 'text-red-600')}>
                        {feedback.score}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Evaluation Complete</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {feedback.score >= 80 ? 'Excellent work, Atty.!' : feedback.score >= 60 ? 'Good attempt, Atty. Room for improvement.' : 'Keep practicing, Atty.!'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 🟢 ALAC FEEDBACK GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="card p-5">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Answer</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{getSafeText(feedback.answer)}</p>
                  </div>
                  <div className="card p-5">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-2"><BookOpen className="w-4 h-4 text-blue-500" /> Legal Basis</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{getSafeText(feedback.legalBasis)}</p>
                  </div>
                  <div className="card p-5">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-2"><AlertCircle className="w-4 h-4 text-amber-500" /> Analysis</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{getSafeText(feedback.analysis)}</p>
                  </div>
                  <div className="card p-5">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-2"><Star className="w-4 h-4 text-gold-500" /> Conclusion</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{getSafeText(feedback.conclusion)}</p>
                  </div>
                </div>

                <div className="card p-5">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Your Submitted Answer</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{userAnswer}</p>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
};

export default PracticeBarPage;