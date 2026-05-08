import { useState, useEffect } from 'react';
import Sidebar, { TabType } from './components/Sidebar';
import FileExplorer from './components/FileExplorer';
import GameGenerator from './components/GameGenerator';
import ThemeManager from './components/ThemeManager';
import FileViewer from './components/FileViewer';
import { ThemeProvider } from './ThemeContext';
import { useFileSystem } from './hooks/useFileSystem';
import { HubFile } from './types';

import GlobalNotepad from './components/GlobalNotepad';
import GlobalTimer from './components/GlobalTimer';
import GlobalAudio from './components/GlobalAudio';

function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('library');
  const [viewingFile, setViewingFile] = useState<HubFile | null>(null);
  const [activeAudio, setActiveAudio] = useState<HubFile | null>(null);
  const { state, updateFile } = useFileSystem();

  return (
    <div className="flex relative">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 min-h-screen bg-bg-primary overflow-auto flex flex-col">
        {activeTab === 'library' && (
          <FileExplorer onFileSelect={setViewingFile} />
        )}
        {activeTab === 'games' && <GameGenerator />}
        {activeTab === 'themes' && <ThemeManager />}
      </main>
 
      <GlobalNotepad />
      <GlobalTimer />
      <GlobalAudio 
        activeAudio={activeAudio} 
        onClearAudio={() => setActiveAudio(null)} 
        allFiles={state.files}
        onSelectAudio={setActiveAudio}
      />
 
      {viewingFile && (
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
        />
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
