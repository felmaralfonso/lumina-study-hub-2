import { ThemeType } from './types';

export const THEMES: Record<ThemeType, { name: string; colors: { bg: string; text: string; accent: string; sidebar: string } }> = {
  light: {
    name: 'Editorial Light',
    colors: {
      bg: '#F9F9F7',
      text: '#1A1A1A',
      accent: '#E11D48',
      sidebar: '#FFFFFF',
    }
  },
  dark: {
    name: 'Ink Dark',
    colors: {
      bg: '#1A1A1A',
      text: '#F9F9F7',
      accent: '#E11D48',
      sidebar: '#121212',
    }
  },
  sepia: {
    name: 'Manuscript',
    colors: {
      bg: '#F4ECD8',
      text: '#433422',
      accent: '#964B00',
      sidebar: '#E8DFC4',
    }
  },
  nordic: {
    name: 'Research Arctic',
    colors: {
      bg: '#E5E9F0',
      text: '#2E3440',
      accent: '#81A1C1',
      sidebar: '#D8DEE9',
    }
  }
};

export const INITIAL_FOLDERS = [
  { id: 'root-docs', name: 'Documents', parentId: null, createdAt: Date.now() },
  { id: 'root-audio', name: 'Audio Lectures', parentId: null, createdAt: Date.now() },
  { id: 'root-assignments', name: 'Assignments', parentId: null, createdAt: Date.now() },
];
