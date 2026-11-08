import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({
  icon = 'fa-inbox',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-10 text-center',
        className
      )}
    >
      <span className='mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-800 text-navy-400'>
        <i className={`fa-solid ${icon} text-lg`}></i>
      </span>
      <p className='text-sm font-semibold text-white'>{title}</p>
      {description && (
        <p className='mt-1 max-w-xs text-xs leading-relaxed text-navy-400'>
          {description}
        </p>
      )}
      {action && <div className='mt-4'>{action}</div>}
    </div>
  );
}
