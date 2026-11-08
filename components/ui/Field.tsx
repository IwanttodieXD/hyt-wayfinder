import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Shared form control styling.
 *
 * Uses the same navy/yellow tokens as the rest of the app. The slightly larger
 * radius and calmer border are the main visual change from the old per-page
 * `INPUT` constants; behaviour is unchanged.
 */
export const controlClass =
  'w-full rounded-xl border border-navy-700 bg-navy-950/60 px-4 py-3 text-sm text-white placeholder-navy-500 transition-colors focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/40 disabled:cursor-not-allowed disabled:opacity-60';

/** Adds the chevron spacing + native-select reset. */
export const selectClass = cn(
  controlClass,
  'cursor-pointer appearance-none pr-10'
);

interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Label + control + optional hint/error.
 *
 * The label is `text-navy-200` rather than the old yellow label: yellow is kept
 * for actions and status, so a long form reads as a form rather than a wall of
 * accent text.
 */
export default function Field({
  label,
  htmlFor,
  required = false,
  hint,
  error,
  className,
  children,
}: FieldProps) {
  return (
    <div className={className}>
      <div className='mb-1.5 flex items-center justify-between gap-2'>
        <label
          htmlFor={htmlFor}
          className='text-sm font-medium text-navy-200'
        >
          {label}
          {required && <span className='ml-1 text-red-400'>*</span>}
        </label>
        {hint && (
          <span className='text-[11px] font-medium text-navy-500'>{hint}</span>
        )}
      </div>
      {children}
      {error && (
        <p className='mt-1.5 text-xs text-red-300' role='alert'>
          {error}
        </p>
      )}
    </div>
  );
}

/** Wraps a native select with the shared chevron affordance. */
export function SelectWrap({ children }: { children: ReactNode }) {
  return (
    <div className='relative'>
      {children}
      <i className='fa-solid fa-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-navy-400'></i>
    </div>
  );
}
