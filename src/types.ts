import 'react';

declare module 'react' {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

export type FileType = 'pdf' | 'audio' | 'doc' | 'image';

export interface Annotation {
  id: string;
  type: 'pen' | 'rect' | 'circle' | 'text';
  points?: number[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color: string;
  strokeWidth: number;
  content?: string;
  fontSize?: number;
  fontFamily?: string;
}


export interface HubFile {
  id: string;
  name: string;
  type: FileType;
  parentId: string | null;
  content: string; // Base64 or text
  mimeType: string;
  createdAt: number;
  size?: number;
  annotations?: Annotation[];
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  notes?: string;
}

export interface FileSystemState {
  files: HubFile[];
  folders: Folder[];
}

export type ThemeType = 'light' | 'sepia' | 'midnight' | 'forest' | 'slate' | 'solar' | 'espresso' | 'velum';

export interface Game {
  id: string;
  title: string;
  type: 'quiz' | 'flashcards';
  data: any;
  createdAt: number;
}
