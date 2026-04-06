import React, { useState, useEffect } from 'react';
import { useCodalsStore } from '../../store/codalsStore';
import type { CodalProvision } from '../../types/index';
import { cn } from '../../lib/utils';
import remarkGfm from 'remark-gfm';
import ReactMarkdown from 'react-markdown';
import {
  BookOpen, Plus, Edit3, Trash2, X, Search, 
  ChevronDown, ChevronRight, Loader2, Info, Copy, Check, Eye, Layers
} from 'lucide-react';

import BulkImportCodals from '../../components/admin/BulkImportCodals';

const codeOptions = [
  'Civil Code', 'Revised Penal Code', 'Labor Code',
  'National Internal Revenue Code', 'Corporation Code',
  '1987 Constitution', 'Rules of Court', 'Family Code',
  'Local Government Code', 'Administrative Code',
  'Omnibus Election Code', 'Special Penal Laws', 'Other',
];

const ManageCodalsPage: React.FC = () => {
  const { codals, loading, fetchCodals, addCodal, updateCodal, deleteCodal } = useCodalsStore();
  
  const [showModal, setShowModal] = useState(false);
  const [editingCodal, setEditingCodal] = useState<CodalProvision | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCode, setSelectedCode] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [copyId, setCopyId] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);

  // 🟢 UPGRADED: Added Structural Hierarchy Fields
  const [form, setForm] = useState({
    book: '', // The Code Name (e.g., Civil Code)
    bookPart: '', // e.g., Book II: Property
    titlePart: '', // e.g., Title I: Classification
    chapter: '', // e.g., Chapter 1: Immovable Property
    articleNumber: '',
    title: '', // Article specific title
    content: '',
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    fetchCodals();
  }, [fetchCodals]);

  useEffect(() => {
    setSelectedIds(new Set());
    setVisibleCount(20); 
  }, [search, selectedCode]);

  const filteredCodals = codals.filter((c) => {
    const matchCode = selectedCode === 'all' || c.book === selectedCode;
    const matchSearch =
      search === '' ||
      c.content.toLowerCase().includes(search.toLowerCase()) ||
      c.articleNumber.toLowerCase().includes(search.toLowerCase()) ||
      (c.title || '').toLowerCase().includes(search.toLowerCase()) ||
      ((c as any).bookPart || '').toLowerCase().includes(search.toLowerCase());
    return matchCode && matchSearch;
  });

  const displayedCodals = filteredCodals.slice(0, visibleCount);
  const books = ['all', ...Array.from(new Set(codals.map((c) => c.book)))];

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(new Set(filteredCodals.map(c => c.id)));
    else setSelectedIds(new Set());
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirm = window.confirm(`Atty, are you absolutely sure you want to delete ${selectedIds.size} provisions? This cannot be undone.`);
    if (!confirm) return;

    setIsDeletingBulk(true);
    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteCodal(id)));
      setSelectedIds(new Set()); 
    } catch (error) {
      console.error("Bulk delete failed", error);
      alert("Some items failed to delete. Check console.");
    }
    setIsDeletingBulk(false);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyId(id);
    setTimeout(() => setCopyId(null), 2000);
  };

  const handleAdd = async () => {
    if (!form.book || !form.articleNumber) return alert("Code Name and Article Number are required.");
    await addCodal({
      book: form.book,
      bookPart: form.bookPart, // 🟢 New
      titlePart: form.titlePart, // 🟢 New
      chapter: form.chapter, // 🟢 New
      title: form.title,
      articleNumber: form.articleNumber,
      content: form.content,
      notes: '',
      linkedCases: [],
    } as any);
    resetForm();
  };

  const handleEdit = async () => {
    if (!editingCodal) return;
    await updateCodal(editingCodal.id, {
      book: form.book,
      bookPart: form.bookPart, // 🟢 New
      titlePart: form.titlePart, // 🟢 New
      chapter: form.chapter, // 🟢 New
      title: form.title,
      articleNumber: form.articleNumber,
      content: form.content,
    } as any);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteCodal(id);
    setDeleteConfirm(null);
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingCodal(null);
    setIsPreview(false);
    setForm({ book: '', bookPart: '', titlePart: '', chapter: '', title: '', articleNumber: '', content: '' });
  };

  const openEdit = (codal: any) => {
    setEditingCodal(codal);
    setForm({
      book: codal.book,
      bookPart: codal.bookPart || '',
      titlePart: codal.titlePart || '',
      chapter: codal.chapter || '',
      title: codal.title || '',
      articleNumber: codal.articleNumber,
      content: codal.content,
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Manage E-Codals</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Publish global laws with hierarchical tagging</p>
        </div>
        
        <div className="flex items-center gap-3">
          <BulkImportCodals />
          <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Provision
          </button>
        </div>
      </div>

      {/* Stats Quick-Filter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {books.filter(b => b !== 'all').slice(0, 4).map(book => (
          <button
            key={book}
            onClick={() => setSelectedCode(selectedCode === book ? 'all' : book)}
            className={cn('card p-3 text-left transition-all', selectedCode === book && 'ring-2 ring-gold-500/50')}
          >
            <p className="text-lg font-bold text-navy-900 dark:text-white">
              {codals.filter(c => c.book === book).length}
            </p>
            <p className="text-[10px] font-bold text-gray-400 uppercase truncate">{book}</p>
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search articles, structure, or keywords..." className="input-field pl-10 py-3"
        />
      </div>

      {/* BULK ACTION TOOLBAR */}
      {filteredCodals.length > 0 && (
        <div className="flex items-center justify-between bg-white dark:bg-navy-900 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-navy-800 animate-fade-in">
          <label className="flex items-center gap-3 cursor-pointer pl-2">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-gray-300 text-gold-500 focus:ring-gold-500 bg-gray-50 dark:bg-navy-950 cursor-pointer"
              checked={selectedIds.size === filteredCodals.length && filteredCodals.length > 0}
              onChange={handleSelectAll}
            />
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
              Select All ({filteredCodals.length})
            </span>
          </label>

          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isDeletingBulk}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              {isDeletingBulk ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Delete {selectedIds.size} Selected
            </button>
          )}
        </div>
      )}

      {/* Main List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gold-500" /></div>
        ) : filteredCodals.length === 0 ? (
          <div className="card p-12 text-center text-gray-400 italic">No provisions found.</div>
        ) : (
          <>
            {displayedCodals.map((codal: any) => (
              <div 
                key={codal.id} 
                className={cn(
                  "card overflow-hidden transition-all duration-200",
                  selectedIds.has(codal.id) ? "border-gold-500 ring-1 ring-gold-500/50 bg-gold-50/10" : "border-gray-100 dark:border-navy-800"
                )}
              >
                <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-navy-900/30 transition-colors">
                  
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="pl-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-gold-500 focus:ring-gold-500 bg-gray-50 dark:bg-navy-950 cursor-pointer"
                        checked={selectedIds.has(codal.id)}
                        onChange={() => handleSelectOne(codal.id)}
                      />
                    </div>

                    <button
                      onClick={() => setExpandedId(expandedId === codal.id ? null : codal.id)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left outline-none"
                    >
                      {expandedId === codal.id ? <ChevronDown size={16} className="text-gold-500 shrink-0"/> : <ChevronRight size={16} className="text-gray-300 shrink-0"/>}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="badge-navy text-[10px]">{codal.book}</span>
                          <span className="text-sm font-bold text-navy-900 dark:text-white">{codal.articleNumber}</span>
                        </div>
                        {/* 🟢 Breadcrumb Preview */}
                        {(codal.bookPart || codal.titlePart) ? (
                           <p className="text-[10px] text-gray-500 font-medium truncate mt-0.5 flex items-center gap-1 opacity-70">
                              <Layers size={10} /> 
                              {[codal.bookPart, codal.titlePart, codal.chapter].filter(Boolean).join(" > ")}
                           </p>
                        ) : (
                           codal.title && <p className="text-xs text-gray-500 font-medium truncate mt-0.5">— {codal.title}</p>
                        )}
                      </div>
                    </button>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => handleCopy(`${codal.articleNumber}: ${codal.title}\n\n${codal.content}`, codal.id)} 
                      className="p-2 hover:text-navy-600 transition-colors"
                    >
                      {copyId === codal.id ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-gray-400" />}
                    </button>
                    <button onClick={() => openEdit(codal)} className="p-2 hover:text-navy-600 dark:hover:text-gold-500 transition-colors"><Edit3 size={16} className="text-gray-400"/></button>
                    {deleteConfirm === codal.id ? (
                      <button onClick={() => handleDelete(codal.id)} className="text-[10px] font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg animate-pulse">Confirm</button>
                    ) : (
                      <button onClick={() => setDeleteConfirm(codal.id)} className="p-2 hover:text-red-500 transition-colors"><Trash2 size={16} className="text-gray-400"/></button>
                    )}
                  </div>
                </div>
                
                {expandedId === codal.id && (
                  <div className="border-t border-gray-100 dark:border-navy-800 p-6 bg-gray-50/30 dark:bg-navy-950/20 animate-fade-in">
                    {/* 🟢 Full Breadcrumb inside expanded view */}
                    {(codal.bookPart || codal.titlePart || codal.chapter) && (
                      <div className="mb-4 p-3 bg-white dark:bg-navy-900 border border-gray-200 dark:border-navy-700 rounded-lg text-xs font-mono text-gray-500 flex flex-wrap gap-2 items-center">
                        <span className="font-bold text-navy-700 dark:text-navy-300">{codal.book}</span>
                        {codal.bookPart && <><span>/</span><span>{codal.bookPart}</span></>}
                        {codal.titlePart && <><span>/</span><span>{codal.titlePart}</span></>}
                        {codal.chapter && <><span>/</span><span>{codal.chapter}</span></>}
                      </div>
                    )}
                    <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {codal.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {visibleCount < filteredCodals.length && (
              <div className="flex justify-center pt-4 pb-2">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 20)}
                  className="px-6 py-2.5 bg-gray-100 dark:bg-navy-800 hover:bg-gray-200 dark:hover:bg-navy-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-sm transition-colors border border-gray-200 dark:border-navy-700"
                >
                  Load Next 20 <span className="font-normal text-gray-500 ml-1">(Showing {visibleCount} of {filteredCodals.length})</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={resetForm}>
          <div className="card p-6 w-full max-w-2xl bg-white dark:bg-navy-900 shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-navy-900 dark:text-white">{editingCodal ? 'Edit Provision' : 'New Codal Provision'}</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsPreview(!isPreview)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors",
                    isPreview ? "bg-gold-500 text-navy-900" : "bg-gray-100 dark:bg-navy-800 text-gray-500"
                  )}
                >
                  <Eye size={12} /> {isPreview ? 'Editor' : 'Preview'}
                </button>
                <button onClick={resetForm} className="p-2 hover:bg-gray-100 dark:hover:bg-navy-800 rounded-full transition-colors"><X size={20} className="text-gray-400" /></button>
              </div>
            </div>

            <div className="space-y-5">
              {!isPreview ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Code Name</label>
                      <select value={form.book} onChange={(e) => setForm({...form, book: e.target.value})} className="input-field">
                        <option value="">Select Law Code...</option>
                        {codeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Article Identifier</label>
                      <input type="text" value={form.articleNumber} onChange={(e) => setForm({...form, articleNumber: e.target.value})} placeholder="e.g. Art. 414" className="input-field" />
                    </div>
                  </div>
                  
                  {/* 🟢 NEW STRUCTURAL HIERARCHY BLOCK */}
                  <div className="p-4 bg-gray-50 dark:bg-navy-950 rounded-xl border border-gray-100 dark:border-navy-800 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                       <Layers size={14} className="text-gold-500" />
                       <label className="text-[10px] font-bold uppercase tracking-wider text-navy-900 dark:text-gray-300">Hierarchical Structure (Optional)</label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input type="text" placeholder="e.g. Book II: Property" value={form.bookPart} onChange={e => setForm({...form, bookPart: e.target.value})} className="input-field text-xs bg-white dark:bg-navy-900" />
                      <input type="text" placeholder="e.g. Title I: Classification" value={form.titlePart} onChange={e => setForm({...form, titlePart: e.target.value})} className="input-field text-xs bg-white dark:bg-navy-900" />
                      <input type="text" placeholder="e.g. Chapter 1: Immovable" value={form.chapter} onChange={e => setForm({...form, chapter: e.target.value})} className="input-field text-xs bg-white dark:bg-navy-900" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Specific Title (Optional)</label>
                    <input type="text" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="e.g. National Territory" className="input-field" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Statutory Body (Markdown)</label>
                    <textarea 
                      value={form.content} 
                      onChange={(e) => setForm({...form, content: e.target.value})} 
                      placeholder="Paste the full text of the article here..." 
                      rows={8} 
                      className="input-field font-mono text-sm resize-y" 
                    />
                    <div className="flex items-center gap-2 px-2 text-[10px] text-gray-500 font-medium">
                      <Info size={14} className="text-gold-500" />
                      Markdown Enabled: Use **bold** for keywords, *italics* for Latin, and * for bullets.
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="pb-4 border-b border-gray-100 dark:border-navy-800">
                    <span className="badge-navy mb-2 inline-block">{form.book || 'No Code Selected'}</span>
                    
                    {/* Preview Breadcrumb */}
                    {(form.bookPart || form.titlePart || form.chapter) && (
                      <p className="text-xs text-gray-500 mb-2 font-mono flex gap-1 flex-wrap">
                        {form.bookPart && <span>{form.bookPart} /</span>}
                        {form.titlePart && <span>{form.titlePart} /</span>}
                        {form.chapter && <span>{form.chapter}</span>}
                      </p>
                    )}

                    <h4 className="text-lg font-bold text-navy-900 dark:text-white">{form.articleNumber} {form.title && `— ${form.title}`}</h4>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none min-h-[300px] p-4 bg-gray-50/50 dark:bg-navy-950/20 rounded-xl overflow-y-auto">
                    <ReactMarkdown>{form.content || '*No content written yet...*'}</ReactMarkdown>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-50 dark:border-navy-800">
                <button onClick={resetForm} className="btn-secondary flex-1 py-3">Cancel</button>
                <button onClick={editingCodal ? handleEdit : handleAdd} className="btn-primary flex-1 py-3 bg-navy-900 border-none shadow-lg shadow-navy-900/20">
                  <BookOpen size={16} className="mr-2" />
                  {editingCodal ? 'Commit Changes' : 'Publish Provision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCodalsPage;