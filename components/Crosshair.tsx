'use client';

interface CrosshairProps {
  isTargeting?: boolean;
}

export default function Crosshair({ isTargeting = false }: CrosshairProps) {
  return (
    <div className='theme-fixed-dark fixed inset-0 pointer-events-none z-30 flex items-center justify-center'>
      {/* Outer circle */}
      <div
        className={`relative w-8 h-8 rounded-full border-2 transition-colors duration-150 ${
          isTargeting ? 'border-yellow-400 scale-110' : 'border-white/60'
        }`}
      >
        {/* Center dot */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full transition-colors duration-150 ${
            isTargeting ? 'bg-yellow-400 scale-150' : 'bg-white/80'
          }`}
        />

        {/* Targeting lines (appear when targeting) */}
        {isTargeting && (
          <>
            {/* Top line */}
            <div className='absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-0.5 h-3 bg-yellow-400' />
            {/* Bottom line */}
            <div className='absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0.5 h-3 bg-yellow-400' />
            {/* Left line */}
            <div className='absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full h-0.5 w-3 bg-yellow-400' />
            {/* Right line */}
            <div className='absolute right-0 top-1/2 -translate-y-1/2 translate-x-full h-0.5 w-3 bg-yellow-400' />

            {/* Pulsing glow effect */}
            <div className='absolute inset-0 rounded-full border-2 border-yellow-400 animate-ping opacity-75' />
          </>
        )}
      </div>

      {/* Interaction hint when targeting */}
      {isTargeting && (
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 mt-12 animate-bounce'>
          <div className='bg-black/80 px-4 py-2 rounded-lg border border-yellow-400'>
            <p className='text-yellow-300 font-semibold text-sm'>Click to Interact</p>
          </div>
        </div>
      )}
    </div>
  );
}
