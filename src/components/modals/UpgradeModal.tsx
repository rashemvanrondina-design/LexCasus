import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Lock, ArrowRight, X, Diamond } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string; 
  limitText: string;   
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, featureName, limitText }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore(); 

  // 🟢 DYNAMIC TIER LOGIC (Fixed Pricing to ₱499)
  const isPremium = user?.subscription === 'premium';
  const nextTierName = isPremium ? 'Premium+' : 'Premium';
  const nextTierPrice = isPremium ? '₱499' : '₱199'; 
  const NextTierIcon = isPremium ? Diamond : Crown;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/60" onClick={onClose}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white dark:bg-[#0A0F1D] border-2 border-gold-500/50 shadow-[0_0_50px_rgba(212,168,67,0.15)] rounded-3xl p-8 text-center"
          >
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon */}
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6",
              isPremium ? "bg-purple-500/10" : "bg-gold-500/10"
            )}>
              <Lock className={cn("w-8 h-8", isPremium ? "text-purple-500" : "text-gold-600 dark:text-gold-400")} />
            </div>

            {/* Text Content */}
            <h2 className="text-2xl font-bold text-navy-900 dark:text-white mb-3">Limit Reached</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              Atty., you've exhausted your <span className="font-bold text-navy-900 dark:text-white">{limitText}</span> for <span className={cn("font-bold", isPremium ? "text-purple-500" : "text-gold-600 dark:text-gold-400")}>{featureName}</span>. 
              Upgrade to {nextTierName} to continue your research without interruptions.
            </p>
            
            {/* Dynamic Benefits Box */}
            <div className="bg-navy-50 dark:bg-navy-900/50 p-5 rounded-2xl text-left border border-navy-100 dark:border-navy-800 mb-8">
              <p className={cn("text-[11px] font-black mb-3 uppercase tracking-widest", isPremium ? "text-purple-500" : "text-navy-600 dark:text-gold-400")}>
                {nextTierName} Benefits:
              </p>
              <ul className="text-sm space-y-3 text-gray-700 dark:text-gray-300 font-medium">
                {isPremium ? (
                  <>
                    <li className="flex items-center gap-3"><NextTierIcon size={16} className="text-purple-500 shrink-0"/> Unlimited Case Digests</li>
                    <li className="flex items-center gap-3"><NextTierIcon size={16} className="text-purple-500 shrink-0"/> Unlimited AI Deconstructions</li>
                    <li className="flex items-center gap-3"><NextTierIcon size={16} className="text-purple-500 shrink-0"/> Unlimited Folders & Notes</li>
                    <li className="flex items-center gap-3"><NextTierIcon size={16} className="text-purple-500 shrink-0"/> Priority AI Processing</li>
                  </>
                ) : (
                  <>
                    <li className="flex items-center gap-3"><NextTierIcon size={16} className="text-gold-500 shrink-0"/> Unlimited Legal Chat</li>
                    {/* 🟢 ALIGNED WITH INDEX.TS CONSTITUTION */}
                    <li className="flex items-center gap-3"><NextTierIcon size={16} className="text-gold-500 shrink-0"/> 2,000 AI Deconstructions & Notes</li>
                    <li className="flex items-center gap-3"><NextTierIcon size={16} className="text-gold-500 shrink-0"/> 500 Note Folders</li>
                    <li className="flex items-center gap-3"><NextTierIcon size={16} className="text-gold-500 shrink-0"/> 300 Case Digests per month</li>
                  </>
                )}
              </ul>
            </div>

            {/* Dynamic CTA Button */}
            <button 
              onClick={() => {
                onClose();
                navigate('/billing');
              }}
              className={cn(
                "w-full py-4 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2",
                isPremium 
                  ? "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white shadow-purple-500/25"
                  : "bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-navy-950 shadow-gold-500/25"
              )}
            >
              Upgrade to {nextTierName} ({nextTierPrice}) <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default UpgradeModal;