'use client';

import { useEffect, useState } from 'react';

/**
 * Small "Live · updated Ns ago" pill.
 *
 * Shown next to numbers that refresh themselves, so a viewer can see that the
 * data is current instead of having to trust it - and so it is obvious when the
 * polling has stopped. The ticker only re-renders this label; it never fetches.
 */
export default function LiveBadge({ lastRefreshed }: { lastRefreshed: number }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const seconds = Math.max(0, Math.floor((Date.now() - lastRefreshed) / 1000));

  return (
    <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-300 text-xs font-semibold whitespace-nowrap'>
      <span className='w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse' />
      {seconds < 5 ? 'Live · just now' : `Live · ${seconds}s ago`}
    </span>
  );
}
