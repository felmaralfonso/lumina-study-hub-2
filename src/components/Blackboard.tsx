import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PencilIcon, SquareIcon, CircleIcon, EraserIcon, MousePointer2Icon, Trash2Icon, ChevronLeftIcon, ChevronRightIcon, TypeIcon, Settings2Icon, FileTextIcon } from 'lucide-react';
import AnnotationCanvas from './AnnotationCanvas';
import { Annotation } from '../types';
import { cn } from '../lib/utils';

interface BlackboardProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  width: number;
  setWidth: (width: number) => void;
  isEmbedded?: boolean;
}

function EditableDoc({ initialContent, onContentChange, fontFamily, isEditable }: { 
  initialContent: string, 
  onContentChange: (val: string) => void,
  fontFamily: string,
  isEditable: boolean
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (editorRef.current && isFirstRender.current) {
      editorRef.current.innerHTML = initialContent;
      isFirstRender.current = false;
    }
  }, [initialContent]);

  return (
    <div 
      ref={editorRef}
      contentEditable={isEditable}
      onInput={(e) => onContentChange(e.currentTarget.innerHTML)}
      data-placeholder="Start typing your study notes..."
      className={cn(
        "w-full min-h-[1000px] p-20 focus:outline-none text-text-primary leading-relaxed text-lg relative",
        "empty:before:content-[attr(data-placeholder)] empty:before:text-[#BCBCB9] empty:before:italic",
        isEditable ? "z-20 pointer-events-auto" : "z-10 pointer-events-none"
      )}
      style={{ fontFamily }}
    />
  );
}

