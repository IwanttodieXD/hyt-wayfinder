'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useRecordsStore } from '@/store/recordsStore';
import Link from 'next/link';
import UserProfile from '@/components/UserProfile';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { records, getActiveCount, getTodayCount, fetchTodayRecords } = useRecordsStore();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/login');
    } else {
      // Fetch today's records when component mounts
      fetchTodayRecords();
    }
  }, [isAuthenticated, user, router, fetchTodayRecords]);

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  const activeCount = getActiveCount();
  const todayCount = getTodayCount();
  const recentRecords = records.slice(0, 5);

  return (
    <>
      <div className="min-h-screen bg-slate-950">
        {/* Header */}
        <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
                  <img src="/hyt_logo.png" alt="HYT Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-white font-bold text-lg leading-none">HYT Wayfinder</h1>
                  <p className="text-slate-400 text-xs mt-0.5">Admin Dashboard</p>
                </div>
              </Link>
            </div>

            <UserProfile />
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              Welcome back, {user.name}
            </h2>
            <p className="text-slate-400">
              Here&apos;s what&apos;s happening with your system today
            </p>
          </div>

          {/* Live Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Active Clock-Ins */}
            <div className="glass-panel border-slate-800 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <i className="fa-solid fa-users text-green-400 text-xl"></i>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/30">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="text-green-300 text-xs font-semibold uppercase">Live</span>
                </div>
              </div>
              <p className="text-slate-400 text-sm mb-1">Active Clock-Ins</p>
              <p className="text-white text-3xl font-bold">{activeCount}</p>
            </div>

            {/* Today&apos;s Total */}
            <div className="glass-panel border-slate-800 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <i className="fa-solid fa-calendar-day text-cyan-400 text-xl"></i>
                </div>
              </div>
              <p className="text-slate-400 text-sm mb-1">Today&apos;s Total</p>
              <p className="text-white text-3xl font-bold">{todayCount}</p>
            </div>

            {/* Total Records */}
            <div className="glass-panel border-slate-800 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <i className="fa-solid fa-database text-blue-400 text-xl"></i>
                </div>
              </div>
              <p className="text-slate-400 text-sm mb-1">Total Records</p>
              <p className="text-white text-3xl font-bold">{records.length}</p>
            </div>

            {/* System Status */}
            <div className="glass-panel border-slate-800 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <i className="fa-solid fa-server text-purple-400 text-xl"></i>
                </div>
              </div>
              <p className="text-slate-400 text-sm mb-1">System Status</p>
              <p className="text-green-400 text-lg font-bold flex items-center gap-2">
                <i className="fa-solid fa-circle-check"></i>
                Online
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Link
              href="/admin/records"
              className="glass-panel border-slate-800 p-6 rounded-2xl hover:border-cyan-500/50 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500/30 transition-all">
                  <i className="fa-solid fa-table text-cyan-400 text-2xl"></i>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-1">View All Records</h3>
                  <p className="text-slate-400 text-sm">Full clock-in/out history</p>
                </div>
              </div>
            </Link>

            <Link
              href="/clock-in"
              className="glass-panel border-slate-800 p-6 rounded-2xl hover:border-cyan-500/50 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-all">
                  <i className="fa-solid fa-qrcode text-blue-400 text-2xl"></i>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-1">Kiosk View</h3>
                  <p className="text-slate-400 text-sm">Check-in station</p>
                </div>
              </div>
            </Link>

            <Link
              href="/tour"
              className="glass-panel border-slate-800 p-6 rounded-2xl hover:border-cyan-500/50 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-all">
                  <i className="fa-solid fa-cube text-purple-400 text-2xl"></i>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-1">3D Building Tour</h3>
                  <p className="text-slate-400 text-sm">Virtual exploration</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Recent Activity */}
          <div className="glass-panel border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Recent Activity</h3>
              <Link
                href="/admin/records"
                className="text-cyan-400 hover:text-cyan-300 text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                View All
                <i className="fa-solid fa-arrow-right"></i>
              </Link>
            </div>

            <div className="space-y-3">
              {recentRecords.map((record) => (
                <div
                  key={record.id}
                  className="p-4 rounded-lg bg-slate-900/50 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        record.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      <i className="fa-solid fa-user"></i>
                    </div>
                    <div>
                      <p className="text-white font-semibold">{record.userName || 'User ' + record.userId.slice(0, 8)}</p>
                      <p className="text-slate-400 text-sm">
                        {record.destination} • {record.room}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold mb-1 ${
                        record.status === 'active' ? 'text-green-400' : 'text-slate-400'
                      }`}
                    >
                      {record.status === 'active' ? 'Active' : 'Completed'}
                    </p>
                    <p className="text-slate-500 text-xs">
                      {record.timeIn.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {recentRecords.length === 0 && (
                <div className="text-center py-12">
                  <i className="fa-solid fa-inbox text-slate-600 text-4xl mb-3"></i>
                  <p className="text-slate-400">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
