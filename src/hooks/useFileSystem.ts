import { useEffect, useState, useRef } from 'react';
import { FileSystemState, Folder, HubFile } from '../types';
import { INITIAL_FOLDERS } from '../constants';
import localforage from 'localforage';

const STORAGE_KEY = 'lumina_fs_v1';

export function useFileSystem() {
  const [state, setState] = useState<FileSystemState>({ files: [], folders: INITIAL_FOLDERS });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<{ used: number; total: number } | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const isResetting = useRef(false);

  useEffect(() => {
    localforage.getItem<FileSystemState>(STORAGE_KEY).then((saved) => {
      if (saved && saved.folders) {
        setState(saved);
      } else {
        const old = localStorage.getItem(STORAGE_KEY);
        if (old) {
          try {
            const parsed = JSON.parse(old);
            setState(parsed);
          } catch(e) {}
        }
      }
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isLoaded && !isResetting.current) {
      setIsSaving(true);
      setStorageError(null);
      localforage.setItem(STORAGE_KEY, state)
        .then(() => {
          setTimeout(() => setIsSaving(false), 800);
          if (navigator.storage && navigator.storage.estimate) {
            navigator.storage.estimate().then(estimate => {
              setQuotaInfo({ 
                used: estimate.usage || 0, 
                total: estimate.quota || 0 
              });
            });
          }
        })
        .catch(e => {
          console.error("Storage error:", e);
          setStorageError("Memory limit reached. Try deleting unused files.");
          setIsSaving(false);
        });
    }
  }, [state, isLoaded]);

  const addFolder = (name: string, parentId: string | null, customId?: string) => {
    const id = customId || crypto.randomUUID();
    const newFolder: Folder = {
      id,
      name,
      parentId,
      createdAt: Date.now(),
    };
    setState(prev => ({ ...prev, folders: [...prev.folders, newFolder] }));
    return id;
  };

  const addFile = (file: Omit<HubFile, 'id' | 'createdAt' | 'annotations'> & { size?: number }) => {
    const newFile: HubFile & { size?: number } = {
      ...file,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      annotations: [],
    };
    setState(prev => ({ ...prev, files: [...prev.files, newFile] }));
  };

  const deleteFile = (id: string) => {
    setState(prev => ({
      ...prev,
      files: prev.files.filter(f => f.id !== id)
    }));
  };

  const deleteFolder = (id: string) => {
    const folderIdsToDelete = new Set([id]);
    const findChildren = (pid: string) => {
      state.folders.forEach(f => {
        if (f.parentId === pid) {
          folderIdsToDelete.add(f.id);
          findChildren(f.id);
        }
      });
    };
    findChildren(id);

    setState(prev => ({
      folders: prev.folders.filter(f => !folderIdsToDelete.has(f.id)),
      files: prev.files.filter(f => !f.parentId || !folderIdsToDelete.has(f.parentId))
    }));
  };

  const updateFile = (fileId: string, updates: Partial<Pick<HubFile, 'annotations' | 'content'>>) => {
    setState(prev => ({
      ...prev,
      files: prev.files.map(f => f.id === fileId ? { ...f, ...updates } : f)
    }));
  };

  const updateFolder = (folderId: string, updates: Partial<Pick<Folder, 'name' | 'notes'>>) => {
    setState(prev => ({
      ...prev,
      folders: prev.folders.map(f => f.id === folderId ? { ...f, ...updates } : f)
    }));
  };

  const resetFileSystem = async () => {
    try {
      console.log("Starting system wipe...");
      isResetting.current = true;
      
      // 1. Clear State
      setState({ files: [], folders: [] });
      
      // 2. Clear localStorage (Sync & Fast)
      console.log("Clearing localStorage...");
      localStorage.clear();
      
      // 3. Clear localforage (Async)
      console.log("Clearing localforage...");
      try {
        await localforage.clear();
      } catch (lfErr) {
        console.error("Localforage clear failed, but continuing:", lfErr);
      }
      
      console.log("Wipe complete. Performing hard reload...");
      // Use query param to bust any potential aggressive caching on GH Pages
      const url = new URL(window.location.href);
      url.searchParams.set('w', Date.now().toString());
      window.location.href = url.toString();
    } catch (error) {
      console.error("Critical error during system wipe:", error);
      localStorage.clear();
      window.location.reload();
    }
  };

  return {
    state,
    isSaving,
    quotaInfo,
    storageError,
    addFolder,
    addFile,
    deleteFile,
    deleteFolder,
    updateFile,
    updateFolder,
    resetFileSystem
  };
}
