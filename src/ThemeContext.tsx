import { createContext, useContext, useEffect, useState } from 'react';
import { ThemeType } from './types';
import { THEMES } from './constants';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  colors: typeof THEMES.light.colors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeType>(() => {
    return (localStorage.getItem('lumina_theme') as ThemeType) || 'light';
  });

  useEffect(() => {
    localStorage.setItem('lumina_theme', theme);
    const colors = THEMES[theme].colors;
    document.documentElement.style.setProperty('--bg-primary', colors.bg);
    document.documentElement.style.setProperty('--text-primary', colors.text);
    document.documentElement.style.setProperty('--accent-primary', colors.accent);
    document.documentElement.style.setProperty('--sidebar-bg', colors.sidebar);
  }, [theme]);

  const colors = THEMES[theme].colors;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colors }}>
      <div 
        style={{ 
          backgroundColor: colors.bg, 
          color: colors.text,
          minHeight: '100vh',
          transition: 'background-color 0.3s ease, color 0.3s ease'
        }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
