import { useState, useRef, useEffect } from 'react';
import { PencilIcon, SquareIcon, CircleIcon, EraserIcon, MousePointer2Icon, Trash2Icon, TypeIcon, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, FileTextIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';
import AnnotationCanvas from './AnnotationCanvas';
import { Annotation } from '../types';
import { cn } from '../lib/utils';

interface StudyBoardInterfaceProps {
  initialAnnotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
  width: number;
  children: React.ReactNode;
  showTextTools?: boolean;
  onClearAll?: () => void;
  isLibraryDoc?: boolean;
  isFixed?: boolean;
}

export function EditableDoc({ initialContent, onContentChange, fontFamily, isEditable, color, lineHeight }: { 
  initialContent: string, 
  onContentChange: (val: string) => void,
  fontFamily: string,
  isEditable: boolean,
  color: string,
  lineHeight: number
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (editorRef.current && (isFirstRender.current || (document.activeElement !== editorRef.current && editorRef.current.innerHTML !== initialContent))) {
      editorRef.current.innerHTML = initialContent;
      isFirstRender.current = false;
    }
  }, [initialContent]);

  useEffect(() => {
    if (isEditable && document.activeElement === editorRef.current) {
      document.execCommand('foreColor', false, color);
    }
  }, [color, isEditable]);

  return (
    <div 
      ref={editorRef}
      contentEditable={isEditable}
      onInput={(e) => onContentChange(e.currentTarget.innerHTML)}
      onBlur={(e) => {
        onContentChange(e.currentTarget.innerHTML);
      }}
      onFocus={() => {
        document.execCommand('foreColor', false, color);
      }}
      data-placeholder="Write something..."
      className={cn(
        "w-full min-h-[1000px] py-20 focus:outline-none text-text-primary leading-relaxed text-lg relative break-words whitespace-pre-wrap overflow-hidden",
        "empty:before:content-[attr(data-placeholder)] empty:before:text-[#BCBCB9]/40 empty:before:italic empty:before:absolute empty:before:pointer-events-none",
        isEditable ? "z-20 pointer-events-auto" : "z-10 pointer-events-none"
      )}
      style={{ 
        fontFamily, 
        lineHeight: `${lineHeight}`,
        paddingLeft: 'max(2rem, 8%)',
        paddingRight: 'max(2rem, 8%)'
      }}
    />
  );
}

