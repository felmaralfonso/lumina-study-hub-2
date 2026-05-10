import { useState, useEffect } from 'react';
import Sidebar, { TabType } from './components/Sidebar';
import FileExplorer from './components/FileExplorer';
import GameGenerator from './components/GameGenerator';
import ThemeManager from './components/ThemeManager';
import FileViewer from './components/FileViewer';
import { ThemeProvider } from './ThemeContext';
import { useFileSystem } from './hooks/useFileSystem';
import { HubFile } from './types';
import { cn, getDescendantFolderIds } from './lib/utils';


import GlobalTimer from './components/GlobalTimer';
import GlobalAudio from './components/GlobalAudio';
import Blackboard from './components/Blackboard';
import { FileTextIcon } from 'lucide-react';
function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('library');
  const [viewingFile, setViewingFile] = useState<HubFile | null>(null);
  const [activeAudio, setActiveAudio] = useState<HubFile | null>(null);
  const [isBlackboardOpen, setIsBlackboardOpen] = useState(false);
  const [blackboardWidth, setBlackboardWidth] = useState(600);
  const [isToolsHovered, setIsToolsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const { state, updateFile } = useFileSystem();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 520 && newWidth < window.innerWidth - 300) {
        setBlackboardWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);
    
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);
  
  // Filter audio files based on the folder context of the currently viewed file
  const filteredAudioFiles = (() => {
    if (!viewingFile) return state.files.filter(f => f.type === 'audio');
    const descendantFolderIds = getDescendantFolderIds(state.folders, viewingFile.parentId);
    const contextFolderIds = [viewingFile.parentId, ...descendantFolderIds];
    return state.files.filter(f => f.type === 'audio' && contextFolderIds.includes(f.parentId));
  })();

  return (
    <div className="flex relative overflow-hidden h-screen">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main 
        className={cn(
          "flex-1 min-h-screen bg-bg-primary overflow-auto flex flex-col",
          !isResizing && "transition-all duration-300 ease-in-out"
        )}
        style={{ marginRight: (isBlackboardOpen && viewingFile) ? blackboardWidth : 0 }}
      >
        {activeTab === 'library' && (
          <FileExplorer onFileSelect={setViewingFile} />
        )}
        {activeTab === 'games' && <GameGenerator />}
        {activeTab === 'themes' && <ThemeManager />}
      </main>
 
      {/* Resizing Guard Overlay */}
      {isResizing && (
        <div className="fixed inset-0 z-[999] cursor-ew-resize bg-transparent" />
      )}

      {viewingFile && (
        <>
          <FileViewer 
            file={viewingFile} 
            allFiles={state.files}
            allFolders={state.folders}
            onFileSelect={setViewingFile}
            onClose={() => setViewingFile(null)} 
            onSaveFile={(id, updates) => {
              updateFile(id, updates);
            }}
            externalActiveAudio={activeAudio}
            onSetActiveAudio={setActiveAudio}
            blackboardWidth={isBlackboardOpen ? blackboardWidth : 0}
          />

          {/* Hover-to-show Tool Panel */}
          <div 
            className="fixed right-0 top-0 bottom-0 z-[200] flex items-center pointer-events-none"
          >
            {/* Hover Trigger Zone (Very narrow edge) */}
            <div 
              className="absolute right-0 top-20 bottom-0 w-4 pointer-events-auto bg-transparent z-[210]" 
              onMouseEnter={() => setIsToolsHovered(true)}
            />
            
            <div 
              className={cn(
                "flex flex-col gap-4 pr-2 transition-all duration-500 ease-out transform pointer-events-auto relative z-[200] h-full",
                isBlackboardOpen ? "translate-x-0" : (isToolsHovered ? "translate-x-0" : "translate-x-full")
              )}
              onMouseLeave={() => setIsToolsHovered(false)}
            >
              <div className="flex flex-col items-end h-full relative">
                {/* Main Tools Background (Blackboard) */}
                <div className="absolute inset-y-0 right-0 z-0">
                  <Blackboard 
                    isOpen={isBlackboardOpen} 
                    setIsOpen={setIsBlackboardOpen} 
                    width={blackboardWidth} 
                    setWidth={setBlackboardWidth} 
                    setIsResizing={setIsResizing}
                    isEmbedded={true}
                  />
                </div>

                {/* Floating Overlay Tools (Audio, Blackboard, Timer) */}
                <div className={cn(
                  "flex flex-col items-end gap-12 pointer-events-none z-10 transition-all duration-300 h-full justify-center",
                  isBlackboardOpen ? (isToolsHovered ? "opacity-100" : "opacity-0") : "opacity-100"
                )}>
                  <div className="pointer-events-auto">
                    <GlobalAudio 
                      activeAudio={activeAudio} 
                      onClearAudio={() => setActiveAudio(null)} 
                      allFiles={filteredAudioFiles}
                      onSelectAudio={setActiveAudio}
                      isEmbedded={true}
                    />
                  </div>

                  <div className="pointer-events-auto">
                    <button
                      onClick={() => setIsBlackboardOpen(!isBlackboardOpen)}
                      className={cn(
                        "w-10 h-32 bg-white border border-[#E5E5E1] border-r-0 rounded-l-2xl shadow-2xl flex flex-col items-center justify-center gap-2 transition-all hover:translate-x-[-4px] group",
                        isBlackboardOpen ? "text-accent-primary" : "text-[#9A9A96]"
                      )}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-widest rotate-180 flex items-center gap-3 pointer-events-none" style={{ writingMode: 'vertical-rl' }}>
                         Study Board
                         <FileTextIcon size={14} className={isBlackboardOpen ? "text-accent-primary" : "text-[#9A9A96]"} />
                      </div>
                    </button>
                  </div>
                  
                  <div className="pointer-events-auto">
                    <GlobalTimer isEmbedded={true} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Dashboard />
    </ThemeProvider>
  );
}
