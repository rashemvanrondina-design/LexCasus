import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import gcashQR from '../../assets/images/gcash-qr.png';
import {
  CreditCard,
  Crown,
  Shield,
  CheckCircle2,
  X,
  Diamond,
  Mail,
  Copy,
  Check,
  Send,
  Sparkles,
  Users
} from 'lucide-react';

const BillingPage: React.FC = () => {
  const { user } = useAuthStore();
  const subscription = user?.subscription || 'free';
  const isFree = subscription === 'free';
  const isPremium = subscription === 'premium';
  const isPremiumPlus = subscription === 'premium_plus';

  // 🟢 REFERRAL DISCOUNT LOGIC
  const hasDiscount = (user as any)?.hasActiveDiscount || false;
  const premiumPrice = hasDiscount ? '126.75' : '169.00';
  const premiumPlusPrice = hasDiscount ? '374.25' : '499.00';

  // 🟢 DYNAMIC REAL-TIME DATES & INVOICE FIX
  const today = new Date();
  
  const accountCreatedDate = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) 
    : today.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const formattedNextBilling = nextMonth.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

  const nextBillingDate = !isFree ? formattedNextBilling : 'N/A';
  
  // 🟢 PAYMENT MODAL STATES
  const [paymentModalData, setPaymentModalData] = useState<{ isOpen: boolean, plan: 'premium' | 'premium_plus' | null }>({ isOpen: false, plan: null });
  const [copied, setCopied] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false); 

  // 🟢 ACCURATE INVOICE HISTORY
  const billingHistory = isPremiumPlus 
    ? [{ date: accountCreatedDate, amount: `₱${premiumPlusPrice}`, status: 'Paid', plan: 'Premium+' }] 
    : isPremium 
      ? [{ date: accountCreatedDate, amount: `₱${premiumPrice}`, status: 'Paid', plan: 'Premium' }]
      : [{ date: accountCreatedDate, amount: '₱0.00', status: 'Paid', plan: 'Free' }];

  // 🟢 EMAIL HANDLERS
  const handleCopyEmail = () => {
    navigator.clipboard.writeText('lexcasus@gmail.com');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = () => {
    const expectedAmount = paymentModalData.plan === 'premium' ? premiumPrice : premiumPlusPrice;
    const subject = encodeURIComponent(`Lex Casus Upgrade - Proof of Payment (${paymentModalData.plan?.toUpperCase()})`);
    const body = encodeURIComponent(`Atty.,\n\nI have successfully scanned and paid ₱${expectedAmount} via GCash for the ${paymentModalData.plan?.replace('_', ' ').toUpperCase()} tier.\n\nAttached is my Proof of Payment.\n\nMy Lex Casus Account Email: ${user?.email}\nDiscount Active: ${hasDiscount ? 'YES' : 'NO'}\n\nThank you.`);
    window.location.href = `mailto:lexcasus@gmail.com?subject=${subject}&body=${body}`;
  };

  // 🟢 REFERRAL COPY HANDLER
  const handleCopyReferral = () => {
    if ((user as any)?.referralCode) {
      navigator.clipboard.writeText((user as any).referralCode);
      setReferralCopied(true);
      setTimeout(() => setReferralCopied(false), 2000);
    }
  };

  return (
    <>
      {/* 🟢 LANDSCAPE GCASH & EMAIL PAYMENT MODAL */}
      <AnimatePresence>
        {paymentModalData.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/60" onClick={() => setPaymentModalData({ isOpen: false, plan: null })}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl bg-white dark:bg-[#0A0F1D] border-2 border-navy-100 dark:border-navy-800 shadow-2xl rounded-3xl p-6 md:p-8"
            >
              <button 
                onClick={() => setPaymentModalData({ isOpen: false, plan: null })} 
                className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white bg-gray-100 dark:bg-white/5 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="text-center md:text-left mb-6 pr-8">
                <h2 className="text-2xl font-bold text-navy-900 dark:text-white mb-2">Subscribe via GCash</h2>
                <p className="text-sm text-gray-500">
                  You are upgrading to the <span className={cn("font-bold capitalize", paymentModalData.plan === 'premium_plus' ? "text-purple-500" : "text-gold-600")}>
                    {paymentModalData.plan?.replace('_', ' ')}
                  </span> tier.
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                
                {/* LEFT SIDE: GCash Scanning Box */}
                <div className="w-full md:w-5/12 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-6 text-center flex flex-col justify-center items-center">
                  <div className="w-44 h-44 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-md overflow-hidden border-4 border-white">
                     <img 
                       src={gcashQR} 
                       alt="GCash QR Code" 
                       className="w-full h-full object-contain"
                     />
                  </div>
                  <p className="text-xs font-bold text-blue-900 dark:text-blue-400 uppercase tracking-widest opacity-70">Scan to Pay</p>
                  
                  {/* 🟢 MODAL PROMO PRICING (Factoring in Discount) */}
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-blue-400/80 line-through decoration-blue-500/50 font-semibold">
                      {paymentModalData.plan === 'premium' ? '₱199' : '₱599'}
                    </p>
                    <p className="text-3xl font-black text-blue-600 dark:text-blue-500">
                      ₱{paymentModalData.plan === 'premium' ? premiumPrice : premiumPlusPrice}
                    </p>
                  </div>
                  
                  {hasDiscount && (
                    <div className="mt-1">
                      <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                        25% Referral Applied
                      </span>
                    </div>
                  )}

                  <div className="mt-2 py-1 px-3 bg-blue-500/10 rounded-full">
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tighter">
                      Official Lex Casus GCash
                    </p>
                  </div>
                </div>

                {/* RIGHT SIDE: Email Instructions Box */}
                <div className="flex-1 bg-gray-50 dark:bg-navy-900/50 border border-gray-200 dark:border-navy-800 rounded-2xl p-6 md:p-8 flex flex-col justify-center">
                   <div className="flex items-center gap-4 mb-5">
                     <div className="w-12 h-12 shrink-0 bg-gold-100 dark:bg-gold-500/10 rounded-full flex items-center justify-center text-gold-600">
                       <Mail size={24} />
                     </div>
                     <div>
                       <h3 className="font-bold text-navy-900 dark:text-white text-lg">Send Proof of Payment</h3>
                       <p className="text-xs text-gray-500 dark:text-gray-400">Step 2 to activate your upgrade</p>
                     </div>
                   </div>
                   
                   <div className="space-y-4">
                     <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                       After successfully scanning and paying the exact amount, please email a screenshot of your transaction receipt to us. 
                     </p>

                     <div className="bg-white dark:bg-navy-950 border border-gray-200 dark:border-navy-700 p-4 rounded-xl text-center shadow-sm">
                        <p className="text-[10px] text-gray-500 mb-1 uppercase font-bold tracking-wider">Official Email</p>
                        <p className="font-black text-xl text-navy-900 dark:text-white tracking-wide">
                          lexcasus@gmail.com
                        </p>
                     </div>
                     
                     <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button 
                          onClick={handleCopyEmail} 
                          className="flex-1 py-3 bg-white dark:bg-navy-950 border border-gray-200 dark:border-navy-700 text-navy-600 dark:text-gray-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors shadow-sm"
                        >
                           {copied ? <Check size={16} className="text-emerald-500"/> : <Copy size={16}/>} 
                           {copied ? 'Email Copied!' : 'Copy Email'}
                        </button>
                        <button 
                          onClick={handleSendEmail} 
                          className="flex-1 py-3 bg-gold-500 text-navy-900 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-gold-400 shadow-md shadow-gold-500/20 transition-all"
                        >
                           <Send size={16} /> Open Mail App
                        </button>
                     </div>
                   </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Billing & Subscription</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your Lex Casus tier and view your payment history
          </p>
        </div>

        {/* 🟢 THE REFERRAL CARD */}
        <div className="p-6 bg-gradient-to-br from-navy-900 to-[#0A0F1D] rounded-3xl border border-navy-700 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <Users size={180} />
          </div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-500 text-[10px] font-black uppercase tracking-widest mb-4">
              <Sparkles size={12} /> Viral Growth Engine
            </div>
            
            <h3 className="text-xl font-bold text-white mb-1">Refer a Blockmate</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-[280px]">
              Share your code. When they subscribe to Premium, you get <span className="text-gold-400 font-bold text-lg">25% OFF</span> your next month!
            </p>
            
            <div className="flex items-center gap-3">
              <div className="bg-black/40 border border-white/10 px-6 py-3 rounded-2xl font-black tracking-[0.3em] text-2xl text-gold-500 shadow-inner">
                {(user as any)?.referralCode || 'N/A'}
              </div>
              <button 
                onClick={handleCopyReferral}
                className="p-4 bg-gold-500 hover:bg-gold-400 text-navy-950 rounded-2xl transition-all active:scale-95 shadow-lg shadow-gold-500/20 flex items-center justify-center"
              >
                {referralCopied ? <CheckCircle2 size={24} /> : <Copy size={24} />}
              </button>
            </div>
            
            {((user as any)?.usage?.successfulReferrals > 0) && (
              <p className="mt-4 text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <Check size={12} /> {(user as any).usage.successfulReferrals} Successful Referrals!
              </p>
            )}
          </div>
        </div>

        {/* 🟢 REFERRAL SUCCESS BANNER */}
        {hasDiscount && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 p-4 rounded-xl flex items-center gap-4">
            <div className="bg-emerald-500/20 p-2 rounded-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-sm">25% Referral Discount Unlocked!</p>
              <p className="text-xs mt-0.5">A friend used your code to join Lex Casus! Enjoy 25% off your next upgrade.</p>
            </div>
          </div>
        )}

        {/* Current Plan Card */}
        <div className={cn(
          'card p-6 relative overflow-hidden transition-all duration-300',
          !isFree ? 'border-gold-400 shadow-gold-500/10 shadow-lg' : 'border-navy-200'
        )}>
          {!isFree && (
            <div className="absolute top-0 right-0 bg-gold-500 text-navy-900 text-[10px] font-black px-3 py-1 rounded-bl-lg tracking-widest uppercase">
              {subscription.replace('_', ' ')} ACTIVE
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center transition-colors',
              isPremiumPlus ? 'bg-purple-100 dark:bg-purple-500/20' : isPremium ? 'bg-gold-100 dark:bg-gold-500/10' : 'bg-navy-100 dark:bg-navy-800'
            )}>
              {isPremiumPlus ? <Diamond className="w-7 h-7 text-purple-600 dark:text-purple-400" /> : isPremium ? <Crown className="w-7 h-7 text-gold-600" /> : <Shield className="w-7 h-7 text-navy-600" />}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                {subscription.replace('_', ' ')} Plan
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isPremiumPlus 
                  ? 'Unlimited access to all AI features and storage.' 
                  : isPremium 
                  ? 'High-limit access to AI Deconstruction, Case Digests, and Practice.' 
                  : 'Free basic access for essential legal studies.'}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs text-gray-400">Next billing date</p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{nextBillingDate}</p>
              <span className="inline-flex items-center gap-1 mt-1 badge-green text-xs">
                <CheckCircle2 className="w-3 h-3" />
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Plan Comparison (3 Tiers) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* --- FREE PLAN --- */}
          <div className={cn('card p-6 flex flex-col', isFree && 'ring-2 ring-navy-500/50')}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-navy-100 dark:bg-navy-800 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-navy-600 dark:text-navy-400" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Free Access</h4>
              </div>
            </div>
            <div className="mb-6"><span className="text-3xl font-bold text-gray-900 dark:text-white">₱0</span></div>

            <div className="space-y-4 mb-8 flex-1">
              <div className="flex items-start gap-2.5 text-sm"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /><span className="text-gray-700 dark:text-gray-300"><strong>10</strong> AI Chat Queries / day</span></div>
              <div className="flex items-start gap-2.5 text-sm"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /><span className="text-gray-700 dark:text-gray-300"><strong>5</strong> Bar Practice / day</span></div>
              <div className="flex items-start gap-2.5 text-sm"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /><span className="text-gray-700 dark:text-gray-300"><strong>5</strong> Case Digests / day (Max 30/mo)</span></div>
              <div className="flex items-start gap-2.5 text-sm"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /><span className="text-gray-700 dark:text-gray-300"><strong>100</strong> E-Codal Notes</span></div>
              <div className="flex items-start gap-2.5 text-sm"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /><span className="text-gray-700 dark:text-gray-300"><strong>5</strong> Note Folders</span></div>
              <div className="flex items-start gap-2.5 text-sm opacity-50"><X className="w-4 h-4 text-gray-400 mt-0.5" /><span className="text-gray-500 line-through">AI Deconstruction</span></div>
            </div>

            <button 
              disabled={isFree} 
              onClick={() => alert("Please contact Support to request a downgrade.")} 
              className={cn("w-full py-2.5 rounded-xl text-sm font-bold transition-all", isFree ? "bg-gray-100 text-gray-400 dark:bg-navy-800 dark:text-gray-500 cursor-default" : "btn-secondary")}
            >
              {isFree ? 'Current Plan' : 'Downgrade to Free'}
            </button>
          </div>

          {/* --- PREMIUM PLAN (Most Availed) --- */}
          <div className={cn('card p-6 relative border-gold-300 flex flex-col', isPremium && 'ring-2 ring-gold-500/50 shadow-gold-500/20 shadow-xl scale-[1.02]')}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gold-400 to-gold-600" />
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gold-100 dark:bg-gold-500/10 rounded-xl flex items-center justify-center">
                  <Crown className="w-5 h-5 text-gold-600" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Premium</h4>
              </div>
              <span className="badge bg-gold-500 text-navy-900 border-none font-bold text-[10px] uppercase tracking-widest shadow-sm">Most Availed</span>
            </div>
            
            {/* 🟢 PROMO & DISCOUNT PRICING */}
            <div className={cn("flex items-end gap-2", hasDiscount ? "mb-1" : "mb-6")}>
              <span className="text-gray-400 dark:text-gray-500 line-through text-lg font-medium decoration-2">
                {hasDiscount ? '₱199' : '₱199'}
              </span>
              <span className="text-4xl font-black text-gold-600 dark:text-gold-400 leading-none">
                ₱{premiumPrice}
              </span>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">/ mo</span>
            </div>
            {hasDiscount && (
              <div className="mb-6">
                 <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">25% Discount Applied!</span>
              </div>
            )}

            <div className="space-y-4 mb-8 flex-1">
              <div className="flex items-start gap-2.5 text-sm"><CheckCircle2 className="w-4 h-4 text-gold-500 mt-0.5" /><span className="text-gray-700 dark:text-gray-300 font-medium"><strong>Unlimited</strong> AI Chat</span></div>
              <div className="flex items-start gap-2.5 text-sm"><CheckCircle2 className="w-4 h-4 text-gold-500 mt-0.5" /><span className="text-gray-700 dark:text-gray-300 font-medium"><strong>20</strong> Bar Practice / day</span></div>
              <div className="flex items-start gap-2.5 text-sm"><CheckCircle2 className="w-4 h-4 text-gold-500 mt-0.5" /><span className="text-gray-700 dark:text-gray-300 font-medium"><strong>500</strong> AI Deconstructions</span></div>
              <div className="flex items-start gap-2.5 text-sm"><CheckCircle2 className="w-4 h-4 text-gold-500 mt-0.5" /><span className="text-gray-700 dark:text-gray-300"><strong>50</strong> Case Digests / day (Max 300/mo)</span></div>
              <div className="flex items-start gap-2.5 text-sm"><CheckCircle2 className="w-4 h-4 text-gold-500 mt-0.5" /><span className="text-gray-700 dark:text-gray-300"><strong>500</strong> E-Codal Notes</span></div>
              <div className="flex items-start gap-2.5 text-sm"><CheckCircle2 className="w-4 h-4 text-gold-500 mt-0.5" /><span className="text-gray-700 dark:text-gray-300"><strong>200</strong> Note Folders</span></div>
            </div>

            <button 
              disabled={isPremium} 
              onClick={() => setPaymentModalData({ isOpen: true, plan: 'premium' })} 
              className={cn("w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all", isPremium ? "bg-gray-100 text-gray-400 dark:bg-navy-800 dark:text-gray-500 cursor-default" : "bg-gold-500 hover:bg-gold-400 text-navy-900 shadow-lg shadow-gold-500/20")}
            >
              {isPremium ? 'Active Plan' : 'Select Premium'}
            </button>
          </div>

          {/* --- PREMIUM+ PLAN --- */}
          <div className={cn('card p-6 relative border-purple-300 dark:border-purple-500/30 flex flex-col', isPremiumPlus && 'ring-2 ring-purple-500/50 shadow-purple-500/20 shadow-xl scale-[1.02]')}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-purple-600" />
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-500/10 rounded-xl flex items-center justify-center">
                  <Diamond className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Premium+</h4>
              </div>
            </div>

            {/* 🟢 PROMO & DISCOUNT PRICING */}
            <div className={cn("flex items-end gap-2", hasDiscount ? "mb-1" : "mb-6")}>
              <span className="text-gray-400 dark:text-gray-500 line-through text-lg font-medium decoration-2">
                {hasDiscount ? '₱599' : '₱599'}
              </span>
              <span className="text-4xl font-black text-purple-600 dark:text-purple-400 leading-none">
                ₱{premiumPlusPrice}
              </span>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">/ mo</span>
            </div>
            {hasDiscount && (
              <div className="mb-6">
                 <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">25% Discount Applied!</span>
              </div>
            )}

            <div className="space-y-4 mb-8 flex-1">
              <div className="flex items-start gap-2.5 text-sm"><CheckCircle2 className="w-4 h-4 text-purple-500 mt-0.5" /><span className="text-gray-700 dark:text-gray-300 font-bold">Unlimited Everything</span></div>
              <div className="flex items-start gap-2.5 text-sm"><CheckCircle2 className="w-4 h-4 text-purple-500 mt-0.5" /><span className="text-gray-700 dark:text-gray-300"><strong>Unlimited</strong> Bar Practice</span></div>
              <div className="flex items-start gap-2.5 text-sm"><CheckCircle2 className="w-4 h-4 text-purple-500 mt-0.5" /><span className="text-gray-700 dark:text-gray-300"><strong>Unlimited</strong> Case Digests</span></div>
              <div className="flex items-start gap-2.5 text-sm"><CheckCircle2 className="w-4 h-4 text-purple-500 mt-0.5" /><span className="text-gray-700 dark:text-gray-300"><strong>Unlimited</strong> AI Deconstructions</span></div>
              <div className="flex items-start gap-2.5 text-sm"><CheckCircle2 className="w-4 h-4 text-purple-500 mt-0.5" /><span className="text-gray-700 dark:text-gray-300"><strong>Unlimited</strong> Folders & Notes</span></div>
              <div className="flex items-start gap-2.5 text-sm"><CheckCircle2 className="w-4 h-4 text-purple-500 mt-0.5" /><span className="text-gray-700 dark:text-gray-300">Priority AI Processing</span></div>
            </div>

            <button 
              disabled={isPremiumPlus} 
              onClick={() => setPaymentModalData({ isOpen: true, plan: 'premium_plus' })} 
              className={cn("w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all", isPremiumPlus ? "bg-gray-100 text-gray-400 dark:bg-navy-800 dark:text-gray-500 cursor-default" : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20")}
            >
              {isPremiumPlus ? 'Active Plan' : 'Select Premium+'}
            </button>
          </div>
        </div>

        {/* Billing History Table */}
        <div className="card p-6">
          <h3 className="text-sm font-bold text-navy-900 dark:text-white mb-4 flex items-center gap-2">
            <CreditCard size={18} className="text-gray-400" />
            Recent Invoices
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-navy-800">
                  <th className="pb-3 font-semibold text-gray-500">Date</th>
                  <th className="pb-3 font-semibold text-gray-500">Plan</th>
                  <th className="pb-3 font-semibold text-gray-500">Amount</th>
                  <th className="pb-3 font-semibold text-gray-500 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-navy-900/50">
                {billingHistory.length > 0 ? billingHistory.map((item, i) => (
                  <tr key={i} className="group hover:bg-gray-50/50 dark:hover:bg-navy-900/20">
                    <td className="py-4 text-gray-600 dark:text-gray-400">{item.date}</td>
                    <td className="py-4"><span className="badge-navy capitalize">{item.plan}</span></td>
                    <td className="py-4 font-bold text-gray-900 dark:text-white">{item.amount}</td>
                    <td className="py-4 text-right"><span className="badge-green">{item.status}</span></td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400 italic">No previous paid transactions found, Atty.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default BillingPage;