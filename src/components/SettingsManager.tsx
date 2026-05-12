import { HardDriveIcon, ShieldAlertIcon, InfoIcon, RefreshCwIcon, SaveIcon, CheckIcon, BookOpenIcon, PlusIcon, FileTextIcon, MusicIcon, PlayIcon, Trash2Icon, FolderIcon, LayoutDashboardIcon, LockIcon, UnlockIcon, RouteIcon, StickyNoteIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

interface SettingsManagerProps {
  quotaInfo: { used: number; total: number } | null;
  storageError: string | null;
  isSaving: boolean;
  lockMode: 'hold' | 'toggle';
  setLockMode: (mode: 'hold' | 'toggle') => void;
  lockKey: string;
  setLockKey: (key: string) => void;
  onStartTour: () => void;
}

export default function SettingsManager({ 
  quotaInfo, 
  storageError, 
  isSaving, 
  lockMode, 
  setLockMode, 
  lockKey, 
  setLockKey, 
  onStartTour 
}: SettingsManagerProps) {
  const [testResult, setTestResult] = useState<'pending' | 'success' | 'failed' | 'incognito' | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const usedPercentage = quotaInfo ? (quotaInfo.used / quotaInfo.total) * 100 : 0;

  const verifyStorage = async () => {
    setTestResult('pending');

    // 1. Check for Incognito/Private Mode via Storage Quota
    // In Chrome/Edge/Firefox incognito, the quota is significantly restricted.
    let isIncognito = false;
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const { quota } = await navigator.storage.estimate();
        // If quota is unusually low (e.g., < 150MB) it usually indicates a private session
        if (quota && quota < 150 * 1024 * 1024) {
          isIncognito = true;
        }
      }
    } catch (e) {
      // If estimation fails, we assume potential privacy restrictions
    }

    // 2. Functional persistence test
    const testKey = 'lumina_persistence_test';
    const testVal = Date.now().toString();
    try {
      localStorage.setItem(testKey, testVal);
      setTimeout(() => {
        const retrieved = localStorage.getItem(testKey);
        if (retrieved === testVal) {
          setTestResult(isIncognito ? 'incognito' : 'success');
        } else {
          setTestResult('failed');
        }
      }, 800);
    } catch (e) {
      setTestResult('failed');
    }
  };

  return (
    <div className="flex-1 w-full h-full overflow-auto">
      <div className="p-12 max-w-5xl mx-auto pb-32">
        <header className="mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9A9A96] mb-4">Instructor Administration</p>
          <h1 className="text-5xl font-serif tracking-tight">Settings & Help.</h1>
          <p className="text-[#6A6A64] text-lg mt-4 italic font-serif">Manage lesson storage, verify system integrity, and learn how to teach with Lumina.</p>
        </header>

        {/* Interactive Tour Section */}
        <section className="mb-20">
          <div className="bg-white border border-[#E5E5E1] shadow-sm rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 className="text-xl font-serif text-accent-primary mb-2 flex items-center gap-2">
                <RouteIcon size={20} />
                Interactive Workspace Tour
              </h2>
              <p className="text-sm text-[#6A6A64] max-w-xl leading-relaxed">
                New to Lumina? Take a quick guided tour to learn where everything is and how to get the most out of your offline study hub.
              </p>
            </div>
            <button 
              onClick={onStartTour}
              className="px-6 py-3 bg-accent-primary text-white font-bold text-sm tracking-widest uppercase rounded shadow-lg hover:opacity-90 transition-all shrink-0"
            >
              Start Tour
            </button>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#9A9A96] mb-6 flex items-center gap-2">
            <BookOpenIcon size={14} /> How to Teach with Lumina
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 border border-[#E5E5E1]">
              <h3 className="font-serif text-lg mb-3 text-text-primary flex items-center gap-2">
                <FolderIcon size={18} className="text-accent-primary" /> 1. Lesson Library
              </h3>
              <p className="text-sm text-[#6A6A64] leading-relaxed mb-4">
                Lumina is your digital curriculum binder. Use the <strong>My Documents</strong> tab to organize your lesson plans, handouts, and teaching resources.
              </p>
              <ul className="text-xs text-[#6A6A64] space-y-2 list-disc pl-5">
                <li>Create subject-specific folders for quick access during live calls.</li>
                <li>Upload PDFs, lesson slides, and reference materials.</li>
                <li>Drag-and-drop support for rapid curriculum building.</li>
              </ul>
            </div>

            <div className="bg-white p-6 border border-[#E5E5E1]">
              <h3 className="font-serif text-lg mb-3 text-text-primary flex items-center gap-2">
                <FileTextIcon size={18} className="text-accent-primary" /> 2. Live Document Annotation
              </h3>
              <p className="text-sm text-[#6A6A64] leading-relaxed mb-4">
                Open any PDF to enter <strong>Presentation Mode</strong>. Annotate directly on the document while screensharing to highlight key concepts.
              </p>
              <ul className="text-xs text-[#6A6A64] space-y-2 list-disc pl-5">
                <li>Use the top toolbar for various pens and highlighters.</li>
                <li>Hover the <strong>left edge</strong> to switch between related documents instantly.</li>
                <li>Annotations are saved per-file for future reference.</li>
              </ul>
            </div>

            <div className="bg-white p-6 border border-[#E5E5E1]">
              <h3 className="font-serif text-lg mb-3 text-text-primary flex items-center gap-2">
                <MusicIcon size={18} className="text-accent-primary" /> 3. Audio & Ambiance
              </h3>
              <p className="text-sm text-[#6A6A64] leading-relaxed mb-4">
                Set the classroom mood by uploading background ambiance or lecture recordings.
              </p>
              <ul className="text-xs text-[#6A6A64] space-y-2 list-disc pl-5">
                <li>The persistent global player stays active across all documents.</li>
                <li>Access audio files quickly from the Document Viewer's left sidebar.</li>
              </ul>
            </div>

            <div className="bg-white p-6 border border-[#E5E5E1]">
              <h3 className="font-serif text-lg mb-3 text-text-primary flex items-center gap-2">
                <LayoutDashboardIcon size={18} className="text-accent-primary" /> 4. The Teaching Board
              </h3>
              <p className="text-sm text-[#6A6A64] leading-relaxed mb-4">
                A professional blackboard and scratchpad for worked examples and real-time notes.
              </p>
              <ul className="text-xs text-[#6A6A64] space-y-2 list-disc pl-5">
                <li>Hover the <strong>right edge</strong> to reveal the tool panel.</li>
                <li>Pull out the Teaching Board alongside any PDF for side-by-side instruction.</li>
                <li>Write math problems or lecture summaries in real-time.</li>
              </ul>
            </div>

            <div className="bg-white p-6 border border-[#E5E5E1]">
              <h3 className="font-serif text-lg mb-3 text-text-primary flex items-center gap-2">
                <StickyNoteIcon size={18} className="text-accent-primary" /> 5. Instructor Journal
              </h3>
              <p className="text-sm text-[#6A6A64] leading-relaxed mb-4">
                Use the <strong>Global Notepad</strong> (Journal Icon on the right) for private lecture notes, class reflections, or administrative reminders.
              </p>
              <ul className="text-xs text-[#6A6A64] space-y-2 list-disc pl-5">
                <li>Accessible from any screen without switching tabs.</li>
                <li>Persistent date-based entries for tracking curriculum progress.</li>
              </ul>
            </div>

            <div className="bg-white p-6 border border-[#E5E5E1]">
              <h3 className="font-serif text-lg mb-3 text-text-primary flex items-center gap-2">
                <PlusIcon size={18} className="text-accent-primary" /> 6. Student Progress Tracking
              </h3>
              <p className="text-sm text-[#6A6A64] leading-relaxed mb-4">
                Keep specific notes for each student or group within their respective folders.
              </p>
              <ul className="text-xs text-[#6A6A64] space-y-2 list-disc pl-5">
                <li>Inside any folder, click the <span className="font-bold">Notes</span> button to toggle the student progress panel.</li>
                <li>Ideal for keeping track of individual learning goals or grading feedback.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#9A9A96] mb-6 flex items-center gap-2">
            <LockIcon size={14} /> Presentation Mode (Workspace Lock)
          </h2>
          <div className="bg-white p-6 border border-[#E5E5E1] w-full">
            <div className="mb-6 p-4 bg-[#F9F9F7] border border-[#E5E5E1] rounded-lg">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9A9A96] mb-3">
                Current Activation Key
              </label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-text-primary bg-[#E5E5E1] px-2 py-1 rounded">Alt +</span>
                  <select 
                    value={lockKey}
                    onChange={(e) => {
                      const newKey = e.target.value;
                      setLockKey(newKey);
                      localStorage.setItem('lumina_lock_key', newKey);
                    }}
                    className="bg-white border border-[#E5E5E1] px-3 py-1.5 text-sm font-bold rounded outline-none focus:border-accent-primary transition-all"
                  >
                    <option value="s">S (Standard)</option>
                    <option value="l">L (Lock)</option>
                    <option value="x">X (X-Ray)</option>
                    <option value="z">Z</option>
                  </select>
                </div>
                <p className="text-[11px] text-[#6A6A64]">
                  We use the Alt/Option modifier to prevent accidental triggers while lecturing or screensharing.
                </p>
              </div>
            </div>

            <p className="text-sm text-[#6A6A64] leading-relaxed mb-6">
              Pressing <kbd className="px-2 py-1 bg-[#F5F5F3] border border-[#E5E5E1] rounded text-xs font-mono font-bold text-text-primary mx-1">Alt + {lockKey.toUpperCase()}</kbd> enters <strong>Presentation Mode</strong>, locking all sidebars to prevent accidental interruptions while you are teaching.
            </p>

            <div className="space-y-3">
              <label className={cn(
                "flex items-center gap-4 p-4 border transition-all cursor-pointer rounded-lg",
                lockMode === 'hold' ? "border-accent-primary bg-accent-primary/5" : "border-[#E5E5E1] hover:bg-[#F9F9F7]"
              )}>
                <input 
                  type="radio" 
                  name="lockMode" 
                  checked={lockMode === 'hold'} 
                  onChange={() => {
                    setLockMode('hold');
                    localStorage.setItem('lumina_lock_mode', 'hold');
                  }}
                  className="w-4 h-4 accent-accent-primary"
                />
                <div>
                  <span className="block text-sm font-bold text-text-primary mb-1">Hold to Lock</span>
                  <span className="block text-[11px] text-[#6A6A64]">Lock sidebars only while holding Alt + {lockKey.toUpperCase()}. Ideal for brief focus moments.</span>
                </div>
              </label>

              <label className={cn(
                "flex items-center gap-4 p-4 border transition-all cursor-pointer rounded-lg",
                lockMode === 'toggle' ? "border-accent-primary bg-accent-primary/5" : "border-[#E5E5E1] hover:bg-[#F9F9F7]"
              )}>
                <input 
                  type="radio" 
                  name="lockMode" 
                  checked={lockMode === 'toggle'} 
                  onChange={() => {
                    setLockMode('toggle');
                    localStorage.setItem('lumina_lock_mode', 'toggle');
                  }}
                  className="w-4 h-4 accent-accent-primary"
                />
                <div>
                  <span className="block text-sm font-bold text-text-primary mb-1">Toggle to Lock</span>
                  <span className="block text-[11px] text-[#6A6A64]">Press Alt once to lock, and again to unlock. Best for long-form lectures or live demos.</span>
                </div>
              </label>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#9A9A96] mb-8 flex items-center gap-2">
              <HardDriveIcon size={14} /> Storage Diagnosis
            </h2>
            <div className="bg-white border border-[#E5E5E1] p-8 space-y-6 shadow-sm">
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-[#6A6A64]">Browser Storage Used</span>
                  <span className="font-bold">{quotaInfo ? formatSize(quotaInfo.used) : 'Calculating...'}</span>
                </div>
                <div className="w-full h-1.5 bg-[#F0F0EE] rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all duration-1000", usedPercentage > 80 ? "bg-red-500" : "bg-accent-primary")}
                    style={{ width: `${Math.max(2, usedPercentage)}%` }} 
                  />
                </div>
                <p className="text-[10px] text-[#9A9A96] mt-2 italic">
                  Total available: {quotaInfo ? formatSize(quotaInfo.total) : '...'}
                </p>
              </div>

              <div className="flex items-center gap-3 p-4 bg-[#F9F9F7] border border-[#E5E5E1]">
                {isSaving ? (
                  <RefreshCwIcon size={16} className="text-accent-primary animate-spin" />
                ) : (
                  <SaveIcon size={16} className="text-green-600" />
                )}
                <div>
                  <p className="text-xs font-bold">{isSaving ? 'Syncing to disk...' : 'All data synchronized'}</p>
                  <p className="text-[10px] text-[#9A9A96]">Your files are safely stored in your browser.</p>
                </div>
              </div>

              {storageError && (
                <div className="p-4 bg-red-50 border border-red-100 flex items-start gap-3">
                  <ShieldAlertIcon size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-red-700">Storage Warning</p>
                    <p className="text-[10px] text-red-600 leading-relaxed">{storageError}</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#9A9A96] mb-8 flex items-center gap-2">
              <ShieldAlertIcon size={14} /> Privacy & Persistence
            </h2>
            <div className="bg-white border border-[#E5E5E1] p-8 shadow-sm">
              <p className="text-xs text-[#6A6A64] leading-relaxed mb-6">
                If your data is being removed after closing the tab, you might be in <span className="font-bold text-text-primary">Incognito Mode</span> or have <span className="font-bold text-text-primary">"Clear site data on exit"</span> enabled in your browser settings.
              </p>
              
              <button 
                onClick={verifyStorage}
                disabled={testResult === 'pending'}
                className="w-full py-3 border border-text-primary text-[10px] font-bold uppercase tracking-widest hover:bg-text-primary hover:text-white transition-all disabled:opacity-50"
              >
                {testResult === 'pending' ? 'Verifying...' : 'Run Persistence Test'}
              </button>

              {testResult === 'success' && (
                <div className="mt-4 p-4 bg-green-50 border border-green-100 flex items-start gap-3">
                  <CheckIcon size={16} className="text-green-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-green-700 font-medium leading-relaxed">
                    Test Passed. Your browser is correctly retaining data. If you still lose files, make sure you aren't using "Incognito Mode".
                  </p>
                </div>
              )}

              {testResult === 'incognito' && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-100 flex items-start gap-3">
                  <ShieldAlertIcon size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                    <strong className="block mb-1 uppercase tracking-wider">Incognito Mode Detected</strong>
                    Your browser is in Private/Incognito mode. While Lumina works, all files will be <strong>permanently deleted</strong> as soon as you close this tab. Please use a regular window for teaching.
                  </p>
                </div>
              )}

              {testResult === 'failed' && (
                <div className="mt-4 p-4 bg-red-50 border border-red-100 flex items-start gap-3">
                  <ShieldAlertIcon size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-red-700 font-medium leading-relaxed">
                    Test Failed. Your browser is blocking storage or clearing it. Check your "Privacy & Security" settings.
                  </p>
                </div>
              )}

              <div className="mt-8 flex items-start gap-3 text-[#9A9A96] p-4 bg-[#F9F9F7] border border-[#E5E5E1]">
                <InfoIcon size={14} className="shrink-0 mt-0.5" />
                <p className="text-[10px] leading-relaxed">
                  Lumina runs entirely locally. We use <strong>IndexedDB</strong> to store your files in your browser. No data is sent to the cloud.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
