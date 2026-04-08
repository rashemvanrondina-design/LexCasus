// src/pages/client/NotesPage.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useNotesStore } from '../../store/notesStore';
import type { Note } from '../../types';
import { cn, formatDate } from '../../lib/utils';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import {
  Search, Tag, Trash2, Edit3, Save, X, Link2,
  Bold, Italic, List, ListOrdered, Undo, Redo, Highlighter,
  ChevronDown, ChevronRight, FolderOpen, FolderPlus, Plus, FileText, Download, 
  AlertCircle, Library, Share2, CheckSquare, Square
} from 'lucide-react';

// 🟢 GUARDS & PAYWALL
import { useUsageGuard } from '../../hooks/useUsageGuard';
import UpgradeModal from '../../components/modals/UpgradeModal';

const NotesPage: React.FC = () => {
  const { user } = useAuthStore();
  const { notes, saveNote, removeNote, fetchNotes, loading } = useNotesStore();
  const [searchParams] = useSearchParams();
  
  // 🟢 Initialize the Bouncer
  const { checkAccess } = useUsageGuard();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeConfig, setUpgradeConfig] = useState({ feature: '', text: '' });

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // 🟢 NEW: Split Title States
  const [currentFolder, setCurrentFolder] = useState('Uncategorized');
  const [editTopic, setEditTopic] = useState('');
  const [editTags, setEditTags] = useState('');
  
  // 🟢 NEW: Custom Folders State (Persisted to localStorage for empty folders)
  const [customFolders, setCustomFolders] = useState<string[]>(() => {
    const saved = localStorage.getItem('lexcasus_folders');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  // 🟢 Feature States
  const [copied, setCopied] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [notesToDownload, setNotesToDownload] = useState<string[]>([]);

  const editor = useEditor({
  extensions: [
    StarterKit, 
    Highlight.configure({ multicolor: true })
  ],
  editorProps: {
    attributes: { 
      class: 'tiptap prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[400px]' 
    },
  },
});
  // Save custom folders to local storage
  useEffect(() => {
    localStorage.setItem('lexcasus_folders', JSON.stringify(customFolders));
  }, [customFolders]);

  useEffect(() => {
    const queryParam = searchParams.get('search');
    if (queryParam) setSearch(queryParam);
  }, [searchParams]);

  useEffect(() => { 
    if (user?.id) {
      fetchNotes(user.id); 
    }
  }, [user?.id, fetchNotes]);

  useEffect(() => {
    if (!loading && notes.length > 0 && !selectedNote) {
      if (search) {
        const found = notes.find(n => n.title.toLowerCase().includes(search.toLowerCase()));
        if (found) setSelectedNote(found);
        else setSelectedNote(notes[0]);
      } else {
        setSelectedNote(notes[0]);
      }
    }
  }, [notes, selectedNote, loading, search]);

  useEffect(() => {
    if (selectedNote && editor) {
      if (!isEditing) {
        editor.commands.setContent(selectedNote.content || '');
      }
      
      // Split the DB title into Folder and Topic for the UI
      if (selectedNote.title.includes(' - ')) {
        const parts = selectedNote.title.split(' - ');
        setCurrentFolder(parts[0].trim());
        setEditTopic(parts.slice(1).join(' - ').trim());
      } else {
        setCurrentFolder('Uncategorized');
        setEditTopic(selectedNote.title);
      }
      
      setEditTags(selectedNote.tags?.join(', ') || '');
    }
  }, [selectedNote, editor, isEditing]);

  const filteredNotes = notes.filter((note) => {
    const searchTerm = search.toLowerCase();
    return (note.title || '').toLowerCase().includes(searchTerm) || 
           (note.content || '').toLowerCase().includes(searchTerm);
  });

  // 🟢 REVISED: Grouping logic that includes Custom Folders
  const allFoldersMap = useMemo(() => {
    const groups: Record<string, Note[]> = {};
    
    // Initialize custom folders first so they appear even if empty
    customFolders.forEach(folder => { groups[folder] = []; });

    filteredNotes.forEach(note => {
      let folderName = 'Uncategorized';
      if (note.title.includes(' - ')) {
        folderName = note.title.split(' - ')[0].trim();
      }
      if (!groups[folderName]) groups[folderName] = [];
      groups[folderName].push(note);
    });

    return groups;
  }, [filteredNotes, customFolders]);

  const toggleFolder = (name: string) => {
    setExpandedFolders(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // 🟢 ENFORCED: Create Folder Handler
  const handleCreateFolder = () => {
    // 🛡️ THE BOUNCER: Check Folder Limit
    const currentFolderCount = Object.keys(allFoldersMap).length;
    if (!checkAccess('noteFolders', currentFolderCount)) {
      setUpgradeConfig({ 
        feature: 'Subject Folders', 
        text: user?.subscription === 'free' ? 'Basic tier limit of 5 folders' : 'Premium tier limit of 500 folders' 
      });
      setShowUpgradeModal(true);
      return;
    }

    const folderName = prompt("Atty., enter the new Subject/Folder name (e.g. Remedial Law):");
    if (folderName && folderName.trim()) {
      const cleanName = folderName.trim();
      if (!customFolders.includes(cleanName)) {
        setCustomFolders(prev => [...prev, cleanName]);
      }
      setExpandedFolders(prev => ({ ...prev, [cleanName]: true }));
    }
  };

  // 🟢 ENFORCED: Add Note inside specific folder
  const handleAddNoteToFolder = (folderName: string) => {
    // 🛡️ THE BOUNCER: Check Subnotes Limit for this specific folder
    const notesInFolder = allFoldersMap[folderName]?.length || 0;
    
    if (!checkAccess('noteSubnotes', notesInFolder)) {
      setUpgradeConfig({ 
        feature: 'Subnotes per Folder', 
        text: user?.subscription === 'free' ? 'Basic tier limit of 10 subnotes' : 'Premium tier limit of 150 subnotes' 
      });
      setShowUpgradeModal(true);
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const newNote: Note = {
      id: tempId, title: `${folderName} - Untitled Topic`, content: '', tags: [],
      linkedCases: [], linkedProvisions: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    setSelectedNote(newNote);
    setCurrentFolder(folderName);
    setEditTopic('Untitled Topic');
    editor?.commands.setContent('');
    setIsEditing(true);
  };

  const handleShareNote = () => {
    if (!selectedNote) return;
    const url = `${window.location.origin}/notes?search=${encodeURIComponent(selectedNote.title)}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openDownloadModal = () => {
    if (!selectedNote || currentFolder === 'Uncategorized') return;
    
    const subjectNotes = notes
      .filter(n => n.title.startsWith(`${currentFolder} - `))
      .sort((a, b) => a.title.localeCompare(b.title));
      
    setNotesToDownload(subjectNotes.map(n => n.id));
    setShowDownloadModal(true);
  };

  const toggleNoteSelection = (id: string) => {
    setNotesToDownload(prev => 
      prev.includes(id) ? prev.filter(noteId => noteId !== id) : [...prev, id]
    );
  };

  const downloadSubjectPDF = () => {
    if (!selectedNote || notesToDownload.length === 0) return;

    const subjectNotes = notes
      .filter(n => notesToDownload.includes(n.id))
      .sort((a, b) => a.title.localeCompare(b.title));

    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    subjectNotes.forEach((note, index) => {
      if (index > 0) doc.addPage();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text("LEX CASUS LEGAL VAULT", margin, 10);
      doc.text(`SUBJECT: ${currentFolder.toUpperCase()}`, pageWidth - margin - 50, 10);
      doc.setDrawColor(200);
      doc.line(margin, 12, pageWidth - margin, 12);

      const subTitle = note.title.split(' - ')[1] || note.title;
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); 
      doc.text(subTitle, margin, 25);

      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100);
      doc.text(`Last Updated: ${formatDate(note.updatedAt)}`, margin, 32);
      
      doc.setDrawColor(234, 179, 8); 
      doc.setLineWidth(1.5);
      doc.line(margin, 35, 50, 35);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(40);
      
      const plainText = note.content
        .replace(/<\/p>/g, '\n\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim();

      const splitText = doc.splitTextToSize(plainText, pageWidth - (margin * 2));
      
      let cursorY = 45;
      for (let i = 0; i < splitText.length; i++) {
        if (cursorY > pageHeight - 20) {
          doc.addPage();
          cursorY = 20;
        }
        doc.text(splitText[i], margin, cursorY);
        cursorY += 6; 
      }
    });

    doc.save(`LexCasus_${currentFolder.replace(/\s+/g, '_')}_Selection.pdf`);
    setShowDownloadModal(false);
  };

  const handleSaveNote = async () => {
    if (!selectedNote || !editor) return;
    
    // 🟢 REBUILDS THE TITLE SAFELY
    const finalTitle = `${currentFolder} - ${editTopic.trim() || 'Untitled Topic'}`;
    
    // 🟢 SECURE PAYLOAD: Check if it's a temporary note
    const isNewNote = selectedNote.id.startsWith('temp-');
    
    const notePayload: Partial<Note> = {
      title: finalTitle,
      content: editor.getHTML(),
      tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
    };

    // Only attach the ID if it's an existing note being modified
    if (!isNewNote) {
      notePayload.id = selectedNote.id;
    }
    
    await saveNote(notePayload);
    setIsEditing(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Atty., proceed with deleting this research?")) {
      await removeNote(id); setSelectedNote(null);
    }
  };

  return (
    <>
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
        featureName={upgradeConfig.feature} 
        limitText={upgradeConfig.text} 
      />

      <div className="animate-fade-in pb-10 text-left relative">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-navy-900 dark:text-white uppercase tracking-tight">Legal Vault</h2>
            <p className="text-sm text-gray-500 font-medium mt-1">Hierarchical Subject Management</p>
          </div>
          
          <button onClick={handleCreateFolder} className="btn-primary py-2 shadow-lg shadow-navy-900/10 flex items-center gap-2">
            <FolderPlus className="w-4 h-4" /> Create Subject Folder
          </button>
        </div>

        <div className="flex gap-6 min-h-[calc(100vh-16rem)]">
          {/* SIDEBAR */}
          <div className="w-80 flex-shrink-0 space-y-3 hidden md:block">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-gold-500 transition-colors" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subjects..." className="input-field pl-10 border-gray-200" />
            </div>
            
            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
              {Object.entries(allFoldersMap).map(([folderName, subNotes]) => (
                <div key={folderName} className="space-y-1">
                  <button onClick={() => toggleFolder(folderName)} className="w-full flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-navy-900 rounded-lg transition-colors group">
                    <div className="flex items-center gap-2">
                      {expandedFolders[folderName] ? <ChevronDown size={14} className="text-gray-400"/> : <ChevronRight size={14} className="text-gray-400"/>}
                      <FolderOpen size={16} className="text-gold-500" />
                      <span className="text-xs font-black uppercase tracking-tight text-navy-900 dark:text-gray-200">{folderName}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold bg-white dark:bg-navy-950 px-2 py-0.5 rounded-full">{subNotes.length}</span>
                  </button>
                  
                  {expandedFolders[folderName] && (
                    <div className="ml-4 pl-2 border-l-2 border-gray-100 space-y-1 mt-1 pb-2">
                      {subNotes.map(note => (
                        <button key={note.id} onClick={() => { setSelectedNote(note); setIsEditing(false); }} className={cn('w-full text-left p-3 rounded-xl transition-all duration-200', selectedNote?.id === note.id ? 'bg-navy-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50')}>
                          <p className="text-xs font-bold truncate">{note.title.split(' - ')[1] || note.title}</p>
                          <span className="text-[9px] opacity-60 uppercase">{formatDate(note.updatedAt)}</span>
                        </button>
                      ))}
                      
                      {/* 🟢 ADD TOPIC BUTTON INSIDE FOLDER */}
                      <button onClick={() => handleAddNoteToFolder(folderName)} className="w-full mt-2 py-2 flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400 hover:text-navy-900 hover:bg-gray-50 rounded-lg border border-dashed border-gray-200 transition-colors">
                        <Plus size={12}/> ADD TOPIC
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* EDITOR AREA */}
          <div className="flex-1 card overflow-hidden flex flex-col border-gray-100 shadow-sm bg-white dark:bg-navy-950">
            {selectedNote ? (
              <>
                <div className="flex items-center flex-wrap gap-1 p-2 border-b bg-gray-50/50">
                  {isEditing ? (
                    <>
                      <button onClick={() => editor?.chain().focus().undo().run()} className="p-1.5 rounded"><Undo size={16} /></button>
                      <button onClick={() => editor?.chain().focus().redo().run()} className="p-1.5 rounded"><Redo size={16} /></button>
                      <div className="w-px h-4 bg-gray-300 mx-1" />
                      <button onClick={() => editor?.chain().focus().toggleBold().run()} className={cn("p-1.5 rounded", editor?.isActive('bold') && "bg-navy-800 text-white")}><Bold size={16} /></button>
                      <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={cn("p-1.5 rounded", editor?.isActive('italic') && "bg-navy-800 text-white")}><Italic size={16} /></button>
                      <button onClick={() => editor?.chain().focus().toggleUnderline().run()} className={cn("p-1.5 rounded", editor?.isActive('underline') && "bg-navy-800 text-white")}><span className="underline font-bold text-sm">U</span></button>
                      <div className="w-px h-4 bg-gray-300 mx-1" />
                      
                      <button onClick={() => editor?.chain().focus().toggleHighlight({ color: '#fef08a' }).run()} className={cn("p-1.5 rounded hover:bg-yellow-100", editor?.isActive('highlight', { color: '#fef08a' }) && "bg-yellow-200 ring-1 ring-yellow-400")}><Highlighter size={16} className="text-yellow-600" /></button>
                      <button onClick={() => editor?.chain().focus().toggleHighlight({ color: '#fecaca' }).run()} className={cn("p-1.5 rounded hover:bg-red-100", editor?.isActive('highlight', { color: '#fecaca' }) && "bg-red-200 ring-1 ring-red-400")}><Highlighter size={16} className="text-red-600" /></button>
                      <button onClick={() => editor?.chain().focus().toggleHighlight({ color: '#bbf7d0' }).run()} className={cn("p-1.5 rounded hover:bg-green-100", editor?.isActive('highlight', { color: '#bbf7d0' }) && "bg-green-200 ring-1 ring-green-400")}><Highlighter size={16} className="text-green-600" /></button>
                      <button onClick={() => editor?.chain().focus().toggleHighlight({ color: '#bfdbfe' }).run()} className={cn("p-1.5 rounded hover:bg-blue-100", editor?.isActive('highlight', { color: '#bfdbfe' }) && "bg-blue-200 ring-1 ring-blue-400")}><Highlighter size={16} className="text-blue-600" /></button>
                      
                      <div className="ml-auto flex gap-2">
                        <button onClick={handleSaveNote} className="px-4 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg">SAVE CHANGES</button>
                        <button onClick={() => setIsEditing(false)} className="p-1 text-gray-400"><X size={18} /></button>
                      </div>
                    </>
                  ) : (
                    <div className="flex w-full justify-between items-center px-2 py-1">
                      <div className="flex gap-2">
                        <button onClick={() => setIsEditing(true)} className="px-4 py-1.5 bg-navy-100 text-navy-700 text-[10px] font-bold rounded-lg border border-navy-200 flex items-center gap-2">
                          <Edit3 size={12} /> MODIFY NOTE
                        </button>
                        
                        <button onClick={openDownloadModal} disabled={currentFolder === 'Uncategorized'} className="px-4 py-1.5 bg-gold-50 text-gold-700 text-[10px] font-bold rounded-lg border border-gold-200 flex items-center gap-2 hover:bg-gold-100 transition-colors shadow-sm disabled:opacity-50">
                          <Download size={12} /> COMPILE PDF
                        </button>

                        <button onClick={handleShareNote} className="px-4 py-1.5 bg-gray-100 text-gray-700 text-[10px] font-bold rounded-lg border border-gray-200 flex items-center gap-2 hover:bg-gray-200 transition-colors shadow-sm">
                          <Share2 size={12} /> {copied ? 'LINK COPIED!' : 'SHARE LINK'}
                        </button>
                      </div>
                      <button onClick={() => handleDelete(selectedNote.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                  )}
                </div>

                <div className="flex-1 p-10 overflow-y-auto">
                  {isEditing ? (
                    <div className="space-y-6">
                      <div>
                        {/* 🟢 SPLIT TITLE UI */}
                        <div className="flex items-center gap-3 mb-2">
                           <span className="bg-navy-900 text-gold-500 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                             <FolderOpen size={12}/> {currentFolder}
                           </span>
                           <span className="text-gray-300 font-black">—</span>
                        </div>
                        <input 
                          type="text" 
                          value={editTopic} 
                          onChange={e => setEditTopic(e.target.value)} 
                          placeholder="Enter Topic Title..."
                          className="text-4xl font-black bg-transparent border-none outline-none w-full text-navy-900 placeholder:text-gray-300" 
                        />
                      </div>
                      <EditorContent editor={editor} />
                    </div>
                  ) : (
                    <div className="prose prose-slate max-w-none">
                      <div className="mb-8 border-b-4 border-gold-500 pb-4 inline-block">
                          <span className="text-sm font-black text-gold-600 uppercase tracking-widest mb-1 block">{currentFolder}</span>
                          <h1 className="text-4xl font-black text-navy-900 m-0 leading-tight">{editTopic}</h1>
                      </div>
                      <div className="text-gray-700 leading-relaxed text-lg" dangerouslySetInnerHTML={{ __html: selectedNote.content || '<p class="italic text-gray-400">No content provided.</p>' }} />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 italic">Select a Subject to begin.</div>
            )}
          </div>
        </div>

        {/* PDF DOWNLOAD SELECTION MODAL */}
        {showDownloadModal && selectedNote && (
          <div className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-fade-in border-2 border-gold-500">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-black text-navy-900 uppercase tracking-widest flex items-center gap-2">
                    <Library size={18} className="text-gold-500"/> Select Notes for PDF
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mt-1">
                    Choose which topics to include in the {currentFolder} syllabus.
                  </p>
                </div>
                <button onClick={() => setShowDownloadModal(false)} className="text-gray-400 hover:text-navy-900">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2 mb-6 border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                {notes
                  .filter(n => n.title.startsWith(`${currentFolder} - `))
                  .sort((a, b) => a.title.localeCompare(b.title))
                  .map(note => {
                    const isSelected = notesToDownload.includes(note.id);
                    return (
                      <div 
                        key={note.id} 
                        onClick={() => toggleNoteSelection(note.id)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors border",
                          isSelected ? "bg-white border-navy-300 shadow-sm" : "border-transparent hover:bg-gray-100"
                        )}
                      >
                        <span className="text-xs font-bold text-navy-900">{note.title.split(' - ')[1] || note.title}</span>
                        {isSelected ? <CheckSquare size={16} className="text-gold-600"/> : <Square size={16} className="text-gray-300"/>}
                      </div>
                    );
                  })}
              </div>

              <button 
                onClick={downloadSubjectPDF} 
                disabled={notesToDownload.length === 0}
                className="w-full btn-primary bg-navy-900 hover:bg-navy-800 text-gold-500 py-3 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Download size={16} /> Generate Selected PDF ({notesToDownload.length})
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default NotesPage;