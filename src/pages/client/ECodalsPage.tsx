// src/pages/client/ECodalsPage.tsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useCodalsStore } from '../../store/codalsStore';
import { useAuthStore } from '../../store/authStore';
import { useCasesStore } from '../../store/casesStore'; 
import { useNotesStore } from '../../store/notesStore'; 
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db, auth } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { cn } from '../../lib/utils';
import { API_URL } from '../../lib/constants'; // 🟢 AMENDMENT 3: Dynamic URL Import
import {
  ChevronDown, ChevronRight, Edit3, Save, ArrowLeft,
  Search, FileText, Plus, Trash2, Loader2, Scale, Lock, Book,
  Sparkles, Gavel, ShieldCheck, Library, Bookmark, Folder, Layers
} from 'lucide-react';
import type { CodalProvision } from '../../types/index';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useUsageGuard } from '../../hooks/useUsageGuard';
import UpgradeModal from '../../components/modals/UpgradeModal';

// ============================================================================
// 🛠️ GLOBAL HELPER FUNCTIONS
// ============================================================================
const getAbbreviation = (bookName: string) => {
  if (!bookName) return '';
  const name = bookName.toUpperCase(); 
  if (name.includes('ALL')) return 'ALL';
  if (name.includes('CONSTITUTION')) return 'CONST';
  if (name.includes('CIVIL')) return 'CC';
  if (name.includes('REVISED PENAL')) return 'RPC';
  if (name.includes('LABOR')) return 'LC';
  if (name.includes('TAX')) return 'NIRC';
  if (name.includes('CORPORATION')) return 'RCC';
  if (name.includes('COURT')) return 'RoC';
  if (name.includes('FAMILY')) return 'FC';
  if (name.includes('LOCAL GOV')) return 'LGC';
  return name.substring(0, 3).toUpperCase(); 
};

const getArticleWeight = (articleStr: string) => {
  if (articleStr.toLowerCase().includes('preamble')) return -1;
  const romanMatch = articleStr.match(/Article\s+([IVXLCDM]+)/i);
  if (romanMatch) {
      const romanValues: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
      let res = 0;
      for (let i = 0; i < romanMatch[1].length; i++) {
        const current = romanValues[romanMatch[1][i].toUpperCase()];
        const next = romanValues[romanMatch[1][i + 1]?.toUpperCase()];
        if (next && current < next) { res += next - current; i++; } else { res += current; }
      }
      return res;
  }
  const numMatch = articleStr.match(/\d+/);
  return numMatch ? parseInt(numMatch[0], 10) : 9999;
};

const getCrossReferences = (provision: CodalProvision, cases: any[]) => {
  const artNum = provision.articleNumber.match(/\d+/)?.[0] || "";
  const provBookLower = (provision.book || "").toLowerCase();
  
  const strictLinkedCases = cases.filter(c => {
    if (!c.provisions || !Array.isArray(c.provisions)) return false;

    return c.provisions.some((tag: string) => {
      const tagLower = tag.toLowerCase();
      const hasExactNumber = new RegExp(`\\b${artNum}\\b`).test(tagLower);
      if (!hasExactNumber) return false;

      let bookMatches = false;
      if (provBookLower.includes('civil') && tagLower.includes('civil')) bookMatches = true;
      else if (provBookLower.includes('penal') && (tagLower.includes('rpc') || tagLower.includes('penal'))) bookMatches = true;
      else if (provBookLower.includes('constitution') && tagLower.includes('constitution')) bookMatches = true;
      else if (provBookLower.includes('court') && (tagLower.includes('court') || tagLower.includes('roc'))) bookMatches = true;
      else if (!provBookLower) bookMatches = true; 

      return bookMatches;
    });
  });

  return { linkedCases: strictLinkedCases };
};

// ============================================================================
// 🧠 COMPONENT: INDIVIDUAL CODAL CARD (Performance Optimized)
// ============================================================================
interface CodalCardProps {
  provision: CodalProvision;
  isExpanded: boolean;
  onToggleExpand: () => void;
  indentStyles: string;
  userNotes: Record<string, {content: string}>;
  onSaveNote: (targetId: string, content: string) => Promise<void>;
  savedAnalysis?: string;
  isAnalyzing: boolean;
  onAIDeconstruct: (provision: CodalProvision) => void;
  cases: any[];
}

