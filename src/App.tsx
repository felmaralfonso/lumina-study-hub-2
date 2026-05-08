import { useState, useEffect } from 'react';
import Sidebar, { TabType } from './components/Sidebar';
import FileExplorer from './components/FileExplorer';
import GameGenerator from './components/GameGenerator';
import ThemeManager from './components/ThemeManager';
import FileViewer from './components/FileViewer';
import { ThemeProvider } from './ThemeContext';
import { useFileSystem } from './hooks/useFileSystem';
import { HubFile } from './types';
import { cn } from './lib/utils';


import GlobalTimer from './components/GlobalTimer';
import GlobalAudio from './components/GlobalAudio';
import Blackboard from './components/Blackboard';

function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('library');
  const [viewingFile, setViewingFile] = useState<HubFile | null>(null);
  const [activeAudio, setActiveAudio] = useState<HubFile | null>(null);
  const [isBlackboardOpen, setIsBlackboardOpen] = useState(false);
  const [blackboardWidth, setBlackboardWidth] = useState(600);
  const { state, updateFile } = useFileSystem();

  return (
    <div className="flex relative overflow-hidden h-screen">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main 
        className="flex-1 min-h-screen bg-bg-primary overflow-auto flex flex-col transition-all duration-300 ease-in-out"
        style={{ marginRight: (isBlackboardOpen && viewingFile) ? blackboardWidth : 0 }}
      >
        {activeTab === 'library' && (
          <FileExplorer onFileSelect={setViewingFile} />
        )}
        {activeTab === 'games' && <GameGenerator />}
        {activeTab === 'themes' && <ThemeManager />}
      </main>
 
      {viewingFile && (
        <>
          <FileViewer 
            file={viewingFile} 
            allFiles={state.files}
            onFileSelect={setViewingFile}
            onClose={() => setViewingFile(null)} 
            onSaveFile={(id, updates) => {
              updateFile(id, updates);
              setViewingFile(null);
            }}
            externalActiveAudio={activeAudio}
            onSetActiveAudio={setActiveAudio}
            blackboardWidth={isBlackboardOpen ? blackboardWidth : 0}
          />

          {/* Hover-to-show Tool Panel */}
          <div className="fixed right-0 top-0 bottom-0 z-[200] flex items-center pointer-events-none group">
            {/* Hover Trigger Zone */}
            <div className="absolute right-0 top-0 bottom-0 w-16 pointer-events-auto bg-transparent z-0" />
            
            <div className={cn(
              "flex flex-col gap-4 pr-2 transition-all duration-500 ease-out transform pointer-events-auto relative z-10",
              isBlackboardOpen ? "translate-x-0" : "translate-x-[calc(100%-16px)] group-hover:translate-x-0"
            )}>
              <div className="flex flex-col items-end gap-3">
                <GlobalAudio 
                  activeAudio={activeAudio} 
                  onClearAudio={() => setActiveAudio(null)} 
                  allFiles={state.files}
                  onSelectAudio={setActiveAudio}
                  isEmbedded={true}
                />
                
                <Blackboard 
                  isOpen={isBlackboardOpen} 
                  setIsOpen={setIsBlackboardOpen} 
                  width={blackboardWidth} 
                  setWidth={setBlackboardWidth} 
                  isEmbedded={true}
                />

                <GlobalTimer isEmbedded={true} />
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
