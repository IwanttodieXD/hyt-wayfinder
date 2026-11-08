'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useRoomPresenceStore,
  visitDuration,
  type RoomPresence,
} from '@/store/roomPresenceStore';
import { useRoomsStore } from '@/store/roomsStore';
import { formatDurationMinutes } from '@/store/recordsStore';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { useLiveData } from '@/hooks/useLiveData';
import { usePagination } from '@/hooks/usePagination';
import AdminPageHeader from '@/components/AdminPageHeader';
import AdminShell from '@/components/AdminShell';
import {
  Badge,
  Card,
  DatePeriodFilter,
  EmptyState,
  StatCard,
  TablePagination,
  buttonStyles,
  controlClass,
  type DatePeriodMode,
} from '@/components/ui';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Room visit history, admin-only.
 *
 * This is the room-side counterpart to /admin/records: that page answers "who
 * is in the building and for how long" (attendance), this one answers "who went
 * into Room 304, when, and how long were they there" (presence). They come
 * from different tables on purpose, so neither can imply the other.
 *
 * Rooms come from the `rooms` table so rooms with no visits still appear as
 * empty, rather than silently vanishing from the report.
 */
export default function RoomRecordsPage() {
  const isAllowed = useRoleGuard(['admin'], '/verify');

  const { presence } = useRoomPresenceStore();
  const { getAllRooms, fetchRooms } = useRoomsStore();

  const [searchTerm, setSearchTerm] = useState('');
  // 'all' shows every room at once; otherwise a single room number.
  const [roomFilter, setRoomFilter] = useState('all');

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedDay, setSelectedDay] = useState(String(now.getDate()));
  const [periodMode, setPeriodMode] = useState<DatePeriodMode>('day');
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'all' | 'page'>('all');
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

  // `yyyy-mm-dd`, the value a native date input expects.
  const selectedDateValue = [
    selectedYear,
    String(selectedMonth).padStart(2, '0'),
    String(selectedDay).padStart(2, '0'),
  ].join('-');

  // `yyyy-mm`, the value a native month input expects.
  const selectedMonthValue = [selectedYear, String(selectedMonth).padStart(2, '0')].join(
    '-'
  );

  const handleDateChange = (value: string) => {
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return;

    setSelectedYear(String(Number(year)));
    setSelectedMonth(String(Number(month)));
    setSelectedDay(String(Number(day)));
    setPeriodMode('day');
  };

  const handleMonthChange = (value: string) => {
    const [year, month] = value.split('-');
    if (!year || !month) return;

    setSelectedYear(String(Number(year)));
    setSelectedMonth(String(Number(month)));
    setPeriodMode('month');
  };

  // Switching from Month back to Day keeps the same day where possible. A day
  // like the 31st does not exist in every month, so clamp it to the selected
  // month instead of handing the date input an invalid value.
  const handlePeriodModeChange = (mode: DatePeriodMode) => {
    if (mode === 'day') {
      const daysInMonth = new Date(
        Number(selectedYear),
        Number(selectedMonth),
        0
      ).getDate();
      setSelectedDay((day) => String(Math.min(Number(day) || 1, daysInMonth)));
    }
    setPeriodMode(mode);
  };

  // Dates are compared field-by-field in LOCAL time so a visit matches the
  // calendar day the admin sees, regardless of the stored UTC offset.
  const matchesDate = (entry: RoomPresence) => {
    const entered = entry.enteredAt;
    return (
      entered.getFullYear() === Number(selectedYear) &&
      entered.getMonth() + 1 === Number(selectedMonth) &&
      (periodMode === 'month' || entered.getDate() === Number(selectedDay))
    );
  };

  const filtered = presence.filter((entry) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      entry.userName?.toLowerCase().includes(term) ||
      entry.courseLabel?.toLowerCase().includes(term) ||
      entry.userId.toLowerCase().includes(term) ||
      entry.room.toLowerCase().includes(term) ||
      entry.roomLabel.toLowerCase().includes(term);

    const matchesRoom = roomFilter === 'all' || entry.roomId === roomFilter;

    return matchesSearch && matchesRoom && matchesDate(entry);
  });

  // Rooms are counted from every filtered visit, not just the visible page, so
  // the summary tile does not change when the admin flips pages.
  const roomCount = new Set(filtered.map((entry) => entry.roomId)).size;

  // Paginate the flat visit list, then group only that slice. Paginating after
  // grouping would make a room's section break across pages in an unpredictable
  // order; slicing first keeps every page a fixed number of rows.
  const pagination = usePagination(
    filtered.length,
    [
      searchTerm,
      roomFilter,
      selectedYear,
      selectedMonth,
      selectedDay,
      periodMode,
    ].join('|')
  );
  const visibleEntries = filtered.slice(pagination.start, pagination.end);

  // What the export menu currently points at.
  const exportRows = exportScope === 'page' ? visibleEntries : filtered;

  // Group the visible visits into per-room sections, keyed by room id. Rooms from
  // the `rooms` table come first so sections keep a stable, familiar order, then
  // any room that was retired but still has visits against it.
  const grouped = useMemo(() => {
    const byRoom = new Map<string, RoomPresence[]>();
    for (const entry of visibleEntries) {
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
  }, [visibleEntries, getAllRooms]);

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

  const buildExportData = (entries: RoomPresence[] = exportRows) => {
    const headers = [
      'User',
      'Course',
      'User ID',
      'Room',
      'Room Name',
      'Entered',
      'Exited',
      'Duration',
      'Status',
    ];

    const rows = entries.map((entry) => [
      entry.userName || 'Unknown user',
      entry.courseLabel ?? '',
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
    (periodMode === 'month' ? 'all-days' : String(selectedDay).padStart(2, '0')) +
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
        `<p>${exportRows.length} visit(s) &middot; ${escapeHtml(periodLabel)} &middot; ${escapeHtml(scopeLabel)}</p>` +
        `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>` +
        '</body></html>'
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const periodLabel =
    periodMode === 'month'
      ? `${MONTH_NAMES[Number(selectedMonth) - 1]} ${selectedYear}`
      : `${MONTH_NAMES[Number(selectedMonth) - 1]} ${selectedDay}, ${selectedYear}`;

  if (!isAllowed) return null;

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow='Activity'
        title='Room Visits'
        subtitle='Who entered each room, and when'
        actions={
          <div className='relative' ref={exportRef}>
            {/* Disabled rather than hidden when there is nothing to export: a
                missing button reads as "this page can't export" rather than
                "there are no rows for the filters you picked". */}
            <button
              onClick={() => setExportOpen((v) => !v)}
              disabled={filtered.length === 0}
              title={
                filtered.length === 0
                  ? 'No room visits match the current filters'
                  : 'Export the filtered visits'
              }
              className={`${buttonStyles('quiet', 'md')} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <i className='fa-solid fa-download text-xs'></i>
              Export
              <i
                className={`fa-solid fa-chevron-down text-xs transition-transform ${exportOpen ? 'rotate-180' : ''}`}
              ></i>
            </button>

            {exportOpen && filtered.length > 0 && (
              <div className='absolute right-0 mt-2 w-56 bg-navy-900 border border-navy-700 rounded-lg shadow-black/50 overflow-hidden z-50'>
                {/* Which visits the next export should include. Defaults to the
                    whole filtered set; "This page" copies exactly what is shown. */}
                <div className='border-b border-navy-700 p-2'>
                  <p className='px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy-400'>
                    Include
                  </p>
                  <div className='grid grid-cols-2 gap-1'>
                    {[
                      { key: 'all' as const, label: 'All rows', count: filtered.length },
                      {
                        key: 'page' as const,
                        label: 'This page',
                        count: visibleEntries.length,
                      },
                    ].map((option) => (
                      <button
                        key={option.key}
                        type='button'
                        onClick={() => setExportScope(option.key)}
                        className={`rounded-lg px-2 py-1.5 text-center text-xs font-semibold transition-colors ${
                          exportScope === option.key
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'text-navy-300 hover:bg-navy-800/60 hover:text-white'
                        }`}
                      >
                        {option.label}
                        <span className='block text-[10px] font-normal opacity-80'>
                          {option.count} {option.count === 1 ? 'visit' : 'visits'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {[
                  { label: 'CSV (.csv)', icon: 'fa-file-csv', handler: handleExportCSV },
                  {
                    label: 'Excel (.xls)',
                    icon: 'fa-file-excel',
                    handler: handleExportExcel,
                  },
                  { label: 'PDF', icon: 'fa-file-pdf', handler: handleExportPDF },
                  {
                    label: 'JSON (.json)',
                    icon: 'fa-file-code',
                    handler: handleExportJSON,
                  },
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
        }
      />

      {/* Summary */}
      <div className='mb-4 grid grid-cols-1 gap-3 md:grid-cols-3'>
        <StatCard
          label='Total visits'
          value={filtered.length}
          hint={periodLabel}
          icon='fa-person-walking-arrow-right'
          tone='brand'
        />
        <StatCard
          label='Rooms visited'
          value={roomCount}
          hint='Rooms with at least one visit'
          icon='fa-door-open'
          tone='info'
        />
        <StatCard
          label='Still inside'
          value={filtered.filter((entry) => !entry.exitedAt).length}
          hint='Visits without an exit scan'
          icon='fa-user-clock'
          tone='success'
        />
      </div>

      {/* Filters */}
      <Card className='mb-4'>
        <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
          <div>
            <label className='block text-sm font-medium text-navy-200 mb-2'>Search</label>
            <div className='relative'>
              <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4'>
                <i className='fa-solid fa-magnifying-glass text-navy-500'></i>
              </div>
              <input
                type='text'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder='Search by name, course, or room...'
                className={`${controlClass} pl-12`}
              />
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-navy-200 mb-2'>Room</label>
            <div className='relative'>
              <select
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
                className={`${controlClass} appearance-none pr-10`}
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
            <label className='block text-sm font-medium text-navy-200 mb-2'>Date</label>
            <DatePeriodFilter
              mode={periodMode}
              onModeChange={handlePeriodModeChange}
              dateValue={selectedDateValue}
              onDateChange={handleDateChange}
              monthValue={selectedMonthValue}
              onMonthChange={handleMonthChange}
              summary={`Showing ${periodLabel}`}
            />
          </div>
        </div>
      </Card>

      {/* Per-room sections */}
      {grouped.length === 0 ? (
        <Card>
          <EmptyState
            icon='fa-inbox'
            title='No room visits found'
            description='No one scanned a room door code for this date. Try another month or day, or adjust your filters.'
          />
        </Card>
      ) : (
        <div className='space-y-4'>
          {grouped.map(({ roomId, room, label, visits }) => {
            const inside = visits.filter((v) => !v.exitedAt).length;
            return (
              <Card key={roomId} padded={false} className='overflow-hidden'>
                <div className='flex items-center justify-between border-b border-navy-800 bg-navy-900/50 px-4 py-3'>
                  <div className='flex items-center gap-3'>
                    <span className='flex h-9 w-9 items-center justify-center rounded-xl bg-navy-800 text-navy-300'>
                      <i className='fa-solid fa-door-closed text-sm'></i>
                    </span>
                    <div>
                      <h2 className='font-bold text-white'>{label}</h2>
                      <p className='text-xs text-navy-400'>{room}</p>
                    </div>
                  </div>
                  <div className='flex items-center gap-3 text-sm'>
                    <span className='text-navy-300'>
                      {visits.length} {visits.length === 1 ? 'visit' : 'visits'}
                    </span>
                    {inside > 0 && (
                      <Badge tone='success' dot>
                        {inside} inside
                      </Badge>
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
                            className='px-3 py-2 text-left text-xs font-semibold text-navy-300 uppercase tracking-wider'
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
                          <td className='px-3 py-2'>
                            <p className='text-sm font-medium text-white'>
                              {visit.userName || 'Unknown user'}
                            </p>
                            <p className='text-navy-500 text-xs'>
                              {visit.courseLabel ?? 'No course'} ·{' '}
                              {visit.userId.slice(0, 8)}
                            </p>
                          </td>
                          <td className='px-3 py-2 whitespace-nowrap text-navy-200'>
                            {visit.enteredAt.toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className='px-3 py-2 whitespace-nowrap text-navy-200'>
                            {visit.exitedAt
                              ? visit.exitedAt.toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </td>
                          <td className='px-3 py-2 whitespace-nowrap text-navy-200'>
                            {visitDuration(visit.enteredAt, visit.exitedAt)}
                          </td>
                          <td className='px-3 py-2 whitespace-nowrap'>
                            <Badge tone={visit.exitedAt ? 'neutral' : 'success'} dot>
                              {visit.exitedAt ? 'left' : 'inside'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card padded={false} className='mt-4 overflow-hidden'>
        <TablePagination pagination={pagination} itemLabel='visits' />
      </Card>
    </AdminShell>
  );
}
