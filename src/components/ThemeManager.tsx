import { useTheme } from '../ThemeContext';
import { THEMES } from '../constants';
import { ThemeType } from '../types';
import { CheckIcon, HardDriveIcon, ShieldAlertIcon, InfoIcon, RefreshCwIcon, SaveIcon, PaletteIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState } from 'react';

export default function ThemeManager() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-12 flex-1 max-w-6xl mx-auto w-full pb-32">
      <header className="mb-16">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-50 mb-4">Workspace Control Center</p>
        <h1 className="text-5xl font-serif tracking-tight">Theme Studio.</h1>
      </header>

      <section className="mb-20">
        <h2 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-8 flex items-center gap-2">
          <PaletteIcon size={14} /> Academic Collections
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(Object.keys(THEMES) as ThemeType[]).map((themeKey) => {
            const t = THEMES[themeKey];
            const isActive = theme === themeKey;
            
            return (
              <button
                key={themeKey}
                onClick={() => setTheme(themeKey)}
                className={cn(
                  "group relative overflow-hidden transition-all border p-1 rounded-2xl",
                  isActive 
                    ? "border-accent-primary ring-4 ring-accent-primary/10 shadow-2xl" 
                    : "border-[#E5E5E1] hover:border-accent-primary/50 hover:shadow-lg"
                )}
                style={{ backgroundColor: t.colors.bg }}
              >
                {/* Mock UI Preview */}
                <div className="aspect-[16/10] w-full rounded-t-xl overflow-hidden flex border-b border-black/5">
                  <div className="w-12 h-full border-r border-black/5" style={{ backgroundColor: t.colors.sidebar }} />
                  <div className="flex-1 p-4 space-y-3">
                    <div className="h-2 w-1/2 rounded-full opacity-20" style={{ backgroundColor: t.colors.text }} />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-12 rounded-lg opacity-10" style={{ backgroundColor: t.colors.text }} />
                      <div className="h-12 rounded-lg opacity-10" style={{ backgroundColor: t.colors.text }} />
                    </div>
                    <div className="h-2 w-full rounded-full opacity-10" style={{ backgroundColor: t.colors.text }} />
                  </div>
                </div>

                <div className="p-6 flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-serif text-lg leading-none" style={{ color: t.colors.text }}>{t.name}</h3>
                    <div className="flex gap-1 items-center mt-2">
                       <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.colors.accent }} />
                       <div className="w-3 h-3 rounded-full opacity-50" style={{ backgroundColor: t.colors.text }} />
                       <div className="w-3 h-3 rounded-full opacity-30" style={{ backgroundColor: t.colors.text }} />
                    </div>
                  </div>
                  {isActive && (
                    <div className="bg-accent-primary text-white p-1.5 rounded-full shadow-lg">
                      <CheckIcon size={14} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}


