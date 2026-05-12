import { useState, useEffect, useRef } from 'react';
import Sidebar, { TabType } from './components/Sidebar';
import FileExplorer from './components/FileExplorer';
import GameGenerator from './components/GameGenerator';
import ThemeManager from './components/ThemeManager';
import SettingsManager from './components/SettingsManager';
import FileViewer from './components/FileViewer';
import { ThemeProvider } from './ThemeContext';
import { useFileSystem } from './hooks/useFileSystem';
import { HubFile } from './types';
import { cn, getDescendantFolderIds } from './lib/utils';


import GlobalTimer from './components/GlobalTimer';
import GlobalAudio from './components/GlobalAudio';
import Blackboard from './components/Blackboard';
import { FileTextIcon, Save, LockIcon, UnlockIcon } from 'lucide-react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('library');
  const [viewingFile, setViewingFile] = useState<HubFile | null>(null);
  const [activeAudio, setActiveAudio] = useState<HubFile | null>(null);
  const [isBlackboardOpen, setIsBlackboardOpen] = useState(false);
  const [blackboardWidth, setBlackboardWidth] = useState(600);
  const [isToolsHovered, setIsToolsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [lockMode, setLockMode] = useState<'hold' | 'toggle'>(
    (localStorage.getItem('lumina_lock_mode') as 'hold' | 'toggle') || 'hold'
  );
  const [lockKey, setLockKey] = useState<string>(
    localStorage.getItem('lumina_lock_key') || 's'
  );
  const [isSidebarLocked, setIsSidebarLocked] = useState(false);
  const { 
    state, 
    addFile, 
    addFolder, 
    deleteFile, 
    deleteFolder, 
    updateFile, 
    updateFolder, 
    resetFileSystem, 
    isSaving, 
    quotaInfo, 
    storageError 
  } = useFileSystem();

  const [onboardingStep, setOnboardingStep] = useState(0);

  // Persist Lock Settings
  useEffect(() => {
    localStorage.setItem('lumina_lock_mode', lockMode);
  }, [lockMode]);

  useEffect(() => {
    localStorage.setItem('lumina_lock_key', lockKey);
  }, [lockKey]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only allow locking if a document is open OR if we are on the specific tour tip
      if (!viewingFile && onboardingStep !== 8) return;
      
      const targetCode = `Key${lockKey.toUpperCase()}`;
      const isMatch = e.altKey && e.code === targetCode;

      if (isMatch) {
        e.preventDefault();
        if (lockMode === 'toggle') {
          setIsSidebarLocked(prev => {
            const next = !prev;
            if (next && isToolsHovered) setIsToolsHovered(false);
            window.dispatchEvent(new CustomEvent('lumina-lock-toggled'));
            return next;
          });
        } else {
          setIsSidebarLocked(true);
          if (isToolsHovered) setIsToolsHovered(false);
          window.dispatchEvent(new CustomEvent('lumina-lock-toggled'));
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      const targetCode = `Key${lockKey.toUpperCase()}`;
      if ((e.code === targetCode || e.key === 'Alt') && lockMode === 'hold') {
        setIsSidebarLocked(false);
      }
    };

    const handleBlur = () => {
      if (lockMode === 'hold') {
        setIsSidebarLocked(false);
      }
    };

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'lumina-keyboard-event') {
        const { eventType, key, code, altKey } = e.data;
        const fakeEvent = { key, code, altKey, preventDefault: () => { } } as KeyboardEvent;
        if (eventType === 'keydown') handleKeyDown(fakeEvent);
        else if (eventType === 'keyup') handleKeyUp(fakeEvent);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('message', handleMessage);
    };
  }, [lockMode, isToolsHovered, lockKey, viewingFile, onboardingStep]);


  // Stateful Onboarding Flow Progressions
  useEffect(() => {
    if (onboardingStep === 0) return;
    if (onboardingStep === 1 && activeTab === 'library') {
      setTimeout(() => setOnboardingStep(2), 400);
    }
    if (onboardingStep === 5 && viewingFile) {
      setTimeout(() => setOnboardingStep(6), 400);
    }
  }, [activeTab, viewingFile, onboardingStep]);

  // Listen for custom events from FileExplorer for folder/file creation
  useEffect(() => {
    const handleFolderAdded = () => {
      if (onboardingStep === 2) {
        setTimeout(() => setOnboardingStep(3), 400);
      }
    };
    const handleFolderEntered = () => {
      if (onboardingStep === 3) {
        setTimeout(() => setOnboardingStep(4), 400);
      }
    };
    const handleFileAdded = () => {
      if (onboardingStep === 4 || onboardingStep === 4.5) {
        setTimeout(() => setOnboardingStep(5), 400);
      }
    };
    window.addEventListener('lumina-folder-added', handleFolderAdded);
    window.addEventListener('lumina-folder-entered', handleFolderEntered);
    window.addEventListener('lumina-file-added', handleFileAdded);
    
    const handleNotes = () => {
      if (onboardingStep === 4) setOnboardingStep(4.5);
    };
    const handleLock = () => {
      if (onboardingStep === 8) setOnboardingStep(10);
    };

    window.addEventListener('lumina-notes-opened', handleNotes);
    window.addEventListener('lumina-lock-toggled', handleLock);

    return () => {
      window.removeEventListener('lumina-folder-added', handleFolderAdded);
      window.removeEventListener('lumina-folder-entered', handleFolderEntered);
      window.removeEventListener('lumina-file-added', handleFileAdded);
      window.removeEventListener('lumina-notes-opened', handleNotes);
      window.removeEventListener('lumina-lock-toggled', handleLock);
    };
  }, [onboardingStep]);

  // Run driver.js popovers based on current onboarding step
  useEffect(() => {
    if (onboardingStep === 0) return;

    let driverObj: any = null;

    const commonConfig = {
      animate: true,
      showProgress: false,
      allowClose: false,
      overlayClickAction: 'none' as const,
      allowKeyboardControl: false,
      onPopoverRender: (popover: any) => {
        if (popover.footer) popover.footer.style.display = 'none';
      }
    };

    if (onboardingStep === 1) {
      driverObj = driver({
        ...commonConfig,
        steps: [{ element: '#tour-nav-library', popover: { title: 'Step 1: The Library', description: 'Click "My Documents" to access your curriculum and student folders.', side: 'right', align: 'start' } }]
      });
    } else if (onboardingStep === 2) {
      driverObj = driver({
        ...commonConfig,
        steps: [{ element: '#tour-new-folder', popover: { title: 'Step 2: Create a Student Folder', description: 'Click "Add Student" to create a dedicated space for a student or specific class.', side: 'left', align: 'center' } }]
      });
    } else if (onboardingStep === 3) {
      driverObj = driver({
        ...commonConfig,
        steps: [{ element: '#tour-file-explorer', popover: { title: 'Step 3: Access Lesson Content', description: 'Click your new folder to open it and manage your teaching materials.', side: 'top', align: 'center' } }]
      });
    } else if (onboardingStep === 4) {
      driverObj = driver({
        ...commonConfig,
        steps: [{ element: '#tour-folder-notes', popover: { title: 'Step 4: Student Progress', description: 'Click "Open Notes" to log student progress and feedback for this lesson folder.', side: 'bottom', align: 'center' } }]
      });
    } else if (onboardingStep === 4.5) {
      driverObj = driver({
        ...commonConfig,
        steps: [{ element: '#tour-upload-files', popover: { title: 'Step 5: Ingest Materials', description: 'Now click "Ingest File" to upload your PDFs, lesson plans, or audio recordings.', side: 'bottom', align: 'center' } }]
      });
    } else if (onboardingStep === 5) {
      driverObj = driver({
        ...commonConfig,
        steps: [{ element: '#tour-file-explorer', popover: { title: 'Step 6: Start Teaching', description: 'Click any file to enter the edge-to-edge presentation view.', side: 'top', align: 'center' } }]
      });
    } else if (onboardingStep === 6) {
      window.dispatchEvent(new CustomEvent('lumina-open-file-sidebar'));
      driverObj = driver({
        ...commonConfig,
        steps: [{
          element: '#tour-file-sidebar',
          popover: {
            title: 'Step 7: Quick Switcher',
            description: 'Hover the left edge to swap between related lesson materials instantly.',
            side: "right",
            align: 'start'
          }
        }],
        onPopoverRender: (popover: any) => {
          if (popover.footer) popover.footer.style.display = 'none';
          setTimeout(() => setOnboardingStep(7), 5000);
        }
      });
    } else if (onboardingStep === 7) {
      setIsToolsHovered(true);
      driverObj = driver({
        ...commonConfig,
        steps: [{
          element: '#tour-right-tools',
          popover: { 
            title: 'Step 8: Teaching Tools', 
            description: 'Access the Teaching Board, Timer, and Audio from this panel. It stays hidden until you hover near the right edge.', 
            side: "left", 
            align: 'center' 
          }
        }],
        onPopoverRender: (popover: any) => {
          if (popover.footer) popover.footer.style.display = 'none';
          setTimeout(() => {
            setIsToolsHovered(false);
            setOnboardingStep(8);
          }, 6000);
        }
      });
    } else if (onboardingStep === 8) {
      driverObj = driver({
        ...commonConfig,
        steps: [{
          element: 'body',
          popover: {
            title: 'Final Tip: Presentation Mode',
            description: `Press **Alt + ${lockKey.toUpperCase()}** to lock sidebars and prevent distractions while teaching.`,
            side: "bottom",
            align: 'center'
          }
        }]
      });
    } else if (onboardingStep === 10) {
      setIsToolsHovered(false);
      driverObj = driver({
        showProgress: false,
        allowClose: true,
        steps: [{
          popover: {
            title: '🎉 You are ready!',
            description: 'You have mastered Lumina Study Hub! Use these tools to supercharge your learning. Enjoy!',
            side: "top",
            align: 'center'
          }
        }],
        onDestroyed: () => {
          setOnboardingStep(0);
        }
      });
    }

    if (driverObj) driverObj.drive();

    return () => {
      if (driverObj) driverObj.destroy();
    };
  }, [onboardingStep]);

  const startTour = () => {
    setOnboardingStep(1);
  };

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
    <div className="flex relative overflow-hidden h-screen bg-bg-primary">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setViewingFile(null); // Clear open file when switching tabs
        }}
      />

      <main
        className={cn(
          "flex-1 h-full flex flex-col",
          viewingFile ? "overflow-hidden pointer-events-none opacity-0" : "overflow-auto opacity-100",
          !isResizing && "transition-all duration-300 ease-in-out"
        )}
        style={{ marginRight: (isBlackboardOpen && viewingFile) ? blackboardWidth : 0 }}
      >
        {isSaving && (
          <div className="fixed top-4 right-4 z-[1000] bg-black/80 text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm">
            <Save size={14} className="animate-pulse" />
            Saving...
          </div>
        )}
        {activeTab === 'library' && (
          <FileExplorer 
            onFileSelect={setViewingFile} 
            state={state}
            addFolder={addFolder}
            addFile={addFile}
            deleteFile={deleteFile}
            deleteFolder={deleteFolder}
            updateFolder={updateFolder}
            resetFileSystem={resetFileSystem}
          />
        )}
        {activeTab === 'games' && <GameGenerator />}
        {activeTab === 'themes' && <ThemeManager />}
        {activeTab === 'settings' && (
          <SettingsManager
            quotaInfo={quotaInfo}
            storageError={storageError}
            isSaving={isSaving}
            lockMode={lockMode}
            setLockMode={setLockMode}
            lockKey={lockKey}
            setLockKey={setLockKey}
            onStartTour={startTour}
          />
        )}
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
            addFile={addFile}
            externalActiveAudio={activeAudio}
            onSetActiveAudio={setActiveAudio}
            blackboardWidth={(isBlackboardOpen && !isSidebarLocked) ? blackboardWidth : 0}
            isSidebarLocked={isSidebarLocked}
            setIsSidebarLocked={setIsSidebarLocked}
          />

          {/* Hover-to-show Tool Panel */}
          <div
            className="fixed right-0 top-0 bottom-0 z-[200] flex items-center pointer-events-none"
          >
            {/* The invisible trigger area - now lives in the 12px gutter */}
            <div
              className={cn(
                "absolute right-0 top-0 bottom-0 w-[30px] pointer-events-auto",
                (isToolsHovered || isSidebarLocked) && "hidden"
              )}
              onMouseEnter={() => {
                if (isSidebarLocked) return;
                setIsToolsHovered(true);
              }}
            />

            <div
              className={cn(
                "flex flex-col gap-4 pr-2 transition-all duration-500 ease-out transform pointer-events-auto relative z-[200] h-full items-end",
                isSidebarLocked ? "hidden" : (isBlackboardOpen ? "translate-x-0" : (isToolsHovered ? "translate-x-0" : "translate-x-full"))
              )}
              onMouseEnter={() => setIsToolsHovered(true)}
              onMouseLeave={() => setIsToolsHovered(false)}
            >
              <Blackboard
                isOpen={isBlackboardOpen}
                setIsOpen={setIsBlackboardOpen}
                width={blackboardWidth}
                setWidth={setBlackboardWidth}
                setIsResizing={setIsResizing}
                isEmbedded={true}
              />

              {/* Floating Overlay Tools (Audio, Blackboard, Timer) */}
              <div
                id="tour-right-tools"
                className={cn(
                  "flex flex-col items-end gap-12 pointer-events-none z-10 transition-all duration-300 h-full justify-center",
                  isBlackboardOpen ? (isToolsHovered ? "opacity-100" : "opacity-20") : "opacity-100"
                )}
              >
                <div id="tour-audio-player" className="pointer-events-auto">
                  <GlobalAudio
                    activeAudio={activeAudio}
                    onClearAudio={() => setActiveAudio(null)}
                    allFiles={filteredAudioFiles}
                    onSelectAudio={setActiveAudio}
                    isEmbedded={true}
                  />
                </div>

                <div id="tour-study-board-btn" className="pointer-events-auto">
                  <button
                    onClick={() => setIsBlackboardOpen(!isBlackboardOpen)}
                    className={cn(
                      "w-10 h-32 bg-white border border-[#E5E5E1] border-r-0 rounded-l-2xl flex flex-col items-center justify-center gap-2 transition-all hover:translate-x-[-4px] group",
                      isBlackboardOpen ? "text-accent-primary" : "text-[#9A9A96]"
                    )}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-widest rotate-180 flex items-center gap-3 pointer-events-none" style={{ writingMode: 'vertical-rl' }}>
                      Study Board
                      <FileTextIcon size={14} className={isBlackboardOpen ? "text-accent-primary" : "text-[#9A9A96]"} />
                    </div>
                  </button>
                </div>

                <div id="tour-timer" className="pointer-events-auto">
                  <GlobalTimer isEmbedded={true} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {/* Global Workspace Lock Indicator */}
      <div className={cn(
        "fixed bottom-6 right-6 z-[1000] flex items-center justify-center w-10 h-10 bg-text-primary text-white rounded-full transition-all duration-300",
        isSidebarLocked ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        <LockIcon size={18} />
      </div>
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
