'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import {
  useRoomPresenceStore,
  visitDuration,
  type RoomPresence,
} from '@/store/roomPresenceStore';
import { DESTINATION_ROUTES } from '@/lib/wayfinding';
import UserProfile from '@/components/UserProfile';
import { useRoleGuard } from '@/hooks/useRoleGuard';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Room visit history, admin-only.
 *
 * This is the room-side counterpart to /admin/records: that page answers "who
 * is in the building and for how long" (attendance), this one answers "who went
 * into Room 304, when, and how long were they there" (presence). They come
 * from different tables on purpose, so neither can imply the other.
 *
 * Rooms come from the route registry so rooms with no visits still appear as
 * empty, rather than silently vanishing from the report.
 */
export default function RoomRecordsPage() {
  const { user } = useAuthStore();
  const isAllowed = useRoleGuard(['admin'], '/admin');

  const { presence, fetchAllPresence } = useRoomPresenceStore();

  const [searchTerm, setSearchTerm] = useState('');
  // 'all' shows every room at once; otherwise a single room number.
  const [roomFilter, setRoomFilter] = useState('all');

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedDay, setSelectedDay] = useState(String(now.getDate()));

  useEffect(() => {
    if (isAllowed) {
      fetchAllPresence();
    }
  }, [isAllowed, fetchAllPresence]);

  const daysInSelectedMonth = new Date(
    Number(selectedYear),
    Number(selectedMonth),
    0
  ).getDate();

  // Only years that actually appear in the data, plus the current one - same
  // approach as the clock-in records page.
  const availableYears = useMemo(
    () =>
      Array.from(
        new Set([
          String(now.getFullYear()),
          ...presence.map((p) => String(p.enteredAt.getFullYear())),
        ])
      )
        .map(Number)
        .sort((a, b) => b - a),
    [presence, now]
  );

  // Dates are compared field-by-field in LOCAL time so a visit matches the
  // calendar day the admin sees, regardless of the stored UTC offset.
  const matchesDate = (entry: RoomPresence) => {
    const entered = entry.enteredAt;
    return (
      entered.getFullYear() === Number(selectedYear) &&
      entered.getMonth() + 1 === Number(selectedMonth) &&
      (selectedDay === 'all' || entered.getDate() === Number(selectedDay))
    );
  };

  const filtered = presence.filter((entry) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      entry.userName?.toLowerCase().includes(term) ||
      entry.userId.toLowerCase().includes(term) ||
      entry.room.toLowerCase().includes(term) ||
      entry.roomLabel.toLowerCase().includes(term);

    const matchesRoom = roomFilter === 'all' || entry.room === roomFilter;

    return matchesSearch && matchesRoom && matchesDate(entry);
  });

  // Group into per-room sections. Registry order first so rooms keep a stable,
  // familiar order, then any unexpected rooms that were still scanned.
  const grouped = useMemo(() => {
    const byRoom = new Map<string, RoomPresence[]>();
    for (const entry of filtered) {
      const list = byRoom.get(entry.room) ?? [];
      list.push(entry);
      byRoom.set(entry.room, list);
    }

    const known = DESTINATION_ROUTES.filter((r) => byRoom.has(r.room)).map((r) => ({
      room: r.room,
      label: r.label,
      visits: byRoom.get(r.room) ?? [],
    }));

    const extra = Array.from(byRoom.entries())
      .filter(([room]) => !DESTINATION_ROUTES.some((r) => r.room === room))
      .map(([room, visits]) => ({
        room,
        label: visits[0]?.roomLabel || room,
        visits,
      }));

    return [...known, ...extra];
  }, [filtered]);

  // Rooms in the filter dropdown: every registered room, so an admin can pick a
  // room that currently has no visits instead of it being missing.
  const roomOptions = useMemo(() => {
    const scanned = new Map(presence.map((p) => [p.room, p.roomLabel]));
    return [
      ...DESTINATION_ROUTES.map((r) => ({ room: r.room, label: r.label })),
      ...Array.from(scanned.entries())
        .filter(([room]) => !DESTINATION_ROUTES.some((r) => r.room === room))
        .map(([room, label]) => ({ room, label })),
    ];
  }, [presence]);

  const periodLabel =
    selectedDay === 'all'
      ? `${MONTH_NAMES[Number(selectedMonth) - 1]} ${selectedYear}`
      : `${MONTH_NAMES[Number(selectedMonth) - 1]} ${selectedDay}, ${selectedYear}`;

  if (!isAllowed) return null;

  return (
    <div className='min-h-screen bg-navy-950'>
      <header className='border-b border-navy-800 bg-navy-900/50 sticky top-0 z-50'>
        <div className='max-w-7xl mx-auto px-4 py-3 flex items-center justify-between'>
          <Link href='/admin' className='flex items-center gap-3'>
            <div className='w-12 h-12 flex items-center justify-center overflow-hidden'>
              <img src='/hyt_logo.png' alt='HYT Logo' className='w-full h-full object-contain' />
            </div>
            <div>
              <h1 className='text-white font-bold text-lg leading-none'>
                Room Visits
              </h1>
              <p className='text-navy-300 text-xs mt-0.5'>
                Who entered each room, and when
              </p>
            </div>
          </Link>
          {user ? <UserProfile /> : null}
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 py-5'>
        <div className='mb-6'>
          <Link
            href='/admin'
            className='text-navy-300 hover:text-navy-200 flex items-center gap-2 transition-colors'
          >
            <i className='fa-solid fa-arrow-left'></i>
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Summary */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-3 mb-6'>
          <div className='glass-panel border-navy-800 p-5 rounded-lg'>
            <p className='text-navy-300 text-sm mb-1'>Total Visits</p>
            <p className='text-white text-3xl font-bold'>{filtered.length}</p>
          </div>
          <div className='glass-panel border-navy-800 p-5 rounded-lg'>
            <p className='text-navy-300 text-sm mb-1'>Rooms Visited</p>
            <p className='text-white text-3xl font-bold'>{grouped.length}</p>
          </div>
          <div className='glass-panel border-navy-800 p-5 rounded-lg'>
            <p className='text-navy-300 text-sm mb-1'>Still Inside</p>
            <p className='text-white text-3xl font-bold'>
              {filtered.filter((e) => !e.exitedAt).length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className='glass-panel border-navy-800 rounded-lg p-6 mb-6'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
            <div>
              <label className='block text-sm font-medium text-navy-200 mb-2'>
                Search
              </label>
              <div className='relative'>
                <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                  <i className='fa-solid fa-magnifying-glass text-navy-500'></i>
                </div>
                <input
                  type='text'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder='Search by name or room...'
                  className='
                    w-full pl-12 pr-4 py-3 rounded-lg
                    bg-navy-900/50 border border-navy-700
                    text-white placeholder-navy-500
                    focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
                    transition-colors
                  '
                />
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-navy-200 mb-2'>
                Room
              </label>
              <div className='relative'>
                <select
                  value={roomFilter}
                  onChange={(e) => setRoomFilter(e.target.value)}
                  className='
                    w-full px-4 py-3 rounded-lg appearance-none
                    bg-navy-900/50 border border-navy-700
                    text-white font-semibold text-sm
                    focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
                    transition-colors cursor-pointer
                  '
                >
                  <option value='all' className='bg-navy-900'>
                    All rooms
                  </option>
                  {roomOptions.map((r) => (
                    <option key={r.room} value={r.room} className='bg-navy-900'>
                      {r.label} ({r.room})
                    </option>
                  ))}
                </select>
                <i className='fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-navy-300 text-xs pointer-events-none'></i>
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-navy-200 mb-2'>
                Date
              </label>
              <div className='flex gap-2'>
                <div className='relative flex-1'>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className='
                      w-full px-4 py-3 rounded-lg appearance-none
                      bg-navy-900/50 border border-navy-700
                      text-white font-semibold text-sm
                      focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
                      transition-colors cursor-pointer
                    '
                  >
                    {MONTH_NAMES.map((name, i) => (
                      <option key={name} value={String(i + 1)} className='bg-navy-900'>
                        {name.slice(0, 3)}
                      </option>
                    ))}
                  </select>
                  <i className='fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-navy-300 text-xs pointer-events-none'></i>
                </div>

                <div className='relative flex-1'>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className='
                      w-full px-4 py-3 rounded-lg appearance-none
                      bg-navy-900/50 border border-navy-700
                      text-white font-semibold text-sm
                      focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
                      transition-colors cursor-pointer
                    '
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={String(year)} className='bg-navy-900'>
                        {year}
                      </option>
                    ))}
                  </select>
                  <i className='fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-navy-300 text-xs pointer-events-none'></i>
                </div>

                <div className='relative flex-1'>
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className='
                      w-full px-4 py-3 rounded-lg appearance-none
                      bg-navy-900/50 border border-navy-700
                      text-white font-semibold text-sm
                      focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
                      transition-colors cursor-pointer
                    '
                  >
                    <option value='all' className='bg-navy-900'>
                      All days
                    </option>
                    {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map(
                      (day) => (
                        <option key={day} value={String(day)} className='bg-navy-900'>
                          Day {day}
                        </option>
                      )
                    )}
                  </select>
                  <i className='fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-navy-300 text-xs pointer-events-none'></i>
                </div>
              </div>
              <p className='text-navy-500 text-xs mt-2'>
                Showing {selectedDay === 'all' ? `all visits in ${periodLabel}` : periodLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Per-room sections */}
        {grouped.length === 0 ? (
          <div className='glass-panel border-navy-800 rounded-lg py-12 text-center'>
            <i className='fa-solid fa-inbox text-navy-600 text-5xl mb-4'></i>
            <p className='text-navy-300 text-lg'>No room visits found</p>
            <p className='text-navy-500 text-sm mt-1'>
              No one scanned a room door code for this date. Try another month or
              day, or adjust your filters.
            </p>
          </div>
        ) : (
          <div className='space-y-6'>
            {grouped.map(({ room, label, visits }) => {
              const inside = visits.filter((v) => !v.exitedAt).length;
              return (
                <div key={room} className='glass-panel border-navy-800 rounded-lg overflow-hidden'>
                  <div className='flex items-center justify-between px-5 py-4 bg-navy-900/50 border-b border-navy-800'>
                    <div className='flex items-center gap-3'>
                      <i className='fa-solid fa-door-closed text-navy-400'></i>
                      <div>
                        <h2 className='text-white font-bold'>{label}</h2>
                        <p className='text-navy-400 text-xs'>{room}</p>
                      </div>
                    </div>
                    <div className='flex items-center gap-4 text-sm'>
                      <span className='text-navy-300'>
                        {visits.length} {visits.length === 1 ? 'visit' : 'visits'}
                      </span>
                      {inside > 0 && (
                        <span className='px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30'>
                          {inside} inside
                        </span>
                      )}
                    </div>
                  </div>

                  <div className='overflow-x-auto'>
                    <table className='w-full'>
                      <thead className='bg-navy-900/30 border-b border-navy-800'>
                        <tr>
                          {['User', 'Entered', 'Exited', 'Duration', 'Status'].map((h) => (
                            <th
                              key={h}
                              className='px-4 py-3 text-left text-xs font-semibold text-navy-300 uppercase tracking-wider'
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {visits.map((visit) => (
                          <tr
                            key={visit.id}
                            className='border-b border-navy-800/50 last:border-0'
                          >
                            <td className='px-4 py-3'>
                              <p className='text-white font-medium'>
                                {visit.userName || 'Unknown user'}
                              </p>
                              <p className='text-navy-500 text-xs'>
                                {visit.userId.slice(0, 8)}
                              </p>
                            </td>
                            <td className='px-4 py-3 whitespace-nowrap text-navy-200'>
                              {visit.enteredAt.toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className='px-4 py-3 whitespace-nowrap text-navy-200'>
                              {visit.exitedAt
                                ? visit.exitedAt.toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '—'}
                            </td>
                            <td className='px-4 py-3 whitespace-nowrap text-navy-200'>
                              {visitDuration(visit.enteredAt, visit.exitedAt)}
                            </td>
                            <td className='px-4 py-3 whitespace-nowrap'>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                  visit.exitedAt
                                    ? 'bg-navy-700 text-navy-200'
                                    : 'bg-green-500/20 text-green-300 border border-green-500/30'
                                }`}
                              >
                                {visit.exitedAt ? 'left' : 'inside'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className='mt-4 text-center text-navy-300 text-sm'>
          Showing {filtered.length} of {presence.length} total room visits
        </div>
      </main>
    </div>
  );
}
