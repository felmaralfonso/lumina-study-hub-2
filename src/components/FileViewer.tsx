import { useState, useRef, useEffect, useMemo } from 'react';
import { HubFile } from '../types';
import { XIcon, ChevronLeftIcon, ChevronRightIcon, PlayIcon, DiscIcon } from 'lucide-react';
import { cn, getDescendantFolderIds } from '../lib/utils';
import { Folder } from '../types';
import StudyBoardInterface, { EditableDoc } from './StudyBoardInterface';

// Build the iframe HTML once — EmbedPDF loads inside the iframe's own context,
// so its WASM/workers are destroyed instantly by the browser when we remove
// the iframe (no main-thread freeze).
const PDF_VIEWER_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>*{margin:0;padding:0;box-sizing:border-box}html,body,#v{width:100%;height:100%}</style>
</head><body>
<div id="v"></div>
<script type="module">
import EmbedPDF from 'https://cdn.jsdelivr.net/npm/@embedpdf/snippet@2/dist/embedpdf.js';
window.addEventListener('message', e => {
  if (e.data?.type === 'load-pdf') {
    document.getElementById('v').innerHTML = '';
    EmbedPDF.init({ type: 'container', target: document.getElementById('v'), src: e.data.url });
  }
});
window.parent.postMessage({ type: 'pdf-viewer-ready' }, '*');
</script>
</body></html>`;

const iframeBlob = new Blob([PDF_VIEWER_HTML], { type: 'text/html' });
const iframeSrc = URL.createObjectURL(iframeBlob);

interface FileViewerProps {
  file: HubFile;
  allFiles: HubFile[];
  onFileSelect: (file: HubFile) => void;
  onClose: () => void;
  onSaveFile: (fileId: string, updates: Partial<Pick<HubFile, 'annotations' | 'content'>>) => void;
  externalActiveAudio: HubFile | null;
  onSetActiveAudio: (file: HubFile | null) => void;
  allFolders: Folder[];
  blackboardWidth?: number;
}

export default function FileViewer({
  file,
  allFiles,
  onFileSelect,
  onClose,
  onSetActiveAudio,
  allFolders,
  blackboardWidth = 0
}: FileViewerProps) {
  const [switcherSearch, setSwitcherSearch] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Track doc edits — reset immediately on file change to avoid stale decoding
  const [editedDocContent, setEditedDocContent] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pdfUrlRef = useRef<string>('');
  const iframeReadyRef = useRef(false);
  const prevFileIdRef = useRef(file.id);

  // Reset edited content synchronously when file changes
  if (prevFileIdRef.current !== file.id) {
    prevFileIdRef.current = file.id;
    setEditedDocContent(null);
    setSwitcherSearch('');
  }

  // Listen for iframe ready signal (once)
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'pdf-viewer-ready') {
        iframeReadyRef.current = true;
        // If we already have a PDF queued, send it now
        if (pdfUrlRef.current && iframeRef.current) {
          iframeRef.current.contentWindow?.postMessage(
            { type: 'load-pdf', url: pdfUrlRef.current }, '*'
          );
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // When viewing a PDF, convert to blob URL and send to iframe
  useEffect(() => {
    if (file.type !== 'pdf') return;

    fetch(file.content)
      .then(res => res.blob())
      .then(blob => {
        if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
        const url = URL.createObjectURL(blob);
        pdfUrlRef.current = url;
        // Send to iframe
        if (iframeReadyRef.current && iframeRef.current) {
          iframeRef.current.contentWindow?.postMessage(
            { type: 'load-pdf', url }, '*'
          );
        }
      })
      .catch(e => {
        console.error('Failed to create blob URL for PDF', e);
      });
  }, [file.content, file.type]);

  const decodeContent = (base64: string) => {
    // Safety guard: only decode if it looks like a text doc, not a PDF/image binary
    if (!base64 || base64.startsWith('data:application/pdf') || base64.startsWith('data:image')) {
      return '';
    }
    try {
      return decodeURIComponent(escape(atob(base64.split(',')[1] || base64)));
    } catch (e) {
      try {
        return atob(base64.split(',')[1] || base64);
      } catch {
        return '';
      }
    }
  };

  // Use the "fresh" file from state to ensure we always have latest content/annotations
  const currentFile = allFiles.find(f => f.id === file.id) || file;

  // The actual content to render for docs — use edits if available, otherwise file.content
  const docContent = currentFile.type === 'doc' ? (editedDocContent ?? currentFile.content) : '';

  // Non-audio files for the document list (exclude audio)
  const documentFiles = useMemo(() =>
    allFiles.filter(f =>
      f.type !== 'audio' &&
      (f.parentId || null) === (currentFile.parentId || null) && (
        f.name.toLowerCase().includes(switcherSearch.toLowerCase()) ||
        f.type.toLowerCase().includes(switcherSearch.toLowerCase())
      )
    ),
    [allFiles, switcherSearch, currentFile.parentId]
  );

  // Audio files from the current folder and all its subfolders
  const folderAudioFiles = useMemo(() => {
    const contextFolderIds = getDescendantFolderIds(allFolders, currentFile.parentId);
    return allFiles.filter(f => f.type === 'audio' && contextFolderIds.has(f.parentId));
  }, [allFiles, allFolders, currentFile.parentId]);

  const [isHovered, setIsHovered] = useState(false);
  const [localAnnotations, setLocalAnnotations] = useState<Record<string, any[]>>({});
  const showFullSidebar = isSidebarOpen || isHovered;

  return (
    <div
      className="fixed inset-y-0 left-0 z-50 bg-[#F9F9F7] flex font-sans overflow-hidden transition-all duration-300 ease-in-out"
      style={{ right: blackboardWidth }}
    >

      {/* Left Navigation Sidebar (Floating Overlay) */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "absolute left-0 top-0 bottom-0 z-[160] flex flex-col transition-all duration-500 ease-in-out",
          showFullSidebar
            ? "w-80 translate-x-0"
            : "w-16 translate-x-0"
        )}
      >
        {/* Top Deadzone Shield: 
            Blocks hover when closed, disappears when open to allow clicking */}
        <div 
          className={cn(
            "absolute left-0 top-0 w-full h-20 z-[200]",
            showFullSidebar ? "pointer-events-none" : "pointer-events-auto bg-transparent"
          )}
        />

        <div className={cn(
          "h-full flex flex-col transition-all duration-500 relative z-10",
          showFullSidebar ? "bg-white border-r border-[#E5E5E1] shadow-2xl" : "bg-transparent"
        )}>
          {showFullSidebar ? (
            <>
              <div className="p-4 border-b border-[#E5E5E1] flex items-center justify-between bg-white shrink-0">
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#9A9A96] hover:text-[#E11D48] transition-colors"
                  title="Close Document"
                >
                  <XIcon size={16} />
                  Close Document
                </button>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 text-[#9A9A96] hover:text-text-primary hover:bg-[#F9F9F7] rounded transition-colors"
                  title="Collapse Sidebar"
                >
                  <ChevronLeftIcon size={18} />
                </button>
              </div>
              {/* ... rest of full sidebar content ... */}


              <div className="p-6 border-b border-[#E5E5E1] bg-[#F9F9F7] shrink-0">
                <h2 className="text-sm font-bold tracking-tight text-text-primary mb-1 line-clamp-2" title={file.name}>
                  {file.name}
                </h2>
                <p className="text-[10px] text-[#9A9A96] font-mono uppercase truncate">
                  {file.type} • {file.id.slice(0, 8)}
                </p>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden bg-white">
                <div className="p-4 border-b border-[#E5E5E1] shrink-0">
                  <input
                    value={switcherSearch}
                    onChange={(e) => setSwitcherSearch(e.target.value)}
                    placeholder="Search documents..."
                    className="w-full bg-[#F9F9F7] border border-[#E5E5E1] px-3 py-2 text-[10px] uppercase font-bold tracking-widest outline-none focus:border-text-primary transition-colors"
                  />
                </div>

                <div className="flex-1 overflow-auto">
                  <p className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#9A9A96] sticky top-0 bg-white/90 backdrop-blur-sm z-10 border-b border-[#E5E5E1]/50">
                    Documents
                  </p>
                  {documentFiles.map(f => (
                    <div
                      key={f.id}
                      onClick={() => onFileSelect(f)}
                      className={cn(
                        "px-4 py-3 text-left text-xs hover:bg-[#F9F9F7] flex items-center justify-between group cursor-pointer transition-colors border-l-4",
                        f.id === file.id ? "bg-[#F9F9F7] border-text-primary" : "border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className={cn("truncate", f.id === file.id ? "font-bold text-text-primary" : "text-[#6A6A64]")}>
                          {f.name}
                        </span>
                      </div>
                    </div>
                  ))}
                  {documentFiles.length === 0 && (
                    <div className="px-4 py-8 text-center text-[10px] italic text-[#9A9A96]">No matching documents.</div>
                  )}
                </div>
              </div>

              {/* Audio Section — shows audio files from the current folder */}
              {folderAudioFiles.length > 0 && (
                <div className="border-t border-[#E5E5E1] bg-white shrink-0 max-h-52 flex flex-col overflow-hidden">
                  <p className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#9A9A96] bg-[#F9F9F7] border-b border-[#E5E5E1]/50 shrink-0">
                    🎵 Folder Audio
                  </p>
                  <div className="overflow-auto flex-1">
                    {folderAudioFiles.map(af => (
                      <button
                        key={af.id}
                        onClick={() => onSetActiveAudio(af)}
                        className="w-full px-4 py-2.5 text-left text-xs hover:bg-[#F9F9F7] flex items-center gap-3 group transition-colors"
                      >
                        <DiscIcon size={12} className="text-accent-primary opacity-50 group-hover:opacity-100 shrink-0" />
                        <span className="truncate text-[#6A6A64] group-hover:text-text-primary transition-colors">{af.name}</span>
                        <PlayIcon size={10} className="ml-auto text-accent-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-transparent cursor-w-resize" />
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative flex bg-[#F9F9F7]">
        <div
          className="flex-1 overflow-auto relative cursor-default"
          ref={containerRef}
        >
          <div className="w-full h-full relative">
            {currentFile.type === 'pdf' && (
              <iframe
                ref={iframeRef}
                src={iframeSrc}
                className="w-full h-full border-0 absolute inset-0 z-0"
                sandbox="allow-scripts allow-same-origin"
                title="PDF Viewer"
              />
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

            {currentFile.type === 'doc' && (
              <StudyBoardInterface
                key={currentFile.id}
                initialAnnotations={localAnnotations[currentFile.id] || currentFile.annotations || []}
                onAnnotationsChange={(newAnnos) => {
                  setLocalAnnotations(prev => ({ ...prev, [currentFile.id]: newAnnos }));
                }}
                width={containerRef.current?.clientWidth || 1000}
                showTextTools={true}
                onClearAll={() => {
                  onSaveFile(currentFile.id, { content: '' });
                }}
              >
                <EditableDoc 
                  initialContent={decodeContent(currentFile.content)}
                  onContentChange={(newContent) => {
                    onSaveFile(currentFile.id, { content: btoa(unescape(encodeURIComponent(newContent))) });
                  }}
                  fontFamily="Inter, sans-serif"
                  isEditable={true}
                  color="#1A1A1A"
                  lineHeight={1.6}
                />
              </StudyBoardInterface>
            )}

            {currentFile.type === 'image' && (
              <div className="w-full h-full flex items-center justify-center p-8 bg-white">
                <img
                  src={currentFile.content}
                  alt={currentFile.name}
                  className="max-w-full max-h-full object-contain shadow-2xl bg-white p-2 border border-[#E5E5E1]"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
          </div>
        </div>
      </main>

    </div>
  );
}
