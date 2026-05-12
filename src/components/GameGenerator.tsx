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
    <div className="p-12 flex-1 max-w-6xl mx-auto w-full relative overflow-hidden">
      {/* WIP SLANTED OVERLAY - Smaller, Red, Serif */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[50] overflow-hidden">
        <div className="w-[150%] flex justify-center rotate-[-25deg] opacity-[0.08]">
          <div className="text-[6vw] font-serif font-bold text-accent-primary uppercase tracking-[0.4em] whitespace-nowrap select-none">
            Work In Progress • Work In Progress • Work In Progress
          </div>
        </div>
      </div>

      <div className="mb-16 text-left relative z-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-50 mb-4">Module 01 / Logical Laboratory</p>
        <h1 className="text-5xl font-serif mb-6 leading-tight">Interactive Synthesis.</h1>
        <p className="opacity-70 text-lg max-w-md italic font-serif leading-relaxed">Translate source materials and conceptual requirements into functional logical environments.</p>
      </div>

      {!gameHtml && !loading && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/5 p-12 border border-black/10 rounded-2xl relative z-10"
        >
          <div className="mb-12">
            <label className="block text-[10px] font-bold uppercase tracking-widest opacity-50 mb-4">Functional Requirements</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the game mechanics, rules, and visual style..."
              className="w-full bg-transparent border-b-2 border-black/10 focus:border-accent-primary rounded-none p-4 outline-none transition-all text-lg font-serif min-h-[120px] resize-none"
            />
          </div>

          <div className="mb-12">
            <label className="block text-[10px] font-bold uppercase tracking-widest opacity-50 mb-4">Source Material (Images/PDF/PPT)</label>
            <div className="flex flex-wrap gap-4">
              <label className="w-32 h-32 border-2 border-dashed border-black/10 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-black/5 transition-colors group">
                <PlusIcon size={20} className="opacity-30 group-hover:opacity-100 transition-opacity" />
                <span className="text-[8px] font-bold uppercase tracking-tighter mt-2 opacity-50">Attach</span>
                <input type="file" className="hidden" multiple onChange={handleFileUpload} accept="image/*,.pdf,.pptx,.png,.jpg,.jpeg" />
              </label>
              {attachedFiles.map((file, idx) => (
                <div key={idx} className="w-32 h-32 border border-black/10 bg-black/5 p-3 flex flex-col justify-between relative group rounded-xl">
                  <div className="text-[10px] font-mono truncate opacity-50">{file.name}</div>
                  <div className="text-2xl opacity-20 text-center">📄</div>
                  <button 
                    onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 text-accent-primary transition-opacity"
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
            className="w-full bg-accent-primary text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:opacity-90 disabled:opacity-30 transition-all shadow-xl rounded-xl"
          >
            Initiate Synthesis
          </button>
        </motion.div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-32 space-y-8 relative z-10">
          <div className="w-12 h-12 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] animate-pulse">Calculating interaction nodes...</p>
        </div>
      )}

      {gameHtml && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-black/5 border border-black/10 flex flex-col h-[700px] shadow-2xl overflow-hidden rounded-2xl relative z-10"
        >
          <header className="h-12 border-b border-black/5 px-6 flex items-center justify-between bg-black/5 z-10">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Active Synthesis Environment</span>
            <div className="flex gap-4">
              <button onClick={() => setGameHtml(null)} className="text-[10px] font-bold hover:text-accent-primary uppercase tracking-widest transition-colors">Destroy Session</button>
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
