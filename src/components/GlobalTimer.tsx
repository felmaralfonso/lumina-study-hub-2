import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TimerIcon, PlayIcon, PauseIcon, RotateCcwIcon, XIcon, PlusIcon, MinusIcon } from 'lucide-react';

export default function GlobalTimer() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem('lumina_timer_left');
    return saved ? parseInt(saved, 10) : 1500; // default 25 mins
  });
  const [isRunning, setIsRunning] = useState(() => {
    const saved = localStorage.getItem('lumina_timer_running');
    return saved === 'true';
  });
  const [initialTime, setInitialTime] = useState(() => {
    const saved = localStorage.getItem('lumina_timer_initial');
    return saved ? parseInt(saved, 10) : 1500;
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    localStorage.setItem('lumina_timer_left', timeLeft.toString());
    localStorage.setItem('lumina_timer_running', isRunning.toString());
    localStorage.setItem('lumina_timer_initial', initialTime.toString());
  }, [timeLeft, isRunning, initialTime]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3');
      audio.play().catch(e => console.error("Audio playback blocked", e));
      if (timerRef.current) clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const adjustTime = (amount: number) => {
    const newTime = Math.max(0, initialTime + amount);
    setInitialTime(newTime);
    if (!isRunning) setTimeLeft(newTime);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(initialTime);
  };

  return (
    <div className="fixed right-0 bottom-8 z-[100] flex flex-row-reverse" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-white border border-[#E5E5E1] border-r-0 shadow-lg flex items-center justify-center rounded-l-xl hover:bg-[#F9F9F7] transition-all group overflow-hidden relative"
      >
        <motion.div
           animate={isRunning ? { rotate: 360 } : { rotate: 0 }}
           transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <TimerIcon size={20} className={isRunning ? "text-accent-primary" : "text-[#4A4A44]"} />
        </motion.div>
        {timeLeft > 0 && isRunning && (
           <span className="absolute bottom-1 text-[7px] font-mono font-bold tracking-tighter text-accent-primary">
             {Math.ceil(timeLeft / 60)}m
           </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0, x: 20 }}
            animate={{ width: 280, opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: 20 }}
            className="h-[300px] bg-white border border-[#E5E5E1] shadow-2xl flex flex-col p-6 rounded-l-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between mb-8 border-b border-[#F0F0EE] pb-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A96]">Focus Engine</h3>
              <button onClick={() => setIsOpen(false)} className="opacity-40 hover:opacity-100">
                <XIcon size={14} />
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="relative mb-8">
                <motion.div 
                   className="text-5xl font-mono font-bold tracking-tighter text-[#1A1A1A]"
                   animate={isRunning ? { opacity: [1, 0.7, 1] } : {}}
                   transition={{ duration: 1, repeat: Infinity }}
                >
                  {formatTime(timeLeft)}
                </motion.div>
                
                {!isRunning && (
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 w-max">
                    <button onClick={() => adjustTime(-60)} className="text-[10px] font-mono hover:text-accent-primary transition-colors">-1m</button>
                    <button onClick={() => adjustTime(-10)} className="text-[10px] font-mono hover:text-accent-primary transition-colors">-10s</button>
                    <span className="text-[8px] font-bold text-[#BCBCB9] uppercase tracking-tighter mx-1">Set</span>
                    <button onClick={() => adjustTime(10)} className="text-[10px] font-mono hover:text-accent-primary transition-colors">+10s</button>
                    <button onClick={() => adjustTime(60)} className="text-[10px] font-mono hover:text-accent-primary transition-colors">+1m</button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6 mt-4">
                <button 
                  onClick={resetTimer}
                  className="p-3 border border-[#E5E5E1] rounded-full hover:bg-[#F9F9F7] transition-all text-[#9A9A96]"
                >
                  <RotateCcwIcon size={18} />
                </button>
                
                <button 
                  onClick={() => setIsRunning(!isRunning)}
                  className="w-16 h-16 bg-text-primary text-white rounded-full flex items-center justify-center hover:opacity-90 transition-all shadow-xl"
                >
                  {isRunning ? <PauseIcon size={24} fill="currentColor" /> : <PlayIcon size={24} fill="currentColor" className="ml-1" />}
                </button>

                <div className="w-10" /> {/* Spacer */}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between text-[8px] font-mono text-[#BCBCB9] opacity-40">
              <span className="uppercase tracking-widest">Temporal Node Alpha</span>
              <span>{Math.round((timeLeft/initialTime)*100)}%</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
