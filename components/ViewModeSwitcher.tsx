'use client';

import { useClockInStore } from '@/store/clockInStore';

export default function ViewModeSwitcher() {
  const { viewMode, setViewMode } = useClockInStore();

  return (
    <div className='flex items-center gap-2 p-1 rounded-lg bg-navy-900/50 border border-navy-800'>
      <button
        onClick={() => setViewMode('mobile')}
        className={`
      flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150
      ${
        viewMode === 'mobile'
          ? 'bg-orange-500/20 text-orange-300  '
          : 'text-navy-300 hover:text-navy-200 hover:bg-navy-800/50'
      }
        `}
      >
        <i className='fa-solid fa-mobile-screen-button text-base'></i>
        <span className='hidden sm:inline'>Mobile App</span>
        <span className='sm:hidden'>Mobile</span>
      </button>

      <button
        onClick={() => setViewMode('kiosk')}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150
          ${
            viewMode === 'kiosk'
              ? 'bg-orange-500/20 text-orange-300  '
              : 'text-navy-300 hover:text-navy-200 hover:bg-navy-800/50'
          }
        `}
      >
        <i className='fa-solid fa-desktop text-base'></i>
        <span className='hidden sm:inline'>Lobby Kiosk Station</span>
        <span className='sm:hidden'>Kiosk</span>
      </button>
    </div>
  );
}
