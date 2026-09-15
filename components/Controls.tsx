export default function Controls() {
  return (
    <div className="absolute bottom-6 left-6 z-20 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 w-52 select-none">
      {/* Header */}
      <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2.5">
        Controls
      </p>

      {/* Commands */}
      <div className="space-y-1.5">
        <Row keys={['W', 'A', 'S', 'D']} label="Move" />
        <Row keys={['Mouse']} label="Look around" />
        <Row keys={['Esc']} label="Pause / show menu" />
      </div>

      {/* Divider */}
      <div className="my-2.5 border-t border-white/10" />

      {/* Mobile note */}
      <p className="text-[10px] text-slate-500 leading-relaxed">
        Mobile: left drag to move, right drag to look
      </p>
    </div>
  );
}

function Row({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        {keys.map((k) => (
          <kbd
            key={k}
            className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white font-mono text-[10px] leading-none min-w-[22px]"
          >
            {k}
          </kbd>
        ))}
      </div>
      <span className="text-slate-400 text-[11px] text-right leading-tight">{label}</span>
    </div>
  );
}
