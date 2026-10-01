'use client';

import { Component, type ReactNode } from 'react';

/**
 * Catches render failures inside 3D canvases (most often
 * "Error creating WebGL context" on machines with no GPU or with software
 * rendering disabled) so the rest of the page keeps working instead of the
 * whole app white-screening.
 */
export default class ThreeErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; message: string | null }
> {
  state = { hasError: false, message: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message ?? 'Unknown 3D error' };
  }

  componentDidCatch(error: Error) {
    console.error('3D view failed to render:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className='w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center'>
        <i className='fa-solid fa-cube text-navy-600 text-4xl' />
        <p className='text-white font-semibold'>3D view unavailable</p>
        <p className='text-navy-300 text-sm max-w-xs'>
          This device could not start WebGL, so the 3D route cannot be drawn.
        </p>
        <button
          onClick={() => this.setState({ hasError: false, message: null })}
          className='px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-paper font-semibold text-sm transition-colors'
        >
          <i className='fa-solid fa-rotate-right mr-2' />
          Try Again
        </button>
      </div>
    );
  }
}
