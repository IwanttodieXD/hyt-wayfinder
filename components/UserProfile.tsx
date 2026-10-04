'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import ThemeToggle from '@/components/ThemeToggle';

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

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Only two roles exist, so these two helpers are exhaustive rather than a
// lookup table. `default` is unreachable in practice but keeps the return type
// total if a retired role ever resurfaces in an old database row.
const getRoleColor = () => {
  switch (user.role) {
    case 'admin':
      return 'bg-red-500/20 text-red-300 border-red-500/30';
    default:
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
  }
};

const getRoleIcon = () => {
  switch (user.role) {
    case 'admin':
      return 'fa-user-shield';
    default:
      return 'fa-id-card';
  }
};

  return (
    <div className='relative' ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='flex items-center gap-3 px-4 py-2 rounded-lg bg-navy-800/50 hover:bg-navy-800 border border-navy-700 transition-colors'
      >
        <div className='w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center'>
          <i className={`fa-solid ${getRoleIcon()} text-orange-400`}></i>
        </div>
        <div className='hidden md:block text-left'>
          <p className='text-white font-semibold text-sm leading-tight'>{user.name}</p>
          <p className='text-navy-300 text-xs capitalize'>{user.role}</p>
        </div>
        <i
          className={`fa-solid fa-chevron-down text-navy-300 text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}
        ></i>
      </button>

      {isOpen && (
        <div className='absolute right-0 mt-2 w-64 bg-navy-900 border border-navy-700 rounded-lg shadow-black/50 overflow-hidden animate-fade-in z-50'>
          {/* Profile Header */}
          <div className='p-4 border-b border-navy-700'>
            <div className='flex items-center gap-3 mb-3'>
              <div className='w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center'>
                <i className={`fa-solid ${getRoleIcon()} text-orange-400 text-xl`}></i>
              </div>
              <div className='flex-1'>
                <p className='text-white font-semibold'>{user.name}</p>
                <p className='text-navy-300 text-sm'>{user.email}</p>
              </div>
            </div>
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${getRoleColor()}`}
            >
              <i className={`fa-solid ${getRoleIcon()}`}></i>
              <span className='capitalize'>{user.role}</span>
            </div>
          </div>

          {/* Menu Items (admins only) */}
          {user.role === 'admin' && (
            <div className='p-2'>
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/admin');
                }}
                className='w-full px-4 py-2.5 rounded-lg text-left text-navy-200 hover:bg-navy-800/50 hover:text-white transition-colors flex items-center gap-3'
              >
                <i className='fa-solid fa-chart-line w-5'></i>
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/admin/records');
                }}
                className='w-full px-4 py-2.5 rounded-lg text-left text-navy-200 hover:bg-navy-800/50 hover:text-white transition-colors flex items-center gap-3'
              >
                <i className='fa-solid fa-table w-5'></i>
                <span>Records</span>
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/admin/users');
                }}
                className='w-full px-4 py-2.5 rounded-lg text-left text-navy-200 hover:bg-navy-800/50 hover:text-white transition-colors flex items-center gap-3'
              >
                <i className='fa-solid fa-users-gear w-5'></i>
                <span>Manage Users</span>
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/occupancy');
                }}
                className='w-full px-4 py-2.5 rounded-lg text-left text-navy-200 hover:bg-navy-800/50 hover:text-white transition-colors flex items-center gap-3'
              >
                <i className='fa-solid fa-door-open w-5'></i>
                <span>Live Occupancy</span>
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/station');
                }}
                className='w-full px-4 py-2.5 rounded-lg text-left text-navy-200 hover:bg-navy-800/50 hover:text-white transition-colors flex items-center gap-3'
              >
                <i className='fa-solid fa-user-check w-5'></i>
                <span>Attendance Station</span>
              </button>
            </div>
          )}

          {/* Preferences (all roles) */}
          <div className='p-2 border-t border-navy-700'>
            <ThemeToggle />
          </div>

          {/* Logout */}
          <div className='p-2 border-t border-navy-700'>
            <button
              onClick={handleLogout}
              className='w-full px-4 py-2.5 rounded-lg text-left text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3'
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
