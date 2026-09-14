export default function Controls() {
  return (
    <div className="absolute bottom-8 left-8 bg-black/50 backdrop-blur-sm px-6 py-4 rounded-lg border border-cyan-400/30">
      <div className="space-y-2 text-white text-sm">
        <p className="font-semibold text-cyan-300 uppercase tracking-wide">Desktop Controls</p>
        <div className="space-y-1">
          <p><span className="font-mono bg-gray-700 px-2 py-1 rounded">W A S D</span> - Move</p>
          <p><span className="font-mono bg-gray-700 px-2 py-1 rounded">Mouse</span> - Look Around</p>
          <p><span className="font-mono bg-gray-700 px-2 py-1 rounded">Space</span> - Jump</p>
        </div>
        <p className="font-semibold text-cyan-300 uppercase tracking-wide mt-4">Mobile</p>
        <p>Use virtual joystick</p>
      </div>
    </div>
  );
}
