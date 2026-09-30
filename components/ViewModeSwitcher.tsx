'use client';

import { useClockInStore } from '@/store/clockInStore';

export default function ViewModeSwitcher() {
  const { viewMode, setViewMode } = useClockInStore();

  return (
    <div className="flex items-center gap-2 p-1 rounded-lg bg-slate-900/50 border border-slate-800">
      <button
        onClick={() => setViewMode('mobile')}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
          ${
            viewMode === 'mobile'
              ? 'bg-cyan-500/20 text-cyan-300 shadow-lg shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
          }
        `}
      >
        <i className="fa-solid fa-mobile-screen-button text-base"></i>
        <span className="hidden sm:inline">Student Mobile App</span>
        <span className="sm:hidden">Mobile</span>
      </button>

      <button
        onClick={() => setViewMode('kiosk')}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
          ${
            viewMode === 'kiosk'
              ? 'bg-cyan-500/20 text-cyan-300 shadow-lg shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
          }
        `}
      >
        <i className="fa-solid fa-desktop text-base"></i>
        <span className="hidden sm:inline">Lobby Kiosk Station</span>
        <span className="sm:hidden">Kiosk</span>
      </button>
    </div>
  );
}
