'use client';

import { useEffect, useState } from 'react';

/** Row counts offered at the bottom of every admin table. */
export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export interface PaginationResult {
  /** 1-based current page, always inside `1..totalPages`. */
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  /** 1-based index of the first row on the page, or 0 when there are no rows. */
  rangeStart: number;
  /** 1-based index of the last row on the page, or 0 when there are no rows. */
  rangeEnd: number;
  /** 0-based bounds for `Array.prototype.slice`. */
  start: number;
  end: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

/**
 * Client-side pagination for a table.
 *
 * `resetKey` should be a string built from the active filters (search term,
 * dropdown values, date scope, ...). When it changes the table jumps back to
 * page 1, so narrowing a filter can never leave the viewer stranded on a page
 * that no longer exists. The page is also clamped when live data shrinks the
 * result set, and changing the page size starts again from the first page.
 */
export function usePagination(
  total: number,
  resetKey: string,
  initialPageSize: PageSize = PAGE_SIZE_OPTIONS[0]
): PaginationResult {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState<number>(initialPageSize);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  // A filter change starts a new result set from the top.
  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  // Rows can also disappear without a filter change (live data or an archive),
  // so keep the current page inside the available range.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);

  return {
    page: safePage,
    pageSize,
    total,
    totalPages,
    rangeStart: total === 0 ? 0 : start + 1,
    rangeEnd: end,
    start,
    end,
    setPage: (next) => setPage(Math.min(Math.max(1, next), totalPages)),
    setPageSize: (size) => {
      setPageSizeState(size);
      setPage(1);
    },
  };
}
