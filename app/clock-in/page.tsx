'use client';

import { useEffect } from 'react';
import { useClockInStore } from '@/store/clockInStore';
import { useAuthStore } from '@/store/authStore';
import ViewModeSwitcher from '@/components/ViewModeSwitcher';
import StudentMobileView from '@/components/StudentMobileView';
import KioskStationView from '@/components/KioskStationView';
import UserProfile from '@/components/UserProfile';

export default function ClockInPage() {
  const { viewMode, setViewMode, setStudentName } = useClockInStore();
  const { user, isAuthenticated } = useAuthStore();

  // Auto-set mobile view for trainers/visitors
  useEffect(() => {
    if (isAuthenticated && user && (user.role === 'trainer' || user.role === 'trainee' || user.role === 'visitor')) {
      setViewMode('mobile');
    }
  }, [isAuthenticated, user, setViewMode]);

  // Sync the logged-in user's name (from the database) into the clock-in store
  useEffect(() => {
    if (isAuthenticated && user) {
      setStudentName(user.name);
    }
  }, [isAuthenticated, user, setStudentName]);

  return (
    <>
      <div className="w-full h-screen bg-slate-950 flex flex-col overflow-hidden">
        {/* Header with View Switcher */}
        <header className="flex-shrink-0 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm px-6 py-4 relative z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
                <img src="/hyt_logo.png" alt="HYT Global Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg leading-none">HYT Wayfinder</h1>
                <p className="text-slate-400 text-xs mt-0.5">
                  {isAuthenticated && user ? `${user.name} - ` : ''}Student QR Clock-In System
                </p>
              </div>
            </div>

            {/* View Mode Switcher (only show if admin or not logged in) */}
            {(!isAuthenticated || user?.role === 'admin') && <ViewModeSwitcher />}

            {/* User Profile or System Status */}
            {isAuthenticated && user ? (
              <UserProfile />
            ) : (
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-green-300 text-sm font-semibold">System Online</span>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {viewMode === 'mobile' ? <StudentMobileView /> : <KioskStationView />}
        </main>
      </div>
    </>
  );
}
