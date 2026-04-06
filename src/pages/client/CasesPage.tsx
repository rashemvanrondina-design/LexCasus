import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useCasesStore } from '../../store/casesStore';
import { auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { cn } from '../../lib/utils';
import {
  Search, Plus, Book, ChevronRight, ChevronDown, BookOpen, Layers, 
  Scale, Trash2, ArrowLeft, Loader2, Sparkles, X, Shield, Gavel, Calendar, 
  User, Target, BookMarked, Hash, ArrowRight, RotateCcw, Edit3, Save, Link, CheckCircle,
  Download, Filter // 🟢 IMPORTED FILTER ICON
} from 'lucide-react';

import { useUsageGuard } from '../../hooks/useUsageGuard';
import UpgradeModal from '../../components/modals/UpgradeModal';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../lib/firebase';

import ReactQuill from 'react-quill-new';
import 'react-quill/dist/quill.snow.css';

const TOPICS = [
  'All', 'Civil Law', 'Criminal Law', 'Remedial Law', 'Constitutional Law', 'Labor Law', 'Commercial Law', 'Taxation Law', 'Legal Ethics',
  'Property', 'Succession', 'Obligations & Contracts', 'Persons & Family Relations', 'Sales', 'Agency & Partnership', 'Corporation Law', 'Evidence', 'Criminal Procedure', 'Civil Procedure'
];

const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ 'background': [] }, { 'color': [] }], 
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['clean'] 
  ],
};

