import { useEffect, useState } from 'react';
import { FileSystemState, Folder, HubFile } from '../types';
import { INITIAL_FOLDERS } from '../constants';
import localforage from 'localforage';

const STORAGE_KEY = 'lumina_fs_v1';

export function useFileSystem() {
  const [state, setState] = useState<FileSystemState>({ files: [], folders: INITIAL_FOLDERS });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    localforage.getItem<FileSystemState>(STORAGE_KEY).then((saved) => {
      if (saved && saved.folders) {
        setState(saved);
      } else {
        // Fallback for old localStorage data
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
    if (isLoaded) {
      localforage.setItem(STORAGE_KEY, state).catch(e => {
        console.error("Storage limit hit or error:", e);
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
    // Delete folder and all its contents recursively
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

  const resetFileSystem = () => {
    setState({ files: [], folders: INITIAL_FOLDERS });
    localforage.clear();
    localStorage.clear();
    window.location.reload();
  };

  return {
    state,
    addFolder,
    addFile,
    deleteFile,
    deleteFolder,
    updateFile,
    updateFolder,
    resetFileSystem
  };
}
