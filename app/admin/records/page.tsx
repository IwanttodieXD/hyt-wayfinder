'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useRecordsStore, formatDurationMinutes, type ClockInRecord } from '@/store/recordsStore';
import { useLiveData } from '@/hooks/useLiveData';
import Link from 'next/link';
import UserProfile from '@/components/UserProfile';

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
 * Visitor types that are enrolled in a course. For every other type the Course
 * column and Course filter are hidden, because a course is not part of their
 * visit.
 */
const COURSE_VISITOR_TYPES = ['trainee', 'trainer'];

function isCourseVisitorType(label: string): boolean {
  return (
    label === 'all' ||
    COURSE_VISITOR_TYPES.includes(label.trim().toLowerCase())
  );
}

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
  // Visitor type is joined from the visitor's profile, like the course. Course
  // only applies to trainees and trainers, so the Course column and filter are
  // hidden for every other type.
  const [visitorTypeFilter, setVisitorTypeFilter] = useState('all');
  // Course is joined from the visitor's profile, so the filter matches the
  // label already shown in the Course column rather than a separate id.
  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  // Date selection. The calendar picks a specific day; "All month" switches the
  // filter to the whole selected month instead.
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedDay, setSelectedDay] = useState(String(now.getDate()));
  const [exportOpen, setExportOpen] = useState(false);
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
      router.push('/login');
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

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

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

  // `yyyy-mm-dd`, the value a native date input expects. When the whole month
  // is selected, the input shows the first of that month as an anchor for the
  // calendar header while the filter ignores the day.
  const selectedDateValue = [
    selectedYear,
    String(selectedMonth).padStart(2, '0'),
    String(selectedDay === 'all' ? 1 : Number(selectedDay)).padStart(2, '0'),
  ].join('-');

  const handleDateChange = (value: string) => {
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return;

    setSelectedYear(String(Number(year)));
    setSelectedMonth(String(Number(month)));
    setSelectedDay(String(Number(day)));
  };

  // Switching back to a specific day anchors on the 1st of the visible month;
  // the admin can then pick any day from the calendar.
  const toggleWholeMonth = () =>
    setSelectedDay((day) => (day === 'all' ? '1' : 'all'));

  // Course tally for the filter buttons. Counted from every loaded record, the
  // same way the Manage Users visitor-type buttons count users: the number is a
  // property of the course, not of the current search or status selection.
  const courseCounts = (() => {
    const counts = new Map<string, number>();

    for (const record of records) {
      if (!record.courseLabel) continue;
      counts.set(
        record.courseLabel,
        (counts.get(record.courseLabel) ?? 0) + 1
      );
    }

    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  })();

  // Visitor type tally for the filter buttons. Same rule as the course tally:
  // counted from every loaded record, not from the current search/status view.
  const visitorTypeCounts = (() => {
    const counts = new Map<string, number>();

    for (const record of records) {
      if (!record.visitorType) continue;
      counts.set(record.visitorType, (counts.get(record.visitorType) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  })();

  // Course is a trainee/trainer attribute, so it is only shown while the
  // visitor-type filter is "all", "Trainee" or "Trainer".
  const showCourse = isCourseVisitorType(visitorTypeFilter);

  const filteredRecords = records.filter((record) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      record.userName?.toLowerCase().includes(term) ||
      record.userId.toLowerCase().includes(term) ||
      // `destination` no longer exists; the room name and the purpose are the
      // two things that now identify where someone was going and why.
      (record.purposeLabel?.toLowerCase().includes(term) ?? false) ||
      (record.courseLabel?.toLowerCase().includes(term) ?? false) ||
      record.room.toLowerCase().includes(term);

    const matchesVisitorType =
      visitorTypeFilter === 'all' || record.visitorType === visitorTypeFilter;

    // Ignored while the Course filter is hidden, so a filter chosen for trainees
    // cannot silently keep excluding records after switching to another type.
    const matchesCourse =
      !showCourse ||
      courseFilter === 'all' ||
      record.courseLabel === courseFilter;

    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;

    const timeIn = new Date(record.timeIn);
    const matchesDate =
      timeIn.getFullYear() === Number(selectedYear) &&
      timeIn.getMonth() + 1 === Number(selectedMonth) &&
      (selectedDay === 'all' || timeIn.getDate() === Number(selectedDay));

    return (
      matchesSearch &&
      matchesVisitorType &&
      matchesCourse &&
      matchesStatus &&
      matchesDate
    );
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

  // Selecting a type that has no course clears the now-hidden course filter and
  // moves sorting off the hidden Course column, so neither keeps affecting the
  // table invisibly.
  const selectVisitorType = (label: string) => {
    setVisitorTypeFilter(label);
    if (!isCourseVisitorType(label)) {
      setCourseFilter('all');
      if (sortKey === 'courseLabel') setSortKey('timeIn');
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
  // Shared tabular view of the currently filtered records.
  const buildExportData = () => {
    // Match the on-screen table: the Course column is only present when the
    // current visitor-type filter is all/trainee/trainer.
    const headers = [
      'User',
      'User ID',
      ...(showCourse ? ['Course'] : []),
      'Purpose',
      'Building',
      'Room',
      'Time In',
      'Time Out',
      'Duration',
      'Status',
    ];

    // Exported in the order shown on screen, so a sorted view and its export agree.
    const rows = sortedRecords.map((record) => [
      record.userName || 'User ' + record.userId.slice(0, 8),
      record.userId,
      ...(showCourse ? [record.courseLabel ?? ''] : []),
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
    selectedDay === 'all'
      ? `${MONTH_NAMES[Number(selectedMonth) - 1]} ${selectedYear}`
      : `${MONTH_NAMES[Number(selectedMonth) - 1]} ${selectedDay}, ${selectedYear}`;

  const exportFileName = (ext: string) =>
    'attendance-records-' + selectedYear + '-' + selectedMonth + '-' + selectedDay + '.' + ext;

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
        `<p>${filteredRecords.length} record(s) &middot; ${escapeHtml(periodLabel)}</p>` +
        `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>` +
        '</body></html>'
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <>
      <div className='min-h-screen'>
        {/* Header */}
        <header className='app-header border-b sticky top-0 z-50'>
          <div className='max-w-7xl mx-auto px-4 py-3 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <Link href='/admin' className='flex items-center gap-3'>
                <div className='w-12 h-12 flex items-center justify-center overflow-hidden'>
                  <img
                    src='/hyt_logo.png'
                    alt='HYT Logo'
                    className='w-full h-full object-contain'
                  />
                </div>
                <div>
                  <h1 className='text-white font-bold text-lg leading-none'>
                    Attendance Records
                  </h1>
                  <p className='text-navy-300 text-xs mt-0.5'>
                    All check-in/check-out logs
                  </p>
                </div>
              </Link>
            </div>

            <UserProfile />
          </div>
        </header>

        {/* Main Content */}
        <main className='max-w-7xl mx-auto px-4 py-5'>
          {/* Page Header */}
          <div className='flex items-center justify-between mb-6'>
            <Link
              href='/admin'
              className='text-navy-300 hover:text-navy-200 flex items-center gap-2 transition-colors'
            >
              <i className='fa-solid fa-arrow-left'></i>
              <span>Back to Dashboard</span>
            </Link>

            <div className='relative' ref={exportRef}>
              <button
                onClick={() => setExportOpen((v) => !v)}
                className='px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/30 transition-colors flex items-center gap-2'
              >
                <i className='fa-solid fa-download'></i>
                Export
                <i
                  className={`fa-solid fa-chevron-down text-xs transition-transform ${exportOpen ? 'rotate-180' : ''}`}
                ></i>
              </button>

              {exportOpen && (
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

          {/* Search - its own panel above the filters so the input spans the
              full width instead of sharing a column with the filter buttons. */}
          <div className='glass-panel border-navy-800 rounded-lg p-6 mb-6'>
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
                placeholder='Search by name, course, purpose, or room...'
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

          {/* Filters */}
          <div className='glass-panel border-navy-800 rounded-lg p-6 mb-6'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
              {/* Visitor type and course. Buttons rather than a select so each
                  option's record count is visible at a glance, matching the
                  filter on Manage Users. */}
              <div>
                <label className='block text-sm font-medium text-navy-200 mb-2'>
                  Visitor type
                </label>
                <div className='flex flex-wrap gap-2'>
                  <button
                    type='button'
                    onClick={() => selectVisitorType('all')}
                    className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors border-2 ${
                      visitorTypeFilter === 'all'
                        ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500'
                        : 'bg-navy-900/50 text-navy-300 border-navy-700 hover:border-navy-600'
                    }`}
                  >
                    All ({records.length})
                  </button>
                  {visitorTypeCounts.map(({ label, count }) => (
                    <button
                      type='button'
                      key={label}
                      onClick={() => selectVisitorType(label)}
                      className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors border-2 ${
                        visitorTypeFilter === label
                          ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500'
                          : 'bg-navy-900/50 text-navy-300 border-navy-700 hover:border-navy-600'
                      }`}
                    >
                      {label} ({count})
                    </button>
                  ))}
                </div>

                {/* Course only applies to trainees and trainers, so the whole
                    filter disappears for every other visitor type. Buttons
                    rather than a select so each course's record count is visible
                    at a glance. */}
                {showCourse && (
                  <>
                    <label className='block text-sm font-medium text-navy-200 mt-3 mb-2'>
                      Course
                    </label>
                    <div className='flex flex-wrap gap-2'>
                      <button
                        type='button'
                        onClick={() => setCourseFilter('all')}
                        className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors border-2 ${
                          courseFilter === 'all'
                            ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500'
                            : 'bg-navy-900/50 text-navy-300 border-navy-700 hover:border-navy-600'
                        }`}
                      >
                        All ({records.length})
                      </button>
                      {courseCounts.map(({ label, count }) => (
                        <button
                          type='button'
                          key={label}
                          onClick={() => setCourseFilter(label)}
                          className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors border-2 ${
                            courseFilter === label
                              ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500'
                              : 'bg-navy-900/50 text-navy-300 border-navy-700 hover:border-navy-600'
                          }`}
                        >
                          {label} ({count})
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Status Filter */}
              <div>
                <label className='block text-sm font-medium text-navy-200 mb-2'>
                  Status
                </label>
                <div className='flex gap-2'>
                  {(['all', 'active', 'completed'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`
                  flex-1 px-4 py-3 rounded-lg font-semibold text-sm transition-colors
                  ${
                    statusFilter === status
                      ? 'bg-yellow-500/20 text-yellow-300 border-2 border-yellow-500'
                      : 'bg-navy-900/50 text-navy-300 border-2 border-navy-700 hover:border-navy-600'
                  }
                      `}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Filter - calendar day, or the whole selected month */}
              <div>
                <label className='block text-sm font-medium text-navy-200 mb-2'>
                  Date
                </label>
                <div className='flex flex-col sm:flex-row gap-2'>
                  <input
                    type='date'
                    value={selectedDateValue}
                    onChange={(e) => handleDateChange(e.target.value)}
                    aria-label='Filter records by date'
                    className='
                      flex-1 min-w-0 px-4 py-3 rounded-lg
                      bg-navy-900/50 border border-navy-700
                      text-white font-semibold text-sm
                      focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500
                      transition-colors cursor-pointer
                      '
                  />
                  <button
                    type='button'
                    onClick={toggleWholeMonth}
                    aria-pressed={selectedDay === 'all'}
                    className={`px-4 py-3 rounded-lg font-semibold text-sm transition-colors border-2 flex items-center justify-center gap-2 ${
                      selectedDay === 'all'
                        ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500'
                        : 'bg-navy-900/50 text-navy-300 border-navy-700 hover:border-navy-600'
                    }`}
                  >
                    <i
                      className={`fa-solid ${
                        selectedDay === 'all'
                          ? 'fa-calendar-days'
                          : 'fa-calendar-day'
                      }`}
                    ></i>
                    All month
                  </button>
                </div>

                {/* Active date description */}
                <p className='text-navy-500 text-xs mt-2'>
                  Showing{' '}
                  {selectedDay === 'all'
                    ? `all records in ${MONTH_NAMES[Number(selectedMonth) - 1]} ${selectedYear}`
                    : `${MONTH_NAMES[Number(selectedMonth) - 1]} ${selectedDay}, ${selectedYear}`}
                </p>
              </div>
            </div>
          </div>

          {/* Records Table */}
          <div className='glass-panel border-navy-800 rounded-lg overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-navy-900/50 border-b border-navy-800'>
                  <tr>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-navy-300'>
                      {sortHeader('User', 'userName')}
                    </th>
                    {showCourse && (
                      <th className='px-4 py-3 text-left text-xs font-semibold text-navy-300'>
                        {sortHeader('Course', 'courseLabel')}
                      </th>
                    )}
                    <th className='px-4 py-3 text-left text-xs font-semibold text-navy-300'>
                      {sortHeader('Purpose / Room', 'purposeLabel')}
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-navy-300'>
                      {sortHeader('Time In', 'timeIn')}
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-navy-300'>
                      {sortHeader('Time Out', 'timeOut')}
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-navy-300'>
                      {sortHeader('Duration', 'durationMinutes')}
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-navy-300'>
                      {sortHeader('Status', 'status')}
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-navy-800'>
                  {sortedRecords.map((record) => (
                    <tr
                      key={record.id}
                      className='hover:bg-navy-900/30 transition-colors'
                    >
                      <td className='px-4 py-3 whitespace-nowrap'>
                        <div className='flex items-center gap-3'>
                          <div className='w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center'>
                            <i className='fa-solid fa-user text-yellow-400'></i>
                          </div>
                          <div>
                            <p className='text-white font-semibold'>
                              {record.userName || 'User ' + record.userId.slice(0, 8)}
                            </p>
                            <p className='text-navy-500 text-xs'>{record.userId}</p>
                          </div>
                        </div>
                      </td>
                      {showCourse && (
                        <td className='px-4 py-3 whitespace-nowrap'>
                          {record.courseLabel ? (
                            <span className='px-2.5 py-1 rounded-md bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 text-xs font-medium'>
                              {record.courseLabel}
                            </span>
                          ) : (
                            <span className='text-navy-500 text-sm'>—</span>
                          )}
                        </td>
                      )}
                      <td className='px-4 py-3'>
                        <p className='text-white font-medium'>
                          {record.purposeLabel || 'No purpose recorded'}
                        </p>
                        <p className='text-navy-300 text-sm'>
                          {record.building ? `${record.building} • ` : ''}
                          {record.room}
                        </p>
                      </td>
                      <td className='px-4 py-3 whitespace-nowrap text-navy-200'>
                        {record.timeIn.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className='px-4 py-3 whitespace-nowrap text-navy-200'>
                        {record.timeOut
                          ? record.timeOut.toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className='px-4 py-3 whitespace-nowrap text-navy-200'>
                        {formatDurationMinutes(record.durationMinutes)}
                      </td>
                      <td className='px-4 py-3 whitespace-nowrap'>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            record.status === 'active'
                              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                              : 'bg-navy-700 text-navy-200'
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredRecords.length === 0 && (
                <div className='text-center py-8'>
                  <i className='fa-solid fa-inbox text-navy-600 text-5xl mb-4'></i>
                  <p className='text-navy-300 text-lg'>No records found</p>
                  <p className='text-navy-500 text-sm mt-1'>
                    No check-in records for the selected date. Try another month or day,
                    or adjust your filters.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Results Summary */}
          <div className='mt-4 text-center text-navy-300 text-sm'>
            Showing {filteredRecords.length} of {records.length} records
            {selectedDay === 'all'
              ? ` (${MONTH_NAMES[Number(selectedMonth) - 1]} ${selectedYear})`
              : ` (${MONTH_NAMES[Number(selectedMonth) - 1]} ${selectedDay}, ${selectedYear})`}
          </div>
        </main>
      </div>
    </>
  );
}
