import { useState, useRef, useEffect, useMemo } from 'react';
import { useTheme } from '../ThemeContext';
import { HubFile } from '../types';
import { XIcon, ChevronLeftIcon, ChevronRightIcon, PlayIcon, DiscIcon, LockIcon, UnlockIcon, PlusIcon } from 'lucide-react';
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
    EmbedPDF.init({ 
      type: 'container', 
      target: document.getElementById('v'), 
      src: e.data.url,
      features: {
        openFile: false,
        closeFile: false
      },
      annotations: {
        selectAfterCreate: false,
        editAfterCreate: false
      }
    });
  }
});
window.addEventListener('keydown', e => {
  window.parent.postMessage({ 
    type: 'lumina-keyboard-event', 
    eventType: 'keydown',
    key: e.key, 
    code: e.code, 
    altKey: e.altKey, 
    ctrlKey: e.ctrlKey, 
    shiftKey: e.shiftKey,
    metaKey: e.metaKey
  }, '*');
});
window.addEventListener('keyup', e => {
  window.parent.postMessage({ 
    type: 'lumina-keyboard-event', 
    eventType: 'keyup',
    key: e.key, 
    code: e.code, 
    altKey: e.altKey, 
    ctrlKey: e.ctrlKey, 
    shiftKey: e.shiftKey,
    metaKey: e.metaKey
  }, '*');
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
  addFile: (file: Omit<HubFile, 'id' | 'createdAt'>) => void;
  blackboardWidth?: number;
  isSidebarLocked?: boolean;
  setIsSidebarLocked?: (locked: boolean) => void;
}

export default function FileViewer({
  file: currentFile,
  allFiles,
  onFileSelect,
  onClose,
  onSaveFile,
  externalActiveAudio,
  onSetActiveAudio,
  allFolders,
  addFile,
  blackboardWidth = 0,
  isSidebarLocked = false,
  setIsSidebarLocked
}: FileViewerProps) {
  const { colors } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [switcherSearch, setSwitcherSearch] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Track doc edits — reset immediately on file change to avoid stale decoding
  const [editedDocContent, setEditedDocContent] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pdfUrlRef = useRef<string>('');
  const iframeReadyRef = useRef(false);
  const prevFileIdRef = useRef(currentFile.id);

  // Reset edited content synchronously when file changes
  if (prevFileIdRef.current !== currentFile.id) {
    prevFileIdRef.current = currentFile.id;
    setEditedDocContent(null);
    setSwitcherSearch('');
  }

  // Close sidebar immediately when locked
  useEffect(() => {
    if (isSidebarLocked) {
      setIsSidebarOpen(false);
      setIsHovered(false);
    }
  }, [isSidebarLocked]);

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
    if (currentFile.type !== 'pdf') return;

    fetch(currentFile.content)
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
  }, [currentFile.content, currentFile.type]);

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

  // Listen for custom tour event to open the sidebar
  useEffect(() => {
    const handleOpenSidebar = () => setIsHovered(true);
    window.addEventListener('lumina-open-file-sidebar', handleOpenSidebar);
    return () => window.removeEventListener('lumina-open-file-sidebar', handleOpenSidebar);
  }, []);

  const [localAnnotations, setLocalAnnotations] = useState<Record<string, any[]>>({});
  const showFullSidebar = isSidebarOpen || isHovered;

  return (
    <div
      className="fixed inset-0 z-50 bg-[var(--bg-primary)] flex font-sans overflow-hidden transition-all duration-300 ease-in-out"
      style={{ right: blackboardWidth }}
    >

      <aside
        id="tour-file-sidebar"
        onMouseEnter={(e) => {
          if (e.altKey || isSidebarLocked) return;
          setIsHovered(true);
        }}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "absolute left-0 top-0 bottom-0 z-[160] flex flex-col transition-all duration-500 ease-in-out",
          showFullSidebar
            ? "w-80 translate-x-0"
            : (isSidebarLocked ? "w-0 overflow-hidden" : "w-[30px] translate-x-0")
        )}
      >
        {/* Top Deadzone Shield: Blocks hover when closed */}
        <div
          className={cn(
            "absolute left-0 top-0 w-full h-20 z-[200]",
            showFullSidebar ? "pointer-events-none" : "pointer-events-auto bg-transparent"
          )}
        />

        <div className={cn(
          "h-full flex flex-col transition-all duration-300 relative z-20 w-full",
          showFullSidebar ? "bg-[var(--bg-primary)] border-r border-black/10" : "bg-transparent"
        )}>
          {showFullSidebar ? (
            <>
              <div className="p-4 border-b border-black/10 flex items-center justify-between shrink-0">
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-50 hover:text-accent-primary transition-colors"
                  title="Close Document"
                >
                  <XIcon size={16} />
                  Close Document
                </button>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 opacity-50 hover:opacity-100 hover:bg-black/5 rounded transition-colors"
                  title="Collapse Sidebar"
                >
                  <ChevronLeftIcon size={18} />
                </button>
              </div>
              {/* ... rest of full sidebar content ... */}


              <div className="p-6 border-b border-black/10 bg-black/5 shrink-0">
                <h2 className="text-sm font-bold tracking-tight mb-1 line-clamp-2" title={currentFile.name}>
                  {currentFile.name}
                </h2>
                <p className="text-[10px] opacity-40 font-mono uppercase truncate">
                  {currentFile.type} • {currentFile.id.slice(0, 8)}
                </p>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-black/10 shrink-0 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Document Switcher</span>
                  </div>
                  <input
                    value={switcherSearch}
                    onChange={(e) => setSwitcherSearch(e.target.value)}
                    placeholder="Search documents..."
                    className="w-full bg-black/5 border border-black/10 px-3 py-2 text-[10px] uppercase font-bold tracking-widest outline-none focus:border-accent-primary transition-colors"
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
                        "px-4 py-3 text-left text-xs hover:bg-black/5 flex items-center justify-between group cursor-pointer transition-colors border-l-4",
                        f.id === currentFile.id ? "bg-black/5 border-accent-primary" : "border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className={cn("truncate", f.id === currentFile.id ? "font-bold text-accent-primary" : "opacity-60")}>
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
            !isSidebarLocked && (
              <div className="w-full h-full bg-transparent cursor-w-resize" />
            )
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        className={cn(
          "flex-1 overflow-hidden relative flex bg-[var(--bg-primary)] transition-all duration-300 px-0"
        )}
      >
        <div
          className={cn(
            "flex-1 relative cursor-default",
            currentFile.type === 'pdf' ? "overflow-hidden" : "overflow-auto"
          )}
          ref={containerRef}
        >
          {/* Header Actions */}
          <div className="absolute top-4 right-4 z-[210] flex items-center gap-2">
          </div>
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

            {currentFile.type === 'audio' && (
              <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-[var(--bg-primary)]">
                <div className="flex flex-col items-center mb-8">
                  <div className="w-48 h-48 bg-accent-primary/5 rounded-full flex items-center justify-center text-accent-primary mb-6 animate-pulse text-6xl">
                    📻
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-primary flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent-primary animate-ping" />
                    Tab Audio Broadcast Active
                  </p>
                </div>
                <h3 className="text-2xl font-serif mb-2 italic">{currentFile.name}</h3>
                <p className="text-xs opacity-50 mb-12 font-mono">Compatible with Google Meet Tab Sharing</p>

                <div className="w-full max-w-md bg-black/5 p-6 border border-black/10 rounded-2xl">
                  <audio controls className="w-full" autoPlay>
                    <source src={currentFile.content} type={currentFile.mimeType} />
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
                  color={colors.text}
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
