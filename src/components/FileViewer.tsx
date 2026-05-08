import { useState, useRef, useEffect, useMemo } from 'react';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import { HubFile } from '../types';
import AnnotationCanvas from './AnnotationCanvas';
import { XIcon, PenIcon, SquareIcon, CircleIcon, EraserIcon, TypeIcon, SaveIcon, Share2Icon, DownloadIcon, MousePointer2Icon, ChevronDownIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface FileViewerProps {
  file: HubFile;
  allFiles: HubFile[];
  onFileSelect: (file: HubFile) => void;
  onClose: () => void;
  onSaveFile: (fileId: string, updates: Partial<Pick<HubFile, 'annotations' | 'content'>>) => void;
  externalActiveAudio: HubFile | null;
  onSetActiveAudio: (file: HubFile | null) => void;
}

export default function FileViewer({ 
  file, 
  allFiles, 
  onFileSelect, 
  onClose, 
  onSaveFile,
  externalActiveAudio,
  onSetActiveAudio
}: FileViewerProps) {
  const [annotations, setAnnotations] = useState(file.annotations || []);
  const [tool, setTool] = useState<'pen' | 'rect' | 'circle' | 'eraser' | 'cursor'>('cursor');
  const [content, setContent] = useState(file.content);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [switcherSearch, setSwitcherSearch] = useState('');
  const [scale, setScale] = useState(1);
  const [color, setColor] = useState('#E11D48');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [showSideTools, setShowSideTools] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        showSideTools && 
        sidebarRef.current && 
        !sidebarRef.current.contains(event.target as Node) &&
        containerRef.current && 
        containerRef.current.contains(event.target as Node)
      ) {
        setShowSideTools(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSideTools]);

  useEffect(() => {
    setAnnotations(file.annotations || []);
    setContent(file.content);
    setSwitcherSearch('');
    setScale(1);
  }, [file]);

  // Convert base64 to Blob URL to ensure PDF native tools (Download, Print) work flawlessly
  const pdfUrl = useMemo(() => {
    if (file.type !== 'pdf') return '';
    try {
      const base64Data = file.content.split(',')[1] || file.content;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      return URL.createObjectURL(blob);
    } catch (e) {
      return file.content; // fallback
    }
  }, [file.content, file.type]);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleShare = () => {
    // Generate a temporary shareable simulated link
    const url = window.location.href + '?shared=' + file.id;
    navigator.clipboard.writeText(url);
    alert('Share link copied to clipboard (Simulated)');
  };

  const handleSave = () => {
    onSaveFile(file.id, { 
      annotations,
      content: file.type === 'doc' ? content : file.content
    });
  };

  const decodeContent = (base64: string) => {
    try {
      return decodeURIComponent(escape(atob(base64.split(',')[1] || base64)));
    } catch (e) {
      return atob(base64.split(',')[1] || base64);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F9F9F7] flex flex-col font-sans">
      <header className="h-16 border-b border-[#E5E5E1] flex items-center justify-between px-8 bg-white z-20">
        <div className="flex items-center gap-6">
          <button onClick={onClose} className="hover:opacity-60 transition-opacity">
            <XIcon size={20} />
          </button>
          <div className="w-[1px] h-6 bg-[#E5E5E1]" />
          <div className="relative">
            <button 
              onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
              className="group flex flex-col hover:opacity-70 transition-opacity text-left"
            >
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight">{file.name}</h2>
                <ChevronDownIcon size={14} className={cn("transition-transform", isSwitcherOpen ? "rotate-180" : "")} />
              </div>
              <p className="text-[10px] text-[#9A9A96] font-mono uppercase">
                {file.type} • {file.id.slice(0, 8)}
              </p>
            </button>

            {isSwitcherOpen && (
              <div className="absolute top-full left-0 mt-4 w-72 bg-white border border-[#E5E5E1] shadow-2xl py-4 z-50">
                <div className="px-4 mb-3">
                  <input 
                    autoFocus
                    value={switcherSearch}
                    onChange={(e) => setSwitcherSearch(e.target.value)}
                    placeholder="Search library..."
                    className="w-full bg-[#F9F9F7] border border-[#E5E5E1] px-3 py-2 text-[10px] uppercase font-bold tracking-widest outline-none focus:border-text-primary transition-colors"
                  />
                </div>
                <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#9A9A96]">Folder Contents</p>
                <div className="max-h-80 overflow-auto">
                  {allFiles
                    .filter(f => f.parentId === file.parentId && (f.name.toLowerCase().includes(switcherSearch.toLowerCase()) || f.type.toLowerCase().includes(switcherSearch.toLowerCase())))
                    .map(f => (
                      <div
                        key={f.id}
                        onClick={() => {
                          onFileSelect(f);
                          setIsSwitcherOpen(false);
                        }}
                        className={cn(
                          "w-full px-4 py-3 text-left text-xs hover:bg-[#F9F9F7] flex items-center justify-between group cursor-pointer transition-colors",
                          f.id === file.id ? "bg-[#F9F9F7] border-l-4 border-text-primary" : ""
                        )}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className="opacity-40 shrink-0">
                            {f.type === 'audio' ? '🎵' : f.type === 'pdf' ? '📄' : f.type === 'image' ? '🖼️' : '📝'}
                          </span>
                          <span className={cn("truncate", f.id === file.id ? "font-bold text-text-primary" : "text-[#6A6A64]")}>{f.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {f.type === 'audio' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSetActiveAudio(f);
                                setIsSwitcherOpen(false);
                              }}
                              className="text-[8px] font-bold uppercase tracking-widest bg-accent-primary text-white px-2 py-1 hover:opacity-80 transition-opacity"
                            >
                              Play
                            </button>
                          )}
                          <span className="text-[8px] font-mono text-[#BCBCB9] opacity-0 group-hover:opacity-100 shrink-0">
                            {new Date(f.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  {allFiles.filter(f => f.name.toLowerCase().includes(switcherSearch.toLowerCase())).length === 0 && (
                    <div className="px-4 py-8 text-center text-[10px] italic text-[#9A9A96]">No matching documents.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowSideTools(!showSideTools)}
            className={cn(
              "text-[10px] font-bold uppercase tracking-widest border px-4 py-2 transition-all",
              showSideTools ? "border-accent-primary text-accent-primary bg-accent-primary/5" : "border-[#E5E5E1] text-[#9A9A96]"
            )}
          >
            {showSideTools ? 'Hide Tools' : 'Show Tools'}
          </button>
          <div className="w-[1px] h-6 bg-[#E5E5E1]" />
          <button 
            onClick={handleShare}
            className="text-[10px] font-bold uppercase tracking-widest border border-[#1A1A1A] px-4 py-2 hover:bg-[#1A1A1A] hover:text-white transition-all"
          >
            Share Audio
          </button>
          <button 
            onClick={handleSave}
            className="text-[10px] font-bold uppercase tracking-widest bg-[#1A1A1A] text-white px-4 py-2 hover:opacity-90 transition-opacity"
          >
            Save Changes
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative flex bg-[#F9F9F7]">
        {/* Left Toolbar */}
        <AnimatePresence>
          {showSideTools && (
            <motion.div 
              ref={sidebarRef}
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              className="absolute left-6 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-4 bg-white border border-[#E5E5E1] p-3 rounded-2xl shadow-2xl"
            >
              <div className="flex flex-col gap-2 bg-[#F9F9F7] p-1.5 rounded-lg border border-[#F0F0EE]">
                <button 
                  onClick={() => setScale(s => Math.min(5, s + 0.1))}
                  className="p-2 hover:bg-white rounded transition-colors text-[#6A6A64]"
                >
                  <ZoomInIcon size={16} />
                </button>
                <div className="text-[10px] font-mono font-bold text-center py-1 border-y border-[#E5E5E1] my-1">
                  {Math.round(scale * 100)}%
                </div>
                <button 
                  onClick={() => setScale(s => Math.max(0.1, s - 0.1))}
                  className="p-2 hover:bg-white rounded transition-colors text-[#6A6A64]"
                >
                  <ZoomOutIcon size={16} />
                </button>
              </div>

              <div className="w-full h-[1px] bg-[#E5E5E1]" />

              <div className="flex flex-col gap-2">
                {[
                  { id: 'cursor', icon: MousePointer2Icon, label: 'Select' },
                  { id: 'pen', icon: PenIcon, label: 'Pen' },
                  { id: 'rect', icon: SquareIcon, label: 'Box' },
                  { id: 'circle', icon: CircleIcon, label: 'Circle' },
                  { id: 'eraser', icon: EraserIcon, label: 'Eraser' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTool(t.id as any)}
                    className={cn(
                      "p-3 rounded-xl transition-all relative group",
                      tool === t.id ? "bg-accent-primary text-white shadow-lg" : "text-[#6A6A64] hover:bg-[#F9F9F7]"
                    )}
                    title={t.label}
                  >
                    <t.icon size={18} />
                    <span className="absolute left-full ml-4 px-2 py-1 bg-text-primary text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="w-full h-[1px] bg-[#E5E5E1]" />

              <div className="flex flex-col gap-3 items-center py-2">
                {['#E11D48', '#2563EB', '#16A34A', '#1A1A1A'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 border-white transition-all hover:scale-110",
                      color === c ? "ring-2 ring-accent-primary scale-110 shadow-md" : "opacity-40"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div 
          className="flex-1 overflow-auto relative p-4 pr-16 cursor-default" 
          ref={containerRef}
        >
          <motion.div 
            animate={{ scale }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full h-[calc(100vh-6rem)] mx-auto bg-white shadow-lg border border-[#E5E5E1] overflow-hidden origin-top"
          >
            {file.type === 'pdf' && pdfUrl && (
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                <Viewer
                  fileUrl={pdfUrl}
                  plugins={[defaultLayoutPluginInstance]}
                />
              </Worker>
            )}

            {file.type === 'audio' && (
              <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-white">
                <div className="flex flex-col items-center mb-8">
                  <div className="w-48 h-48 bg-accent-primary/5 rounded-full flex items-center justify-center text-accent-primary mb-6 animate-pulse text-6xl">
                    📻
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-primary flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent-primary animate-ping" />
                    Tab Audio Broadcast Active
                  </p>
                </div>
                <h3 className="text-2xl font-serif mb-2 italic">{file.name}</h3>
                <p className="text-xs opacity-50 mb-12 font-mono">Compatible with Google Meet Tab Sharing</p>
                
                <div className="w-full max-w-md bg-[#F9F9F7] p-6 border border-[#E5E5E1]">
                  <audio controls className="w-full" autoPlay>
                    <source src={file.content} type={file.mimeType} />
                  </audio>
                </div>
              </div>
            )}

            {file.type === 'doc' && (
               <div 
                 contentEditable
                 className="w-full h-full p-20 overflow-auto bg-white text-black font-serif prose prose-lg focus:outline-none"
                 dangerouslySetInnerHTML={{ __html: decodeContent(content) }}
                 onBlur={(e) => setContent(btoa(unescape(encodeURIComponent(e.currentTarget.innerHTML))))}
               />
            )}

            {file.type === 'image' && (
              <div className="w-full h-full flex items-center justify-center p-8">
                <img 
                  src={file.content} 
                  alt={file.name} 
                  className="max-w-full max-h-full object-contain shadow-2xl" 
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            {/* Annotation Layer */}
            <AnnotationCanvas
              width={dimensions.width}
              height={dimensions.height}
              annotations={annotations}
              setAnnotations={setAnnotations}
              tool={tool}
              color={color}
              strokeWidth={strokeWidth}
              scale={scale}
            />
          </motion.div>
        </div>

        {/* Internal audio controls removed as they are now global */}
      </main>
    </div>
  );
}
