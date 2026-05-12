import { useState, useEffect, useRef } from 'react';
import { StickyNoteIcon, ChevronRightIcon, ChevronLeftIcon, Trash2Icon } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function GlobalNotepad() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  const [allNotes, setAllNotes] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('lumina_global_notes_v2');
    return saved ? JSON.parse(saved) : {};
  });

  const notes = allNotes[selectedDate] || '';

  useEffect(() => {
    localStorage.setItem('lumina_global_notes_v2', JSON.stringify(allNotes));
  }, [allNotes]);

  const updateNotes = (val: string) => {
    setAllNotes(prev => ({ ...prev, [selectedDate]: val }));
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[100] flex" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-text-primary text-white flex items-center justify-center rounded-l-2xl hover:translate-x-[-4px] transition-transform"
      >
        {isOpen ? <ChevronRightIcon size={20} /> : <StickyNoteIcon size={20} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-[500px] bg-white border border-[#E5E5E1] flex flex-col p-6 rounded-l-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A96]">Daily Journal</h3>
              <div className="flex items-center gap-1">
                <button onClick={() => changeDate(-1)} className="p-1 hover:bg-[#F0F0EE] rounded transition-colors"><ChevronLeftIcon size={12}/></button>
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-[10px] font-mono font-bold bg-[#F0F0EE] px-2 py-0.5 rounded outline-none cursor-pointer text-[#4A4A44] hover:bg-[#E5E5E1] transition-colors"
                />
                <button onClick={() => changeDate(1)} className="p-1 hover:bg-[#F0F0EE] rounded transition-colors"><ChevronRightIcon size={12}/></button>
              </div>
            </div>
            
            <textarea
              value={notes}
              onChange={(e) => updateNotes(e.target.value)}
              placeholder={`Reflections for ${selectedDate}...`}
              className="flex-1 bg-transparent border-none outline-none resize-none font-serif text-sm leading-relaxed text-[#4A4A44] mt-4"
            />
            
            <div className="mt-4 flex items-center justify-between text-[10px] font-mono text-[#BCBCB9] border-t border-[#F0F0EE] pt-4">
              <span>{notes.length} characters</span>
              <button 
                onClick={() => updateNotes('')}
                className="opacity-40 hover:opacity-100 hover:text-accent-primary transition-all flex items-center gap-1"
              >
                <Trash2Icon size={10} /> Wipe Entry
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
