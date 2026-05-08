import { useTheme } from '../ThemeContext';
import { THEMES } from '../constants';
import { ThemeType } from '../types';
import { CheckIcon } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ThemeManager() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-12 flex-1 max-w-5xl mx-auto w-full bg-[#F9F9F7]">
      <header className="mb-16">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9A9A96] mb-4">Workspace Customization</p>
        <h1 className="text-5xl font-serif tracking-tight">Theme Studio.</h1>
        <p className="text-[#6A6A64] text-lg mt-4 italic font-serif">Tailor your digital environment for focus and clarity.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {(Object.keys(THEMES) as ThemeType[]).map((themeKey) => {
          const t = THEMES[themeKey];
          const isActive = theme === themeKey;
          
          return (
            <button
              key={themeKey}
              onClick={() => setTheme(themeKey)}
              className={cn(
                "group relative overflow-hidden transition-all p-10 text-left border bg-white",
                isActive ? "border-text-primary shadow-[0_8px_30px_rgba(0,0,0,0.08)]" : "border-[#E5E5E1] hover:border-[#BCBCB9]"
              )}
            >
              <div className="flex justify-between items-start mb-16">
                <div>
                  <h3 className="font-serif text-2xl" style={{ color: t.colors.text }}>{t.name}</h3>
                  <div className="mt-4 flex gap-1.5">
                    <div className="w-5 h-5 rounded-full border border-black/10" style={{ backgroundColor: t.colors.accent }} />
                    <div className="w-5 h-5 rounded-full border border-black/10" style={{ backgroundColor: t.colors.sidebar }} />
                  </div>
                </div>
                {isActive && (
                  <div className="bg-text-primary text-white p-1 rounded-full">
                    <CheckIcon size={16} />
                  </div>
                )}
              </div>

              <div className="space-y-3 opacity-20 group-hover:opacity-40 transition-opacity">
                <div className="h-1 w-2/3" style={{ backgroundColor: t.colors.text }} />
                <div className="h-1 w-full" style={{ backgroundColor: t.colors.text }} />
                <div className="h-1 w-1/2" style={{ backgroundColor: t.colors.text }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
