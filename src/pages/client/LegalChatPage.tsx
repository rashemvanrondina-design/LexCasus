// src/pages/client/LegalChatPage.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';
import { API_URL } from '../../lib/constants'; // 🟢 AMENDMENT 1: Dynamic URL Import
import {
  Send, Loader2, Plus, MessageSquare, Trash2, Menu, X, Scale, Sparkles, BookOpen
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// 🟢 GUARDS & PAYWALL
import { useUsageGuard } from '../../hooks/useUsageGuard';
import UpgradeModal from '../../components/modals/UpgradeModal';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

const LegalChatPage: React.FC = () => {
  const { user } = useAuthStore();
  
  // 🟢 Initialize the Bouncer
  const { checkAccess } = useUsageGuard();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessions, activeSessionId, isTyping]);

  // Load History from Local Storage
  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`lexcasus_chats_${user.id}`);
      if (saved) setSessions(JSON.parse(saved));
    }
  }, [user?.id]);

  // Save History to Local Storage
  useEffect(() => {
    if (sessions.length > 0 && user?.id) {
      localStorage.setItem(`lexcasus_chats_${user.id}`, JSON.stringify(sessions));
    }
  }, [sessions, user?.id]);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const currentMessages = activeSession?.messages || [];

  const handleNewChat = () => {
    setActiveSessionId(null);
    setShowSidebar(false);
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) setActiveSessionId(null);
  };

  const handleSend = async () => {
    if (!inputText.trim() || isTyping) return;

    // 🟢 ENFORCE THE LAW: Check Daily Chat Limits
    if (!checkAccess('chatDaily')) {
      setShowUpgradeModal(true);
      return;
    }

    const textToSend = inputText;
    setInputText('');
    setIsTyping(true);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    let currentSessionId = activeSessionId;
    
    // Create new session if none exists
    if (!currentSessionId) {
      const newId = Date.now().toString();
      currentSessionId = newId;
      const newSession: ChatSession = {
        id: newId,
        title: textToSend.substring(0, 30) + '...',
        messages: [userMsg],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newId);
    } else {
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId 
          ? { ...s, updatedAt: Date.now(), messages: [...s.messages, userMsg] }
          : s
      ));
    }

    // Prepare History to send to the Server
    const updatedSession = sessions.find(s => s.id === currentSessionId) || { messages: [] };
    const history = updatedSession.messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({ role: m.role, parts: [{ text: m.content }] }));

    // Append the new message to the history we're sending
    history.push({ role: 'user', parts: [{ text: textToSend }] });

    try {
      // 🟢 AMENDMENT 1: Secure API Call using dynamic API_URL
      const serverResponse = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          history: history, 
          message: textToSend,
          userId: user?.id,
          isAdmin: user?.role === 'admin' || user?.email === 'rashemvanrondina@gmail.com'
        })
      });

      if (!serverResponse.ok) {
        throw new Error(`Server returned status: ${serverResponse.status}`);
      }
      
      const data = await serverResponse.json();

      // 🟢 APPEND AI RESPONSE TO UI
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: data.response,
        timestamp: new Date().toISOString(),
      };

      setSessions(prev => prev.map(s => 
        s.id === currentSessionId 
          ? { ...s, updatedAt: Date.now(), messages: [...s.messages, aiMsg] }
          : s
      ));

    } catch (error) {
      console.error("Chat Server Connection Error:", error);
      alert("Atty., I am having trouble connecting to the Chambers. Please ensure the backend is running.");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* 🟢 THE PAYWALL MODAL */}
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
        featureName="Legal AI Chat" 
        // 🟢 AMENDMENT 2: Clarified Text
        limitText="Basic tier limit of 10 queries/day" 
      />

      <div className="h-[calc(100vh-8rem)] flex bg-white dark:bg-[#0A0F1D] rounded-3xl overflow-hidden border border-gray-200 dark:border-navy-800 shadow-sm relative">
        
        {/* Mobile Sidebar Toggle */}
        <button 
          onClick={() => setShowSidebar(true)}
          className="md:hidden absolute top-4 left-4 z-20 p-2 bg-white dark:bg-navy-900 rounded-lg shadow-md border border-gray-100 dark:border-navy-800 text-navy-600 dark:text-gold-500"
        >
          <Menu size={20} />
        </button>

        {/* Sidebar History */}
        <div className={cn(
          "absolute md:relative z-30 h-full w-72 bg-gray-50 dark:bg-navy-950 border-r border-gray-200 dark:border-navy-800 flex flex-col transition-transform duration-300 ease-in-out",
          showSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}>
          <div className="p-4 border-b border-gray-200 dark:border-navy-800 flex items-center justify-between">
            <button 
              onClick={handleNewChat}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-sm font-bold shadow-md transition-colors"
            >
              <Plus size={16} className="text-gold-500" /> New Consultation
            </button>
            <button onClick={() => setShowSidebar(false)} className="md:hidden p-2 text-gray-500 ml-2">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {sessions.map(session => (
              <div 
                key={session.id}
                onClick={() => { setActiveSessionId(session.id); setShowSidebar(false); }}
                className={cn(
                  "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all",
                  activeSessionId === session.id 
                    ? "bg-white dark:bg-navy-900 border border-gold-200 dark:border-gold-500/30 shadow-sm" 
                    : "hover:bg-gray-200/50 dark:hover:bg-navy-900/50 text-gray-600 dark:text-gray-400 border border-transparent"
                )}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare size={16} className={cn("shrink-0", activeSessionId === session.id ? "text-gold-500" : "text-gray-400")} />
                  <span className="text-sm font-medium truncate">{session.title}</span>
                </div>
                <button 
                  onClick={(e) => handleDeleteSession(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="text-center p-6 text-gray-400 text-xs italic">
                No previous consultations found.
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col relative bg-gray-50/50 dark:bg-[#0A0F1D]">
          
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar">
            {currentMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center animate-fade-in px-4">
                <div className="w-20 h-20 bg-navy-100 dark:bg-navy-900 rounded-full flex items-center justify-center mb-6 border-4 border-white dark:border-[#0A0F1D] shadow-xl">
                  <Scale className="w-10 h-10 text-navy-600 dark:text-gold-500" />
                </div>
                <h3 className="text-2xl font-bold text-navy-900 dark:text-white mb-2">Lex Casus Counsel</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                  I am ready to assist with statutory principles, codal provisions, and general legal concepts. How can I counsel you today, Atty.?
                </p>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg">
                  <button onClick={() => setInputText("Explain the elements of Estafa under the RPC.")} className="p-4 bg-white dark:bg-navy-900 border border-gray-200 dark:border-navy-800 rounded-xl text-sm text-left text-gray-600 dark:text-gray-300 hover:border-gold-500 transition-colors shadow-sm">
                    "Explain the elements of Estafa under the RPC."
                  </button>
                  <button onClick={() => setInputText("What is the Doctrine of State Immunity?")} className="p-4 bg-white dark:bg-navy-900 border border-gray-200 dark:border-navy-800 rounded-xl text-sm text-left text-gray-600 dark:text-gray-300 hover:border-gold-500 transition-colors shadow-sm">
                    "What is the Doctrine of State Immunity?"
                  </button>
                </div>
              </div>
            ) : (
              currentMessages.map(msg => (
                <div key={msg.id} className={cn("flex w-full animate-fade-in", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] md:max-w-[75%] rounded-2xl p-5 shadow-sm",
                    msg.role === 'user' 
                      ? "bg-navy-900 text-white rounded-br-sm" 
                      : "bg-white dark:bg-navy-900 border border-gray-200 dark:border-navy-800 text-gray-800 dark:text-gray-200 rounded-bl-sm"
                  )}>
                    {msg.role === 'model' && (
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-navy-800 text-gold-600 dark:text-gold-500">
                        <Sparkles size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Lex Casus Analysis</span>
                      </div>
                    )}
                    <div className={cn(
                      "prose prose-sm max-w-none text-left",
                      msg.role === 'user' ? "prose-invert text-white" : "dark:prose-invert text-gray-800 dark:text-gray-200"
                    )}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))
            )}
            {isTyping && (
              <div className="flex justify-start w-full animate-fade-in">
                <div className="max-w-[85%] md:max-w-[75%] rounded-2xl p-5 bg-white dark:bg-navy-900 border border-gray-200 dark:border-navy-800 rounded-bl-sm shadow-sm">
                  <div className="flex items-center gap-3 text-gold-600 dark:text-gold-500">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-widest animate-pulse">Counsel is drafting...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 md:p-6 bg-white dark:bg-[#0A0F1D] border-t border-gray-200 dark:border-navy-800">
            <div className="relative max-w-4xl mx-auto flex items-end gap-2 bg-gray-50 dark:bg-navy-950 p-2 rounded-2xl border border-gray-200 dark:border-navy-800 focus-within:border-gold-500 transition-colors shadow-inner">
              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask your legal question..."
                className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[44px] p-3 text-sm text-gray-800 dark:text-gray-200 outline-none custom-scrollbar"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isTyping}
                className="shrink-0 p-3 bg-gold-500 text-navy-900 rounded-xl hover:bg-gold-400 disabled:opacity-50 disabled:hover:bg-gold-500 transition-colors shadow-md"
              >
                <Send size={18} className={cn(isTyping && "opacity-0")} />
                {isTyping && <Loader2 size={18} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />}
              </button>
            </div>
            <p className="text-center text-[10px] text-gray-400 mt-3 font-medium">
              Lex Casus can make mistakes. Always verify codal provisions and jurisprudence.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default LegalChatPage;