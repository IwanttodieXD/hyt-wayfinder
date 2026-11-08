'use client';

import { cn } from '@/lib/cn';
import {
  PAGE_SIZE_OPTIONS,
  type PaginationResult,
} from '@/hooks/usePagination';

interface TablePaginationProps {
  pagination: PaginationResult;
  /** Plural noun for the rows, e.g. "records" or "visits". */
  itemLabel?: string;
  className?: string;
}

/**
 * Row-count selector and page controls for the admin tables.
 *
 * Sits at the bottom of a table card. The "Showing X-Y of Z" line is the same
 * place the old static summary lived, so the layout does not move around when
 * pagination is added.
 */
export default function TablePagination({
  pagination,
  itemLabel = 'rows',
  className,
}: TablePaginationProps) {
  const {
    page,
    pageSize,
    total,
    totalPages,
    rangeStart,
    rangeEnd,
    setPage,
    setPageSize,
  } = pagination;

  const previousDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-navy-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <p className='text-sm text-navy-300'>
        {total === 0 ? (
          <>No {itemLabel} to show</>
        ) : (
          <>
            Showing{' '}
            <span className='font-semibold text-white'>
              {rangeStart}&ndash;{rangeEnd}
            </span>{' '}
            of <span className='font-semibold text-white'>{total}</span>{' '}
            {itemLabel}
          </>
        )}
      </p>

      <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
        <label className='flex items-center gap-2 text-sm text-navy-300'>
          <span>Rows per page</span>
          <span className='relative'>
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              aria-label='Rows per page'
              className='cursor-pointer appearance-none rounded-lg border border-navy-700 bg-navy-950/60 py-1.5 pl-3 pr-8 text-sm text-white transition-colors focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/40'
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size} className='bg-navy-900'>
                  {size}
                </option>
              ))}
            </select>
            <i className='fa-solid fa-chevron-down pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-navy-400'></i>
          </span>
        </label>

        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={() => setPage(page - 1)}
            disabled={previousDisabled}
            aria-label='Previous page'
            title='Previous page'
            className='inline-flex h-8 w-8 items-center justify-center rounded-lg border border-navy-700 bg-navy-800 text-navy-200 transition-colors hover:bg-navy-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/60 disabled:pointer-events-none disabled:opacity-40'
          >
            <i className='fa-solid fa-chevron-left text-xs'></i>
          </button>

          <span className='min-w-[5.5rem] text-center text-sm tabular-nums text-navy-300'>
            Page <span className='font-semibold text-white'>{page}</span> of{' '}
            {totalPages}
          </span>

          <button
            type='button'
            onClick={() => setPage(page + 1)}
            disabled={nextDisabled}
            aria-label='Next page'
            title='Next page'
            className='inline-flex h-8 w-8 items-center justify-center rounded-lg border border-navy-700 bg-navy-800 text-navy-200 transition-colors hover:bg-navy-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/60 disabled:pointer-events-none disabled:opacity-40'
          >
            <i className='fa-solid fa-chevron-right text-xs'></i>
          </button>
        </div>
      </div>
    </div>
  );
}
