import { ThemeType, Folder } from './types';

export const THEMES: Record<ThemeType, { name: string; colors: { bg: string; text: string; accent: string; sidebar: string } }> = {
  light: {
    name: 'Editorial Light',
    colors: {
      bg: '#F9F9F7',
      text: '#050505',
      accent: '#E11D48',
      sidebar: '#FFFFFF',
    }
  },
  sepia: {
    name: 'Manuscript',
    colors: {
      bg: '#F4ECD8',
      text: '#21180D',
      accent: '#964B00',
      sidebar: '#E8DFC4',
    }
  },
  midnight: {
    name: 'Oxford Night',
    colors: {
      bg: '#0A0F1D',
      text: '#F1F5F9',
      accent: '#38BDF8',
      sidebar: '#161E2E',
    }
  },
  forest: {
    name: 'Boreal Scholar',
    colors: {
      bg: '#0D1A14',
      text: '#E3F1E9',
      accent: '#4ADE80',
      sidebar: '#15261E',
    }
  },
  slate: {
    name: 'Bauhaus Gray',
    colors: {
      bg: '#171717',
      text: '#F5F5F5',
      accent: '#FACC15',
      sidebar: '#222222',
    }
  },
  solar: {
    name: 'Solaris Scholar',
    colors: {
      bg: '#FEF9E7',
      text: '#253338',
      accent: '#CB4B16',
      sidebar: '#FDF6E3',
    }
  },
  espresso: {
    name: 'Deep Espresso',
    colors: {
      bg: '#1A1614',
      text: '#F8F3F0',
      accent: '#D4A373',
      sidebar: '#241E1B',
    }
  },
  velum: {
    name: 'Royal Velum',
    colors: {
      bg: '#16141A',
      text: '#F5F3F7',
      accent: '#A78BFA',
      sidebar: '#211E26',
    }
  }
};

export const INITIAL_FOLDERS: Folder[] = [];