const CodalCard: React.FC<CodalCardProps> = React.memo(({
  provision, isExpanded, onToggleExpand, indentStyles,
  userNotes, onSaveNote, savedAnalysis, isAnalyzing, onAIDeconstruct, cases
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [visibleSectionsLimit, setVisibleSectionsLimit] = useState(10);
  const [sidePanelContent, setSidePanelContent] = useState<{ type: 'case', data: any } | null>(null);
  const [showLinkedCases, setShowLinkedCases] = useState(false);

  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState('');

  const currentCrossRefs = useMemo(() => {
    if (!isExpanded) return { linkedCases: [] };
    return getCrossReferences(provision, cases);
  }, [isExpanded, provision, cases]);

  useEffect(() => {
    if (!isExpanded) setSidePanelContent(null);
  }, [isExpanded]);

  const handleSave = async (targetId: string) => {
    try {
      await onSaveNote(targetId, editBuffer);
      setEditingTargetId(null);
    } catch (err) {
      // Handled in parent
    }
  };

  const renderInteractionZone = (targetId: string) => {
    const personalData = userNotes[targetId] || { content: '' };
    const isEditingThis = editingTargetId === targetId;

    return (
      <div className="mt-2 pt-4 border-t border-gray-100 dark:border-navy-800/50 space-y-4 animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-navy-900 dark:text-white">
              <Edit3 size={14} className="text-navy-600 dark:text-gold-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">My Research Notes</span>
            </div>
            {!isEditingThis ? (
              <button onClick={() => { setEditingTargetId(targetId); setEditBuffer(personalData.content); }} className="text-[10px] text-navy-600 font-bold hover:underline">Edit Research</button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => handleSave(targetId)} className="text-[10px] text-emerald-600 font-bold">Save</button>
                <button onClick={() => setEditingTargetId(null)} className="text-[10px] text-gray-400 font-bold">Cancel</button>
              </div>
            )}
          </div>
          
          {isEditingThis ? (
            <textarea 
              value={editBuffer} 
              onChange={(e) => setEditBuffer(e.target.value)} 
              placeholder="Write your research or digest here..."
              className="w-full p-3 text-xs bg-gray-50 dark:bg-navy-900 border border-gray-200 rounded-lg outline-none min-h-[100px]" 
            />
          ) : (
            <div className="text-xs p-4 rounded-xl border bg-white dark:bg-navy-950 text-gray-700 dark:text-gray-300 shadow-sm">
              {personalData.content ? (
                <div className="prose prose-sm dark:prose-invert max-w-none text-left">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {personalData.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <span className="italic text-gray-400">No research notes yet. Click edit to begin your annotation.</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStructuredContent = () => {
    if (!provision.content) return null;
    const sections = provision.content.split(/(?=Section\s+\d+\.)/gi);
    
    const visibleSections = sections.slice(0, visibleSectionsLimit);
    const hasMore = sections.length > visibleSectionsLimit;

    return (
      <div className="space-y-4">
        {visibleSections.map((sec, idx) => {
          const text = sec.trim();
          if (!text) return null;
          const isSection = /^Section\s+\d+\./i.test(text);
          
          if (isSection) {
            const match = text.match(/^(Section\s+\d+\.)([\s\S]*)/i);
            if (match) {
              const sectionTitle = match[1].trim();
              const targetId = `${provision.id}::${sectionTitle}`;
              const isSectionExpanded = expandedSections[targetId];
              
              return (
                <div key={idx} className="bg-white dark:bg-navy-900 border-l-4 border-l-gold-500 border-y border-r border-gray-200 dark:border-navy-700 rounded-r-xl shadow-sm">
                  <div onClick={() => setExpandedSections(prev => ({...prev, [targetId]: !prev[targetId]}))} className="p-5 cursor-pointer rounded-r-xl hover:bg-gray-50 transition-colors flex justify-between items-center">
                    <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 text-left">
                      <h5 className="font-bold text-gold-600 text-xs uppercase mb-1">{sectionTitle}</h5>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{match[2].trim()}</ReactMarkdown>
                    </div>
                    <ChevronDown size={16} className={cn("text-gray-400", isSectionExpanded && "rotate-180")} />
                  </div>
                  {isSectionExpanded && <div className="px-5 pb-5">{renderInteractionZone(targetId)}</div>}
                </div>
              );
            }
          }
          return (
            <div key={idx} className="bg-gray-50 dark:bg-navy-900/50 p-5 rounded-xl text-gray-700 dark:text-gray-300 text-left">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            </div>
          );
        })}
        
        {hasMore && (
          <div className="flex justify-center pt-4 pb-2">
            <button 
              onClick={() => setVisibleSectionsLimit(prev => prev + 10)}
              className="px-6 py-2 bg-white dark:bg-navy-950 border border-gray-200 dark:border-navy-800 text-navy-600 dark:text-gold-400 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:border-gold-500 hover:text-gold-600 transition-all shadow-sm"
            >
              Load More Sections ({sections.length - visibleSectionsLimit} hidden)
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn(
      "card overflow-hidden transition-all duration-300", 
      isExpanded ? "ring-2 ring-gold-500/30 shadow-xl border-transparent" : "border-gray-100 dark:border-navy-800",
      indentStyles 
    )}>
      <button onClick={onToggleExpand} className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 dark:hover:bg-navy-900/50 transition-colors text-left">
        <div className="flex items-center gap-4">
          {isExpanded ? <ChevronDown size={18} className="text-gold-500"/> : <ChevronRight size={18} className="text-gray-400"/>}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-navy-600 dark:text-gold-400 bg-navy-50 dark:bg-navy-900/50 px-2 py-1 rounded uppercase tracking-widest">{getAbbreviation(provision.book)}</span>
              <h3 className="font-black text-navy-900 dark:text-white text-sm tracking-tight">{provision.articleNumber}</h3>
            </div>
            {provision.title && <p className="text-xs text-gray-500 font-medium mt-1 truncate">— {provision.title}</p>}
          </div>
        </div>
        {isExpanded && <Sparkles className="text-gold-500 animate-pulse" size={18} />}
      </button>

      {isExpanded && (
        <div className="flex flex-col lg:flex-row border-t border-gray-100 dark:border-navy-800 bg-white dark:bg-navy-950 animate-fade-in relative">
          
          <div className="flex-1 p-8 border-r border-gray-100 dark:border-navy-800/50">
            <div className="mb-6 p-4 bg-gray-50 dark:bg-navy-900/30 rounded-xl border border-gray-100 dark:border-navy-800 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                <span className="text-navy-900 dark:text-gray-200">{provision.book}</span>
                {provision.bookPart && <><span><ChevronRight size={12}/></span><span className="text-gray-600 dark:text-gray-400">{provision.bookPart}</span></>}
                {provision.titlePart && <><span><ChevronRight size={12}/></span><span className="text-gray-600 dark:text-gray-400">{provision.titlePart}</span></>}
                {provision.chapter && <><span><ChevronRight size={12}/></span><span className="text-gray-600 dark:text-gray-400">{provision.chapter}</span></>}
            </div>

            <div className="flex items-center gap-2 mb-6 text-navy-900 dark:text-white opacity-60">
              <FileText size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Codal Text</span>
            </div>
            {renderStructuredContent()}
            
            <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-100 dark:border-navy-800">
              <div className="flex items-center gap-2 mb-4">
                <Library size={16} className="text-gold-500" />
                <span className="text-xs font-black uppercase tracking-widest text-navy-900 dark:text-white">General Article Annotations</span>
              </div>
              {renderInteractionZone(provision.id)}
            </div>
          </div>

          <div className="w-full lg:w-[420px] bg-navy-50/20 dark:bg-navy-900/10 p-8">
            {sidePanelContent ? (
              <div className="animate-fade-in space-y-4">
                <button 
                  onClick={() => setSidePanelContent(null)} 
                  className="text-xs font-bold flex items-center gap-2 text-gray-500 hover:text-navy-900 bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-sm"
                >
                  <ArrowLeft size={14} /> Back to Analysis & Links
                </button>
                
                {sidePanelContent.type === 'case' && (
                  <div className="bg-white dark:bg-navy-900 p-6 rounded-2xl shadow-sm border border-gold-200 max-h-[600px] overflow-y-auto custom-scrollbar">
                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2">{sidePanelContent.data.grNo}</div>
                    <h3 className="font-bold text-navy-900 dark:text-white leading-snug mb-4">{sidePanelContent.data.title}</h3>
                    <div className="space-y-4 text-xs text-gray-700 dark:text-gray-300">
                        <div><strong className="text-gold-600">Facts:</strong><br/> <span className="whitespace-pre-wrap">{sidePanelContent.data.facts}</span></div>
                        <div><strong className="text-gold-600">Issues:</strong><br/> <span className="whitespace-pre-wrap">{sidePanelContent.data.issues}</span></div>
                        <div className="p-3 bg-navy-50 dark:bg-navy-950 rounded border-l-2 border-navy-900"><strong className="text-navy-900 dark:text-gold-400">Ruling:</strong><br/> <span className="whitespace-pre-wrap">{sidePanelContent.data.ratio}</span></div>
                    </div>
                  </div>
                )}
              </div>

            ) : (
              <div className="space-y-8 animate-fade-in">
                <div className="space-y-4">
                    {!savedAnalysis ? (
                        <button 
                            onClick={() => onAIDeconstruct(provision)}
                            disabled={isAnalyzing}
                            className="w-full py-4 bg-navy-950 dark:bg-gold-500 text-white dark:text-navy-950 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50 transition-all"
                        >
                            {isAnalyzing ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16} />}
                            {isAnalyzing ? "Processing Logic..." : "Initialize AI Deconstruction"}
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 text-gold-500 pb-2 border-b border-gold-200/30">
                            <ShieldCheck size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {provision.aiAnalysis ? "Verified Admin Insight" : "Personal AI Analysis Secured"}
                            </span>
                        </div>
                    )}
                    
                    {savedAnalysis && (
                        <div className="p-6 bg-white dark:bg-navy-900 rounded-3xl border border-gold-200/50 dark:border-navy-800 text-xs leading-relaxed text-gray-700 dark:text-gray-300 max-h-64 overflow-y-auto custom-scrollbar shadow-inner text-left">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{savedAnalysis}</ReactMarkdown>
                        </div>
                    )}
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-navy-800/50">
                    <button 
                      onClick={() => setShowLinkedCases(!showLinkedCases)} 
                      className="w-full flex justify-between items-center py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-navy-600 transition-colors"
                    >
                        <span className="flex items-center gap-2"><Gavel size={14} className="text-blue-500" /> Linked Jurisprudence ({currentCrossRefs.linkedCases.length})</span>
                        <ChevronDown size={14} className={cn("transition-transform", showLinkedCases && "rotate-180")} />
                    </button>
                    
                    {showLinkedCases && (
                      <div className="mt-3 space-y-3 animate-fade-in">
                          {currentCrossRefs.linkedCases.map((c: any) => (
                              <div key={c.id} onClick={() => setSidePanelContent({ type: 'case', data: c })} className="p-4 bg-white dark:bg-navy-900 border border-gray-100 dark:border-navy-800 rounded-2xl hover:border-blue-500 cursor-pointer shadow-sm transition-all group text-left">
                                  <p className="text-[11px] font-bold text-navy-900 dark:text-gray-200 truncate group-hover:text-blue-600">{c.title}</p>
                                  <p className="text-[9px] text-gray-400 mt-1 font-bold uppercase tracking-wider">{c.grNo}</p>
                              </div>
                          ))}
                          {currentCrossRefs.linkedCases.length === 0 && <p className="text-[10px] italic text-gray-400 text-left px-2">No library matches found.</p>}
                      </div>
                    )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// 🏛️ MAIN PAGE COMPONENT
// ============================================================================
const ECodalsPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { codals, fetchCodals, addCodal, updateCodal, deleteCodal, savePrivateNote, loading } = useCodalsStore();
  
  const { cases, fetchCases } = useCasesStore(); 
  const { fetchNotes } = useNotesStore();
  
  const [searchParams] = useSearchParams();

  const isAdmin = user?.email === 'rashemvanrondina@gmail.com'; 

  // 🟢 Guard States
  const { checkAccess } = useUsageGuard();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeConfig, setUpgradeConfig] = useState({ feature: '', text: '' });

  // --- Intelligence States ---
  const [analysis, setAnalysis] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);

  // --- UI States ---
  const [userNotes, setUserNotes] = useState<Record<string, {content: string}>>({});
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');
  const [selectedCode, setSelectedCode] = useState('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [formData, setFormData] = useState<Partial<CodalProvision>>({
    book: '', articleNumber: '', title: '', content: ''
  });

  const [visibleCount, setVisibleCount] = useState(20);

  const fetchUserNotes = async (uid: string) => {
    try {
      const q = query(collection(db, 'codal_notes'), where('userId', '==', uid));
      const snap = await getDocs(q);
      const notesMap: Record<string, {content: string}> = {};
      
      snap.forEach(doc => { 
        const data = doc.data();
        const key = data.targetId || data.codalId || doc.id; 
        notesMap[key] = { content: data.content || '' }; 
      });
      
      setUserNotes(notesMap);
      setNotesLoaded(true);
    } catch (err) { 
      console.error("Vault retrieval error", err); 
      setNotesLoaded(true);
    }
  };

  useEffect(() => {
    fetchCodals();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        fetchUserNotes(firebaseUser.uid); 
        fetchNotes(firebaseUser.uid);
        fetchCases(firebaseUser.uid); 
      }
    });
    return () => unsubscribe();
  }, [fetchCodals, fetchNotes, fetchCases]);

  useEffect(() => {
    const queryParam = searchParams.get('search');
    if (queryParam) setSearch(queryParam);
  }, [searchParams]);

  useEffect(() => {
    setVisibleCount(20);
  }, [search, selectedCode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- LOGIC HANDLERS ---

  const handleAIDeconstruct = async (provision: CodalProvision) => {
    // 🛡️ AMENDMENT 2: Official Guard & Explicit Upgrade Text
    if (!checkAccess('aiDeconstruction')) {
      setUpgradeConfig({ 
        feature: 'AI Deconstruction', 
        text: user?.subscription === 'free' ? 'Basic tier limit (Not Available)' : 'Premium tier limit of 2,000 queries' 
      });
      setShowUpgradeModal(true);
      return;
    }

    const targetId = `${provision.id}::AI_ANALYSIS`; 
    setIsAnalyzing(provision.id);
    try {
      // 🟢 AMENDMENT 3: Dynamic API URL & Auth Payload
      const res = await fetch(`${API_URL}/deconstruct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: `${provision.articleNumber}: ${provision.title}`, 
          content: provision.content,
          userId: user?.id,
          isAdmin: isAdmin 
        })
      });
      
      const data = await res.json();
      const result = data.analysis;

      if (user && !isAdmin) {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, { 'usage.aiDeconstructionCount': increment(1) });
      }

      await savePrivateNote(targetId, user?.id || '', result, [], 'ai_deconstruction');
      setUserNotes(prev => ({ ...prev, [targetId]: { content: result } }));
      setAnalysis(prev => ({ ...prev, [provision.id]: result }));
    } catch (err) {
      alert("AI Engine is currently at maximum capacity.");
    } finally {
      setIsAnalyzing(null);
    }
  };

  const handleSaveNote = async (targetId: string, content: string) => {
    if (!user) return;
    
    // 🛡️ AMENDMENT 1: Using the Official Enforcer for Note Limits!
    if (!userNotes[targetId]) {
      const currentNotesCount = Object.keys(userNotes).length;
      if (!checkAccess('codalNotes', currentNotesCount)) {
        setUpgradeConfig({ 
          feature: 'Codal Annotations', 
          text: user.subscription === 'free' ? 'Basic tier limit of 100 total notes' : 'Premium tier limit of 2,000 total notes' 
        });
        setShowUpgradeModal(true);
        throw new Error("LIMIT_REACHED");
      }
    }

    try {
      await savePrivateNote(targetId, user.id, content, [], 'codal_annotation');
      setUserNotes(prev => ({ ...prev, [targetId]: { content } }));
    } catch (err) { 
      alert("Save failed."); 
      throw err;
    }
  };

  const handleAdminSave = async () => {
    if (!formData.book || !formData.articleNumber) return;
    try {
      if (formData.id) await updateCodal(formData.id, formData);
      else await addCodal(formData);
      setShowAdminForm(false);
      setFormData({ book: '', articleNumber: '', title: '', content: '' });
    } catch (e) { console.error(e); }
  };

  const books = ['all', ...Array.from(new Set(codals.map((c) => c.book)))];

  const filteredCodals = codals
    .filter((c) => {
      const matchBook = selectedCode === 'all' || (c.book && c.book.toUpperCase() === selectedCode.toUpperCase());
      const matchSearch = search === '' || 
        c.content.toLowerCase().includes(search.toLowerCase()) ||
        c.articleNumber.toLowerCase().includes(search.toLowerCase()) ||
        (c.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.bookPart || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.titlePart || '').toLowerCase().includes(search.toLowerCase());
      return matchBook && matchSearch;
    })
    .sort((a, b) => {
      if (a.orderIndex !== undefined && b.orderIndex !== undefined && a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
      const weightA = getArticleWeight(a.articleNumber);
      const weightB = getArticleWeight(b.articleNumber);
      if (weightA !== weightB) return weightA - weightB;
      return (a.title || '').localeCompare(b.title || '', undefined, { numeric: true });
    });

  const displayedCodals = filteredCodals.slice(0, visibleCount);

  let currentBookPart = '';
  let currentTitlePart = '';
  let currentChapter = '';

  return (
    <>
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
        featureName={upgradeConfig.feature} 
        limitText={upgradeConfig.text} 
      />

      <div className="space-y-8 animate-fade-in text-left pb-20">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-navy-900 dark:text-white uppercase tracking-tight">E-Codals</h2>
            <p className="text-sm text-gray-500 font-medium">Intelligence-Powered Legal Library</p>
          </div>
          {isAdmin && (
            <button onClick={() => { setFormData({ book: '', articleNumber: '', title: '', content: '' }); setShowAdminForm(!showAdminForm); }} className="px-6 py-2 bg-red-700 text-white rounded-xl font-bold shadow-lg">
              {showAdminForm ? 'Close Editor' : 'Publish Law'}
            </button>
          )}
        </div>

        {isAdmin && showAdminForm && (
          <div className="card p-6 border-2 border-red-500/50 bg-red-50/30 space-y-4 animate-fade-in">
             <div className="grid grid-cols-2 gap-4">
              <input className="input-field" placeholder="Book" value={formData.book} onChange={e => setFormData({...formData, book: e.target.value})} />
              <input className="input-field" placeholder="Article Number" value={formData.articleNumber} onChange={e => setFormData({...formData, articleNumber: e.target.value})} />
            </div>
            <input className="input-field" placeholder="Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            <textarea className="input-field h-32" placeholder="Content..." value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />
            <button onClick={handleAdminSave} className="btn-primary bg-red-700 w-full border-none shadow-xl">Update Global Registry</button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 z-20">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-gold-500 transition-colors" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search articles, titles, or structure..." className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-navy-950 border-2 border-gray-200 dark:border-navy-800 focus:border-gold-500 rounded-xl outline-none shadow-sm transition-all" />
          </div>
          
          <div className="relative w-full lg:w-64" ref={dropdownRef}>
            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full flex items-center justify-between px-4 py-3.5 bg-white dark:bg-navy-950 border-2 border-gray-200 dark:border-navy-800 rounded-xl hover:border-gold-500 transition-all shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black px-2 py-1 bg-navy-50 dark:bg-navy-900 rounded">{getAbbreviation(selectedCode)}</span>
                <span className="text-sm font-bold text-navy-900 dark:text-white uppercase truncate">
                  {selectedCode === 'all' ? 'All Codes' : selectedCode}
                </span>
              </div>
              <ChevronDown size={18} className={cn("text-gray-400 transition-transform", isDropdownOpen && "rotate-180")} />
            </button>
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-navy-950 border border-gray-100 dark:border-navy-800 rounded-xl shadow-2xl z-50 py-2 animate-fade-in max-h-64 overflow-y-auto">
                {books.map((book) => (
                  <button key={book} onClick={() => { setSelectedCode(book); setIsDropdownOpen(false); }} className="w-full px-4 py-3 hover:bg-gold-50 dark:hover:bg-navy-900 text-left text-xs font-bold uppercase text-navy-900 dark:text-gray-300">
                    {book}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {loading ? <div className="flex justify-center p-20"><Loader2 className="animate-spin text-gold-500" /></div> : displayedCodals.map((provision) => {
            
            const isSearching = search.trim().length > 0;
            let showBookPart = false, showTitlePart = false, showChapter = false;

            if (!isSearching) {
               showBookPart = !!provision.bookPart && provision.bookPart !== currentBookPart;
               if (showBookPart) {
                 currentBookPart = provision.bookPart || '';
                 currentTitlePart = ''; 
                 currentChapter = '';   
               }

               showTitlePart = !!provision.titlePart && provision.titlePart !== currentTitlePart;
               if (showTitlePart) {
                 currentTitlePart = provision.titlePart || '';
                 currentChapter = '';   
               }

               showChapter = !!provision.chapter && provision.chapter !== currentChapter;
               if (showChapter) {
                 currentChapter = provision.chapter || '';
               }
            }

            const isExpanded = expandedId === provision.id;
            const indentStyles = !isSearching && (provision.titlePart || provision.chapter) ? "ml-8" : "";
            const savedAnalysis = provision.aiAnalysis || userNotes[`${provision.id}::AI_ANALYSIS`]?.content;

            return (
              <React.Fragment key={provision.id}>
                {!isSearching && (
                  <>
                    {showBookPart && (
                      <div className="mt-8 mb-4 pt-4 border-t-2 border-navy-900 dark:border-gold-500/50 flex items-center gap-3">
                         <Bookmark className="text-gold-500 shrink-0" size={24} />
                         <h2 className="text-xl font-black text-navy-900 dark:text-white tracking-tight">{provision.bookPart}</h2>
                      </div>
                    )}
                    {showTitlePart && (
                      <div className="mt-6 mb-3 flex items-center gap-2 pl-2">
                         <Folder className="text-gray-400 dark:text-gray-500 shrink-0" size={18} />
                         <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">{provision.titlePart}</h3>
                      </div>
                    )}
                    {showChapter && (
                      <div className="mt-4 mb-2 flex items-center gap-2 pl-6">
                         <Layers className="text-gray-300 dark:text-gray-600 shrink-0" size={14} />
                         <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{provision.chapter}</h4>
                      </div>
                    )}
                  </>
                )}

                <CodalCard 
                  provision={provision}
                  isExpanded={isExpanded}
                  onToggleExpand={() => setExpandedId(isExpanded ? null : provision.id)}
                  indentStyles={indentStyles}
                  userNotes={userNotes}
                  onSaveNote={handleSaveNote}
                  savedAnalysis={savedAnalysis}
                  isAnalyzing={isAnalyzing === provision.id}
                  onAIDeconstruct={handleAIDeconstruct}
                  cases={cases}
                />
              </React.Fragment>
            );
          })}

          {!loading && visibleCount < filteredCodals.length && (
            <div className="flex justify-center pt-8 pb-4">
              <button 
                onClick={() => setVisibleCount(prev => prev + 20)}
                className="px-8 py-3 bg-white dark:bg-navy-950 border-2 border-gray-200 dark:border-navy-800 text-navy-600 dark:text-gold-400 text-xs font-bold uppercase tracking-widest rounded-xl hover:border-gold-500 hover:text-gold-600 transition-all shadow-sm"
              >
                Load More Provisions ({filteredCodals.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ECodalsPage;