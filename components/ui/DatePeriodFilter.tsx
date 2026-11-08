'use client';

import { cn } from '@/lib/cn';
import { controlClass } from './Field';

export type DatePeriodMode = 'day' | 'month';

interface DatePeriodFilterProps {
  /** Whether the filter covers one day or the whole month. */
  mode: DatePeriodMode;
  onModeChange: (mode: DatePeriodMode) => void;
  /** `yyyy-mm-dd`, the value an `<input type="date">` uses. */
  dateValue: string;
  onDateChange: (value: string) => void;
  /** `yyyy-mm`, the value an `<input type="month">` uses. */
  monthValue: string;
  onMonthChange: (value: string) => void;
  /** Short description of the active range. */
  summary?: string;
  className?: string;
}

/**
 * Compact date filter for the admin record tables.
 *
 * Instead of a date input plus an "All month" button, the scope and the value
 * share one row: pick Day or Month, then use the matching native picker. The
 * native controls keep keyboard and mobile behaviour, and the month picker
 * removes the old trick of anchoring a whole-month filter on the 1st.
 */
export default function DatePeriodFilter({
  mode,
  onModeChange,
  dateValue,
  onDateChange,
  monthValue,
  onMonthChange,
  summary,
  className,
}: DatePeriodFilterProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
        <div
          role='group'
          aria-label='Date range'
          className='inline-flex flex-shrink-0 rounded-xl border border-navy-700 bg-navy-950/60 p-1'
        >
          {(
            [
              { value: 'day', label: 'Day', icon: 'fa-calendar-day' },
              { value: 'month', label: 'Month', icon: 'fa-calendar-days' },
            ] as const
          ).map((option) => {
            const active = mode === option.value;

            return (
              <button
                key={option.value}
                type='button'
                aria-pressed={active}
                onClick={() => onModeChange(option.value)}
                className={cn(
                  'inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/60 sm:flex-none',
                  active
                    ? 'bg-yellow-500/15 text-yellow-200'
                    : 'text-navy-400 hover:text-white'
                )}
              >
                <i className={`fa-solid ${option.icon}`}></i>
                {option.label}
              </button>
            );
          })}
        </div>

        {mode === 'day' ? (
          <input
            type='date'
            value={dateValue}
            onChange={(event) => onDateChange(event.target.value)}
            aria-label='Filter records by day'
            className={cn(controlClass, 'sm:flex-1')}
          />
        ) : (
          <input
            type='month'
            value={monthValue}
            onChange={(event) => onMonthChange(event.target.value)}
            aria-label='Filter records by month'
            className={cn(controlClass, 'sm:flex-1')}
          />
        )}
      </div>

      {summary && <p className='text-xs text-navy-500'>{summary}</p>}
    </div>
  );
}
