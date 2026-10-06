'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/store/themeStore';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  // Keep the DOM class in sync (covers rehydration edge cases)
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('light', theme === 'light');
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
  }, [theme]);

  return (
    <button
      type='button'
      role='switch'
      aria-checked={isDark}
      aria-label='Toggle dark mode'
      onClick={toggleTheme}
      className='w-full px-4 py-2.5 rounded-lg text-left text-navy-200 hover:bg-yellow-500/10 hover:text-white active:bg-yellow-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/60 transition-colors flex items-center gap-3'
    >
      <i className={`fa-solid ${isDark ? 'fa-moon' : 'fa-sun'} w-5`}></i>
      <span className='flex-1'>{isDark ? 'Dark mode' : 'Light mode'}</span>
      <span
        className={`relative w-9 h-5 rounded-full transition-colors ${
          isDark ? 'bg-navy-600' : 'bg-yellow-500'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-paper transition-transform ${
            isDark ? 'translate-x-0' : 'translate-x-4'
          }`}
        />
      </span>
    </button>
  );
}
