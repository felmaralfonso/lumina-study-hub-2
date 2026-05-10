import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileTextIcon } from 'lucide-react';
import StudyBoardInterface, { EditableDoc } from './StudyBoardInterface';
import { Annotation } from '../types';
import { cn } from '../lib/utils';

interface BlackboardProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  width: number;
  setWidth: (width: number) => void;
  setIsResizing: (isResizing: boolean) => void;
  isEmbedded?: boolean;
}

export default function Blackboard({ isOpen, setIsOpen, width, setWidth, setIsResizing, isEmbedded }: BlackboardProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [docContent, setDocContent] = useState('');

  return (
    <div className={cn(
      isEmbedded ? "absolute inset-y-0 right-0 flex pointer-events-none" : "fixed right-0 top-0 bottom-0 z-[100] flex",
      "select-none"
    )}>
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

            <StudyBoardInterface 
              initialAnnotations={annotations}
              onAnnotationsChange={setAnnotations}
              width={width}
              showTextTools={true}
              onClearAll={() => setDocContent('')}
            >
              <EditableDoc 
                initialContent={docContent}
                onContentChange={setDocContent}
                fontFamily="Inter, sans-serif"
                isEditable={true}
                color="#1A1A1A"
                lineHeight={1.6}
              />
            </StudyBoardInterface>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        [contenteditable]:empty:before {
          content: attr(placeholder);
          color: #BCBCB9;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
