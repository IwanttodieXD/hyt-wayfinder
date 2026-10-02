'use client';

import { useEffect } from 'react';
import { useRecordsStore } from '@/store/recordsStore';
import { DESTINATION_ROUTES } from '@/lib/wayfinding';

/**
 * Live room-by-room occupancy: who is currently checked in and where.
 *
 * Rooms come from the route registry so empty ones still appear, which makes
 * it obvious at a glance which rooms are free. Anything recorded against a room
 * that isn't in the registry is appended as "Unassigned" rather than dropped.
 */
export default function RoomOccupancy() {
  const { getActiveCount, getOccupancyByRoom, fetchTodayRecords } = useRecordsStore();

  useEffect(() => {
    fetchTodayRecords();
  }, [fetchTodayRecords]);

  const activeCount = getActiveCount();

  const occupancy = (() => {
    const byRoom = new Map(getOccupancyByRoom().map((r) => [r.room, r.people]));

    const known = DESTINATION_ROUTES.map((route) => ({
      route,
      people: byRoom.get(route.room) ?? [],
    }));

    const extra = Array.from(byRoom.entries())
      .filter(([room]) => !DESTINATION_ROUTES.some((r) => r.room === room))
      .map(([room, people]) => ({
        route: { id: room, label: room, room, building: 'Unassigned' },
        people,
      }));

    return [...known, ...extra];
  })();

  return (
    <div className='glass-panel border-navy-800 p-6 rounded-lg'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-white font-bold text-lg flex items-center gap-2'>
          <i className='fa-solid fa-door-open text-orange-400'></i>
          Inside Right Now
        </h2>
        <span className='text-navy-300 text-sm'>
          {activeCount} {activeCount === 1 ? 'person' : 'people'}
        </span>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3'>
        {occupancy.map(({ route, people }) => (
          <div
            key={route.id}
            className='rounded-lg border border-navy-700 bg-navy-900/40 p-4'
          >
            <div className='flex items-center justify-between mb-2'>
              <div>
                <p className='text-white font-semibold text-sm'>{route.label}</p>
                <p className='text-navy-400 text-xs'>{route.room}</p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  people.length > 0
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-navy-700/40 text-navy-400 border border-navy-700'
                }`}
              >
                {people.length}
              </span>
            </div>

            {people.length > 0 ? (
              <ul className='space-y-1.5 mt-2'>
                {people.map((person) => (
                  <li
                    key={person.id}
                    className='flex items-center justify-between gap-2 text-sm'
                  >
                    <span className='flex items-center gap-2 text-navy-200 truncate'>
                      <i className='fa-solid fa-user text-navy-500 text-xs'></i>
                      <span className='truncate'>
                        {person.userName || 'Unknown user'}
                      </span>
                    </span>
                    <span className='text-navy-500 text-xs whitespace-nowrap'>
                      {person.timeIn.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className='text-navy-600 text-xs mt-2'>Empty</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
