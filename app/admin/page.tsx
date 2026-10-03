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
  const { records, getActiveCount, getCompletedTodayCount, fetchTodayRecords } =
    useRecordsStore();

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
  const todayCount = getCompletedTodayCount();
  const recentRecords = records.slice(0, 5);

  return (
    <>
      <div className='min-h-screen bg-navy-950'>
        {/* Header */}
        <header className='border-b border-navy-800 bg-navy-900/50 sticky top-0 z-50'>
          <div className='max-w-7xl mx-auto px-4 py-3 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <Link href='/' className='flex items-center gap-3'>
                <div className='w-12 h-12 flex items-center justify-center overflow-hidden'>
                  <img
                    src='/hyt_logo.png'
                    alt='HYT Logo'
                    className='w-full h-full object-contain'
                  />
                </div>
                <div>
                  <h1 className='text-white font-bold text-lg leading-none'>
                    HYT Wayfinder
                  </h1>
                  <p className='text-navy-300 text-xs mt-0.5'>Admin Dashboard</p>
                </div>
              </Link>
            </div>

            <UserProfile />
          </div>
        </header>

        {/* Main Content */}
        <main className='max-w-7xl mx-auto px-4 py-5'>
          {/* Welcome Section */}
          <div className='mb-8'>
            <h2 className='text-3xl font-bold text-white mb-2'>
              Welcome back, {user.name}
            </h2>
            <p className='text-navy-300'>
              Here&apos;s what&apos;s happening with your system today
            </p>
          </div>

          {/* Live Metrics. Total users deliberately lives on /admin/users rather than
              here — this dashboard is about today's movement through the
              building, not the size of the account list. */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-3 mb-8'>
            {/* Active Clock-Ins */}
            <div className='glass-panel border-navy-800 p-6 rounded-lg'>
              <div className='flex items-center justify-between mb-4'>
                <div className='w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center'>
                  <i className='fa-solid fa-users text-green-400 text-xl'></i>
                </div>
                <div className='flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/30'>
                  <div className='w-2 h-2 rounded-full bg-green-400 animate-pulse'></div>
                  <span className='text-green-300 text-xs font-semibold uppercase'>
                    Live
                  </span>
                </div>
              </div>
              <p className='text-navy-300 text-sm mb-1'>Active Clock-Ins</p>
              <p className='text-white text-3xl font-bold'>{activeCount}</p>
            </div>

            {/* Attendance Today */}
            <div className='glass-panel border-navy-800 p-6 rounded-lg'>
              <div className='flex items-center justify-between mb-4'>
                <div className='w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center'>
                  <i className='fa-solid fa-user-check text-orange-400 text-xl'></i>
                </div>
                <Link
                  href='/station'
                  className='text-navy-400 hover:text-orange-300 transition-colors'
                >
                  <i className='fa-solid fa-arrow-right'></i>
                </Link>
              </div>
              <p className='text-navy-300 text-sm mb-1'>Attendance Today</p>
              <p className='text-white text-3xl font-bold'>{todayCount}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-3 mb-8'>
            <Link
              href='/admin/records'
              className='glass-panel border-navy-800 p-6 rounded-lg hover:border-orange-500/50 transition-colors group'
            >
              <div className='flex items-center gap-3'>
                <div className='w-14 h-14 rounded-lg bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors'>
                  <i className='fa-solid fa-table text-orange-400 text-2xl'></i>
                </div>
                <div>
                  <h3 className='text-white font-semibold text-lg mb-1'>
                    Attendance Records
                  </h3>
                  <p className='text-navy-300 text-sm'>
                    Who clocked in and out of the building
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href='/admin/room-records'
              className='glass-panel border-navy-800 p-6 rounded-lg hover:border-orange-500/50 transition-colors group'
            >
              <div className='flex items-center gap-3'>
                <div className='w-14 h-14 rounded-lg bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors'>
                  <i className='fa-solid fa-door-open text-orange-400 text-2xl'></i>
                </div>
                <div>
                  <h3 className='text-white font-semibold text-lg mb-1'>
                    Room Visits
                  </h3>
                  <p className='text-navy-300 text-sm'>
                    Who entered each room, and when
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href='/station'
              className='glass-panel border-navy-800 p-6 rounded-lg hover:border-orange-500/50 transition-colors group'
            >
              <div className='flex items-center gap-3'>
                <div className='w-14 h-14 rounded-lg bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors'>
                  <i className='fa-solid fa-qrcode text-orange-400 text-2xl'></i>
                </div>
                <div>
                  <h3 className='text-white font-semibold text-lg mb-1'>Station</h3>
                  <p className='text-navy-300 text-sm'>Scan to check-in / check-out</p>
                </div>
              </div>
            </Link>

            <Link
              href='/admin/users'
              className='glass-panel border-navy-800 p-6 rounded-lg hover:border-orange-500/50 transition-colors group'
            >
              <div className='flex items-center gap-3'>
                <div className='w-14 h-14 rounded-lg bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors'>
                  <i className='fa-solid fa-users-gear text-orange-400 text-2xl'></i>
                </div>
                <div>
                  <h3 className='text-white font-semibold text-lg mb-1'>Manage Users</h3>
                  <p className='text-navy-300 text-sm'>Accounts and roles</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Recent Activity */}
          <div className='glass-panel border-navy-800 rounded-lg p-6'>
            <div className='flex items-center justify-between mb-6'>
              <h3 className='text-xl font-bold text-white'>Recent Activity</h3>
              <Link
                href='/admin/records'
                className='text-orange-400 hover:text-orange-300 text-sm font-semibold flex items-center gap-2 transition-colors'
              >
                View All Attendance
                <i className='fa-solid fa-arrow-right'></i>
              </Link>
            </div>

            <div className='space-y-3'>
              {recentRecords.map((record) => (
                <div
                  key={record.id}
                  className='p-4 rounded-lg bg-navy-900/50 border border-navy-800 flex items-center justify-between'
                >
                  <div className='flex items-center gap-3'>
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        record.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-navy-700 text-navy-300'
                      }`}
                    >
                      <i className='fa-solid fa-user'></i>
                    </div>
                    <div>
                      <p className='text-white font-semibold'>
                        {record.userName || 'User ' + record.userId.slice(0, 8)}
                      </p>
                      <p className='text-navy-300 text-sm'>
                        {record.destination} • {record.room}
                      </p>
                    </div>
                  </div>
                  <div className='text-right'>
                    <p
                      className={`text-sm font-semibold mb-1 ${
                        record.status === 'active' ? 'text-green-400' : 'text-navy-300'
                      }`}
                    >
                      {record.status === 'active' ? 'Active' : 'Completed'}
                    </p>
                    <p className='text-navy-500 text-xs'>
                      {record.timeIn.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {recentRecords.length === 0 && (
                <div className='text-center py-3'>
                  <i className='fa-solid fa-inbox text-navy-600 text-4xl mb-3'></i>
                  <p className='text-navy-300'>No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
