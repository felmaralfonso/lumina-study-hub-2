import { FolderIcon, FileIcon, FileAudioIcon, FileTextIcon, ImageIcon, MoreVerticalIcon, Trash2Icon, ChevronRightIcon, PlusIcon, UploadIcon, PencilIcon } from 'lucide-react';
import { useState } from 'react';
import { HubFile, Folder, FileSystemState } from '../types';
import { cn, formatBytes } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface FileExplorerProps {
  onFileSelect: (file: HubFile) => void;
  state: FileSystemState;
  addFolder: (name: string, parentId: string | null) => string;
  addFile: (file: Omit<HubFile, 'id' | 'createdAt' | 'annotations'>) => void;
  deleteFile: (id: string) => void;
  deleteFolder: (id: string) => void;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  resetFileSystem: () => void;
}

export default function FileExplorer({ 
  onFileSelect,
  state,
  addFolder,
  addFile,
  deleteFile,
  deleteFolder,
  updateFolder,
  resetFileSystem
}: FileExplorerProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  const currentFolder = state.folders.find(f => f.id === currentFolderId);
  const currentFolders = state.folders.filter(f => (f.parentId || null) === (currentFolderId || null));
  const currentFiles = state.files.filter(f => (f.parentId || null) === (currentFolderId || null));

  const isAtRoot = currentFolderId === null;

  const getBreadcrumbs = () => {
    const crumbs = [];
    let curr = state.folders.find(f => f.id === currentFolderId);
    while (curr) {
      crumbs.unshift(curr);
      curr = state.folders.find(f => f.id === curr?.parentId);
    }
    return crumbs;
  };

  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (file: File, parentId: string | null = currentFolderId) => {
    const allowedExtensions = ['.pdf', '.mp3', '.wav', '.m4a', '.ogg', '.aac', '.flac', '.mp4', '.txt', '.docx', '.png', '.jpg', '.jpeg', '.pptx'];
    const isAllowed = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext)) || 
                      file.type.includes('pdf') || 
                      file.type.includes('audio') || 
                      file.type.includes('video') ||
                      file.type.includes('image');

    if (!isAllowed) return;

    if (file.name.endsWith('.docx')) {
      const arrayBuffer = await file.arrayBuffer();
      const mammoth = await import('mammoth');
      const result = await mammoth.convertToHtml({ arrayBuffer });
      
      addFile({
        name: file.name,
        type: 'doc',
        content: btoa(unescape(encodeURIComponent(result.value))),
        mimeType: 'text/html',
        parentId: parentId,
        size: file.size
      });
      window.dispatchEvent(new CustomEvent('lumina-file-added'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      let type: 'pdf' | 'audio' | 'doc' | 'image' = 'doc';
      let mimeType = file.type;

      if (file.type.includes('pdf')) {
        type = 'pdf';
      } else if (file.type.includes('audio') || file.type.includes('video') || file.name.toLowerCase().endsWith('.mp4')) {
        type = 'audio';
        // Help the browser's audio player by using a compatible MIME type
        if (file.type.includes('video/mp4') || file.name.toLowerCase().endsWith('.mp4')) {
          mimeType = 'audio/mp4';
        }
      } else if (file.type.includes('image')) {
        type = 'image';
      }
      
      addFile({
        name: file.name,
        type: type as any,
        content: base64,
        mimeType: mimeType,
        parentId: parentId,
        size: file.size
      });
    };
    reader.readAsDataURL(file);
  };

  const traverseEntry = async (entry: any, parentId: string | null) => {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve) => entry.file(resolve));
      await processFile(file, parentId);
    } else if (entry.isDirectory) {
      const newFolderId = addFolder(entry.name, parentId);
      const reader = entry.createReader();
      const entries = await new Promise<any[]>((resolve) => {
        const allEntries: any[] = [];
        const read = () => {
          reader.readEntries((results: any[]) => {
            if (results.length) {
              allEntries.push(...results);
              read();
            } else {
              resolve(allEntries);
            }
          });
        };
        read();
      });
      for (const childEntry of entries) {
        await traverseEntry(childEntry, newFolderId);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      await processFile(file);
    }
    window.dispatchEvent(new CustomEvent('lumina-file-added'));
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const folderCache: Record<string, string> = {};

    for (const file of files) {
      const parts = (file as any).webkitRelativePath.split('/');
      let lastParentId = currentFolderId;

      for (let i = 0; i < parts.length - 1; i++) {
        const path = parts.slice(0, i + 1).join('/');
        if (!folderCache[path]) {
          folderCache[path] = addFolder(parts[i], lastParentId);
        }
        lastParentId = folderCache[path];
      }

      await processFile(file, lastParentId);
    }
    window.dispatchEvent(new CustomEvent('lumina-file-added'));
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const items = Array.from(e.dataTransfer.items);
    for (const item of items) {
      const entry = (item as any).webkitGetAsEntry?.();
      if (entry) {
        await traverseEntry(entry, currentFolderId);
      } else {
        const file = item.getAsFile();
        if (file) await processFile(file);
      }
    }
  };

  const handleCreateDoc = () => {
    const name = prompt('Document Name:', 'New Document');
    if (name) {
      addFile({
        name: name + '.doc',
        type: 'doc',
        content: btoa(unescape(encodeURIComponent(''))),
        mimeType: 'text/html',
        parentId: currentFolderId,
      });
      window.dispatchEvent(new CustomEvent('lumina-file-added'));
    }
  };

  const handleCreateFolder = () => {
    const trimmedName = newFolderName.trim();
    if (!trimmedName) return;

    // Check for duplicates in the current directory
    const isDuplicate = currentFolders.some(f => f.name.toLowerCase() === trimmedName.toLowerCase());
    if (isDuplicate) {
      alert('A folder with this name already exists in this location.');
      return;
    }

    addFolder(trimmedName, currentFolderId);
    setNewFolderName('');
    setIsCreatingFolder(false);
    window.dispatchEvent(new CustomEvent('lumina-folder-added'));
  };

  const handleRenameFolder = (folderId: string) => {
    const trimmedName = editFolderName.trim();
    if (!trimmedName) return;

    // Check for duplicates (excluding the current folder)
    const isDuplicate = currentFolders.some(f => 
      f.id !== folderId && f.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      alert('A folder with this name already exists in this location.');
      return;
    }

    updateFolder(folderId, { name: trimmedName });
    setEditingFolderId(null);
    setEditFolderName('');
  };

  const handleCreateAssignmentFolder = () => {
    addFolder('Assignments', currentFolderId);
  };

  return (
    <div 
      id="tour-file-explorer"
      className="p-12 flex-1 overflow-auto max-w-7xl mx-auto w-full relative flex flex-col"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-accent-primary/5 border-2 border-dashed border-accent-primary/20 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
          <div className="bg-[var(--bg-primary)] px-8 py-4 shadow-2xl border border-black/10 flex items-center gap-4 animate-in fade-in zoom-in duration-200">
            <UploadIcon className="text-accent-primary animate-bounce" size={24} />
            <p className="text-sm font-bold uppercase tracking-widest">Drop to ingest into workspace</p>
          </div>
        </div>
      )}
      <header className="flex items-center justify-between mb-12 border-b border-black/5 pb-6">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A9A96]">
          <button 
            onClick={() => setCurrentFolderId(null)}
            className="hover:text-text-primary transition-colors"
          >
            Library
          </button>
          {getBreadcrumbs().map((crumb) => (
            <div key={crumb.id} className="flex items-center gap-2">
              <span className="opacity-30">/</span>
              <button 
                onClick={() => {
                  setCurrentFolderId(crumb.id);
                  window.dispatchEvent(new CustomEvent('lumina-folder-entered'));
                }}
                className="hover:text-text-primary transition-colors"
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {!isAtRoot && (
            <button 
              id="tour-folder-notes"
              onClick={() => {
                setShowNotes(!showNotes);
                if (!showNotes) window.dispatchEvent(new CustomEvent('lumina-notes-opened'));
              }}
              className={cn(
                "flex items-center gap-2 px-5 py-2 text-[10px] font-bold uppercase tracking-widest border transition-colors rounded",
                showNotes ? "bg-accent-primary text-white border-accent-primary" : "border-[#E5E5E1] hover:bg-white"
              )}
            >
              {showNotes ? 'Close Notes' : 'Open Notes'}
            </button>
          )}


          <button 
            onClick={handleCreateDoc}
            className="flex items-center gap-2 px-5 py-2 text-[10px] font-bold uppercase tracking-widest border border-black/10 hover:bg-black/5 rounded transition-colors"
          >
            <FileTextIcon size={14} />
            Create Doc
          </button>
          
          <button 
            id="tour-new-folder"
            onClick={() => setIsCreatingFolder(true)}
            className="flex items-center gap-2 px-5 py-2 text-[10px] font-bold uppercase tracking-widest border border-black/10 hover:bg-black/5 rounded transition-colors"
          >
            <PlusIcon size={14} />
            {isAtRoot ? 'Add Student' : 'New Folder'}
          </button>
          
          <label className="flex items-center gap-2 px-5 py-2 text-[10px] font-bold uppercase tracking-widest border border-black/10 hover:bg-black/5 rounded transition-colors cursor-pointer">
            <FolderIcon size={14} />
            Ingest Folder
            <input 
              type="file" 
              webkitdirectory="" 
              directory="" 
              className="hidden" 
              onChange={handleFolderUpload}
            />
          </label>

          <label id="tour-upload-files" className="flex items-center gap-2 px-5 py-2 text-[10px] font-bold uppercase tracking-widest bg-accent-primary text-white rounded shadow-lg hover:shadow-accent-primary/20 transition-all cursor-pointer">
            <UploadIcon size={14} />
            Ingest File
            <input type="file" multiple className="hidden" onChange={handleFileUpload} accept=".pdf,.mp3,.wav,.m4a,.ogg,.aac,.flac,.mp4,.txt,.docx,.png,.jpg,.jpeg,.pptx" />
          </label>
        </div>
      </header>

      <div className="flex gap-8 flex-1">
        <div className="flex-1">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-8 items-start">
        <AnimatePresence mode="popLayout">
          {isCreatingFolder && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-accent-primary p-8 rounded-2xl flex flex-col gap-4 bg-black/5 aspect-[3/4] justify-center"
            >
              <input 
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Name..."
                className="bg-transparent border-b border-text-primary/20 outline-none text-xs font-bold uppercase tracking-widest p-1"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
              <div className="flex gap-2">
                <button 
                  onClick={handleCreateFolder}
                  className="flex-1 text-[10px] font-bold uppercase tracking-widest bg-text-primary text-white py-2 rounded"
                >
                  Create
                </button>
                <button 
                  onClick={() => setIsCreatingFolder(false)}
                  className="flex-1 text-[10px] font-bold uppercase tracking-widest bg-[#F0F0EE] py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {currentFolders.map((folder) => (
            <motion.div
              layout
              key={folder.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="group relative border border-black/10 p-8 transition-all cursor-pointer hover:shadow-xl hover:-translate-y-1 aspect-[3/4] flex flex-col justify-between rounded-2xl bg-black/5"
              onClick={() => {
                setCurrentFolderId(folder.id);
                window.dispatchEvent(new CustomEvent('lumina-folder-entered'));
              }}
            >
              <div>
                <div className="text-[#BCBCB9] mb-4 group-hover:text-accent-primary transition-colors">
                  <FolderIcon size={32} strokeWidth={1.5} />
                </div>
                {editingFolderId === folder.id ? (
                  <input
                    autoFocus
                    value={editFolderName}
                    onChange={(e) => setEditFolderName(e.target.value)}
                    onBlur={() => handleRenameFolder(folder.id)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRenameFolder(folder.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="font-serif text-lg leading-tight w-full bg-transparent border-b border-accent-primary outline-none"
                  />
                ) : (
                  <h3 className="font-serif text-lg leading-tight">{folder.name}</h3>
                )}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#BCBCB9] mt-2">Folder</p>
              
              <div className="absolute top-4 right-4 flex gap-1">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingFolderId(folder.id);
                    setEditFolderName(folder.name);
                  }}
                  className="p-2 opacity-0 group-hover:opacity-40 hover:opacity-100 hover:text-accent-primary transition-all"
                  title="Rename"
                >
                  <PencilIcon size={14} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFolder(folder.id);
                  }}
                  className="p-2 opacity-0 group-hover:opacity-40 hover:opacity-100 hover:text-accent-primary transition-all"
                  title="Delete"
                >
                  <Trash2Icon size={14} />
                </button>
              </div>
            </motion.div>
          ))}

          {currentFiles.map((file) => (
            <motion.div
              layout
              key={file.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="group relative border border-black/10 p-8 transition-all cursor-pointer hover:shadow-xl hover:-translate-y-1 aspect-[3/4] flex flex-col justify-between rounded-2xl bg-black/5"
              onClick={() => onFileSelect(file)}
            >
              <div>
                <div className={cn(
                  "mb-6 transition-colors",
                  file.type === 'pdf' ? "text-accent-primary" : 
                  file.type === 'audio' ? "text-[#2563EB]" :
                  file.type === 'image' ? "text-[#E11D48]" :
                  "text-[#16A34A]"
                )}>
                  {file.type === 'pdf' && <FileIcon size={32} strokeWidth={1.5} />}
                  {file.type === 'audio' && <FileAudioIcon size={32} strokeWidth={1.5} />}
                  {file.type === 'image' && <ImageIcon size={32} strokeWidth={1.5} />}
                  {file.type === 'doc' && <FileTextIcon size={32} strokeWidth={1.5} />}
                </div>
                <h3 className="font-serif text-lg leading-tight truncate pr-4">{file.name}</h3>
              </div>
              <div className="flex flex-col gap-1 mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-primary">{file.type}</span>
                  <span className="w-1 h-1 rounded-full bg-[#BCBCB9]" />
                  <span className="text-[10px] font-mono text-[#9A9A96]">{new Date(file.createdAt).toLocaleDateString()}</span>
                </div>
                {(file as any).size && (
                  <p className="text-[9px] font-mono text-[#BCBCB9]">
                    {Math.round((file as any).size / 1024)} KB • ARCHIVED
                  </p>
                )}
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFile(file.id);
                }}
                className="absolute top-4 right-4 p-2 opacity-0 group-hover:opacity-40 hover:opacity-100 hover:text-accent-primary transition-all"
              >
                <Trash2Icon size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        </div>
        </div>

        {/* Folder Notes Sidebar */}
        <AnimatePresence>
          {showNotes && currentFolder && (
            <motion.div 
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="w-80 bg-white border border-[#E5E5E1] rounded-2xl p-6 flex flex-col shadow-xl sticky top-0 h-fit"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A96]">Notes for {currentFolder.name}</h3>
              </div>
              <textarea 
                className="w-full min-h-[300px] bg-[#F9F9F7] p-4 rounded-xl resize-none text-sm font-serif italic outline-none border border-transparent focus:border-accent-primary/20 transition-all placeholder:text-[#BCBCB9]/50"
                placeholder="Aa"
                value={currentFolder.notes || ''}
                onChange={(e) => updateFolder(currentFolder.id, { notes: e.target.value })}
              />
              <p className="mt-4 text-[9px] font-mono text-[#BCBCB9] leading-relaxed uppercase tracking-tighter">
                These notes are persistent and tied to this specific student folder.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {currentFolders.length === 0 && currentFiles.length === 0 && !isCreatingFolder && (
        <div className="flex flex-col items-center justify-center py-24 opacity-20">
          <FolderIcon size={64} strokeWidth={1} />
          <p className="mt-4 font-medium italic">This folder is as empty as a Sunday morning.</p>
        </div>
      )}
    </div>
  );
}