export default function StudyBoardInterface({ 
  initialAnnotations, 
  onAnnotationsChange,
  width,
  children,
  showTextTools = false,
  onClearAll,
  isFixed = false
}: StudyBoardInterfaceProps) {
  const [tool, setTool] = useState<'pen' | 'rect' | 'circle' | 'eraser' | 'cursor'>('cursor');
  const [color, setColor] = useState('#1A1A1A');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [scale, setScale] = useState(1);
  const [zoomInput, setZoomInput] = useState('100%');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [contentHeight, setContentHeight] = useState(2000);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setZoomInput(`${Math.round(scale * 100)}%`);
  }, [scale]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!contentRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const height = entry.target.scrollHeight;
        setContentHeight(Math.max(height, dimensions.height, 2000));
      }
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [dimensions.height]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (panelRef.current && panelRef.current.contains(e.target as Node)) {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const delta = -e.deltaY * 0.002;
          setScale(prev => Math.min(Math.max(prev + delta, 0.2), 5));
        }
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      const isOverPanel = panelRef.current && (panelRef.current.contains(document.activeElement) || panelRef.current.matches(':hover'));
      if (isOverPanel && (e.ctrlKey || e.metaKey)) {
        if (e.key === '=' || e.key === '+') { e.preventDefault(); setScale(prev => Math.min(prev + 0.1, 5)); }
        else if (e.key === '-') { e.preventDefault(); setScale(prev => Math.max(prev - 0.1, 0.2)); }
        else if (e.key === '0') { e.preventDefault(); setScale(1); }
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const colors = ['#1A1A1A', '#E11D48', '#2563EB', '#16A34A', '#D97706', '#7C3AED'];
  const tools = [
    { id: 'cursor', icon: MousePointer2Icon, label: 'Select' },
    { id: 'pen', icon: PencilIcon, label: 'Pen' },
    { id: 'rect', icon: SquareIcon, label: 'Shape' },
    { id: 'eraser', icon: EraserIcon, label: 'Eraser' },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#F5F5F3] h-full" ref={panelRef}>
      {/* Toolbar */}
      <div className="px-6 py-3 bg-white border-b border-[#E5E5E1] flex items-center justify-between shrink-0 shadow-sm z-50">
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
          
          {showTextTools && (
            <>
              <div className="flex items-center gap-0.5">
                <button onClick={() => document.execCommand('bold')} className="p-1.5 rounded hover:bg-[#F5F5F3] text-[#9A9A96] hover:text-text-primary transition-all"><Bold size={15} /></button>
                <button onClick={() => document.execCommand('italic')} className="p-1.5 rounded hover:bg-[#F5F5F3] text-[#9A9A96] hover:text-text-primary transition-all"><Italic size={15} /></button>
                <button onClick={() => document.execCommand('underline')} className="p-1.5 rounded hover:bg-[#F5F5F3] text-[#9A9A96] hover:text-text-primary transition-all"><Underline size={15} /></button>
                <div className="w-[1px] h-4 bg-[#E5E5E1] mx-1" />
              </div>
              <div className="w-[1px] h-6 bg-[#E5E5E1] mx-2" />
            </>
          )}

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
              if (confirm('Clear all annotations?')) {
                onAnnotationsChange([]);
                if (onClearAll) onClearAll();
              }
            }}
            className="p-2 text-[#9A9A96] hover:text-red-500 transition-colors"
            title="Clear Annotations"
          >
            <Trash2Icon size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Tool Settings */}
        <div className="w-14 bg-white border-r border-[#E5E5E1] flex flex-col items-center py-6 gap-8 shrink-0 overflow-y-auto">
          <div className="flex flex-col items-center gap-4">
            <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#9A9A96] rotate-180" style={{ writingMode: 'vertical-rl' }}>Weight</div>
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

          <div className="flex flex-col items-center gap-6">
            <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#9A9A96] rotate-180" style={{ writingMode: 'vertical-rl' }}>Zoom</div>
            <div className="flex flex-col items-center gap-3">
              <button onClick={() => setScale(prev => Math.min(prev + 0.1, 5))} className="w-8 h-8 rounded border border-[#E5E5E1] flex items-center justify-center font-bold text-text-primary hover:bg-[#F5F5F3] shadow-sm">+</button>
              <div className="relative w-12 h-6">
                <input 
                  type="text" 
                  value={zoomInput}
                  onFocus={() => setZoomInput(Math.round(scale * 100).toString())}
                  onBlur={() => setZoomInput(`${Math.round(scale * 100)}%`)}
                  onChange={(e) => setZoomInput(e.target.value.replace(/[^0-9]/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = e.currentTarget.value.replace(/[^0-9]/g, '');
                      if (val) {
                        const num = parseInt(val);
                        if (num >= 20 && num <= 500) { setScale(num / 100); e.currentTarget.blur(); }
                      }
                    }
                  }}
                  className="w-full h-full text-[10px] font-mono text-[#9A9A96] bg-transparent text-center outline-none"
                />
              </div>
              <button onClick={() => setScale(prev => Math.max(prev - 0.1, 0.2))} className="w-8 h-8 rounded border border-[#E5E5E1] flex items-center justify-center font-bold text-text-primary hover:bg-[#F5F5F3] shadow-sm">-</button>
            </div>
          </div>
        </div>

        <div className={cn("flex-1 bg-white relative scroll-smooth", isFixed ? "overflow-hidden" : "overflow-auto")} ref={containerRef}>
          <div 
            className="relative origin-top-left transition-transform duration-200" 
            ref={contentRef}
            style={{ 
              transform: `scale(${scale})`, 
              width: dimensions.width > 0 ? (dimensions.width - 56) / scale : '100%',
              height: isFixed ? (dimensions.height / scale) : 'auto',
              minHeight: isFixed ? '0' : (dimensions.height / scale)
            }}
          >
            {/* Annotation Layer */}
            <div className={cn("absolute inset-0", tool === 'cursor' ? "z-10" : "z-30")}>
              {dimensions.width > 0 && (
                <AnnotationCanvas
                  width={(dimensions.width - 56) / scale} 
                  height={contentHeight}
                  annotations={initialAnnotations}
                  setAnnotations={onAnnotationsChange}
                  tool={tool}
                  color={color}
                  strokeWidth={strokeWidth}
                  fontFamily="'Inter', sans-serif"
                  scale={scale}
                />
              )}
            </div>

            {/* Injected Content */}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
