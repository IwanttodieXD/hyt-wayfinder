'use client';

import { useEffect, type MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { useThemeStore } from '@/store/themeStore';

// `startViewTransition` is not in the DOM lib on every TypeScript version, so
// describe just the slice we use here.
type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => {
    ready: Promise<void>;
    finished: Promise<void>;
  };
};

// The wave is used at every viewport size: it expands from the click point and
// is intentionally slow, so it reads as one continuous sweep rather than a
// snap. The expensive part is the clipped snapshot, so everything else that
// could compete for main-thread frames during the sweep is switched off (see
// `html.theme-switching` in globals.css).

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

  /**
   * Wave between the two palettes.
   *
   * The View Transition API snapshots the page before and after the change.
   * The old snapshot stays perfectly still and the new one is revealed through
   * a circle that expands from the toggle. That circle is the only thing
   * animated, so there is no full-page colour transition on every themed
   * surface.
   *
   * The wave starts where the person clicked and is intentionally slow: 1.4s
   * with a gentle ease-in-out curve, so the circle gathers pace instead of
   * snapping open in the first few frames. The radius is measured to the
   * farthest screen corner in pixels, so the wave finishes exactly when it has
   * covered the viewport.
   *
   * Everything that could steal frames from the sweep is turned off for its
   * duration: the animated background is paused, and every per-element
   * transition is frozen (see `html.theme-switching` in globals.css). The theme
   * update is committed with `flushSync`, so React cannot re-render a frame
   * after the new snapshot is taken.
   *
   * Browsers without the API, or people who ask for reduced motion, just get
   * the instant switch.
   */
  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    const doc = document as ViewTransitionDocument;
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (!doc.startViewTransition || reduceMotion) {
      toggleTheme();
      return;
    }

    // Centre the wave on the click. Keyboard activation has no useful pointer
    // coordinates, so fall back to the middle of the button.
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX || rect.left + rect.width / 2;
    const y = event.clientY || rect.top + rect.height / 2;
    const root = document.documentElement;

    // A full circle needs to reach the farthest corner from the click. Using
    // an exact pixel radius avoids overshooting with a huge `vmax` value and
    // keeps the animated clip simple.
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const radius = Math.ceil(
      Math.max(
        Math.hypot(x, y),
        Math.hypot(viewportWidth - x, y),
        Math.hypot(x, viewportHeight - y),
        Math.hypot(viewportWidth - x, viewportHeight - y)
      )
    );

    root.style.setProperty('--theme-origin-x', `${x}px`);
    root.style.setProperty('--theme-origin-y', `${y}px`);
    root.style.setProperty('--theme-radius', `${radius}px`);

    root.classList.add('theme-switching');

    try {
      // `toggleTheme` updates the `<html>` classes synchronously, which is what
      // the transition captures as the "after" state. `flushSync` commits the
      // React re-render in that same step as well: otherwise the store update
      // can land a frame after the new snapshot is taken, and that late paint
      // shows up as a hitch part-way through the wave.
      const transition = doc.startViewTransition(() => {
        flushSync(() => toggleTheme());
      });
      transition.finished.finally(() =>
        root.classList.remove('theme-switching')
      );
    } catch {
      root.classList.remove('theme-switching');
      toggleTheme();
    }
  };

  return (
    <button
      type='button'
      role='switch'
      aria-checked={isDark}
      aria-label='Toggle dark mode'
      onClick={handleToggle}
      className='w-full px-4 py-2.5 rounded-lg text-left text-navy-200 hover:bg-yellow-500/10 hover:text-white active:bg-yellow-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/60 transition-colors flex items-center gap-3'
    >
      <i className={`fa-solid ${isDark ? 'fa-moon' : 'fa-sun'} w-5`}></i>
      <span className='flex-1'>{isDark ? 'Dark mode' : 'Light mode'}</span>
      <span
        className={`relative w-9 h-5 rounded-full transition-colors duration-300 ${
          isDark ? 'bg-navy-600' : 'bg-yellow-500'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-paper transition-transform duration-300 ease-out ${
            isDark ? 'translate-x-0' : 'translate-x-4'
          }`}
        />
      </span>
    </button>
  );
}
