export default function LoadingScreen() {
  return (
    <div className='w-full h-screen relative overflow-hidden flex flex-col items-center justify-center bg-navy-950'>
      {/* Background grid */}
      <div
        className='absolute inset-0 opacity-10'
        style={{
          backgroundImage:
            'linear-gradient(rgba(100,119,168,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(100,119,168,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className='relative z-10 text-center space-y-6'>
        {/* Spinner */}
        <div className='mx-auto w-14 h-14 relative'>
          <div className='absolute inset-0 rounded-full border-2 border-navy-700' />
          <div className='absolute inset-0 rounded-full border-2 border-transparent border-t-orange-400 animate-spin' />
          <div
            className='absolute inset-2 rounded-full border-2 border-transparent border-t-blue-400 animate-spin'
            style={{
              animationDuration: '0.75s',
              animationDirection: 'reverse',
            }}
          />
        </div>

        {/* Text */}
        <div className='space-y-2'>
          <h2 className='text-white font-semibold text-xl tracking-wide'>
            Loading 3D Environment
          </h2>
          <p className='text-navy-500 text-sm'>Preparing HYT Global Institute tour</p>
        </div>

        {/* Progress bar */}
        <div className='w-48 mx-auto h-px bg-navy-800 rounded-full overflow-hidden'>
          <div
            className='h-full rounded-full'
            style={{
              animation: 'loadbar 2s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes loadbar {
          0% {
            width: 0%;
            margin-left: 0%;
          }
          50% {
            width: 60%;
            margin-left: 20%;
          }
          100% {
            width: 0%;
            margin-left: 100%;
          }
        }
      `}</style>
    </div>
  );
}
