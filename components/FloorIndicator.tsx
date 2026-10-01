interface FloorIndicatorProps {
  currentFloor: number;
}

export default function FloorIndicator({ currentFloor }: FloorIndicatorProps) {
  return (
    <div className='absolute top-8 right-8 bg-black/50 px-4 py-3 rounded-lg border border-orange-400/30'>
      <div className='text-center'>
        <p className='text-sm text-orange-300 font-semibold uppercase tracking-wider'>
          Floor
        </p>
        <p className='text-4xl font-bold text-white'>{currentFloor}</p>
      </div>
      <div className='mt-3 flex gap-1 justify-center'>
        {[1, 2, 3, 4, 5].map((floor) => (
          <div
            key={floor}
            className={`w-2 h-6 rounded-full transition-colors ${
              floor === currentFloor ? 'bg-orange-400' : 'bg-gray-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
