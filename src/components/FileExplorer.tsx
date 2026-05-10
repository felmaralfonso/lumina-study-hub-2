import { FolderIcon, FileIcon, FileAudioIcon, FileTextIcon, ImageIcon, MoreVerticalIcon, Trash2Icon, ChevronRightIcon, PlusIcon, UploadIcon } from 'lucide-react';
import { useState } from 'react';
import { useFileSystem } from '../hooks/useFileSystem';
import { HubFile, Folder } from '../types';
import { cn, formatBytes } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface FileExplorerProps {
  onFileSelect: (file: HubFile) => void;
}

export default function FileExplorer({ onFileSelect }: FileExplorerProps) {
  const { state, addFolder, addFile, deleteFile, deleteFolder, updateFolder, resetFileSystem } = useFileSystem();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
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
    const allowedExtensions = ['.pdf', '.mp3', '.wav', '.txt', '.docx', '.png', '.jpg', '.jpeg', '.pptx'];
    const isAllowed = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext)) || 
                      file.type.includes('pdf') || 
                      file.type.includes('audio') || 
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
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      let type: 'pdf' | 'audio' | 'doc' | 'image' = 'doc';
      if (file.type.includes('pdf')) type = 'pdf';
      else if (file.type.includes('audio')) type = 'audio';
      else if (file.type.includes('image')) type = 'image';
      
      addFile({
        name: file.name,
        type: type as any,
        content: base64,
        mimeType: file.type,
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
    }
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      addFolder(newFolderName, currentFolderId);
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const handleCreateAssignmentFolder = () => {
    addFolder('Assignments', currentFolderId);
  };

  return (
    <div 
      className="p-12 flex-1 overflow-auto max-w-7xl mx-auto w-full bg-[#F9F9F7] relative flex flex-col"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-text-primary/5 border-2 border-dashed border-text-primary/20 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
          <div className="bg-white px-8 py-4 shadow-2xl border border-[#E5E5E1] flex items-center gap-4 animate-in fade-in zoom-in duration-200">
            <UploadIcon className="text-accent-primary animate-bounce" size={24} />
            <p className="text-sm font-bold uppercase tracking-widest">Drop to ingest into workspace</p>
          </div>
        </div>
      )}
      <header className="flex items-center justify-between mb-12 border-b border-[#E5E5E1] pb-6">
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
                onClick={() => setCurrentFolderId(crumb.id)}
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
              onClick={() => setShowNotes(!showNotes)}
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
            className="flex items-center gap-2 px-5 py-2 text-[10px] font-bold uppercase tracking-widest border border-[#E5E5E1] hover:bg-white rounded transition-colors"
          >
            <FileTextIcon size={14} />
            Create Doc
          </button>
          
          <button 
            onClick={() => setIsCreatingFolder(true)}
            className="flex items-center gap-2 px-5 py-2 text-[10px] font-bold uppercase tracking-widest border border-[#E5E5E1] hover:bg-white rounded transition-colors"
          >
            <PlusIcon size={14} />
            {isAtRoot ? 'Add Student' : 'New Folder'}
          </button>
          
          <label className="flex items-center gap-2 px-5 py-2 text-[10px] font-bold uppercase tracking-widest border border-[#E5E5E1] hover:bg-white rounded transition-colors cursor-pointer">
            <FolderIcon size={14} />
            Ingest Folder
            <input 
              type="file" 
              className="hidden" 
              onChange={handleFolderUpload} 
              webkitdirectory="" 
              directory="" 
            />
          </label>

          <label className="flex items-center gap-2 px-5 py-2 text-[10px] font-bold uppercase tracking-widest bg-text-primary text-white hover:opacity-90 rounded transition-opacity cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <UploadIcon size={14} />
            Ingest File
            <input type="file" className="hidden" onChange={handleFileUpload} multiple accept=".pdf,.mp3,.wav,.txt,.docx,.png,.jpg,.jpeg,.pptx" />
          </label>
        </div>
      </header>

      <div className="flex gap-8 flex-1">
        <div className="flex-1">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-8 items-start">
        <AnimatePresence mode="popLayout">
          {isCreatingFolder && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#E5E5E1] p-6 flex flex-col gap-4 shadow-sm aspect-[3/4] justify-center"
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
              className="group relative bg-white border border-[#E5E5E1] p-8 transition-all cursor-pointer hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1 aspect-[3/4] flex flex-col justify-between"
              onClick={() => setCurrentFolderId(folder.id)}
            >
              <div>
                <div className="text-[#BCBCB9] mb-4 group-hover:text-accent-primary transition-colors">
                  <FolderIcon size={32} strokeWidth={1.5} />
                </div>
                <h3 className="font-serif text-lg leading-tight">{folder.name}</h3>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#BCBCB9] mt-2">Folder</p>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFolder(folder.id);
                }}
                className="absolute top-4 right-4 p-2 opacity-0 group-hover:opacity-40 hover:opacity-100 hover:text-accent-primary transition-all"
              >
                <Trash2Icon size={14} />
              </button>
            </motion.div>
          ))}

          {currentFiles.map((file) => (
            <motion.div
              layout
              key={file.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="group relative bg-white border border-[#E5E5E1] p-8 transition-all cursor-pointer hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1 aspect-[3/4] flex flex-col justify-between"
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
