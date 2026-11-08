'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
  useRecordsStore,
  formatDurationMinutes,
  type ClockInRecord,
} from '@/store/recordsStore';
import { useLiveData } from '@/hooks/useLiveData';
import { usePagination } from '@/hooks/usePagination';
import { isTraineeType } from '@/lib/trainee';
import AdminPageHeader from '@/components/AdminPageHeader';
import AdminShell from '@/components/AdminShell';
import {
  Badge,
  Card,
  DatePeriodFilter,
  EmptyState,
  TablePagination,
  buttonStyles,
  controlClass,
  type DatePeriodMode,
} from '@/components/ui';

/** Compact pill used by the course and status filter groups. */
const filterChipClass = (active: boolean) =>
  `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/50 ${
    active
      ? 'border-yellow-500/60 bg-yellow-500/15 text-yellow-200'
      : 'border-navy-700 bg-navy-950/40 text-navy-300 hover:border-navy-500 hover:bg-navy-800/70 hover:text-white'
  }`;

/** The count inside a filter pill, quieter than the label. */
const filterCountClass = (active: boolean) =>
  `rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums ${
    active ? 'bg-yellow-500/20 text-yellow-200' : 'bg-navy-800 text-navy-400'
  }`;

/** Columns the records table can be sorted by. */
type SortKey =
  | 'userName'
  | 'courseLabel'
  | 'purposeLabel'
  | 'timeIn'
  | 'timeOut'
  | 'durationMinutes'
  | 'status';

/**
 * Reduces a record to a value the comparator can order.
 *
 * Nullable fields collapse to +Infinity so an unset value (no time out, no
 * duration, no course) sorts to the end rather than jumping to the top - an
 * empty cell at the front of an ascending sort reads as a bug.
 */
function sortValue(record: ClockInRecord, key: SortKey): string | number {
  switch (key) {
    case 'timeIn':
      return record.timeIn.getTime();
    case 'timeOut':
      return record.timeOut ? record.timeOut.getTime() : Number.POSITIVE_INFINITY;
    case 'durationMinutes':
      return record.durationMinutes ?? Number.POSITIVE_INFINITY;
    case 'userName':
      return (record.userName ?? '').toLowerCase();
    case 'courseLabel':
      return (record.courseLabel ?? '').toLowerCase();
    case 'purposeLabel':
      return (record.purposeLabel ?? '').toLowerCase();
    case 'status':
      return record.status;
  }
}

