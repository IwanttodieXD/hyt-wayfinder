'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

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

  const getRoleColor = () => {
    switch (user.role) {
      case 'admin':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'trainer':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'visitor':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getRoleIcon = () => {
    switch (user.role) {
      case 'admin':
        return 'fa-user-shield';
      case 'trainer':
        return 'fa-chalkboard-user';
      case 'visitor':
        return 'fa-id-card';
      default:
        return 'fa-user';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700 transition-all"
      >
        <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
          <i className={`fa-solid ${getRoleIcon()} text-cyan-400`}></i>
        </div>
        <div className="hidden md:block text-left">
          <p className="text-white font-semibold text-sm leading-tight">{user.name}</p>
          <p className="text-slate-400 text-xs capitalize">{user.role}</p>
        </div>
        <i className={`fa-solid fa-chevron-down text-slate-400 text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 glass-panel border-slate-700 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-fade-in">
          {/* Profile Header */}
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <i className={`fa-solid ${getRoleIcon()} text-cyan-400 text-xl`}></i>
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold">{user.name}</p>
                <p className="text-slate-400 text-sm">{user.email}</p>
              </div>
            </div>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${getRoleColor()}`}>
              <i className={`fa-solid ${getRoleIcon()}`}></i>
              <span className="capitalize">{user.role}</span>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            {user.role === 'admin' && (
              <>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/admin');
                  }}
                  className="w-full px-4 py-2.5 rounded-lg text-left text-slate-300 hover:bg-slate-800/50 hover:text-white transition-all flex items-center gap-3"
                >
                  <i className="fa-solid fa-chart-line w-5"></i>
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/admin/records');
                  }}
                  className="w-full px-4 py-2.5 rounded-lg text-left text-slate-300 hover:bg-slate-800/50 hover:text-white transition-all flex items-center gap-3"
                >
                  <i className="fa-solid fa-table w-5"></i>
                  <span>Records</span>
                </button>
              </>
            )}
            
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/');
              }}
              className="w-full px-4 py-2.5 rounded-lg text-left text-slate-300 hover:bg-slate-800/50 hover:text-white transition-all flex items-center gap-3"
            >
              <i className="fa-solid fa-house w-5"></i>
              <span>Home</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/clock-in');
              }}
              className="w-full px-4 py-2.5 rounded-lg text-left text-slate-300 hover:bg-slate-800/50 hover:text-white transition-all flex items-center gap-3"
            >
              <i className="fa-solid fa-qrcode w-5"></i>
              <span>Clock-In System</span>
            </button>
          </div>

          {/* Logout */}
          <div className="p-2 border-t border-slate-700">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2.5 rounded-lg text-left text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-3"
            >
              <i className="fa-solid fa-right-from-bracket w-5"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
