export default function LoadingScreen() {
  return (
    <div className="w-full h-screen relative overflow-hidden flex flex-col items-center justify-center bg-[#080d1a]">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'linear-gradient(rgba(56,189,248,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.4) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)',
        }}
      />

      {/* Glow */}
      <div className="absolute w-64 h-64 bg-cyan-500 rounded-full opacity-10 blur-[100px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center space-y-6">
        {/* Spinner */}
        <div className="mx-auto w-14 h-14 relative">
          <div className="absolute inset-0 rounded-full border-2 border-slate-700" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-blue-400 animate-spin" style={{ animationDuration: '0.75s', animationDirection: 'reverse' }} />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h2 className="text-white font-semibold text-xl tracking-wide">Loading 3D Environment</h2>
          <p className="text-slate-500 text-sm">Preparing HYT Global Institute tour</p>
        </div>

        {/* Progress bar */}
        <div className="w-48 mx-auto h-px bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
            style={{
              animation: 'loadbar 2s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes loadbar {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
