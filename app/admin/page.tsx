'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useRecordsStore } from '@/store/recordsStore';
import { useRoomPresenceStore } from '@/store/roomPresenceStore';
import { useLiveData } from '@/hooks/useLiveData';
import { ADMIN_NAV } from '@/lib/adminNav';
import LiveBadge from '@/components/LiveBadge';
import AdminPageHeader from '@/components/AdminPageHeader';
import AdminShell from '@/components/AdminShell';
import { Badge, buttonStyles, Card, EmptyState } from '@/components/ui';

/** Compact destinations for phones, where the desktop sidebar is hidden. */
const MOBILE_ACTIONS = ADMIN_NAV.filter(
  (item) => item.href !== '/admin' && item.href !== '/admin/lookups'
);

interface MetricProps {
  label: string;
  value: ReactNode;
  hint: string;
  icon: string;
  accent: string;
}

/**
 * One cell of the overview panel.
 *
 * Deliberately flat: the panel around these cells owns the surface and the
 * dividers, so each metric is a block of information rather than another card
 * floating inside a card. The small icon is an accent, not the focus.
 */
function Metric({ label, value, hint, icon, accent }: MetricProps) {
  return (
    <div className='bg-navy-900 p-5 sm:p-6'>
      <div className='flex items-start justify-between gap-3'>
        <p className='text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-400'>
          {label}
        </p>
        <span
          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${accent}`}
        >
          <i className={`fa-solid ${icon} text-[11px]`}></i>
        </span>
      </div>
      <p className='mt-3 text-4xl font-bold leading-none text-white tabular-nums sm:text-5xl'>
        {value}
      </p>
      <p className='mt-2 text-xs leading-relaxed text-navy-400'>{hint}</p>
    </div>
  );
}

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
      router.push('/verify');
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
  const notInRoom = Math.max(activeCount - inARoom, 0);

  // The busiest room sets the width of every occupancy bar. Capacities are not
  // stored, so the bar is relative occupancy - never a "room is full" signal.
  const busiestRoom = occupancy.reduce(
    (max, entry) => Math.max(max, entry.people.length),
    1
  );

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow={today}
        title={`Welcome back, ${user.name}`}
        subtitle="Here's what's happening with trainee check-ins today."
        actions={<LiveBadge lastRefreshed={lastRefreshed} />}
      />

      {/* Live overview. One surface with hairline dividers instead of four
          separate cards, so the numbers read as a single answer to "how busy is
          the building right now?". Total users deliberately lives on
          /admin/users - this is about movement, not the size of the account
          list. */}
      <section className='overflow-hidden rounded-2xl border border-navy-700/60 bg-navy-700/40'>
        <div className='grid grid-cols-1 gap-px sm:grid-cols-2'>
          <Metric
            label='Checked in now'
            value={activeCount}
            hint='Open attendance records'
            icon='fa-users'
            accent='bg-green-500/15 text-green-400'
          />
          <Metric
            label='Attendance today'
            value={todayCount}
            hint='Completed visits today'
            icon='fa-user-check'
            accent='bg-blue-500/15 text-blue-400'
          />
          <Metric
            label='Inside a room'
            value={inARoom}
            hint={`${occupancy.length} room${occupancy.length === 1 ? '' : 's'} occupied`}
            icon='fa-door-open'
            accent='bg-yellow-500/15 text-yellow-400'
          />
          <Metric
            label='Not in a room yet'
            value={notInRoom}
            hint='Checked in, still in the lobby'
            icon='fa-person-walking'
            accent='bg-teal-500/15 text-teal-300'
          />
        </div>
      </section>

      {/* Phone shortcuts. The desktop rail is hidden below `lg`, so the
          most-used destinations get compact tiles here; the profile menu
          still carries the complete list. */}
      <section className='mt-4 lg:hidden' aria-label='Quick actions'>
        <div className='grid grid-cols-2 gap-2'>
          {MOBILE_ACTIONS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className='group flex items-center gap-3 rounded-xl border border-navy-700/60 bg-navy-900/80 px-3 py-3 transition-colors hover:border-yellow-500/50 hover:bg-navy-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/60'
            >
              <span className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-yellow-500/15 text-yellow-400 transition-transform duration-200 group-hover:scale-110'>
                <i className={`fa-solid ${item.icon} text-xs`}></i>
              </span>
              <span className='truncate text-sm font-semibold text-white'>
                {item.short}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Bottom split. Both sides share the same surface and spacing so the
          dashboard reads as one view rather than two card designs. */}
      <div className='mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'>
        {/* Live Room Occupancy. Per-room breakdown rather than a single total:
            an admin needs to know which room is filling up, not just how many
            people are in the building. */}
        <Card>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <h3 className='text-sm font-semibold text-white'>Room occupancy</h3>
              <p className='mt-0.5 text-xs text-navy-400'>
                Who is inside each room right now
              </p>
            </div>
            <Link
              href='/occupancy'
              className={buttonStyles('ghost', 'sm', 'flex-shrink-0')}
            >
              View all
              <i className='fa-solid fa-arrow-right text-[10px]'></i>
            </Link>
          </div>

          {occupancy.length > 0 ? (
            <div className='mt-4 space-y-3'>
              {occupancy.map((entry) => (
                <div key={entry.roomId}>
                  <div className='flex items-center justify-between gap-3'>
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-medium text-white'>
                        {entry.roomLabel}
                      </p>
                      <p className='text-xs text-navy-500'>{entry.room}</p>
                    </div>
                    <span className='flex-shrink-0 text-sm font-semibold tabular-nums text-white'>
                      {entry.people.length}
                      <span className='ml-1 text-xs font-normal text-navy-500'>
                        {entry.people.length === 1 ? 'person' : 'people'}
                      </span>
                    </span>
                  </div>
                  <div className='mt-1.5 h-1.5 overflow-hidden rounded-full bg-navy-800'>
                    <div
                      className='h-full rounded-full bg-green-500/70'
                      style={{
                        width: `${Math.max(
                          (entry.people.length / busiestRoom) * 100,
                          4
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              <p className='pt-1 text-[11px] text-navy-500'>
                Bar length is relative to the busiest room.
              </p>
            </div>
          ) : (
            <EmptyState
              icon='fa-door-closed'
              title='Nobody is in a room right now'
              description='People appear here once they scan a room door code.'
            />
          )}
        </Card>

        {/* Recent Activity */}
        <Card>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <h3 className='text-sm font-semibold text-white'>Recent activity</h3>
              <p className='mt-0.5 text-xs text-navy-400'>
                The latest attendance records
              </p>
            </div>
            <Link
              href='/admin/records'
              className={buttonStyles('ghost', 'sm', 'flex-shrink-0')}
            >
              View all
              <i className='fa-solid fa-arrow-right text-[10px]'></i>
            </Link>
          </div>

          {recentRecords.length > 0 ? (
            <div className='mt-4 space-y-2'>
              {recentRecords.map((record) => (
                <div
                  key={record.id}
                  className='flex items-center gap-3 rounded-xl border border-navy-700/60 bg-navy-950/30 px-3 py-2.5'
                >
                  <span
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                      record.status === 'active'
                        ? 'bg-green-500/15 text-green-400'
                        : 'bg-navy-800 text-navy-300'
                    }`}
                  >
                    <i className='fa-solid fa-user text-xs'></i>
                  </span>
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm font-medium text-white'>
                      {record.userName || `User ${record.userId.slice(0, 8)}`}
                    </p>
                    <p className='truncate text-xs text-navy-400'>
                      {record.purposeLabel || 'No purpose recorded'} · {record.room}
                    </p>
                  </div>
                  <div className='flex flex-shrink-0 flex-col items-end gap-1'>
                    <Badge tone={record.status === 'active' ? 'success' : 'neutral'}>
                      {record.status === 'active' ? 'Active' : 'Done'}
                    </Badge>
                    <span className='text-[11px] tabular-nums text-navy-500'>
                      {record.timeIn.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon='fa-inbox'
              title='No recent activity'
              description='Check-ins will appear here as they happen.'
            />
          )}
        </Card>
      </div>
    </AdminShell>
  );
}
