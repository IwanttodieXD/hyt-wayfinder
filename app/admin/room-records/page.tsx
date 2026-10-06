'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import {
  useRoomPresenceStore,
  visitDuration,
  type RoomPresence,
} from '@/store/roomPresenceStore';
import { useRoomsStore } from '@/store/roomsStore';
import { formatDurationMinutes } from '@/store/recordsStore';
import UserProfile from '@/components/UserProfile';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { useLiveData } from '@/hooks/useLiveData';

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

  const { presence } = useRoomPresenceStore();
  const { getAllRooms, fetchRooms } = useRoomsStore();

  const [searchTerm, setSearchTerm] = useState('');
  // 'all' shows every room at once; otherwise a single room number.
  const [roomFilter, setRoomFilter] = useState('all');

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedDay, setSelectedDay] = useState(String(now.getDate()));
const [exportOpen, setExportOpen] = useState(false);
const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAllowed) {
      fetchRooms();
    }
  }, [isAllowed, fetchRooms]);

  // Keep the visit counts live: the page used to fetch once on mount.
  useLiveData({ records: 'none', presence: 'all', enabled: isAllowed });

  // Close the export menu when clicking outside of it.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInSelectedMonth = new Date(
    Number(selectedYear),
    Number(selectedMonth),
    0
  ).getDate();

  // Only years that actually appear in the data, plus the current one - same
  // approach as the check-in records page.
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

    const matchesRoom = roomFilter === 'all' || entry.roomId === roomFilter;

    return matchesSearch && matchesRoom && matchesDate(entry);
  });

  // Group into per-room sections, keyed by room id. Rooms from the `rooms` table
  // come first so sections keep a stable, familiar order, then any room that was
  // retired but still has visits against it.
  const grouped = useMemo(() => {
    const byRoom = new Map<string, RoomPresence[]>();
    for (const entry of filtered) {
      const list = byRoom.get(entry.roomId) ?? [];
      list.push(entry);
      byRoom.set(entry.roomId, list);
    }

    const known = getAllRooms()
      .filter((r) => byRoom.has(r.id))
      .map((r) => ({
        roomId: r.id,
        room: r.roomNumber,
        label: r.name,
        visits: byRoom.get(r.id) ?? [],
      }));

    const knownIds = new Set(getAllRooms().map((r) => r.id));
    const extra = Array.from(byRoom.entries())
      .filter(([roomId]) => !knownIds.has(roomId))
      .map(([roomId, visits]) => ({
        roomId,
        room: visits[0]?.room || '',
        label: visits[0]?.roomLabel || 'Unknown Room',
        visits,
      }));

    return [...known, ...extra];
  }, [filtered, getAllRooms]);

  // Rooms in the filter dropdown: every room in the table, so an admin can pick a
  // room that currently has no visits instead of it being missing.
  const roomOptions = useMemo(() => {
    const scanned = new Map(presence.map((p) => [p.roomId, p.roomLabel]));
    const knownIds = new Set(getAllRooms().map((r) => r.id));

    return [
      ...getAllRooms().map((r) => ({
        roomId: r.id,
        label: r.name,
        room: r.roomNumber,
      })),
      ...Array.from(scanned.entries())
        .filter(([roomId]) => !knownIds.has(roomId))
        .map(([roomId, label]) => ({ roomId, label, room: label })),
    ];
  }, [presence, getAllRooms]);

  // --- Export helpers -------------------------------------------------------
  // Mirrors the export menu on /admin/records so the two report pages behave
  // identically. Same four formats, same helper shapes.
  //
  // Exports the FILTERED list, not the whole table, so what lands in the file is
  // what the admin was looking at. The room filter matters most here: exporting
  // "everyone in Room 304 on the 10th" is the point of the page.

  /** Room filter as it reads in a sentence, so the file is self-describing. */
  const scopeLabel =
    roomFilter === 'all'
      ? 'All rooms'
      : (roomOptions.find((r) => r.roomId === roomFilter)?.label ?? 'Selected room');

  const buildExportData = () => {
    const headers = [
      'User',
      'User ID',
      'Room',
      'Room Name',
      'Entered',
      'Exited',
      'Duration',
      'Status',
    ];

    const rows = filtered.map((entry) => [
      entry.userName || 'Unknown user',
      entry.userId,
      entry.room,
      entry.roomLabel,
      entry.enteredAt.toLocaleString('en-US'),
      entry.exitedAt ? entry.exitedAt.toLocaleString('en-US') : '',
      // Generated by Postgres; null while the visit is still open. Falls back to
      // the two timestamps so an open row still shows something meaningful.
      formatDurationMinutes(entry.durationMinutes) === '—'
        ? visitDuration(entry.enteredAt, entry.exitedAt)
        : formatDurationMinutes(entry.durationMinutes),
      entry.exitedAt ? 'left' : 'inside',
    ]);

    return { headers, rows };
  };

  const exportFileName = (ext: string) =>
    'room-visits-' +
    selectedYear +
    '-' +
    String(selectedMonth).padStart(2, '0') +
    '-' +
    (selectedDay === 'all' ? 'all-days' : String(selectedDay).padStart(2, '0')) +
    '.' +
    ext;

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const escapeHtml = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // CSV (.csv)
  const handleExportCSV = () => {
    const { headers, rows } = buildExportData();
    const csvEscape = (value: string) => '"' + value.replace(/"/g, '""') + '"';
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => csvEscape(String(cell))).join(','))
      .join('\n');
    // Prepend a UTF-8 BOM so Excel reads the encoding correctly
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, exportFileName('csv'));
  };

  // Excel (.xls) - an HTML table Excel opens natively (no extra dependency)
  const handleExportExcel = () => {
    const { headers, rows } = buildExportData();
    const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
    const body = rows
      .map(
        (row) =>
          `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join('')}</tr>`
      )
      .join('');
    const html =
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
      'xmlns:x="urn:schemas-microsoft-com:office:excel" ' +
      'xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8" /></head>' +
      `<body><table border="1"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
    const blob = new Blob(['\uFEFF' + html], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    });
    downloadBlob(blob, exportFileName('xls'));
  };

  // JSON (.json)
  const handleExportJSON = () => {
    const { headers, rows } = buildExportData();
    const data = rows.map((row) =>
      headers.reduce<Record<string, string>>((acc, header, i) => {
        acc[header] = String(row[i]);
        return acc;
      }, {})
    );
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    downloadBlob(blob, exportFileName('json'));
  };

  // PDF - opens a print-ready report; choose "Save as PDF" in the print dialog
  const handleExportPDF = () => {
    const { headers, rows } = buildExportData();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
    const body = rows
      .map(
        (row) =>
          `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join('')}</tr>`
      )
      .join('');

    printWindow.document.write(
      '<!doctype html><html><head><title>Room Visits</title>' +
        '<meta charset="utf-8" />' +
        '<style>' +
        'body { font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #111; }' +
        'h1 { font-size: 18px; margin: 0 0 4px; }' +
        'p { font-size: 12px; color: #555; margin: 0 0 16px; }' +
        'table { width: 100%; border-collapse: collapse; font-size: 11px; }' +
        'th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }' +
        'th { background: #f3f4f6; text-transform: uppercase; letter-spacing: 0.03em; }' +
        '</style></head><body>' +
        '<h1>Room Visits</h1>' +
        `<p>${filtered.length} visit(s) &middot; ${escapeHtml(periodLabel)} &middot; ${escapeHtml(scopeLabel)}</p>` +
        `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>` +
        '</body></html>'
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const periodLabel =
    selectedDay === 'all'
      ? `${MONTH_NAMES[Number(selectedMonth) - 1]} ${selectedYear}`
      : `${MONTH_NAMES[Number(selectedMonth) - 1]} ${selectedDay}, ${selectedYear}`;

  if (!isAllowed) return null;

  return (
    <div className='min-h-screen'>
      <header className='app-header border-b sticky top-0 z-50'>
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
        <div className='mb-6 flex items-center justify-between gap-4'>
          <Link
            href='/admin'
            className='text-navy-300 hover:text-navy-200 flex items-center gap-2 transition-colors'
          >
            <i className='fa-solid fa-arrow-left'></i>
            <span>Back to Dashboard</span>
          </Link>

          {/* Disabled rather than hidden when there is nothing to export: a
              missing button reads as "this page can't export" rather than
              "there are no rows for the filters you picked". */}
          <div className='relative' ref={exportRef}>
            <button
              onClick={() => setExportOpen((v) => !v)}
              disabled={filtered.length === 0}
              title={
                filtered.length === 0
                  ? 'No room visits match the current filters'
                  : 'Export the filtered visits'
              }
              className='px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/30 transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-yellow-500/20'
            >
              <i className='fa-solid fa-download'></i>
              Export
              <i
                className={`fa-solid fa-chevron-down text-xs transition-transform ${exportOpen ? 'rotate-180' : ''}`}
              ></i>
            </button>

            {exportOpen && filtered.length > 0 && (
              <div className='absolute right-0 mt-2 w-52 bg-navy-900 border border-navy-700 rounded-lg shadow-black/50 overflow-hidden z-50'>
                {[
                  { label: 'CSV (.csv)', icon: 'fa-file-csv', handler: handleExportCSV },
                  {
                    label: 'Excel (.xls)',
                    icon: 'fa-file-excel',
                    handler: handleExportExcel,
                  },
                  { label: 'PDF', icon: 'fa-file-pdf', handler: handleExportPDF },
                  { label: 'JSON (.json)', icon: 'fa-file-code', handler: handleExportJSON },
                ].map((option) => (
                  <button
                    key={option.label}
                    onClick={() => {
                      setExportOpen(false);
                      option.handler();
                    }}
                    className='w-full px-4 py-2.5 text-left text-navy-200 hover:bg-navy-800/50 hover:text-white transition-colors flex items-center gap-3'
                  >
                    <i className={`fa-solid ${option.icon} w-5`}></i>
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
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
                    focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500
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
                    focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500
                    transition-colors cursor-pointer
                  '
                >
                  <option value='all' className='bg-navy-900'>
                    All rooms
                  </option>
                  {roomOptions.map((r) => (
                    <option key={r.roomId} value={r.roomId} className='bg-navy-900'>
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
                      focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500
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
                      focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500
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
                      focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500
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
            {grouped.map(({ roomId, room, label, visits }) => {
              const inside = visits.filter((v) => !v.exitedAt).length;
              return (
                <div key={roomId} className='glass-panel border-navy-800 rounded-lg overflow-hidden'>
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
