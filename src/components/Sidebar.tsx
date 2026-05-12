import { FolderIcon, GamepadIcon, LayoutDashboardIcon, PaletteIcon, Trash2Icon } from 'lucide-react';
import { cn } from '../lib/utils';

export type TabType = 'library' | 'games' | 'themes' | 'settings';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: 'library', label: 'My Documents', icon: FolderIcon },
    { id: 'games', label: 'Games', icon: GamepadIcon },
    { id: 'themes', label: 'Themes', icon: PaletteIcon },
    { id: 'settings', label: 'Settings & Help', icon: LayoutDashboardIcon },
  ];

  const handleWipeAll = () => {
    const confirmation = prompt('Type "DELETE" to confirm wiping ALL data (files, folders, and notes). This cannot be undone.');
    if (confirmation === 'DELETE') {
      const STORAGE_KEY = 'lumina_fs_v1';
      localStorage.clear();
      import('localforage').then(lf => lf.clear()).then(() => {
        window.location.reload();
      });
    }
  };

  return (
    <div className="w-64 bg-sidebar-bg border-r border-[#E5E5E1] flex flex-col h-screen">
      <div className="p-8">
        <h1 className="text-3xl font-serif italic tracking-tight mb-10 text-text-primary">Lumina.</h1>

        <nav className="flex-1 space-y-8">
          <section>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A9A96] mb-4">Workspace</p>
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <li key={item.id}>
                    <button
                      id={`tour-nav-${item.id}`}
                      onClick={() => setActiveTab(item.id as TabType)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-all duration-200",
                        isActive
                          ? "bg-[#F0F0EE] text-text-primary font-bold shadow-sm"
                          : "text-[#6A6A64] hover:bg-[#F9F9F7] font-medium"
                      )}
                    >
                      <Icon size={16} className={cn(isActive ? "text-accent-primary" : "opacity-40")} />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-[#E5E5E1] flex flex-col gap-6">
        <button
          id="tour-wipe-data"
          onClick={handleWipeAll}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-100 w-full"
        >
          <Trash2Icon size={14} />
          Wipe System Data
        </button>
        <div className="flex gap-2 items-center">
          <div className="w-3 h-3 rounded-full bg-[#1A1A1A]"></div>
          <div className="w-3 h-3 rounded-full bg-[#D4D4D1] border border-[#BCBCB9]"></div>
          <div className="w-3 h-3 rounded-full bg-[#E8E8E6] border border-[#BCBCB9]"></div>
          <span className="text-[10px] font-bold uppercase ml-2 text-[#9A9A96] tracking-widest">System Themes</span>
        </div>
      </div>
    </div>
  );
}