export default function RecordsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { records } = useRecordsStore();

  const [searchTerm, setSearchTerm] = useState('');
  // Course is joined from the visitor's profile, so the filter matches the
  // label already shown in the Course column rather than a separate id.
  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  // Date selection. `periodMode` decides whether the filter covers one day or
  // every day in the selected month, so the scope lives in the picker itself
  // rather than in a separate toggle.
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedDay, setSelectedDay] = useState(String(now.getDate()));
  const [periodMode, setPeriodMode] = useState<DatePeriodMode>('day');
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'all' | 'page'>('all');
  const exportRef = useRef<HTMLDivElement>(null);

  // Column sorting. `timeIn` descending is the default because the table is a
  // log: the most recent check-in is the one an admin almost always wants first.
  const [sortKey, setSortKey] = useState<SortKey>('timeIn');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Keep the table live. It used to fetch once on mount, so a new check-in
  // never appeared until the page was reloaded.
  useLiveData({
    records: 'all',
    presence: 'none',
    enabled: isAuthenticated && user?.role === 'admin',
  });

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/verify');
    }
  }, [isAuthenticated, user, router]);

  // Close the export menu when clicking outside of it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter records
  // Dates are compared field-by-field using LOCAL time, so a record matches the
  // calendar day the admin sees regardless of timezone offset in the stored value.
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

  // This page is trainee-only. The visitor type is joined from the profile, so
  // the scope is applied before search/course/status/date filtering. Records
  // whose profile has no type (legacy rows) are not trainees and stay hidden.
  const traineeRecords = records.filter((record) => isTraineeType(record.visitorType));

  // Course tally for the filter buttons. Counted from every loaded trainee
  // record: the number is a property of the course, not of the current search
  // or status selection.
  const courseCounts = (() => {
    const counts = new Map<string, number>();

    for (const record of traineeRecords) {
      if (!record.courseLabel) continue;
      counts.set(record.courseLabel, (counts.get(record.courseLabel) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  })();

  const filteredRecords = traineeRecords.filter((record) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      record.userName?.toLowerCase().includes(term) ||
      record.userId.toLowerCase().includes(term) ||
      // `destination` no longer exists; the room name and the purpose are the
      // two things that now identify where someone was going and why.
      (record.purposeLabel?.toLowerCase().includes(term) ?? false) ||
      (record.courseLabel?.toLowerCase().includes(term) ?? false) ||
      record.room.toLowerCase().includes(term);

    // Course is always shown here: every record in scope is a trainee, and a
    // trainee is enrolled in a course.
    const matchesCourse = courseFilter === 'all' || record.courseLabel === courseFilter;

    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;

    const timeIn = new Date(record.timeIn);
    const matchesDate =
      timeIn.getFullYear() === Number(selectedYear) &&
      timeIn.getMonth() + 1 === Number(selectedMonth) &&
      (periodMode === 'month' || timeIn.getDate() === Number(selectedDay));

    return matchesSearch && matchesCourse && matchesStatus && matchesDate;
  });

  // Clicking a header sorts by it; clicking the active header flips direction.
  // Switching to a new column starts ascending, which is what "sort by this"
  // means when the column is not already the sort.
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedRecords = [...filteredRecords].sort((a, b) => {
    const av = sortValue(a, sortKey);
    const bv = sortValue(b, sortKey);
    const dir = sortDir === 'asc' ? 1 : -1;
    if (typeof av === 'number' && typeof bv === 'number') {
      // Unset values (no time out, no duration) sink to the bottom whichever
      // direction is active, rather than flipping to the top on a descending sort.
      if (!Number.isFinite(av) && !Number.isFinite(bv)) return 0;
      if (!Number.isFinite(av)) return 1;
      if (!Number.isFinite(bv)) return -1;
      return (av - bv) * dir;
    }
    return String(av).localeCompare(String(bv)) * dir;
  });

  // The table only renders the current page. Sorting runs on the full filtered
  // list above, so page 1 is always the top of the sorted result.
  const pagination = usePagination(
    sortedRecords.length,
    [
      searchTerm,
      courseFilter,
      statusFilter,
      selectedYear,
      selectedMonth,
      selectedDay,
      periodMode,
      sortKey,
      sortDir,
    ].join('|')
  );
  const visibleRecords = sortedRecords.slice(pagination.start, pagination.end);

  // What the export menu currently points at.
  const exportRows =
    exportScope === 'page' ? visibleRecords : sortedRecords;

  // A sortable header: the whole label is the click target, and the arrow shows
  // the current column and direction (a faint fa-sort marks the inactive ones).
  const sortHeader = (label: string, key: SortKey) => (
    <button
      type='button'
      onClick={() => toggleSort(key)}
      className='flex items-center gap-2 uppercase tracking-wider hover:text-white transition-colors'
      title={`Sort by ${label}`}
    >
      <span>{label}</span>
      <i
        className={`fa-solid text-[10px] ${
          sortKey === key
            ? sortDir === 'asc'
              ? 'fa-arrow-up text-yellow-400'
              : 'fa-arrow-down text-yellow-400'
            : 'fa-sort text-navy-600'
        }`}
      ></i>
    </button>
  );

  // --- Export helpers -------------------------------------------------------
  // Shared tabular view of a record list. The caller decides whether that is
  // every filtered record or just the page on screen.
  const buildExportData = (records: ClockInRecord[] = exportRows) => {
    // Every exported row is a trainee, so Course is always a column.
    const headers = [
      'User',
      'User ID',
      'Course',
      'Purpose',
      'Building',
      'Room',
      'Time In',
      'Time Out',
      'Duration',
      'Status',
    ];

    // Exported in the order shown on screen, so a sorted view and its export agree.
    const rows = records.map((record) => [
      record.userName || 'User ' + record.userId.slice(0, 8),
      record.userId,
      record.courseLabel ?? '',
      record.purposeLabel ?? '',
      record.building ?? '',
      record.room,
      record.timeIn.toLocaleString('en-US'),
      record.timeOut ? record.timeOut.toLocaleString('en-US') : '',
      // Generated by Postgres; null while the visit is still open.
      formatDurationMinutes(record.durationMinutes),
      record.status,
    ]);

    return { headers, rows };
  };

  const periodLabel =
    periodMode === 'month'
      ? `${MONTH_NAMES[Number(selectedMonth) - 1]} ${selectedYear}`
      : `${MONTH_NAMES[Number(selectedMonth) - 1]} ${selectedDay}, ${selectedYear}`;

  const exportFileName = (ext: string) =>
    'attendance-records-' +
    selectedYear +
    '-' +
    selectedMonth +
    '-' +
    selectedDay +
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
      '<!doctype html><html><head><title>Attendance Records</title>' +
        '<meta charset="utf-8" />' +
        '<style>' +
        'body { font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #111; }' +
        'h1 { font-size: 18px; margin: 0 0 4px; }' +
        'p { font-size: 12px; color: #555; margin: 0 0 16px; }' +
        'table { width: 100%; border-collapse: collapse; font-size: 11px; }' +
        'th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }' +
        'th { background: #f3f4f6; text-transform: uppercase; letter-spacing: 0.03em; }' +
        '</style></head><body>' +
        '<h1>Attendance Records</h1>' +
        `<p>${exportRows.length} record(s) &middot; ${escapeHtml(periodLabel)}</p>` +
        `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>` +
        '</body></html>'
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow='Attendance'
        title='Attendance Records'
        subtitle='Trainee check-in/check-out logs'
        actions={
          <div className='relative' ref={exportRef}>
            <button
              onClick={() => setExportOpen((v) => !v)}
              className={buttonStyles('quiet', 'md')}
            >
              <i className='fa-solid fa-download text-xs'></i>
              Export
              <i
                className={`fa-solid fa-chevron-down text-xs transition-transform ${exportOpen ? 'rotate-180' : ''}`}
              ></i>
            </button>

            {exportOpen && (
              <div className='absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-navy-700 bg-navy-900 shadow-2xl shadow-black/40'>
                {/* Which rows the next export should include. "All rows" is the
                    default because a report is normally the whole filtered set;
                    "This page" is there for copying exactly what is on screen. */}
                <div className='border-b border-navy-700 p-2'>
                  <p className='px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy-400'>
                    Include
                  </p>
                  <div className='grid grid-cols-2 gap-1'>
                    {[
                      { key: 'all' as const, label: 'All rows', count: sortedRecords.length },
                      { key: 'page' as const, label: 'This page', count: visibleRecords.length },
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
                          {option.count} {option.count === 1 ? 'row' : 'rows'}
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
                    className='flex w-full items-center gap-3 px-4 py-2.5 text-left text-navy-200 transition-colors hover:bg-navy-800/50 hover:text-white'
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

      {/* Search - its own panel above the filters so the input spans the
              full width instead of sharing a column with the filter buttons. */}
      <Card className='mb-4'>
        <label className='mb-2 block text-sm font-medium text-navy-200'>Search</label>
        <div className='relative'>
          <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4'>
            <i className='fa-solid fa-magnifying-glass text-navy-500'></i>
          </div>
          <input
            type='text'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder='Search trainee name, course, purpose, or room...'
            className={`${controlClass} pl-12`}
          />
        </div>
      </Card>

      {/* Filters */}
      <Card className='mb-4'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
          {/* Course. This page only shows trainees, so the filter is always
                  present. Buttons rather than a select so each course's record
                  count is visible at a glance. */}
          <div>
            <label className='mb-2 block text-xs font-semibold uppercase tracking-wider text-navy-400'>
              Course
            </label>
            <div className='flex flex-wrap gap-1.5'>
              <button
                type='button'
                onClick={() => setCourseFilter('all')}
                className={filterChipClass(courseFilter === 'all')}
              >
                All
                <span className={filterCountClass(courseFilter === 'all')}>
                  {traineeRecords.length}
                </span>
              </button>
              {courseCounts.map(({ label, count }) => {
                const active = courseFilter === label;
                return (
                  <button
                    type='button'
                    key={label}
                    onClick={() => setCourseFilter(label)}
                    className={filterChipClass(active)}
                  >
                    {label}
                    <span className={filterCountClass(active)}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className='mb-2 block text-xs font-semibold uppercase tracking-wider text-navy-400'>
              Status
            </label>
            <div className='flex flex-wrap gap-1.5'>
              {(['all', 'active', 'completed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={filterChipClass(statusFilter === status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Date Filter - Day or Month scope, picked directly. */}
          <div>
            <label className='mb-2 block text-xs font-semibold uppercase tracking-wider text-navy-400'>
              Date
            </label>
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

      {/* Records Table */}
      <Card padded={false} className='overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-navy-900/50 border-b border-navy-800'>
              <tr>
                <th className='px-3 py-2 text-left text-xs font-semibold text-navy-300'>
                  {sortHeader('User', 'userName')}
                </th>
                <th className='px-3 py-2 text-left text-xs font-semibold text-navy-300'>
                  {sortHeader('Course', 'courseLabel')}
                </th>
                <th className='px-3 py-2 text-left text-xs font-semibold text-navy-300'>
                  {sortHeader('Purpose / Room', 'purposeLabel')}
                </th>
                <th className='px-3 py-2 text-left text-xs font-semibold text-navy-300'>
                  {sortHeader('Time In', 'timeIn')}
                </th>
                <th className='px-3 py-2 text-left text-xs font-semibold text-navy-300'>
                  {sortHeader('Time Out', 'timeOut')}
                </th>
                <th className='px-3 py-2 text-left text-xs font-semibold text-navy-300'>
                  {sortHeader('Duration', 'durationMinutes')}
                </th>
                <th className='px-3 py-2 text-left text-xs font-semibold text-navy-300'>
                  {sortHeader('Status', 'status')}
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-navy-800'>
              {visibleRecords.map((record) => (
                <tr key={record.id} className='hover:bg-navy-900/30 transition-colors'>
                  <td className='px-3 py-2 whitespace-nowrap'>
                    <div className='flex items-center gap-3'>
                      <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/20'>
                        <i className='fa-solid fa-user text-sm text-yellow-400'></i>
                      </div>
                      <div>
                        <p className='text-sm font-semibold text-white'>
                          {record.userName || 'User ' + record.userId.slice(0, 8)}
                        </p>
                        <p className='text-navy-500 text-xs'>{record.userId}</p>
                      </div>
                    </div>
                  </td>
                  <td className='px-3 py-2 whitespace-nowrap'>
                    {record.courseLabel ? (
                      <span className='px-2.5 py-1 rounded-md bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 text-xs font-medium'>
                        {record.courseLabel}
                      </span>
                    ) : (
                      <span className='text-navy-500 text-sm'>—</span>
                    )}
                  </td>
                  <td className='px-3 py-2'>
                    <p className='text-white font-medium'>
                      {record.purposeLabel || 'No purpose recorded'}
                    </p>
                    <p className='text-navy-300 text-sm'>
                      {record.building ? `${record.building} • ` : ''}
                      {record.room}
                    </p>
                  </td>
                  <td className='px-3 py-2 whitespace-nowrap text-navy-200'>
                    {record.timeIn.toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className='px-3 py-2 whitespace-nowrap text-navy-200'>
                    {record.timeOut
                      ? record.timeOut.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className='px-3 py-2 whitespace-nowrap text-navy-200'>
                    {formatDurationMinutes(record.durationMinutes)}
                  </td>
                  <td className='px-3 py-2 whitespace-nowrap'>
                    <Badge tone={record.status === 'active' ? 'success' : 'neutral'} dot>
                      {record.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRecords.length === 0 && (
            <EmptyState
              icon='fa-inbox'
              title='No trainee records found'
              description='No trainee check-in records for the selected date. Try another month or day, or adjust your filters.'
            />
          )}
        </div>

        <TablePagination pagination={pagination} itemLabel='records' />
      </Card>
    </AdminShell>
  );
}