export default function Blackboard({ isOpen, setIsOpen, width, setWidth, isEmbedded }: BlackboardProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>(() => {
    const saved = localStorage.getItem('lumina_studyboard_annotations');
    return saved ? JSON.parse(saved) : [];
  });
  const [docContent, setDocContent] = useState(() => {
    return localStorage.getItem('lumina_studyboard_text') || '';
  });
  const [tool, setTool] = useState<'pen' | 'rect' | 'circle' | 'eraser' | 'cursor' | 'text'>('cursor');
  const [color, setColor] = useState('#1A1A1A');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [fontFamily, setFontFamily] = useState('Inter, sans-serif');
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    localStorage.setItem('lumina_studyboard_annotations', JSON.stringify(annotations));
  }, [annotations]);

  useEffect(() => {
    localStorage.setItem('lumina_studyboard_text', docContent);
  }, [docContent]);

  // Resizing logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 400 && newWidth < window.innerWidth - 300) {
        setWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setWidth]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isOpen]);

  const colors = [
    '#1A1A1A',
    '#E11D48',
    '#2563EB',
    '#16A34A',
    '#D97706',
    '#7C3AED',
  ];

  const tools = [
    { id: 'cursor', icon: MousePointer2Icon, label: 'Select' },
    { id: 'pen', icon: PencilIcon, label: 'Pen' },
    { id: 'text', icon: TypeIcon, label: 'Text Box' },
    { id: 'rect', icon: SquareIcon, label: 'Shape' },
    { id: 'eraser', icon: EraserIcon, label: 'Eraser' },
  ];

  return (
    <div className={cn(
      isEmbedded ? "relative flex" : "fixed right-0 top-0 bottom-0 z-[100] flex",
      "pointer-events-none select-none"
    )}>
      {/* Toggle Tab */}
      <div className="flex flex-col justify-center pr-4 pointer-events-auto">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-10 h-32 bg-white border border-[#E5E5E1] border-r-0 rounded-l-2xl shadow-2xl flex flex-col items-center justify-center gap-2 transition-all hover:translate-x-[-4px] group",
            isOpen ? "text-accent-primary" : "text-[#9A9A96]"
          )}
        >
          <div className="text-[10px] font-bold uppercase tracking-widest vertical-text rotate-180 flex items-center gap-3 pointer-events-none">
             Study Board
             <FileTextIcon size={14} className={isOpen ? "text-accent-primary" : "text-[#9A9A96]"} />
          </div>
        </button>
      </div>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="h-full bg-[#F5F5F3] shadow-[-20px_0_40px_rgba(0,0,0,0.1)] flex flex-col pointer-events-auto border-l border-[#E5E5E1] relative"
            style={{ width }}
          >
            {/* Resize Handle */}
            <div 
              className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-accent-primary/50 transition-colors z-[110]"
              onMouseDown={() => setIsResizing(true)}
            />

            {/* Toolbar */}
            <div className="px-6 py-3 bg-white border-b border-[#E5E5E1] flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-1">
                {tools.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTool(t.id as any)}
                    className={cn(
                      "p-2 rounded transition-all",
                      tool === t.id ? "bg-[#F5F5F3] text-text-primary shadow-sm" : "text-[#9A9A96] hover:text-text-primary hover:bg-[#F5F5F3]"
                    )}
                    title={t.label}
                  >
                    <t.icon size={16} />
                  </button>
                ))}
                <div className="w-[1px] h-6 bg-[#E5E5E1] mx-2" />
                <div className="flex gap-1.5">
                  {colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={cn(
                        "w-4 h-4 rounded-full border transition-transform hover:scale-125",
                        color === c ? "border-text-primary ring-2 ring-offset-1 ring-[#E5E5E1]" : "border-transparent"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (confirm('Clear all drawings?')) setAnnotations([]);
                  }}
                  className="p-2 text-[#9A9A96] hover:text-red-500 transition-colors"
                  title="Clear Drawings"
                >
                  <Trash2Icon size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Tool Settings */}
              <div className="w-14 bg-white border-r border-[#E5E5E1] flex flex-col items-center py-6 gap-8 shrink-0">
                <div className="flex flex-col items-center gap-4">
                  <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#9A9A96] rotate-180 vertical-text mb-2">Weight</div>
                  <div className="flex flex-col gap-2">
                    {[1, 3, 6, 10].map((s) => (
                      <button
                        key={s}
                        onClick={() => setStrokeWidth(s)}
                        className={cn(
                          "w-6 h-6 rounded flex items-center justify-center transition-all",
                          strokeWidth === s ? "bg-[#1A1A1A] text-white" : "text-[#9A9A96] hover:bg-[#F5F5F3]"
                        )}
                      >
                        <div className="rounded-full bg-current" style={{ width: s/2 + 2, height: s/2 + 2 }} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#9A9A96] rotate-180 vertical-text mb-2">Style</div>
                  <button 
                    onClick={() => setFontFamily(fontFamily.includes('serif') ? 'Inter, sans-serif' : 'Georgia, serif')}
                    className="w-8 h-8 rounded border border-[#E5E5E1] flex items-center justify-center text-[10px] font-bold text-text-primary hover:bg-[#F5F5F3]"
                  >
                    {fontFamily.includes('serif') ? 'Se' : 'Sa'}
                  </button>
                </div>
              </div>

              {/* Document View */}
              <div className="flex-1 overflow-auto bg-white relative scroll-smooth" ref={containerRef}>
                <div className="w-full min-h-full bg-white relative">
                  
                  {/* Annotation Layer (Konva) */}
                  <div 
                    className={cn(
                      "absolute inset-0",
                      tool === 'cursor' ? "z-10" : "z-30"
                    )}
                  >
                    {dimensions.width > 0 && (
                      <AnnotationCanvas
                        width={dimensions.width - 56} 
                        height={Math.max(dimensions.height, 2000)}
                        annotations={annotations}
                        setAnnotations={setAnnotations}
                        tool={tool}
                        color={color}
                        strokeWidth={strokeWidth}
                        fontFamily={fontFamily}
                      />
                    )}
                  </div>

                  {/* Document Text Area (Word-like) */}
                  <EditableDoc 
                    initialContent={docContent}
                    onContentChange={setDocContent}
                    fontFamily={fontFamily}
                    isEditable={tool === 'cursor'}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .vertical-text {
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }
        [contenteditable]:empty:before {
          content: attr(placeholder);
          color: #BCBCB9;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
