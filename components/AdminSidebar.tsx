'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_NAV_GROUPS, isAdminNavActive } from '@/lib/adminNav';

const STORAGE_KEY = 'hyt.admin.sidebar.collapsed';

// `useLayoutEffect` runs before paint in the browser, which lets the saved rail
// width land in the first frame instead of animating from the default open
// state every time a page navigation remounts the sidebar. The server has no
// layout phase, so fall back to `useEffect` there to keep SSR warning-free.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Desktop navigation rail.
 *
 * Hidden below `lg`: on phones the profile menu already carries the same links,
 * so a second drawer only repeated it. The collapsed state is remembered in
 * localStorage so the rail stays the width the admin chose.
 */
export default function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  // Transitions stay off until the saved width has been committed, so a
  // remount on navigation snaps straight to the stored state instead of
  // replaying the closing animation.
  const [ready, setReady] = useState(false);

  // Read the saved preference before the first paint: localStorage is not
  // available during the server render.
  useIsomorphicLayoutEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      // Storage can be blocked (private mode). The default open rail is fine.
    }
    const frame = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const motion = (classes: string) => (ready ? classes : 'transition-none');

  const toggle = () => {
    setCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // Preference just will not persist; the toggle still works this visit.
      }
      return next;
    });
  };

  return (
    <aside
      className={`hidden flex-shrink-0 ${motion('transition-[width] duration-300 ease-in-out motion-reduce:transition-none')} lg:sticky lg:top-24 lg:block ${
        collapsed ? 'w-[4.5rem]' : 'w-60'
      }`}
    >
      <nav
        aria-label='Admin'
        className='flex max-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-navy-700/60 bg-navy-900/80 shadow-lg shadow-navy-950/20 backdrop-blur'
      >
        <div
          className={`flex flex-shrink-0 items-center border-b border-navy-800/80 py-3 ${
            collapsed ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          <p
            className={`overflow-hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-400 ${motion('transition-all duration-300 motion-reduce:transition-none')} ${
              collapsed ? 'max-h-0 max-w-0 opacity-0' : 'max-h-6 max-w-[8rem] opacity-100'
            }`}
          >
            Admin
          </p>
          <button
            type='button'
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-controls='admin-sidebar'
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-navy-400 transition-colors hover:bg-navy-800/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/60'
          >
            <i
              className={`fa-solid fa-angles-left text-xs ${motion('transition-transform duration-300 motion-reduce:transition-none')} ${
                collapsed ? 'rotate-180' : ''
              }`}
            ></i>
          </button>
        </div>

        <div id='admin-sidebar' className='flex-1 overflow-y-auto p-2'>
          {ADMIN_NAV_GROUPS.map((group) => (
            <div key={group.label} className='mb-1 last:mb-0'>
              <p
                className={`overflow-hidden px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-500 ${motion('transition-all duration-200 motion-reduce:transition-none')} ${
                  collapsed ? 'max-h-0 py-0 opacity-0' : 'max-h-6 py-1.5 opacity-100'
                }`}
              >
                {group.label}
              </p>

              <div className='flex flex-col gap-0.5'>
                {group.items.map((item) => {
                  const active = isAdminNavActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.title : item.description}
                      aria-current={active ? 'page' : undefined}
                      className={`group relative flex items-center rounded-xl py-2.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/60 ${
                        collapsed ? 'justify-center px-0' : 'gap-3 px-3'
                      } ${
                        active
                          ? 'bg-yellow-500/10 text-yellow-300'
                          : 'text-navy-300 hover:bg-navy-800/60 hover:text-white'
                      }`}
                    >
                      {/* Active marker fades in instead of snapping between rows. */}
                      <span
                        aria-hidden='true'
                        className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-yellow-400 transition-opacity duration-200 ${
                          active ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                      <i
                        className={`fa-solid ${item.icon} w-4 flex-shrink-0 text-center text-xs transition-transform duration-200 group-hover:scale-110 ${
                          active ? 'text-yellow-300' : 'text-navy-400'
                        }`}
                      ></i>
                      <span
                        className={`overflow-hidden whitespace-nowrap ${motion('transition-all duration-300 ease-in-out motion-reduce:transition-none')} ${
                          collapsed ? 'max-w-0 opacity-0' : 'max-w-[9.5rem] opacity-100'
                        }`}
                      >
                        {item.title}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div
          className={`flex-shrink-0 overflow-hidden border-t border-navy-800/80 ${motion('transition-all duration-300 motion-reduce:transition-none')} ${
            collapsed ? 'max-h-0 px-0 py-0 opacity-0' : 'max-h-20 px-4 py-3 opacity-100'
          }`}
        >
          <p className='flex items-center gap-2 whitespace-nowrap text-[11px] text-navy-500'>
            <span className='relative flex h-2 w-2'>
              <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-50 motion-reduce:animate-none' />
              <span className='relative inline-flex h-2 w-2 rounded-full bg-green-400' />
            </span>
            Live building activity
          </p>
        </div>
      </nav>
    </aside>
  );
}
