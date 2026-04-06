import React, { useRef, useState } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import { useCodalsStore } from '../../store/codalsStore';
import type { CodalProvision } from '../../types';

const BulkImportCodals: React.FC = () => {
  const { bulkAddCodals } = useCodalsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      const text = e.target?.result as string;
      
      // 🟢 THE "NUCLEAR" SPLITTER
      // This splits the file every time it sees the word "BOOK:". 
      // It completely ignores the stars!
      const blocks = text.split(/(?=BOOK:\s*)/i).map(b => b.trim()).filter(b => b.length > 0);
      
      // The Alert to prove it worked:
      alert(`DEBUG CHECK: The system found ${blocks.length} sections based on 'BOOK:' headers.`);

      if (blocks.length === 1) {
        alert("STOPPING: The file did not split. Ensure your articles start with BOOK:");
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const parsedProvisions: Partial<CodalProvision>[] = [];

      blocks.forEach(block => {
        const bookMatch = block.match(/BOOK:\s*(.+)/i);
        const articleMatch = block.match(/ARTICLE:\s*(.+)/i);
        const titleMatch = block.match(/TITLE:\s*(.+)/i);
        
        // 🟢 NEW: Hierarchical Extractors
        const bookPartMatch = block.match(/BOOK_PART:\s*(.+)/i);
        const titlePartMatch = block.match(/TITLE_PART:\s*(.+)/i);
        const chapterMatch = block.match(/CHAPTER:\s*(.+)/i);
        
        if (bookMatch && articleMatch) {
          // Clean the content box AND remove any leftover stars so they don't show up in the app
          let rawContent = block
            .replace(/BOOK_PART:\s*.+/i, '')  // Replace these first so it doesn't conflict with BOOK:
            .replace(/TITLE_PART:\s*.+/i, '')
            .replace(/CHAPTER:\s*.+/i, '')
            .replace(/BOOK:\s*.+/i, '')
            .replace(/ARTICLE:\s*.+/i, '')
            .replace(/TITLE:\s*.+/i, '')
            .replace(/CONTENT:/i, '')
            .replace(/\*{3,}/g, '') // Scubs out normal stars
            .replace(/\\\*\\\*\\\*/g, '') // Scrubs out hidden markdown stars
            .trim(); 

          if (rawContent) {
            parsedProvisions.push({
              book: bookMatch[1].trim(),
              bookPart: bookPartMatch ? bookPartMatch[1].trim() : "",   // 🟢 Added
              titlePart: titlePartMatch ? titlePartMatch[1].trim() : "", // 🟢 Added
              chapter: chapterMatch ? chapterMatch[1].trim() : "",       // 🟢 Added
              articleNumber: articleMatch[1].trim(),
              title: titleMatch ? titleMatch[1].trim() : "",
              content: rawContent
            });
          }
        }
      });

      if (parsedProvisions.length === 0) {
        alert("Error: Couldn't extract the text properly.");
        setIsUploading(false);
        return;
      }

      const confirm = window.confirm(`Ready to publish ${parsedProvisions.length} provisions to Lex Casus?`);
      if (confirm) {
        const success = await bulkAddCodals(parsedProvisions);
        if (success) {
          alert("Successfully imported the law!");
        } else {
          alert("An error occurred during import. Check the console.");
        }
      }
      
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; 
    };

    reader.readAsText(file); 
  };

  return (
    <div>
      <input 
        type="file" 
        accept=".md,.txt" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
      />
      <button 
        onClick={() => fileInputRef.current?.click()} 
        disabled={isUploading}
        className="px-6 py-2 bg-gold-500 text-navy-900 rounded-xl font-bold flex items-center gap-2 hover:bg-gold-400 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isUploading ? <Loader2 className="animate-spin" size={18} /> : <UploadCloud size={18} />}
        {isUploading ? 'Parsing Law...' : 'Bulk Import (.md)'}
      </button>
    </div>
  );
};

export default BulkImportCodals;