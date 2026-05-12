import { useState, useEffect, useRef } from 'react';
import { MusicIcon, ChevronRightIcon, PlayIcon, PauseIcon, XIcon, DiscIcon, ListIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HubFile } from '../types';
import { cn } from '../lib/utils';

interface GlobalAudioProps {
  activeAudio: HubFile | null;
  onClearAudio: () => void;
  allFiles: HubFile[];
  onSelectAudio: (file: HubFile) => void;
  isEmbedded?: boolean;
}

export default function GlobalAudio({ activeAudio, onClearAudio, allFiles, onSelectAudio, isEmbedded }: GlobalAudioProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleRewind = () => {
    if (audioRef.current) {
      const newTime = Math.max(0, audioRef.current.currentTime - 10);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleSpeedChange = () => {
    const rates = [0.75, 1, 1.25, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const audioFiles = allFiles.filter(f => f.type === 'audio');

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

  // Handle auto-play when a new audio is selected
  useEffect(() => {
    if (activeAudio) {
      setIsOpen(true);
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.playbackRate = playbackRate;
        audioRef.current.load();
        audioRef.current.play().then(() => {
          if (audioRef.current) audioRef.current.playbackRate = playbackRate;
        });
      }
    }
  }, [activeAudio]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className={cn(
      isEmbedded ? "relative flex flex-row-reverse" : "fixed right-0 top-24 z-[100] flex flex-row-reverse"
    )} ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-12 h-12 flex items-center justify-center rounded-l-2xl transition-all relative",
          activeAudio ? "bg-accent-primary text-white" : "bg-white border border-[#E5E5E1] border-r-0 text-[#9A9A96]"
        )}
      >
        <motion.div
           animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
           transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          <DiscIcon size={20} />
        </motion.div>
        {isPlaying && (
          <span className="absolute top-1 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-[380px] bg-white border border-[#E5E5E1] flex flex-col p-6 rounded-l-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A96]">Audio Control</h3>
                <button 
                  onClick={() => setShowLibrary(!showLibrary)}
                  className={cn(
                    "p-1 rounded transition-colors",
                    showLibrary ? "bg-accent-primary text-white" : "hover:bg-[#F9F9F7] text-[#BCBCB9]"
                  )}
                >
                  <ListIcon size={12} />
                </button>
              </div>
              {activeAudio && (
                <button onClick={onClearAudio} className="opacity-40 hover:opacity-100 p-1">
                  <XIcon size={14} />
                </button>
              )}
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
              {showLibrary ? (
                <div className="w-full h-full flex flex-col">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#BCBCB9] mb-3">Audio Library</p>
                  <div className="flex-1 overflow-auto flex flex-col gap-1 pr-2">
                    {audioFiles.map(file => (
                      <button
                        key={file.id}
                        onClick={() => {
                          onSelectAudio(file);
                          setShowLibrary(false);
                        }}
                        className={cn(
                          "w-full text-left p-2 rounded-lg text-xs flex items-center gap-3 group transition-all",
                          activeAudio?.id === file.id ? "bg-accent-primary/5 text-accent-primary" : "hover:bg-[#F9F9F7] text-[#6A6A64]"
                        )}
                      >
                         <DiscIcon size={12} className={cn(activeAudio?.id === file.id && isPlaying ? "animate-spin" : "")} />
                         <span className="truncate flex-1">{file.name}</span>
                         {activeAudio?.id === file.id && (
                           <div className="flex gap-0.5">
                             {[...Array(3)].map((_, i) => (
                               <motion.div
                                 key={i}
                                 animate={isPlaying ? { height: [4, 10, 4] } : { height: 4 }}
                                 transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                                 className="w-0.5 bg-accent-primary"
                               />
                             ))}
                           </div>
                         )}
                      </button>
                    ))}
                    {audioFiles.length === 0 && (
                       <p className="text-[10px] italic text-[#BCBCB9] text-center mt-8">No audio files found</p>
                    )}
                  </div>
                </div>
              ) : !activeAudio ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-[#F9F9F7] rounded-full flex items-center justify-center text-[#BCBCB9] mx-auto mb-4">
                    <MusicIcon size={24} />
                  </div>
                  <p className="text-xs text-[#9A9A96] font-serif italic">No audio selected</p>
                  <button 
                    onClick={() => setShowLibrary(true)}
                    className="text-[10px] mt-4 text-accent-primary uppercase font-bold tracking-widest hover:opacity-70"
                  >
                    Browse Library
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 bg-accent-primary/5 rounded-2xl flex items-center justify-center text-accent-primary mb-4 relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center gap-0.5 opacity-20">
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={isPlaying ? { height: [8, 24, 8] } : { height: 8 }}
                          transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                          className="w-1 bg-accent-primary rounded-full"
                        />
                      ))}
                    </div>
                    <MusicIcon size={32} />
                  </div>

                  <h4 className="text-sm font-serif italic mb-4 truncate w-full text-center px-4">{activeAudio.name}</h4>
                  
                  {/* Scrubber */}
                  <div className="w-full px-4 mb-6">
                    <input 
                      type="range" 
                      min={0} 
                      max={duration || 100} 
                      value={currentTime} 
                      onChange={handleSeek}
                      className="w-full h-1 bg-[#E5E5E1] rounded-lg appearance-none cursor-pointer accent-accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-[#9A9A96] mt-1 font-mono">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleSpeedChange}
                      className="text-[10px] font-bold text-[#9A9A96] hover:text-text-primary px-2 py-1 bg-[#F9F9F7] rounded w-10 text-center transition-colors"
                      title="Playback Speed"
                    >
                      {playbackRate}x
                    </button>

                    <button 
                      onClick={handleRewind}
                      className="text-[10px] font-bold text-[#9A9A96] hover:text-text-primary px-2 py-1 bg-[#F9F9F7] rounded w-10 text-center transition-colors flex items-center justify-center gap-0.5"
                      title="Rewind 10 Seconds"
                    >
                      -10s
                    </button>

                    <button 
                      onClick={togglePlay}
                      className="w-12 h-12 bg-text-primary text-white rounded-full flex items-center justify-center hover:opacity-90 transition-all shadow-lg"
                    >
                      {isPlaying ? <PauseIcon size={20} fill="currentColor" /> : <PlayIcon size={20} fill="currentColor" className="ml-1" />}
                    </button>
                    
                    <div className="w-[84px]" /> {/* Spacer to balance the two left buttons (10 + gap + 10) */}
                  </div>

                </>
              )}
            </div>
            
            <div className="mt-6 flex items-center justify-between text-[8px] font-mono text-[#BCBCB9] opacity-40 uppercase tracking-widest">
              <span>Streaming Mode</span>
              <span>{activeAudio ? 'Live Node' : 'Idle'}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeAudio && (
        <audio 
          ref={audioRef} 
          src={activeAudio.content} 
          onEnded={() => setIsPlaying(false)}
          onTimeUpdate={() => {
            if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) setDuration(audioRef.current.duration);
          }}
          hidden 
        />
      )}
    </div>
  );
}
