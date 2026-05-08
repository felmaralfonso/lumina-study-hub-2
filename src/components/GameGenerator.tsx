import { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Loader2Icon } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function GameGenerator() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [gameHtml, setGameHtml] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<{name: string, data: string, mimeType: string}[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        setAttachedFiles(prev => [...prev, { name: file.name, data: base64, mimeType: file.type }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateGame = async () => {
    if (!prompt.trim() && attachedFiles.length === 0) return;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      alert('No Gemini API key configured. Add GEMINI_API_KEY to your .env file to use AI game generation.');
      return;
    }

    setLoading(true);
    setGameHtml(null);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const contents: any[] = [{
        role: "user",
        parts: [
          { text: `Create a fully functional, self-contained interactive game website based on this request: "${prompt}". 
          Use the provided files as source material if attached. 
          The output must be a single HTML file containing CSS and Vanilla JS. 
          Ensure it has a minimal Editorial aesthetic matching a cream and charcoal theme. 
          DO NOT include any text mentioning AI, Gemini, or Large Language Models.` },
          ...attachedFiles.map(f => ({
            inline_data: {
              mime_type: f.mimeType,
              data: f.data
            }
          }))
        ]
      }];

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents,
      });

      let text = response.text ?? '';
      // Clean up markdown code blocks if present
      text = text.replace(/```html/g, '').replace(/```/g, '').trim();
      setGameHtml(text);
    } catch (error) {
      console.error(error);
      alert("System encountered a logical conflict. Please verify your domain parameters.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-12 flex-1 max-w-5xl mx-auto w-full bg-[#F9F9F7]">
      <div className="mb-16 text-left">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9A9A96] mb-4">Module 01 / Logical Laboratory</p>
        <h1 className="text-5xl font-serif mb-6 leading-tight">Interactive Synthesis.</h1>
        <p className="text-[#6A6A64] text-lg max-w-md italic font-serif leading-relaxed">Translate source materials and conceptual requirements into functional logical environments.</p>
      </div>

      {!gameHtml && !loading && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-12 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#E5E5E1]"
        >
          <div className="mb-12">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9A9A96] mb-4">Functional Requirements</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the game mechanics, rules, and visual style..."
              className="w-full bg-[#F9F9F7] border-b-2 border-[#E5E5E1] focus:border-text-primary rounded-none p-4 outline-none transition-all text-lg font-serif min-h-[120px] resize-none"
            />
          </div>

          <div className="mb-12">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9A9A96] mb-4">Source Material (Images/PDF/PPT)</label>
            <div className="flex flex-wrap gap-4">
              <label className="w-32 h-32 border-2 border-dashed border-[#E5E5E1] rounded flex flex-col items-center justify-center cursor-pointer hover:bg-[#F9F9F7] transition-colors group">
                <PlusIcon size={20} className="text-[#BCBCB9] group-hover:text-text-primary" />
                <span className="text-[8px] font-bold uppercase tracking-tighter mt-2 text-[#9A9A96]">Attach</span>
                <input type="file" className="hidden" multiple onChange={handleFileUpload} accept="image/*,.pdf,.pptx,.png,.jpg,.jpeg" />
              </label>
              {attachedFiles.map((file, idx) => (
                <div key={idx} className="w-32 h-32 border border-[#E5E5E1] bg-[#F9F9F7] p-3 flex flex-col justify-between relative group">
                  <div className="text-[10px] font-mono truncate text-[#9A9A96]">{file.name}</div>
                  <div className="text-2xl opacity-20">📄</div>
                  <button 
                    onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 p-1 opacity-0 group-hover:opacity-100 text-accent-primary"
                  >
                    <XIcon size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={generateGame}
            disabled={loading || (!prompt.trim() && attachedFiles.length === 0)}
            className="w-full bg-text-primary text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:opacity-90 disabled:opacity-30 transition-all shadow-xl"
          >
            Initiate Synthesis
          </button>
        </motion.div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-32 space-y-8">
          <div className="w-12 h-12 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] animate-pulse">Calculating interaction nodes...</p>
        </div>
      )}

      {gameHtml && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white border border-[#E5E5E1] flex flex-col h-[700px] shadow-2xl overflow-hidden"
        >
          <header className="h-12 border-b border-[#F0F0EE] px-6 flex items-center justify-between bg-white z-10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A96]">Active Synthesis Environment</span>
            <div className="flex gap-4">
              <button onClick={() => setGameHtml(null)} className="text-[10px] font-bold hover:text-accent-primary uppercase tracking-widest">Destroy Session</button>
            </div>
          </header>
          <iframe 
            srcDoc={gameHtml}
            className="flex-1 w-full border-none"
            title="Generated Game"
            sandbox="allow-scripts allow-modals"
          />
        </motion.div>
      )}
    </div>
  );
}

function PlusIcon({ size, className }: { size: number, className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
}

function XIcon({ size, className }: { size: number, className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
}
