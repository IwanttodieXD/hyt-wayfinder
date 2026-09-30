'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useClockInStore } from '@/store/clockInStore';
import StudentMobileView from '@/components/StudentMobileView';
import UserProfile from '@/components/UserProfile';
import Script from 'next/script';

export default function VisitorPortal() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { setViewMode, status } = useClockInStore();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'visitor') {
      router.push('/login');
      return;
    }

    // Auto-set to mobile view for QR scanner
    setViewMode('mobile');
  }, [isAuthenticated, user, router, setViewMode]);

  if (!isAuthenticated || user?.role !== 'visitor') {
    return null;
  }

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/js/all.min.js"
        strategy="afterInteractive"
      />

      <div className="min-h-screen bg-slate-950 flex flex-col">
        {/* Header */}
        <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm flex-shrink-0">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
                <img src="/hyt_logo.png" alt="HYT Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg leading-none">Visitor Portal</h1>
                <p className="text-slate-400 text-xs mt-0.5">Welcome, {user.name}</p>
              </div>
            </div>

            <UserProfile />
          </div>
        </header>

        {/* Main Content - Full Screen Mobile View */}
        <main className="flex-1 overflow-hidden">
          <StudentMobileView />
        </main>
      </div>
    </>
  );
}
