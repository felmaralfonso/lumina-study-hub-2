import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getDescendantFolderIds(folders: { id: string; parentId: string | null }[], rootId: string | null): Set<string | null> {
  const ids = new Set<string | null>([rootId]);
  
  const findChildren = (parentId: string | null) => {
    for (const folder of folders) {
      if (folder.parentId === parentId) {
        if (!ids.has(folder.id)) {
          ids.add(folder.id);
          findChildren(folder.id);
        }
      }
    }
  };
  
  findChildren(rootId);
  return ids;
}
