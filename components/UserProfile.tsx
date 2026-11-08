'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { ADMIN_NAV } from '@/lib/adminNav';
import { visitorTypeStyle } from '@/lib/visitorTypeStyles';
import ThemeToggle from '@/components/ThemeToggle';

// Shared menu-item styling. Kept in one place so the admin links, the theme
// toggle and the logout row all get the same yellow hover/active/focus
// treatment instead of drifting apart.
const MENU_ITEM =
  'w-full px-4 py-2.5 rounded-lg text-left text-navy-200 hover:bg-yellow-500/10 hover:text-white active:bg-yellow-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/60 transition-colors flex items-center gap-3';

// Unclassified accounts fall back to this neutral navy chip rather than
// inventing a visitor type. Keeps the chip readable when `visitor_types` has not
// loaded yet, and stays inside the navy/yellow palette.
const DEFAULT_VISITOR_STYLE = 'bg-navy-800 text-navy-200 border-navy-600/60';

export default function UserProfile() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  // Visitors and admins both land back on the entrance screen. /login is now
  // admin-only and is reached by direct URL (or the hidden name shortcut on
  // /verify), so it is no longer the post-logout destination.
  const handleLogout = () => {
    logout();
    router.push('/verify');
  };

  // Admin keeps the red shield badge. Everyone else wears the colour of their
  // `visitor_type_id` label (Trainee/Trainer/VIP/...), falling back to the
  // neutral "Guest" chip when unclassified. The label shown next to the avatar
  // mirrors the same choice.
  const isAdmin = user.role === 'admin';
  const visitorLabel = user.visitorType ?? 'Guest';
  const badgeLabel = isAdmin ? 'admin' : visitorLabel;
  const badgeClasses = isAdmin
    ? 'bg-red-500/20 text-red-300 border-red-500/30'
    : user.visitorType
      ? visitorTypeStyle(user.visitorType)
      : DEFAULT_VISITOR_STYLE;
  const badgeIcon = isAdmin ? 'fa-user-shield' : 'fa-id-card';

  return (
    <div className='relative' ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className='flex items-center gap-3 px-3 py-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 active:bg-yellow-500/40 border border-yellow-500/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/60'
      >
        {/* Avatar tile. `bg-navy-900/40` reads as a recess on the trigger in
            both themes instead of a second colour block. */}
        <div className='w-10 h-10 rounded-lg bg-navy-900/40 flex items-center justify-center'>
          <i className={`fa-solid ${badgeIcon} text-yellow-400`}></i>
        </div>
        <div className='hidden md:block text-left'>
          <p className='text-white font-semibold text-sm leading-tight'>{user.name}</p>
          <p className='text-navy-300 text-xs capitalize'>{badgeLabel}</p>
        </div>
        <i
          className={`fa-solid fa-chevron-down text-navy-300 text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}
        ></i>
      </button>

      {isOpen && (
        <div className='absolute right-0 mt-2 w-64 bg-navy-900 border border-yellow-500/30 rounded-lg shadow-lg shadow-black/10 overflow-hidden animate-fade-in z-50'>
          {/* Profile Header */}
          <div className='p-4 border-b border-yellow-500/20 bg-yellow-500/10'>
            <div className='flex items-center gap-3 mb-3'>
              <div className='w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center'>
                <i className={`fa-solid ${badgeIcon} text-yellow-400 text-xl`}></i>
              </div>
              <div className='flex-1'>
                <p className='text-white font-semibold'>{user.name}</p>
                <p className='text-navy-300 text-sm'>{user.email}</p>
              </div>
            </div>
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${badgeClasses}`}
            >
              <i className={`fa-solid ${badgeIcon}`}></i>
              <span className='capitalize'>{badgeLabel}</span>
            </div>
          </div>

          {/* Trainee navigation. The scanner is the trainee's only page now,
              kept here so the profile menu is useful on its own on a narrow
              screen where the header nav is hidden. */}
          {user.role === 'visitor' && (
            <div className='p-2'>
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/check-in');
                }}
                className={MENU_ITEM}
              >
                <i className='fa-solid fa-qrcode w-5 text-yellow-400'></i>
                <span>Check in & scanner</span>
              </button>
            </div>
          )}

          {/* Admin navigation. Desktop already has the sidebar, so this copy
              exists only on narrow screens where the rail is hidden. */}
          {user.role === 'admin' && (
            <div className='p-2 lg:hidden'>
              {ADMIN_NAV.map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    setIsOpen(false);
                    router.push(item.href);
                  }}
                  className={MENU_ITEM}
                >
                  <i className={`fa-solid ${item.icon} w-5 text-yellow-400`}></i>
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          )}

          {/* Preferences (all roles) */}
          <div className='p-2 border-t border-yellow-500/20'>
            <ThemeToggle />
          </div>

          {/* Logout */}
          <div className='p-2 border-t border-yellow-500/20'>
            <button
              onClick={handleLogout}
              className='w-full px-4 py-2.5 rounded-lg text-left text-red-400 hover:bg-red-500/10 active:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 transition-colors flex items-center gap-3'
            >
              <i className='fa-solid fa-right-from-bracket w-5'></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