const CasesPage: React.FC = () => {
  const { user } = useAuthStore();
  const { cases, addCase, updateCase, deleteCase, fetchCases, fetchMoreCases, hasMore, loadingMore, loading } = useCasesStore();
  const navigate = useNavigate();
  
  const { checkAccess } = useUsageGuard(); 
  const [showUpgradeModal, setShowUpgradeModal] = useState(false); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        fetchCases(firebaseUser.uid);
      }
    });
    return () => unsubscribe();
  }, [fetchCases]);

  const [viewMode, setViewMode] = useState<'library' | 'reader' | 'editor' | 'flashcards'>('library');
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTopic, setActiveTopic] = useState('All');
  const [visibleCount, setVisibleCount] = useState(10);

  const [showAddForm, setShowAddForm] = useState(false);
  const [inputText, setInputText] = useState('');
  const [focusTopic, setFocusTopic] = useState(''); // 🟢 NEW STATE: Target Specific Issue
  const [newTag, setNewTag] = useState('');
  const [newProvision, setNewProvision] = useState('');
  const [selectedCode, setSelectedCode] = useState('Civil Code');

  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [generatingIdx, setGeneratingIdx] = useState<number | null>(null);

  const [formData, setFormData] = useState<any>({
    title: '', grNo: '', date: '', ponente: '', topic: '', facts: '', issues: '', ratio: '', disposition: '', doctrines: '', barRelevance: '', provisions: [], tags: []
  });

  useEffect(() => {
    setVisibleCount(10);
  }, [searchQuery, activeTopic]);

  const resetForm = () => {
    setFormData({ 
      title: '', grNo: '', date: '', ponente: '', topic: '', 
      facts: '', issues: '', ratio: '', disposition: '', 
      doctrines: '', barRelevance: '', provisions: [], tags: [] 
    });
    setInputText('');
    setFocusTopic(''); // 🟢 Reset focus topic
    setNewProvision('');
    setNewTag('');
    setShowAddForm(false);
    setSearchResults([]); 
  };

  const openCase = (c: any) => {
    setSelectedCase(c);
    setViewMode('reader');
  };

  const editCase = (c: any) => {
    setFormData(c);
    setViewMode('editor');
  };

  const openFlashcards = (c: any) => {
    setSelectedCase(c);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setViewMode('flashcards');
  };

  const handleDownloadPDF = (c: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow pop-ups to generate the PDF.");
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <title>${c.title} - Digest</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; line-height: 1.6; padding: 40px; color: #000; max-width: 800px; margin: auto; }
            h1 { font-size: 22px; text-align: center; margin-bottom: 5px; text-transform: uppercase; }
            h3 { font-size: 14px; text-align: center; font-weight: normal; margin-top: 0; color: #444; }
            h4 { font-size: 16px; margin-top: 30px; border-bottom: 2px solid #000; padding-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
            p, div { font-size: 14px; text-align: justify; }
            .meta { text-align: center; font-size: 12px; margin-bottom: 40px; font-style: italic; }
            .tags { margin-top: 40px; font-size: 11px; color: #555; border-top: 1px dashed #ccc; padding-top: 10px; }
            @media print {
              @page { margin: 20mm; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>${c.title}</h1>
          <h3>${c.grNo} | ${c.date || 'N/A'}</h3>
          <div class="meta">Ponente: ${c.ponente || 'N/A'} | Topic: ${c.topic || 'N/A'}</div>

          <h4>Facts</h4>
          <div>${c.facts || 'No facts provided.'}</div>

          <h4>Issue/s</h4>
          <div>${c.issues || 'No issues provided.'}</div>

          <h4>Ratio Decidendi</h4>
          <div>${c.ratio || 'No ruling provided.'}</div>

          ${c.disposition ? `<h4>Disposition</h4><div>${c.disposition}</div>` : ''}
          ${c.doctrines ? `<h4>Doctrines</h4><div>${c.doctrines}</div>` : ''}

          <div class="tags">
            <strong>Provisions:</strong> ${(c.provisions || []).join(', ') || 'None'}<br/>
            <strong>Tags:</strong> ${(c.tags || []).join(', ') || 'None'}
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const filteredCases = cases.filter((c: any) => {
    const matchesSearch = (c.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                          (c.grNo?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesTopic = activeTopic === 'All' || 
                         (c.topic || '').toLowerCase().includes(activeTopic.toLowerCase()) || 
                         (c.tags || []).some((t: string) => t.toLowerCase().includes(activeTopic.toLowerCase()));
    return matchesSearch && matchesTopic;
  });

  const displayedCases = filteredCases.slice(0, visibleCount);

  const handleSearch = async () => {
    if (!inputText.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      const res = await fetch('https://lexcasus-backend.onrender.com/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: inputText.trim() })
      });
      
      const data = await res.json();
      if (data.searchResults) {
        setSearchResults(data.searchResults);
      }
    } catch (error) {
      console.error("Discovery Search Error:", error);
      alert("Atty., we could not retrieve the search results. Is the backend running?");
    } finally {
      setIsSearching(false);
    }
  };

  const handleGenerate = async (searchCard: any, index: number) => {
    if (!checkAccess('casesDaily')) {
      setShowUpgradeModal(true);
      return; 
    }

    setGeneratingIdx(index);
    
    try {
      const res = await fetch('https://lexcasus-backend.onrender.com/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 🟢 NEW: Passing the focusTopic to the backend payload
        body: JSON.stringify({ 
          query: searchCard.grNo,
          url: searchCard.links.viewSource,
          focus: focusTopic.trim() || undefined 
        })
      });

      const aiResponse = await res.json();
      
      if (aiResponse.error) {
        throw new Error(aiResponse.error);
      }

      if (user && user.role !== 'admin' && user.email !== 'rashemvanrondina@gmail.com') {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          'usage.dailyCaseCount': increment(1),
          'usage.monthlyCaseCount': increment(1)
        });
      }

      const formatForEditor = (text: string) => text ? text.replace(/\n/g, '<br/>') : '';

      setFormData({
        title: aiResponse.title || searchCard.title || '',
        grNo: aiResponse.grNo || searchCard.grNo || '',
        date: aiResponse.date || '',
        ponente: aiResponse.ponente || '',
        topic: focusTopic ? `${focusTopic} (${aiResponse.topic})` : (aiResponse.topic || ''), // Set the topic based on focus
        facts: formatForEditor(aiResponse.facts),
        issues: formatForEditor(aiResponse.issues),
        ratio: formatForEditor(aiResponse.ratio),
        disposition: formatForEditor(aiResponse.disposition),
        doctrines: formatForEditor(aiResponse.doctrines),
        barRelevance: aiResponse.barRelevance || '',
        provisions: [], 
        tags: []
      });

      setViewMode('editor'); 
      setSearchResults([]); 
    } catch (error) {
      console.error("Frontend Digest Error:", error);
      alert("Atty., we could not process the case. It may lack a recognizable HTML format.");
    } finally {
      setGeneratingIdx(null);
    }
  };

  const handleSave = async () => {
    if (!formData.title) return;

    let finalProvisions = [...(formData.provisions || [])];
    if (newProvision.trim()) {
      const entry = `${selectedCode} ${newProvision.trim()}`;
      if (!finalProvisions.includes(entry)) finalProvisions.push(entry);
    }

    let finalTags = [...(formData.tags || [])];
    if (newTag.trim()) {
      if (!finalTags.includes(newTag.trim())) finalTags.push(newTag.trim());
    }

    const dataToSave = { 
      ...formData, 
      provisions: finalProvisions, 
      tags: finalTags,
      updatedAt: new Date().toISOString() 
    };

    try {
      if (dataToSave.id) {
        await updateCase(dataToSave.id, dataToSave);
        if (selectedCase?.id === dataToSave.id) setSelectedCase(dataToSave);
      } else {
        await addCase({ ...dataToSave, grNo: dataToSave.grNo || 'G.R. No. Pending' });
      }

      setNewProvision('');
      setNewTag('');
      setViewMode('library');
      resetForm();
    } catch (err) {
      alert("Atty., the filing was rejected by the server. Please try again.");
    }
  };

  const handleLoadMore = async () => {
    if (visibleCount + 10 >= cases.length && hasMore) {
      await fetchMoreCases();
    }
    setVisibleCount(prev => prev + 10);
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html || "";
    return tmp.textContent || tmp.innerText || "";
  };

  const flashcards = useMemo(() => {
    if (!selectedCase) return [];
    const cards: { type: string, question: string, answer: string }[] = [];

    if (selectedCase.facts) {
      cards.push({ type: 'Core Facts', question: `What are the material facts of ${selectedCase.title}?`, answer: stripHtml(String(selectedCase.facts)) });
    }

    if (selectedCase.issues && selectedCase.ratio) {
      const rawIssues = stripHtml(Array.isArray(selectedCase.issues) ? selectedCase.issues.join('\n') : String(selectedCase.issues));
      const rawRatio = stripHtml(Array.isArray(selectedCase.ratio) ? selectedCase.ratio.join('\n') : String(selectedCase.ratio));

      const issueList = rawIssues.split(/\n/).filter((l: string) => l.trim().length > 5);
      const ratioList = rawRatio.split(/Issue \d+:/i).filter((l: string) => l.trim().length > 5);

      if (issueList.length > 0 && ratioList.length > 0 && issueList.length === ratioList.length) {
        issueList.forEach((issue: string, idx: number) => {
          cards.push({ type: 'Issue & Ruling', question: issue.replace(/^\d+\.\s*/, '').trim(), answer: ratioList[idx].trim() });
        });
      } else {
        cards.push({ type: 'Issues & Rulings', question: 'What were the core issues and the Court\'s rulings?', answer: rawRatio });
      }
    }

    if (selectedCase.doctrines) {
      const rawDocs = stripHtml(Array.isArray(selectedCase.doctrines) ? selectedCase.doctrines.join('\n') : String(selectedCase.doctrines));
      
      const docs = rawDocs.split(/\n/).filter((l: string) => l.trim().length > 5);
      docs.forEach((d: string, i: number) => {
        cards.push({ type: 'Legal Doctrine', question: `What key doctrine was established in this case? (Point ${i + 1})`, answer: d.replace(/^[-*]\s*/, '').trim() });
      });
    }

    return cards;
  }, [selectedCase]);

  // --- VIEWS ---

  if (viewMode === 'reader' && selectedCase) {
    return (
      <div className="animate-fade-in max-w-5xl mx-auto space-y-6 pb-12">
        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
          <button onClick={() => setViewMode('library')} className="text-sm font-bold text-gray-500 hover:text-navy-900 flex items-center gap-2 transition-colors">
            <ArrowLeft size={16}/> Back to My Cases
          </button>
          
          <div className="flex items-center gap-2">
            <button onClick={() => handleDownloadPDF(selectedCase)} className="btn-secondary text-xs px-4 py-2 border-navy-200 text-navy-700 hover:bg-navy-50">
              <Download size={14} /> Save as PDF
            </button>
            <button onClick={() => openFlashcards(selectedCase)} className="btn-primary bg-navy-900 text-gold-500 text-xs px-4 py-2">
              <Layers size={14} /> Review Flashcards
            </button>
          </div>
        </div>

        <div className="card p-10 shadow-2xl bg-white border border-gray-100">
          <div className="border-b border-gray-100 pb-8">
            <div className="flex justify-between items-start">
               <h3 className="text-3xl font-extrabold text-navy-900 pr-4 leading-tight">{selectedCase.title}</h3>
               <button onClick={() => editCase(selectedCase)} className="btn-secondary text-xs flex-shrink-0 text-navy-700 border-navy-200 hover:bg-navy-50"><Edit3 size={14}/> Edit Digest & Highlights</button>
            </div>
            <div className="flex flex-wrap gap-6 mt-5 text-xs font-bold text-gray-500 uppercase tracking-widest">
              {selectedCase.grNo && <span className="flex items-center gap-1.5"><Gavel size={14} className="text-gold-500" /> {selectedCase.grNo}</span>}
              {selectedCase.date && <span className="flex items-center gap-1.5"><Calendar size={14} className="text-gold-500" /> {selectedCase.date}</span>}
              {selectedCase.ponente && <span className="flex items-center gap-1.5"><User size={14} className="text-gold-500" /> {selectedCase.ponente}</span>}
              {selectedCase.topic && <span className="flex items-center gap-1.5"><Target size={14} className="text-gold-500" /> {selectedCase.topic}</span>}
            </div>
          </div>

          <div className="space-y-10 mt-8">
            <section className="space-y-4">
              <h4 className="font-extrabold text-sm text-gold-600 border-l-4 border-gold-500 pl-4 tracking-widest uppercase">Facts</h4>
              <div className="text-base leading-relaxed text-gray-700 prose max-w-none" dangerouslySetInnerHTML={{ __html: selectedCase.facts }} />
            </section>
            
            <section className="space-y-4">
              <h4 className="font-extrabold text-sm text-gold-600 border-l-4 border-gold-500 pl-4 tracking-widest uppercase">Issue/s</h4>
              <div className="text-base leading-relaxed text-gray-700 prose max-w-none" dangerouslySetInnerHTML={{ __html: selectedCase.issues }} />
            </section>
            
            <section className="p-8 bg-navy-50/50 rounded-2xl border-l-4 border-navy-900">
              <h4 className="font-extrabold text-sm text-navy-900 mb-4 tracking-widest uppercase">Ratio Decidendi</h4>
              <div className="text-base leading-relaxed text-gray-800 prose max-w-none" dangerouslySetInnerHTML={{ __html: selectedCase.ratio }} />
            </section>
            
            <section className="space-y-4">
              <h4 className="font-extrabold text-sm text-gold-600 border-l-4 border-gold-500 pl-4 tracking-widest uppercase">Disposition</h4>
              <div className="text-base italic leading-relaxed text-gray-600 prose max-w-none" dangerouslySetInnerHTML={{ __html: selectedCase.disposition }} />
            </section>
            
            <section className="p-8 bg-gold-50/50 rounded-2xl border border-gold-200">
              <h4 className="font-extrabold text-sm text-gold-700 mb-4 tracking-widest uppercase">Doctrines</h4>
              <div className="text-base leading-relaxed text-gray-800 prose max-w-none" dangerouslySetInnerHTML={{ __html: selectedCase.doctrines }} />
            </section>
            
            <div className="pt-8 border-t border-gray-100 flex flex-wrap gap-4">
               <div className="flex gap-2 flex-wrap">{selectedCase.provisions?.map((p:string) => <button key={p} onClick={() => navigate(`/codals?search=${encodeURIComponent(p)}`)} className="bg-navy-100 text-navy-800 hover:bg-navy-200 cursor-pointer shadow-sm text-xs py-1.5 px-3 rounded-md border-0 flex items-center gap-1"><BookOpen size={12}/> {p}</button>)}</div>
               <div className="flex gap-2 flex-wrap">{selectedCase.tags?.map((t:string) => <span key={t} className="bg-gold-100 text-gold-800 border-0 text-xs py-1.5 px-3 rounded-md flex items-center gap-1"><Hash size={12}/> {t}</span>)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'flashcards' && selectedCase && flashcards.length > 0) {
    const card = flashcards[currentCardIndex];
    return (
      <div className="animate-fade-in max-w-4xl mx-auto space-y-6 pb-12">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setViewMode('reader')} className="text-sm font-bold text-gray-500 hover:text-navy-900 flex items-center gap-2 transition-colors">
            <ArrowLeft size={16}/> Back to Digest
          </button>
          <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">
            Card {currentCardIndex + 1} of {flashcards.length}
          </div>
        </div>

        <div className="relative w-full h-[500px] cursor-pointer" style={{ perspective: '1500px' }} onClick={() => setIsFlipped(!isFlipped)}>
          <div className={cn("w-full h-full transition-transform duration-500 rounded-3xl shadow-2xl", isFlipped ? "[transform:rotateY(180deg)]" : "")} style={{ transformStyle: 'preserve-3d' }}>
            <div className="absolute inset-0 bg-white p-12 rounded-3xl border-4 border-navy-50 flex flex-col justify-center items-center text-center shadow-inner" style={{ backfaceVisibility: 'hidden' }}>
              <div className="absolute top-6 left-6 text-gold-600 font-extrabold tracking-widest uppercase text-xs border border-gold-200 bg-gold-50 px-3 py-1 rounded-full">{card.type}</div>
              <BookOpen size={48} className="text-navy-100 mb-8 absolute top-8 right-8" />
              <h3 className="text-3xl font-extrabold text-navy-900 leading-snug">{card.question}</h3>
              <p className="text-gray-400 mt-10 text-sm flex items-center gap-2 animate-pulse"><RotateCcw size={14}/> Click to flip</p>
            </div>
            <div className="absolute inset-0 bg-navy-900 p-12 rounded-3xl flex flex-col items-center text-center text-white [transform:rotateY(180deg)] shadow-inner" style={{ backfaceVisibility: 'hidden' }}>
              <div className="absolute top-6 left-6 text-gold-500 font-extrabold tracking-widest uppercase text-xs border border-gold-500/30 bg-gold-500/10 px-3 py-1 rounded-full">{card.type} • Answer</div>
              <div className="w-full h-full overflow-y-auto mt-8 pr-4 custom-scrollbar">
                <p className="text-lg leading-relaxed text-gray-100 whitespace-pre-wrap text-left">{card.answer}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-8">
          <button onClick={() => { setCurrentCardIndex(prev => prev - 1); setIsFlipped(false); }} disabled={currentCardIndex === 0} className="btn-secondary px-6 py-3 border-navy-200 text-navy-700 disabled:opacity-30">
            <ArrowLeft size={18} className="mr-2" /> Previous
          </button>
          <button onClick={() => { setCurrentCardIndex(prev => prev + 1); setIsFlipped(false); }} disabled={currentCardIndex === flashcards.length - 1} className="btn-primary bg-navy-900 hover:bg-navy-800 text-gold-500 px-8 py-3 disabled:opacity-30">
            Next <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
      </div>
    );
  }

  if (viewMode === 'editor') {
    return (
      <div className="animate-fade-in max-w-6xl mx-auto space-y-6 pb-20">
        <button onClick={() => { setViewMode('library'); resetForm(); }} className="text-sm font-bold text-gray-500 hover:text-navy-900 flex items-center gap-2 mb-4">
          <ArrowLeft size={16}/> Cancel & Return
        </button>
        
        <div className="card p-8 shadow-xl border-navy-900 bg-white">
          <div className="flex items-center gap-2 text-navy-900 font-bold mb-6 text-lg tracking-wide">
            <Shield size={24} className="text-gold-500" /> Review, Highlight & Archive Case Intelligence
          </div>

          <div className="grid grid-cols-1 gap-8">
            
            <div className="space-y-5 bg-gray-50 p-6 rounded-2xl border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={16} className="text-gold-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-navy-900">Case Identity</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Title of the Case</label>
                <input className="input-field font-bold bg-white text-lg py-3 w-full border-gray-200" placeholder="e.g., People v. Juan Dela Cruz" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">G.R. No.</label>
                  <input className="input-field text-sm bg-white w-full border-gray-200" placeholder="e.g., G.R. No. 123456" value={formData.grNo} onChange={e => setFormData({...formData, grNo: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Date Promulgated</label>
                  <input className="input-field text-sm bg-white w-full border-gray-200" placeholder="e.g., January 1, 2024" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Topic / Subject</label>
                  <input className="input-field text-sm bg-white w-full border-gray-200" placeholder="e.g., Murder; Self-Defense" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-navy-900 flex items-center gap-2"><div className="w-2 h-2 bg-gold-500 rounded-full"></div> Facts</label>
                <ReactQuill theme="snow" value={formData.facts || ''} onChange={(val: string, delta: any, source: string) => { if (source === 'user') setFormData({...formData, facts: val}) }} modules={quillModules} className="bg-white rounded-lg" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-navy-900 flex items-center gap-2"><div className="w-2 h-2 bg-gold-500 rounded-full"></div> Issues</label>
                <ReactQuill theme="snow" value={formData.issues || ''} onChange={(val: string, delta: any, source: string) => { if (source === 'user') setFormData({...formData, issues: val}) }} modules={quillModules} className="bg-white rounded-lg" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-navy-900 flex items-center gap-2"><div className="w-2 h-2 bg-gold-500 rounded-full"></div> Ratio Decidendi</label>
                <ReactQuill theme="snow" value={formData.ratio || ''} onChange={(val: string, delta: any, source: string) => { if (source === 'user') setFormData({...formData, ratio: val}) }} modules={quillModules} className="bg-white rounded-lg" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-navy-900 flex items-center gap-2"><div className="w-2 h-2 bg-gold-500 rounded-full"></div> Disposition</label>
                <ReactQuill theme="snow" value={formData.disposition || ''} onChange={(val: string, delta: any, source: string) => { if (source === 'user') setFormData({...formData, disposition: val}) }} modules={quillModules} className="bg-white rounded-lg" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-navy-900 flex items-center gap-2"><div className="w-2 h-2 bg-gold-500 rounded-full"></div> Doctrines</label>
                <ReactQuill theme="snow" value={formData.doctrines || ''} onChange={(val: string, delta: any, source: string) => { if (source === 'user') setFormData({...formData, doctrines: val}) }} modules={quillModules} className="bg-white rounded-lg border-gold-200" />
              </div>
            </div>

            <div className="p-6 bg-navy-50/50 rounded-2xl border border-navy-100 space-y-4 mt-4">
              <h4 className="text-xs font-black text-navy-900 tracking-widest uppercase flex items-center gap-2">
                <BookMarked size={14} className="text-gold-500" /> Attach Codals & Tags
              </h4>

              <div className="flex flex-wrap gap-2 mb-4">
                {formData.provisions?.map((p: string, i: number) => (
                  <span key={i} className="flex items-center gap-1.5 bg-navy-900 text-gold-500 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                    {p} <X size={12} className="cursor-pointer hover:text-white" onClick={() => setFormData({...formData, provisions: formData.provisions.filter((_:any, idx:any) => idx !== i)})} />
                  </span>
                ))}
                {formData.tags?.map((t: string, i: number) => (
                  <span key={i} className="flex items-center gap-1.5 bg-gold-500 text-navy-900 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                    #{t} <X size={12} className="cursor-pointer hover:text-red-700" onClick={() => setFormData({...formData, tags: formData.tags.filter((_:any, idx:any) => idx !== i)})} />
                  </span>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <select className="input-field text-xs w-1/3 py-2 bg-white" value={selectedCode} onChange={e => setSelectedCode(e.target.value)}>
                    <option value="Civil Code">Civil Code</option>
                    <option value="RPC">RPC</option>
                    <option value="Constitution">Constitution</option>
                    <option value="Rules of Court">Rules of Court</option>
                  </select>
                  <input 
                    className="input-field text-xs flex-1 py-2 bg-white" 
                    placeholder="Article #" 
                    value={newProvision} 
                    onChange={e => setNewProvision(e.target.value)} 
                    onKeyDown={e => { 
                      if(e.key === 'Enter' && newProvision.trim()) { 
                        e.preventDefault();
                        const entry = `${selectedCode} ${newProvision.trim()}`;
                        if(!formData.provisions.includes(entry)) {
                          setFormData({...formData, provisions: [...formData.provisions, entry]});
                        }
                        setNewProvision(''); 
                      }
                    }}
                  />
                </div>
                <input 
                  className="input-field text-xs w-full py-2 bg-white" 
                  placeholder="Add Tag (Press Enter)" 
                  value={newTag} 
                  onChange={e => setNewTag(e.target.value)} 
                  onKeyDown={e => { 
                    if(e.key === 'Enter' && newTag.trim()) { 
                      e.preventDefault();
                      if(!formData.tags.includes(newTag.trim())) {
                        setFormData({...formData, tags: [...formData.tags, newTag.trim()]});
                      }
                      setNewTag(''); 
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-8 pt-6 border-t border-gray-100">
            <button onClick={handleSave} className="btn-primary bg-navy-900 text-white hover:bg-navy-800 px-10 py-4 text-sm font-bold uppercase tracking-widest shadow-2xl flex items-center gap-3">
              <Save size={18} className="text-gold-500" /> Archive to Jurisprudence Library
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
        featureName="AI Case Digest Generator" 
        limitText={user?.subscription === 'free' ? "daily limit of 5 cases" : "daily limit of 50 cases"} 
      />

      <div className="animate-fade-in max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-extrabold text-navy-900 tracking-tight">My Cases</h1>
            <p className="text-gray-500 mt-1 font-medium">{cases.length} cases in your library</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 font-bold text-navy-900 mb-5">
            <div className="bg-navy-900 text-gold-500 rounded-full p-1.5 shadow-sm"><Plus size={16} strokeWidth={3} /></div>
            <span className="text-lg">Add New Jurisprudence</span>
          </div>

          {!showAddForm ? (
            <div onClick={() => setShowAddForm(true)} className="flex items-center bg-gold-50/60 border border-gold-200 rounded-xl p-5 cursor-pointer hover:bg-gold-50 group">
              <div className="bg-gold-100 p-3.5 rounded-xl text-gold-600 mr-5"><Search size={26} strokeWidth={2.5}/></div>
              <div>
                <h3 className="text-lg font-bold text-gold-700 flex items-center gap-2">Search the Jurisprudence <ChevronRight size={18}/></h3>
                <p className="text-sm text-gray-600 mt-0.5">(Search by GR number or party names. Results are sourced from the Supreme Court E-Library and Lawphil.)</p>
              </div>
            </div>
          ) : (
            <div className="bg-gold-50/40 border border-gold-200 rounded-xl p-5 space-y-6 animate-fade-in">
              <div className="flex flex-col md:flex-row items-center gap-3">
                <input 
                  autoFocus 
                  className="input-field flex-1 py-3 px-4 text-base border-gold-300 w-full" 
                  placeholder="Enter G.R. No. or Case Title to search the vault..." 
                  value={inputText} 
                  onChange={(e) => setInputText(e.target.value)} 
                  onKeyDown={(e) => { if (e.key === 'Enter' && !isSearching) handleSearch(); }} 
                />
                <button 
                  onClick={handleSearch} 
                  disabled={!inputText.trim() || isSearching} 
                  className="btn-primary bg-navy-900 hover:bg-navy-800 text-gold-500 py-3 px-6 shadow-md w-full md:w-auto"
                >
                  {isSearching ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                  {isSearching ? 'Searching...' : 'Find Cases'}
                </button>
              </div>

              {/* 🟢 NEW FIELD: Target Issue / Focus Topic */}
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gold-200/50">
                <Filter size={18} className="text-gold-600" />
                <input 
                  className="input-field flex-1 py-2 px-4 text-sm border-gold-200 bg-white" 
                  placeholder="Optional: Specify a topic to focus the digest on (e.g., 'Focus only on the issue of Succession')" 
                  value={focusTopic} 
                  onChange={(e) => setFocusTopic(e.target.value)} 
                />
              </div>

              {searchResults.length > 0 && (
                <div className="pt-4 border-t border-gold-200/50 space-y-4 animate-fade-in mt-4">
                  <h4 className="text-sm font-bold text-navy-900 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle size={16} className="text-gold-500" /> Select the Correct Document
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.map((result, idx) => (
                      <div key={idx} className="bg-white border border-gold-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-gold-600 mb-1 flex items-center justify-between">
                            <span>{result.source}</span>
                            <a href={result.links.viewSource} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-navy-900"><Link size={12}/></a>
                          </div>
                          <h5 className="font-bold text-navy-900 text-sm leading-snug line-clamp-2">{result.title}</h5>
                          <p className="text-xs text-gray-500 mt-2 line-clamp-3 leading-relaxed">{result.summary}</p>
                        </div>
                        
                        <button 
                          onClick={() => handleGenerate(result, idx)}
                          disabled={generatingIdx !== null}
                          className={cn(
                            "mt-4 w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex justify-center items-center gap-2 transition-all",
                            generatingIdx === idx 
                              ? "bg-gold-500 text-navy-900" 
                              : "bg-navy-50 text-navy-700 hover:bg-navy-900 hover:text-gold-500 border border-navy-100"
                          )}
                        >
                          {generatingIdx === idx ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                          {generatingIdx === idx ? 'Digesting Case...' : 'Import & Digest'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative shadow-sm">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20}/>
          <input className="w-full border border-gray-200 focus:border-navy-500 rounded-xl py-3 pl-12 pr-4 text-gray-800 transition-all" placeholder="Search library..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {TOPICS.map(topic => (
            <button key={topic} onClick={() => setActiveTopic(topic)} className={cn("px-5 py-2 rounded-full border text-sm font-semibold transition-all whitespace-nowrap", activeTopic === topic ? "bg-navy-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50")}>{topic}</button>
          ))}
        </div>

        <div className="space-y-3 pb-20">
          {loading && cases.length === 0 ? <Loader2 className="w-8 h-8 animate-spin mx-auto text-gold-500" /> : displayedCases.map((c: any) => {
              const isExpanded = expandedCaseId === c.id;
              return (
                <div key={c.id} className={cn("border rounded-2xl transition-all bg-white shadow-sm overflow-hidden", isExpanded ? "border-navy-900 shadow-md" : "hover:border-navy-300")}>
                  <div onClick={() => setExpandedCaseId(isExpanded ? null : c.id)} className="flex items-center justify-between p-4 cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-3 rounded-xl", isExpanded ? "bg-navy-900 text-gold-500" : "bg-gray-100 text-gray-500")}><Book size={20} /></div>
                      <div>
                        <h4 className="font-bold text-lg text-navy-900">{c.title}</h4>
                        <p className="text-sm text-gray-500 flex items-center gap-2"><span className="text-gold-600 font-bold">{c.grNo}</span> {c.date && <span>• {c.date}</span>}</p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50 border-t">
                      <div className="flex gap-2 pt-3">
                        <button onClick={() => openCase(c)} className="btn-primary bg-navy-900 hover:bg-navy-800 text-white text-sm py-2 px-4 shadow-sm rounded-lg flex items-center gap-2"><BookOpen size={16} className="text-gold-500"/> Open Case</button>
                        <button onClick={() => openFlashcards(c)} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-navy-200 text-navy-700 bg-white hover:bg-navy-50 text-sm font-semibold transition-colors"><Layers size={16}/> Flashcards</button>
                      </div>
                      <button onClick={() => { deleteCase(c.id); setExpandedCaseId(null); }} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={18}/></button>
                    </div>
                  )}
                </div>
              );
            })}

            {!loading && (visibleCount < filteredCases.length || hasMore) && (
              <div className="flex justify-center pt-8 pb-4">
                <button 
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 bg-white border-2 border-gray-200 text-navy-600 text-xs font-bold uppercase tracking-widest rounded-xl hover:border-gold-500 hover:text-gold-600 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {loadingMore ? <Loader2 className="animate-spin" size={16} /> : null}
                  {loadingMore ? 'Fetching...' : 'Load More Cases'}
                </button>
              </div>
            )}
        </div>
      </div>
    </>
  );
};

export default CasesPage;