import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  X, Crown, Sparkles, CheckCircle2, ArrowRight, 
  Rocket, Calendar, Highlighter, Download, PhoneCall,
  BookOpen, Brain, MessageSquare, Target, Zap
} from 'lucide-react';

let sessionActiveUser: string | null = null;

const iconMap: Record<string, React.ElementType> = {
  Highlighter, Download, PhoneCall, Sparkles, Rocket, BookOpen, Brain, MessageSquare, Target, Zap
};

const PromoModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalType, setModalType] = useState<'promo' | 'whats_coming'>('promo');
  const [cloudSettings, setCloudSettings] = useState<any>(null);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      sessionActiveUser = null; 
      return;
    }

    // 🟢 THE FIX: Check the lock
    if (sessionActiveUser !== user.id) {
      // 🟢 THE FIX: Lock the gate IMMEDIATELY before any async delays!
      sessionActiveUser = user.id; 

      let timeoutId: NodeJS.Timeout;

      const initializeModal = async () => {
        let settings = null;

        try {
          const docRef = doc(db, 'settings', 'announcements');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            settings = docSnap.data();
            setCloudSettings(settings);
          }
        } catch (error) {
          console.error("Failed to fetch promo settings:", error);
        }

        if (settings?.isActive === false) {
          return; // Gate is already locked above, just exit gracefully
        }

        let nextType = localStorage.getItem('lexcasus_modal_rotation') as 'promo' | 'whats_coming' || 'promo';

        if (user.subscription === 'premium_plus') {
          nextType = 'whats_coming';
        }

        setModalType(nextType);

        timeoutId = setTimeout(() => {
          setIsOpen(true);

          if (user.subscription !== 'premium_plus') {
            const subsequentType = nextType === 'promo' ? 'whats_coming' : 'promo';
            localStorage.setItem('lexcasus_modal_rotation', subsequentType);
          }
        }, 800);
      };

      initializeModal();

      // Cleanup function to clear timeouts if React unmounts
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
    }
  }, [user]);

  const handleUpgradeClick = () => {
    setIsOpen(false);
    navigate('/billing'); 
  };

  const promoTitle = cloudSettings?.promo?.title || "Upgrade to Premium+";
  const oldPrice = cloudSettings?.promo?.priceOld || 599;
  const newPrice = cloudSettings?.promo?.priceNew || 499;
  const defaultPromoFeatures = ["Unlimited Legal Chat AI Queries", "Unlimited Case Digests", "Unlimited Bar Exam Practice AI"];
  const promoFeatures = cloudSettings?.promo?.features || defaultPromoFeatures;

  const defaultRoadmap = [
    { title: 'Smart Highlighting', desc: 'Highlight specific words directly inside codal provisions.', icon: 'Highlighter' },
    { title: 'Full Study Downloads', desc: 'Download entire provisions for offline review.', icon: 'Download' },
    { title: '1-on-1 AI Audio Coach', desc: 'Call your AI coach for real-time recitation.', icon: 'PhoneCall' }
  ];
  const roadmapItems = cloudSettings?.roadmap?.items || defaultRoadmap;

  const renderIcon = (iconName: string, className: string) => {
    const IconComponent = iconMap[iconName] || Sparkles; 
    return <IconComponent className={className} />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-black/60">
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl bg-white dark:bg-[#0A0F1D] border-2 border-gold-500/30 dark:border-navy-800 shadow-2xl rounded-[2rem] overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
          >
            <button 
              onClick={() => setIsOpen(false)} 
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 🟢 PROMO VIEW */}
            {modalType === 'promo' && (
              <>
                <div className="bg-gradient-to-br from-gold-400 to-gold-600 p-8 md:w-2/5 flex flex-col justify-center items-center text-center text-navy-950">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-sm flex items-center justify-center mb-4 shadow-inner">
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-white mb-2">Pass the Bar. <br/> Without the Burnout.</h3>
                  <p className="text-gold-100 text-sm font-medium">Unlock the full power of Lex Casus AI.</p>
                </div>

                <div className="p-8 md:w-3/5 flex flex-col justify-center overflow-y-auto">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold tracking-widest uppercase w-max mb-2">
                    <Sparkles className="w-3.5 h-3.5" /> Limited Time Promo
                  </div>
                  
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{promoTitle}</h4>
                  
                  <div className="flex items-end gap-2 mb-5">
                    <span className="text-gray-400 dark:text-gray-500 line-through text-lg font-medium decoration-2">₱{oldPrice}</span>
                    <span className="text-4xl font-black text-gold-600 dark:text-gold-400 leading-none">₱{newPrice}</span>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">/ month</span>
                  </div>

                  <div className="space-y-3 mb-8">
                    {promoFeatures.map((feat: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-gold-500 shrink-0" />
                        <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">{feat}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                    <button onClick={handleUpgradeClick} className="flex-1 py-3 px-4 bg-gold-500 hover:bg-gold-400 text-navy-900 font-bold rounded-xl shadow-lg shadow-gold-500/20 transition-all flex items-center justify-center gap-2">
                      Claim Offer Now <ArrowRight className="w-4 h-4" />
                    </button>
                    <button onClick={() => setIsOpen(false)} className="py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-navy-800 dark:hover:bg-navy-700 text-gray-600 dark:text-gray-300 font-semibold rounded-xl transition-colors">
                      Maybe Later
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* 🟢 ROADMAP VIEW */}
            {modalType === 'whats_coming' && (
              <>
                <div className="bg-gradient-to-br from-blue-500 to-indigo-700 p-8 md:w-2/5 flex flex-col justify-center items-center text-center text-white">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-sm flex items-center justify-center mb-4 shadow-inner">
                    <Rocket className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-white mb-2">The Future is <br/>Almost Here.</h3>
                  <p className="text-blue-100 text-sm font-medium">A sneak peek at what we're building for you next.</p>
                </div>

                <div className="p-8 md:w-3/5 flex flex-col justify-center overflow-y-auto">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold tracking-widest uppercase w-max mb-4">
                    <Calendar className="w-3.5 h-3.5" /> Development Roadmap
                  </div>
                  
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Upcoming Features</h4>

                  <div className="space-y-4 mb-8">
                    {roadmapItems.map((item: any, idx: number) => {
                      const colorClasses = [
                        'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                        'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
                        'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
                        'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                      ];
                      const theme = colorClasses[idx % colorClasses.length];
                      const [bgTheme, textTheme] = theme.split(' text-'); 

                      return (
                        <div key={idx} className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg ${bgTheme} flex items-center justify-center shrink-0`}>
                            {renderIcon(item.icon, `w-4 h-4 text-${textTheme}`)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{item.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button 
                    onClick={() => setIsOpen(false)}
                    className="w-full mt-auto py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-navy-800 dark:hover:bg-navy-700 text-gray-900 dark:text-white font-bold rounded-xl transition-colors"
                  >
                    Sounds exciting!
                  </button>
                </div>
              </>
            )}

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PromoModal;