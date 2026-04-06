import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { sendPasswordResetEmail, signInWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import {
  Scale, Mail, Lock, Eye, EyeOff, ArrowRight, BookOpen, FileText,
  Brain, MessageSquare, ChevronLeft, Shield, MailCheck, AlertCircle,
  FolderOpen, X, Sparkles, Sun, Moon, Layers, ChevronDown, CheckCircle2,
  Crown, Diamond, Zap, Check, ShieldCheck, Clock, Target, Coffee
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';

/* ─── 🟢 CUSTOM GOOGLE ICON SVG ─── */
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

/* ─── 🎯 NATIVE COLOR EXTRACTION ─── */
function getAverageColor(img: HTMLImageElement): Promise<{ r: number, g: number, b: number }> {
  return new Promise((resolve) => {
    const fallback = { r: 212, g: 168, b: 67 }; 
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx) return resolve(fallback);

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    try {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 40) {
        r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
      }
      resolve({ r: Math.floor(r / count), g: Math.floor(g / count), b: Math.floor(b / count) });
    } catch (e) {
      resolve(fallback);
    }
  });
}

/* ─── FEATURES ─── */
const features = [
  { id: 0, title: 'Practice Bar AI', desc: 'Simulate the Bar Exam with Answer,Legal Basis, Application/Analysis and Conclusion (ALAC) formatted answers and instant AI evaluation.', icon: Brain, image: '/images/mockup-bar.png' },
  { id: 1, title: 'Case Digest Generator', desc: 'Instantly transform full-text Supreme Court cases into structured, readable digests.', icon: FileText, image: '/images/mockup-digest.png' },
  { id: 2, title: 'Case Flashcards', desc: 'Automatically generate high-yield review flashcards from your case digests and notes.', icon: Layers, image: '/images/mockup-flashcards.png' },
  { id: 3, title: 'Legal Chat AI', desc: 'Ask complex Philippine law queries and receive intelligent, cited answers.', icon: MessageSquare, image: '/images/mockup-chat.png' },
  { id: 4, title: 'E-Codals Library', desc: 'Browse complete statutory provisions and attach your personal margin notes and integrate your own case digests..', icon: BookOpen, image: '/images/mockup-codals.png' },
  { id: 5, title: 'Document Vault', desc: 'A secure, organized digital briefcase to save your notes, digests, and research.', icon: FolderOpen, image: '/images/mockup-vault.png' }
];

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, register, loginWithGoogle } = useAuthStore();

  /* ─── APP STATE ─── */
  const [isDark, setIsDark] = useState(true); 
  const [isShowcaseMode, setIsShowcaseMode] = useState(false); 
  const [activeIndex, setActiveIndex] = useState(0);
  const [colors, setColors] = useState({ r: 212, g: 168, b: 67 });

  /* ─── AUTH STATE ─── */
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [referralCode, setReferralCode] = useState(''); // 🟢 Added Referral State
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  /* ─── 🎯 AUTO COLOR EXTRACTION ─── */
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = features[activeIndex].image;
    img.onload = async () => {
      const extracted = await getAverageColor(img);
      setColors(extracted);
    };
    img.onerror = () => setColors({ r: 212, g: 168, b: 67 });
  }, [activeIndex]);

  /* ─── 🖱️ PARALLAX ─── */
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const handleMouseMove = (e: React.MouseEvent) => {
    const { innerWidth, innerHeight } = window;
    mouseX.set((e.clientX - innerWidth / 2) / 60);
    mouseY.set((e.clientY - innerHeight / 2) / 60);
  };

  /* ─── AUTH HANDLERS ─── */
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (loading) return;
    setLoading(true); setError(null);
    try { await sendPasswordResetEmail(auth, forgotEmail); setForgotSent(true); } 
    catch (err: any) { setError(err.message || "Failed to send reset email."); } 
    finally { setLoading(false); }
  };
  const resetForgotFlow = () => { setIsForgotPassword(false); setForgotSent(false); setForgotEmail(''); setError(null); };

  const handleResendVerification = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCred.user);
      await signOut(auth);
      setVerificationSent(true);
    } catch (err: any) {
      setError("Failed to resend link. Please ensure your password is correct.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (loading) return; 
    setLoading(true); 
    setError(null);
    try {
      if (isRegister) {
        // 🟢 Pass the referral code to the register function
        const success = await register(name, email, password, referralCode);
        if (success) setVerificationSent(true);
        else setError(useAuthStore.getState().error || "Registration failed.");
      } else {
        const success = await login(email, password);
        if (success) setTimeout(() => navigate(useAuthStore.getState().isAdmin ? '/admin' : '/dashboard'), 400);
        else setError(useAuthStore.getState().error || "Invalid credentials.");
      }
    } catch { setError("Unexpected error."); } 
    finally { setLoading(false); }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true); setError(null);
    try {
      const success = await loginWithGoogle();
      if (success) setTimeout(() => navigate(useAuthStore.getState().isAdmin ? '/admin' : '/dashboard'), 400);
      else setError(useAuthStore.getState().error || "Google Sign-In failed.");
    } catch { setError("Unexpected error during Google Sign-In."); } 
    finally { setLoading(false); }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const viewKey = verificationSent ? 'verify-email' : isForgotPassword ? (forgotSent ? 'forgot-success' : 'forgot-email') : (isRegister ? 'register' : 'login');

  return (
    <div onMouseMove={handleMouseMove} className={`min-h-screen transition-colors duration-700 relative font-sans ${isDark ? 'bg-[#02040A] text-white' : 'bg-slate-50 text-slate-900'}`}>

      {/* 🎬 DYNAMIC FIXED BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          key={`${colors.r}-${colors.g}-${colors.b}`} 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}
          className="absolute inset-0" 
          style={{ background: `radial-gradient(circle at 50% 40%, rgba(${colors.r}, ${colors.g}, ${colors.b}, ${isDark ? 0.35 : 0.15}), transparent 75%)` }}
        />
        <div className={`absolute inset-0 opacity-[0.04] ${isDark ? 'bg-white' : 'bg-slate-900'}`} style={{ backgroundImage: `linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />
      </div>

      <div className="relative z-10">
        {/* ─── NAVBAR ─── */}
        <nav className="fixed top-0 left-0 right-0 z-40 backdrop-blur-md bg-transparent border-b border-white/5">
          <div className="flex items-center justify-between px-6 py-4 sm:px-12 max-w-7xl mx-auto w-full">
            <button onClick={() => { setIsShowcaseMode(false); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-9 h-9 bg-gradient-to-br from-gold-400 to-gold-600 rounded-xl flex items-center justify-center shadow-lg"><Scale className="w-5 h-5 text-white" /></div>
              <span className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>LexCasus</span>
            </button>
            
            <div className="flex items-center gap-4">
              <button onClick={() => setIsDark(!isDark)} className={`p-2 rounded-full transition-colors ${isDark ? 'text-white/50 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-900'}`}>
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button onClick={() => { setIsRegister(false); setVerificationSent(false); setIsAuthModalOpen(true); }} className={`text-sm font-bold px-6 py-2.5 rounded-full transition-all border shadow-lg ${isDark ? 'text-navy-900 bg-white border-white hover:bg-gray-100 shadow-white/10' : 'text-white bg-slate-900 border-slate-900 hover:bg-slate-800 shadow-slate-900/10'}`}>
                Sign In
              </button>
            </div>
          </div>
        </nav>

        {/* ─── 1. HERO SECTION ─── */}
        <section className="relative min-h-screen flex flex-col items-center justify-center w-full px-4 sm:px-6 lg:px-12 pt-20 pb-24">
          <AnimatePresence mode="wait">
            {!isShowcaseMode ? (
              <motion.div key="hero-state" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }} transition={{ duration: 0.5 }} className="text-center max-w-4xl w-full flex flex-col items-center">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase mb-6 backdrop-blur-md border ${isDark ? 'bg-white/5 border-white/10 text-gold-400' : 'bg-white border-slate-200 text-gold-600 shadow-sm'}`}>
                  <Sparkles className="w-3 h-3" /> Intelligence-Powered Law
                </div>
                <h1 className={`text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-[1.05] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  The Digital Gavel <br />
                  <span className={`text-transparent bg-clip-text bg-gradient-to-r ${isDark ? 'from-gold-300 via-gold-400 to-gold-600' : 'from-gold-500 to-gold-700'}`}>for the Modern Attorney</span>
                </h1>
                <p className={`mt-8 text-lg sm:text-xl max-w-2xl font-medium ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                  Simulate Bar exams with AI, instantly generate case digests, and manage your legal research inside one intelligent dashboard.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row gap-4">
                  <button onClick={() => { setIsRegister(true); setVerificationSent(false); setIsAuthModalOpen(true); }} className={`group relative overflow-hidden px-8 py-4 rounded-full font-bold text-sm transition-transform hover:scale-105 active:scale-95 ${isDark ? 'bg-gold-500 text-navy-950 shadow-[0_0_30px_rgba(212,168,67,0.3)]' : 'bg-gold-500 text-white shadow-xl shadow-gold-500/30'}`}>
                    <span className="relative z-10 flex items-center gap-2">Start Your Free Trial <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></span>
                  </button>
                  <button onClick={() => scrollToSection('why-choose-us')} className={`px-8 py-4 rounded-full font-bold text-sm transition-colors border ${isDark ? 'border-white/20 text-white hover:bg-white/5' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                    See How It Works
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="showcase-state" initial={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.5 }} className="w-full flex flex-col items-center">
                <div className="w-full flex justify-center h-[50vh] sm:h-[55vh]">
                  <div className={`p-2 sm:p-3 rounded-2xl sm:rounded-[2rem] border shadow-2xl flex items-center justify-center relative backdrop-blur-md h-full w-auto max-w-full ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/80 border-slate-200'}`}>
                    <AnimatePresence mode="wait">
                      <motion.img key={activeIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} src={features[activeIndex].image} alt={features[activeIndex].title} className="h-full w-auto max-w-full object-contain rounded-xl sm:rounded-[1.5rem]" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </AnimatePresence>
                  </div>
                </div>
                <div className="mt-8 text-center max-w-2xl flex flex-col items-center px-4">
                  <AnimatePresence mode="wait">
                    <motion.div key={activeIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="flex flex-col items-center">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg ${isDark ? 'bg-white/10 border border-white/10 shadow-gold-500/10' : 'bg-white border border-slate-200 shadow-slate-200'}`}>
                        {React.createElement(features[activeIndex].icon, { className: `w-6 h-6 ${isDark ? 'text-gold-400' : 'text-gold-600'}` })}
                      </div>
                      <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>{features[activeIndex].title}</h2>
                      <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-white/60' : 'text-slate-600'}`}>{features[activeIndex].desc}</p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Interactive Feature Dock (Hero Only) */}
          <div className={`absolute bottom-24 sm:bottom-12 z-30 flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-2xl border backdrop-blur-xl shadow-2xl ${isDark ? 'bg-[#0A0F1D]/80 border-white/10' : 'bg-white/90 border-slate-200'}`}>
            {features.map((f, i) => {
              const isActive = activeIndex === i && isShowcaseMode;
              return (
                <button key={f.id} onClick={() => { setActiveIndex(i); setIsShowcaseMode(true); }} className={`flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl transition-all duration-300 ${isActive ? (isDark ? 'bg-white/10 text-white shadow-inner scale-105' : 'bg-slate-100 text-slate-900 scale-105 shadow-sm') : (isDark ? 'text-white/50 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50')}`}>
                  <f.icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${isActive ? (isDark ? 'text-gold-400' : 'text-gold-600') : ''}`} />
                  <span className="hidden md:block text-xs font-bold whitespace-nowrap">{f.title}</span>
                </button>
              );
            })}
          </div>

          <button onClick={() => scrollToSection('features')} className="absolute bottom-6 animate-bounce p-2 text-white/50 hover:text-white transition-colors">
            <ChevronDown size={32} />
          </button>
        </section>

        {/* ─── 2. FEATURES SECTION ─── */}
        <section id="features" className="py-24 px-6 max-w-7xl mx-auto w-full">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-5xl font-black tracking-tight mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>How LexCasus Helps Law Students</h2>
            <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Your entire law school arsenal packed into one intelligent, AI-driven dashboard.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className={`p-8 rounded-3xl border transition-all hover:-translate-y-1 ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-200 hover:shadow-xl'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${isDark ? 'bg-gold-500/20 text-gold-400' : 'bg-gold-100 text-gold-600'}`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className={`text-xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>{f.title}</h3>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-white/60' : 'text-slate-600'}`}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── 3. HOW IT WORKS ─── */}
        <section className={`py-24 ${isDark ? 'bg-[#050814]' : 'bg-slate-100'}`}>
          <div className="px-6 max-w-7xl mx-auto w-full">
            <div className="text-center mb-16">
              <h2 className={`text-3xl md:text-5xl font-black tracking-tight mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>The Workflow</h2>
              <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-white/60' : 'text-slate-600'}`}>From syllabus to Bar Exam, LexCasus is built to streamline your study process.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-transparent via-gold-500/50 to-transparent z-0"></div>
              
              {[
                { step: '01', title: 'Upload & Digest', desc: 'Feed the AI full-text jurisprudence or specific topics. It instantly outputs FACTS, ISSUE/S, RULING-formatted digests and core doctrines.' },
                { step: '02', title: 'Annotate & Save', desc: 'Save digests to your secure Vault. Open E-Codals side-by-side to cross-reference and write personal margin notes.' },
                { step: '03', title: 'Simulate & Ace', desc: 'Use the AI Chat to ask complex questions, or take the Mock Bar to get graded on your analytical reasoning in real-time.' }
              ].map((item, i) => (
                <div key={i} className="relative z-10 flex flex-col items-center text-center">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center text-2xl font-black mb-6 shadow-xl ${isDark ? 'bg-[#0A0F1D] border-4 border-[#02040A] text-gold-400' : 'bg-white border-4 border-slate-100 text-gold-600'}`}>
                    {item.step}
                  </div>
                  <h3 className={`text-xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.title}</h3>
                  <p className={`text-sm leading-relaxed ${isDark ? 'text-white/60' : 'text-slate-600'}`}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 4. WHY CHOOSE LEXCASUS (NEW SECTION) ─── */}
        <section id="why-choose-us" className="py-24 px-6 max-w-7xl mx-auto w-full">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-5xl font-black tracking-tight mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Why Make LexCasus Your Study Hub?</h2>
            <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Stop drowning in browser tabs, PDFs, and scattered Word documents.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}><Zap size={24} /></div>
                <div>
                  <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>The Ultimate Time Multiplier</h3>
                  <p className={`text-sm leading-relaxed ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Reduce a 100-page Supreme Court ruling into a 1-page digest in exactly 5 seconds. Get back your weekends and sleep schedules.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}><Target size={24} /></div>
                <div>
                  <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Beat the Terror Professor</h3>
                  <p className={`text-sm leading-relaxed ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Never get caught off-guard during recitation. Our AI anticipates the toughest follow-up questions so you can stand with confidence.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center ${isDark ? 'bg-gold-500/20 text-gold-400' : 'bg-gold-100 text-gold-600'}`}><FolderOpen size={24} /></div>
                <div>
                  <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>One Centralized Vault</h3>
                  <p className={`text-sm leading-relaxed ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Your Codals, Case Digests, Notes, and Mock Exams—all living inside one beautifully designed ecosystem accessible anywhere.</p>
                </div>
              </div>
            </div>
            
            <div className={`p-8 rounded-[2rem] border relative overflow-hidden ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200 shadow-xl'}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-gold-500/10 to-transparent opacity-50" />
              <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                <Clock size={48} className={isDark ? 'text-gold-400' : 'text-gold-600'} />
                <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Law school is a marathon. <br/> Stop running it with weights on.</h3>
                <p className={`text-sm ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                  Traditional law students spend 80% of their time reading and 20% retaining. Lex Casus flips that ratio. Spend 20% of your time extracting the law, and 80% of your time mastering it.
                </p>
                <button onClick={() => scrollToSection('pricing')} className="mt-4 px-8 py-3 rounded-xl font-bold bg-gold-500 text-navy-950 hover:bg-gold-400 shadow-lg shadow-gold-500/20 transition-all">
                  See Pricing Plans
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 5. HIGH-CONVERTING PRICING SECTION ─── */}
        <section id="pricing" className={`py-24 ${isDark ? 'bg-[#050814]' : 'bg-slate-100'}`}>
          <div className="px-6 max-w-7xl mx-auto w-full">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase mb-4 bg-gold-500/10 text-gold-500 border border-gold-500/20">
                <Sparkles className="w-4 h-4" /> Founding Member Promo
              </div>
              <h2 className={`text-3xl md:text-5xl font-black tracking-tight mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Choose Your Study Buddy</h2>
              <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-white/60' : 'text-slate-600'}`}>Unlock your unfair advantage today. Cancel anytime.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Free Tier */}
              <div className={`p-8 rounded-[2rem] border flex flex-col ${isDark ? 'bg-[#0A0F1D] border-white/10' : 'bg-white border-slate-200 shadow-lg'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-3 rounded-xl ${isDark ? 'bg-navy-900 text-navy-400' : 'bg-slate-100 text-slate-600'}`}><Shield size={24} /></div>
                  <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Free Access</h3>
                </div>
                <p className={`text-sm mb-6 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>The basic toolkit to get started.</p>
                
                <div className="mb-6"><span className={`text-4xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>₱0</span></div>
                
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /><span className={isDark ? 'text-white/70' : 'text-slate-600'}><strong>10</strong> AI Chat Queries / day</span></li>
                  <li className="flex gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /><span className={isDark ? 'text-white/70' : 'text-slate-600'}><strong>5</strong> Case Digests / day</span></li>
                  <li className="flex gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /><span className={isDark ? 'text-white/70' : 'text-slate-600'}><strong>100</strong> E-Codal Notes</span></li>
                  <li className="flex gap-3 text-sm opacity-40"><X className="w-5 h-5 text-gray-500 shrink-0" /><span className="line-through text-gray-500">AI Case Deconstruction</span></li>
                  <li className="flex gap-3 text-sm opacity-40"><X className="w-5 h-5 text-gray-500 shrink-0" /><span className="line-through text-gray-500">Priority AI Speed</span></li>
                </ul>
                <button onClick={() => { setIsRegister(true); setIsAuthModalOpen(true); }} className={`w-full py-4 rounded-xl font-bold transition-colors border ${isDark ? 'bg-transparent text-white border-white/20 hover:bg-white/10' : 'bg-transparent text-slate-900 border-slate-300 hover:bg-slate-50'}`}>Start Free</button>
              </div>

              {/* Premium Tier */}
              <div className={`p-8 rounded-[2rem] border-2 relative flex flex-col transform md:-translate-y-4 shadow-2xl ${isDark ? 'bg-[#0A0F1D] border-gold-500 shadow-gold-500/10' : 'bg-white border-gold-500 shadow-gold-500/20'}`}>
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gold-500 text-navy-950 font-black text-[10px] tracking-widest uppercase px-4 py-1.5 rounded-full">Most Availed</div>
                
                <div className="flex items-center gap-3 mb-2 mt-2">
                  <div className="p-3 rounded-xl bg-gold-500/20 text-gold-500"><Crown size={24} /></div>
                  <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Premium</h3>
                </div>
                <p className={`text-sm mb-4 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>The essential toolkit for serious students.</p>

                <div className="mb-2 flex items-end gap-2">
                  <span className="text-gray-400 line-through text-lg font-bold">₱199</span>
                  <span className={`text-5xl font-black ${isDark ? 'text-gold-400' : 'text-gold-600'}`}>₱169</span><span className="text-gray-500">/mo</span>
                </div>
                
                {/* 🟢 COFFEE COMPARISON */}
                <div className={`flex items-center gap-2 p-2 rounded-lg mb-6 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                  <Coffee className={`w-4 h-4 ${isDark ? 'text-gold-400' : 'text-gold-600'}`} />
                  <p className={`text-[11px] font-medium ${isDark ? 'text-white/70' : 'text-slate-600'}`}>Less than the cost of one iced coffee.</p>
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-gold-500 shrink-0" /><span className={isDark ? 'text-white/90' : 'text-slate-700'}><strong>Unlimited</strong> AI Chat</span></li>
                  <li className="flex gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-gold-500 shrink-0" /><span className={isDark ? 'text-white/90' : 'text-slate-700'}><strong>500</strong> AI Deconstructions</span></li>
                  <li className="flex gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-gold-500 shrink-0" /><span className={isDark ? 'text-white/90' : 'text-slate-700'}><strong>50</strong> Case Digests / day</span></li>
                  <li className="flex gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-gold-500 shrink-0" /><span className={isDark ? 'text-white/90' : 'text-slate-700'}><strong>500</strong> E-Codal Notes</span></li>
                </ul>
                <button onClick={() => { setIsRegister(true); setIsAuthModalOpen(true); }} className="w-full py-4 rounded-xl font-bold bg-gold-500 text-navy-950 hover:bg-gold-400 shadow-lg transition-all">Claim Promo Price</button>
              </div>

              {/* Premium+ Tier */}
              <div className={`p-8 rounded-[2rem] border relative flex flex-col overflow-hidden ${isDark ? 'bg-[#0A0F1D] border-purple-500/30' : 'bg-white border-purple-200 shadow-lg'}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
                
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 rounded-xl bg-purple-500/20 text-purple-500"><Diamond size={24} /></div>
                  <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Premium+</h3>
                </div>
                <p className={`text-sm mb-4 ${isDark ? 'text-purple-300/80' : 'text-purple-600/80'}`}>The ultimate Bar Exam advantage.</p>

                <div className="mb-2 flex items-end gap-2">
                  <span className="text-gray-400 line-through text-lg font-bold">₱599</span>
                  <span className={`text-4xl font-black ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>₱499</span><span className="text-gray-500">/mo</span>
                </div>
                
                {/* 🟢 FOMO TRIGGER */}
                <div className={`flex items-center gap-2 p-2 rounded-lg mb-6 ${isDark ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-100'}`}>
                  <Lock className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-500'}`} />
                  <p className={`text-[11px] font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>Lock in this discounted rate forever.</p>
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" /><span className={isDark ? 'text-white font-bold' : 'text-slate-900 font-bold'}>Unlimited Everything</span></li>
                  <li className="flex gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" /><span className={isDark ? 'text-white/80' : 'text-slate-700'}>Unlimited Bar Practice</span></li>
                  <li className="flex gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" /><span className={isDark ? 'text-white/80' : 'text-slate-700'}>Unlimited Case Digests</span></li>
                  <li className="flex gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" /><span className={isDark ? 'text-white/80' : 'text-slate-700'}>Priority AI Processing</span></li>
                </ul>
                <button onClick={() => { setIsRegister(true); setIsAuthModalOpen(true); }} className="w-full py-4 rounded-xl font-bold bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-500/20 transition-all relative z-10">Go Limitless</button>
              </div>
            </div>
            
            <div className="mt-12 flex items-center justify-center gap-2 text-sm text-gray-500">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <span className="font-medium">Secure, encrypted payments handled via officially registered GCash.</span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className={`py-8 text-center text-sm ${isDark ? 'bg-[#02040A] text-white/30 border-t border-white/5' : 'bg-white text-slate-400 border-t border-slate-200'}`}>
          <p>© 2026 Lex Casus AI. All rights reserved. Built for Philippine Law Students.</p>
        </footer>

      </div>

      {/* ─── AUTHENTICATION MODAL ─── */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md ${isDark ? 'bg-black/60' : 'bg-slate-900/40'}`}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className={`w-full max-w-md backdrop-blur-xl border rounded-3xl p-8 relative shadow-2xl ${isDark ? 'bg-[#0A0F1D]/95 border-white/10' : 'bg-white/95 border-slate-200'}`}>
              <button onClick={() => { setIsAuthModalOpen(false); resetForgotFlow(); setVerificationSent(false); }} className={`absolute top-5 right-5 p-2 rounded-full transition-colors ${isDark ? 'text-white/50 hover:text-white bg-white/5 hover:bg-white/10' : 'text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200'}`}><X className="w-5 h-5" /></button>
              
              <AnimatePresence mode="wait">
                <motion.div key={viewKey} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                  
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <div className="w-8 h-8 bg-gradient-to-br from-gold-400 to-gold-600 rounded-lg flex items-center justify-center shadow-lg"><Scale className="w-4 h-4 text-white" /></div>
                    <span className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>LexCasus</span>
                  </div>

                  {/* 🟢 ENHANCED ERROR BANNER WITH RESEND VERIFICATION BUTTON */}
                  {error && (
                    <div className={`mb-6 p-3 rounded-xl flex flex-col gap-2 border ${isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-start gap-3">
                        <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
                        <p className={`text-xs leading-relaxed ${isDark ? 'text-red-200' : 'text-red-700'}`}>{error}</p>
                      </div>
                      {error.includes("verify your email") && (
                        <button onClick={handleResendVerification} disabled={loading} className={`text-xs font-bold underline text-left ml-8 transition-opacity ${loading ? 'opacity-50' : 'hover:opacity-80'} ${isDark ? 'text-gold-400' : 'text-gold-600'}`}>
                          {loading ? 'Sending...' : 'Resend Verification Link'}
                        </button>
                      )}
                    </div>
                  )}

                  {verificationSent ? (
                    <div className="text-center space-y-6 py-4">
                      <div className="flex justify-center"><div className={`w-16 h-16 rounded-full flex items-center justify-center border ${isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'}`}><MailCheck className={`w-8 h-8 ${isDark ? 'text-green-400' : 'text-green-500'}`} /></div></div>
                      <div>
                        <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Verify Your Email</h2>
                        <p className={`mt-2 text-sm ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
                          A secure verification link has been sent to <span className="font-bold">{email}</span>. Please click the link to activate your LexCasus account.
                        </p>
                      </div>
                      <button onClick={() => { setVerificationSent(false); setIsRegister(false); setError(null); setEmail(''); setPassword(''); }} className={`w-full py-3.5 rounded-xl font-bold text-sm transition-colors ${isDark ? 'bg-white text-navy-950 hover:bg-gray-100' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                        Back to Sign In
                      </button>
                    </div>
                  ) : isForgotPassword && forgotSent ? (
                    <div className="text-center space-y-6 py-4">
                      <div className="flex justify-center"><div className={`w-16 h-16 rounded-full flex items-center justify-center border ${isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'}`}><MailCheck className={`w-8 h-8 ${isDark ? 'text-green-400' : 'text-green-500'}`} /></div></div>
                      <div><h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Check Your Email</h2><p className={`mt-2 text-sm ${isDark ? 'text-white/60' : 'text-slate-500'}`}>We sent a reset link to <span className="font-medium">{forgotEmail}</span></p></div>
                      <button onClick={resetForgotFlow} className={`w-full py-3.5 rounded-xl font-bold text-sm transition-colors ${isDark ? 'bg-white text-navy-950 hover:bg-gray-100' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>Back to Sign In</button>
                    </div>
                  ) : isForgotPassword && !forgotSent ? (
                    <div className="py-2">
                      <button onClick={resetForgotFlow} className={`flex items-center gap-1 text-xs transition-colors mb-4 ${isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}><ChevronLeft className="w-3.5 h-3.5" /> Back</button>
                      <h2 className={`text-2xl font-bold tracking-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Reset Password</h2><p className={`text-sm mb-6 ${isDark ? 'text-white/60' : 'text-slate-500'}`}>Enter your email and we'll send a recovery link.</p>
                      <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div className="relative flex items-center"><Mail className={`absolute left-4 w-4 h-4 ${isDark ? 'text-white/40' : 'text-slate-400'}`} /><input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="Email Address" className={`w-full pl-11 pr-4 py-3.5 rounded-xl border focus:outline-none focus:ring-1 transition-all text-sm ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-gold-500/50 focus:ring-gold-500/50' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-gold-500 focus:ring-gold-500'}`} required /></div>
                        <button type="submit" disabled={loading} className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-lg transition-shadow disabled:opacity-50 ${isDark ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-navy-950 shadow-gold-500/20 hover:shadow-gold-500/40' : 'bg-gradient-to-r from-gold-400 to-gold-500 text-white shadow-gold-500/30 hover:shadow-gold-500/50'}`}>{loading ? 'Sending...' : 'Send Reset Link'}</button>
                      </form>
                    </div>
                  ) : (
                    <div>
                      <div className="text-center mb-6"><h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{isRegister ? 'Create Account' : 'Welcome Back, Atty.'}</h2><p className={`mt-1.5 text-sm ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{isRegister ? 'Begin your legal journey' : 'Sign in to your dashboard'}</p></div>
                      
                      <form onSubmit={handleSubmit} className="space-y-4">
                        {isRegister && <div className="relative flex items-center"><Shield className={`absolute left-4 w-4 h-4 ${isDark ? 'text-white/40' : 'text-slate-400'}`} /><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className={`w-full pl-11 pr-4 py-3.5 rounded-xl border focus:outline-none focus:ring-1 transition-all text-sm ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-gold-500/50 focus:ring-gold-500/50' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-gold-500 focus:ring-gold-500'}`} required /></div>}
                        
                        <div className="relative flex items-center"><Mail className={`absolute left-4 w-4 h-4 ${isDark ? 'text-white/40' : 'text-slate-400'}`} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className={`w-full pl-11 pr-4 py-3.5 rounded-xl border focus:outline-none focus:ring-1 transition-all text-sm ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-gold-500/50 focus:ring-gold-500/50' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-gold-500 focus:ring-gold-500'}`} required /></div>
                        
                        <div className="relative flex items-center"><Lock className={`absolute left-4 w-4 h-4 ${isDark ? 'text-white/40' : 'text-slate-400'}`} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required minLength={6} className={`w-full pl-11 pr-11 py-3.5 rounded-xl border focus:outline-none focus:ring-1 transition-all text-sm ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-gold-500/50 focus:ring-gold-500/50' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-gold-500 focus:ring-gold-500'}`} /><button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute right-4 transition-colors ${isDark ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>

                        {/* 🟢 NEW REFERRAL CODE INPUT */}
                        {isRegister && (
                          <div className="relative flex items-center mt-2">
                            <Sparkles className={`absolute left-4 w-4 h-4 ${isDark ? 'text-gold-400/50' : 'text-gold-500/50'}`} />
                            <input 
                              type="text" 
                              value={referralCode} 
                              onChange={(e) => setReferralCode(e.target.value.toUpperCase())} 
                              placeholder="Referral Code (Optional)" 
                              maxLength={6}
                              className={`w-full pl-11 pr-4 py-3.5 rounded-xl border focus:outline-none focus:ring-1 transition-all text-sm font-bold tracking-widest ${isDark ? 'bg-gold-500/5 border-gold-500/20 text-gold-400 placeholder-gold-400/30 focus:border-gold-500 focus:ring-gold-500/50' : 'bg-gold-50 border-gold-200 text-gold-700 placeholder-gold-400 focus:border-gold-500 focus:ring-gold-500'}`} 
                            />
                          </div>
                        )}

                        {!isRegister && <div className="flex justify-end"><button type="button" onClick={() => { setIsForgotPassword(true); setError(null); }} className={`text-xs transition-colors ${isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>Forgot password?</button></div>}
                        
                        <button type="submit" disabled={loading} className={`w-full py-3.5 mt-2 rounded-xl font-bold text-sm shadow-lg transition-shadow disabled:opacity-50 flex justify-center items-center gap-2 ${isDark ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-navy-950 shadow-gold-500/20 hover:shadow-gold-500/40' : 'bg-gradient-to-r from-gold-400 to-gold-500 text-white shadow-gold-500/30 hover:shadow-gold-500/50'}`}>{loading ? 'Authenticating...' : (isRegister ? 'Create Account' : 'Sign In')}{!loading && <ArrowRight className="w-4 h-4" />}</button>
                      </form>

                      <div className="mt-6">
                        <div className="relative flex items-center py-2">
                          <div className={`flex-grow border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}></div>
                          <span className={`shrink-0 px-4 text-xs ${isDark ? 'text-white/30' : 'text-slate-400'}`}>OR</span>
                          <div className={`flex-grow border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}></div>
                        </div>
                        
                        <button type="button" onClick={handleGoogleLogin} disabled={loading} className={`w-full py-3 mt-2 rounded-xl font-bold text-sm border flex items-center justify-center gap-3 transition-colors disabled:opacity-50 ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm'}`}>
                          <GoogleIcon /> Continue with Google
                        </button>
                      </div>

                      <div className="mt-6 text-center"><button type="button" onClick={() => { setIsRegister(!isRegister); setError(null); }} className={`text-sm transition-colors ${isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>{isRegister ? 'Already a member? ' : 'New member? '}<span className={`font-semibold ${isDark ? 'text-gold-400' : 'text-gold-600'}`}>{isRegister ? 'Sign In' : 'Create Account'}</span></button></div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default LoginPage;