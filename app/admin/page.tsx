'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useRecordsStore } from '@/store/recordsStore';
import { useRoomPresenceStore } from '@/store/roomPresenceStore';
import { useLiveData } from '@/hooks/useLiveData';
import LiveBadge from '@/components/LiveBadge';
import Link from 'next/link';
import UserProfile from '@/components/UserProfile';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { records, getActiveCount, getCompletedTodayCount } = useRecordsStore();
  // Occupancy lives here rather than on /station. It is a live question about
  // the building, and the station is a kiosk for printing QR codes - not a
  // dashboard. Putting it here means the answer is one click from the admin
  // landing page instead of buried in the print screen.
  const { getOccupancyByRoom } = useRoomPresenceStore();

  // Keep the dashboard numbers live. They used to be a snapshot taken whenever
  // the page loaded, so a check-in at the kiosk never appeared without a reload.
  const { lastRefreshed } = useLiveData({
    records: 'today',
    presence: 'today',
    enabled: isAuthenticated && user?.role === 'admin',
  });

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/login');
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  const activeCount = getActiveCount();
  const todayCount = getCompletedTodayCount();
  const recentRecords = records.slice(0, 5);

  // "Inside right now" means checked in AND sitting in a room. Someone checked
  // in but in the lobby has not scanned a door yet, so they are deliberately not
  // counted here - that is the whole value of the number.
  const occupancy = getOccupancyByRoom();
  const inARoom = occupancy.reduce((sum, entry) => sum + entry.people.length, 0);

  return (
    <>
      <div className='min-h-screen'>
        {/* Header */}
        <header className='app-header border-b sticky top-0 z-50'>
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
          <div className='mb-8 flex items-start justify-between gap-4'>
            <div>
              <h2 className='text-3xl font-bold text-white mb-2'>
                Welcome back, {user.name}
              </h2>
              <p className='text-navy-300'>
                Here&apos;s what&apos;s happening with the Visitor Management System today
              </p>
            </div>
            <LiveBadge lastRefreshed={lastRefreshed} />
          </div>

          {/* Live Metrics. Total users deliberately lives on /admin/users rather than
              here — this dashboard is about today's movement through the
              building, not the size of the account list. */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-3 mb-8'>
            {/* Active Check-Ins */}
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
              <p className='text-navy-300 text-sm mb-1'>Active Check-Ins</p>
              <p className='text-white text-3xl font-bold'>{activeCount}</p>
            </div>

            {/* Attendance Today */}
            <div className='glass-panel border-navy-800 p-6 rounded-lg'>
              <div className='flex items-center justify-between mb-4'>
                <div className='w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center'>
                  <i className='fa-solid fa-user-check text-orange-400 text-xl'></i>
                </div>
                <Link
                  href='/admin/records'
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
                    Who checked in and out of the building
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
                  <i className='fa-solid fa-table text-orange-400 text-2xl'></i>
                </div>
                <div>
                  <h3 className='text-white font-semibold text-lg mb-1'>
                    Room Visits Records
                  </h3>
                  <p className='text-navy-300 text-sm'>
                    Who entered each room, and when
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href='/admin/rooms'
              className='glass-panel border-navy-800 p-6 rounded-lg hover:border-orange-500/50 transition-colors group'
            >
              <div className='flex items-center gap-3'>
                <div className='w-14 h-14 rounded-lg bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors'>
                  <i className='fa-solid fa-door-closed text-orange-400 text-2xl'></i>
                </div>
                <div>
                  <h3 className='text-white font-semibold text-lg mb-1'>
                    Manage Rooms
                  </h3>
                  <p className='text-navy-300 text-sm'>
                    Add, rename or retire rooms and their codes
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href='/occupancy'
              className='glass-panel border-navy-800 p-6 rounded-lg hover:border-orange-500/50 transition-colors group'
            >
              <div className='flex items-center gap-3'>
                <div className='w-14 h-14 rounded-lg bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors'>
                  <i className='fa-solid fa-door-open text-orange-400 text-2xl'></i>
                </div>
                <div>
                  <h3 className='text-white font-semibold text-lg mb-1'>Room Occupancy</h3>
                  <p className='text-navy-300 text-sm'>See visitors who occupies a room</p>
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
          
            <Link
              href='/station'
              className='glass-panel border-navy-800 p-6 rounded-lg hover:border-orange-500/50 transition-colors group'
            >
              <div className='flex items-center gap-3'>
                <div className='w-14 h-14 rounded-lg bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors'>
                  <i className='fa-solid fa-qrcode text-orange-400 text-2xl'></i>
                </div>
                <div>
                  <h3 className='text-white font-semibold text-lg mb-1'>QR Station</h3>
                  <p className='text-navy-300 text-sm'>QR Codes for Attendance and Rooms</p>
                </div>
              </div>
            </Link>
	  </div>

          {/* Live Room Occupancy. Moved here from /station: it is a question about the
              building right now, and the station is a kiosk for printing codes.
              Per-room breakdown included, because a single total hides the thing
              an admin actually needs - which room is filling up. */}
          <div className='glass-panel border-navy-800 rounded-lg p-6 mb-8'>
            <div className='flex items-center justify-between mb-6'>
              <div>
                <h3 className='text-xl font-bold text-white'>Room Occupancy</h3>
                <p className='text-navy-300 text-sm mt-1'>
                  Who is inside each room right now
                </p>
              </div>
              <Link
                href='/occupancy'
                className='text-orange-400 hover:text-orange-300 text-sm font-semibold flex items-center gap-2 transition-colors'
              >
                View All Occupancy
                <i className='fa-solid fa-arrow-right'></i>
              </Link>
            </div>

            <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-6'>
              <div className='bg-navy-900/50 border border-navy-800 rounded-lg p-4'>
                <p className='text-navy-300 text-xs mb-1'>Inside Right Now</p>
                <p className='text-white text-3xl font-bold leading-none'>
                  {inARoom}
                </p>
              </div>
              <div className='bg-navy-900/50 border border-navy-800 rounded-lg p-4'>
                <p className='text-navy-300 text-xs mb-1'>Rooms Occupied</p>
                <p className='text-white text-3xl font-bold leading-none'>
                  {occupancy.length}
                </p>
              </div>
              <div className='bg-navy-900/50 border border-navy-800 rounded-lg p-4'>
                <p className='text-navy-300 text-xs mb-1'>Checked In</p>
                <p className='text-white text-3xl font-bold leading-none'>
                  {activeCount}
                </p>
              </div>
              {/* The gap the headline number above cannot show: people who are in
                  the building but have not scanned a door yet. */}
              <div className='bg-navy-900/50 border border-navy-800 rounded-lg p-4'>
                <p className='text-navy-300 text-xs mb-1'>Not Yet in a Room</p>
                <p className='text-white text-3xl font-bold leading-none'>
                  {Math.max(activeCount - inARoom, 0)}
                </p>
              </div>
            </div>

            {occupancy.length > 0 && (
              <div className='space-y-2'>
                {occupancy.map((entry) => (
                  <div
                    key={entry.roomId}
                    className='flex items-center justify-between p-3 rounded-lg bg-navy-900/50 border border-navy-800'
                  >
                    <div className='min-w-0'>
                      <p className='text-white font-medium text-sm truncate'>
                        {entry.roomLabel}
                      </p>
                      <p className='text-navy-500 text-xs'>{entry.room}</p>
                    </div>
                    <span className='px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-300 border border-green-500/30 flex-shrink-0 ml-3'>
                      {entry.people.length}{' '}
                      {entry.people.length === 1 ? 'person' : 'people'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {occupancy.length === 0 && (
              <div className='text-center py-8'>
                <i className='fa-solid fa-door-closed text-navy-600 text-3xl mb-3'></i>
                <p className='text-navy-300'>Nobody is in a room right now</p>
                <p className='text-navy-500 text-sm mt-1'>
                  People appear here once they scan a room door code
                </p>
              </div>
            )}
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
                        {record.purposeLabel || 'No purpose recorded'} •{' '}
                        {record.room}
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
