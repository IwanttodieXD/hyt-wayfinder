'use client';

import { useEffect } from 'react';
import { useRecordsStore } from '@/store/recordsStore';
import { useRoomPresenceStore } from '@/store/roomPresenceStore';
import { useRoomsStore } from '@/store/roomsStore';

/**
 * Live room-by-room occupancy: who is inside which room right now.
 *
 * Two numbers, and they answer different questions:
 *
 * - "Inside the building" comes from attendance (records with no time_out).
 *   Someone who has checked in but not scanned a room door yet counts here.
 * - The per-room breakdown comes from room presence, which only records a room
 *   once the person has actually scanned that room's door code.
 *
 * Rooms come from the `rooms` table so empty ones still appear, which makes it
 * obvious at a glance which rooms are free. A presence row whose room is no
 * longer active is still shown rather than dropped, so scanned-but-retired rooms
 * stay visible instead of silently disappearing.
 */
export default function RoomOccupancy() {
  const { getActiveCount, fetchTodayRecords } = useRecordsStore();
  const { getOccupancyByRoom, fetchTodayPresence } = useRoomPresenceStore();
  const { getActiveRooms, getAllRooms, fetchRooms } = useRoomsStore();

  useEffect(() => {
    fetchTodayRecords();
    fetchTodayPresence();
    fetchRooms();
  }, [fetchTodayRecords, fetchTodayPresence, fetchRooms]);

  // Everyone checked in, regardless of whether they've scanned a door yet.
  const insideCount = getActiveCount();

  // Presence is grouped by room id. Active rooms come first so the grid reads in
  // building order; anything left over is a room that has been retired but still
  // has people recorded against it, which is worth showing rather than hiding.
  const occupancy = (() => {
    const byRoom = new Map(getOccupancyByRoom().map((r) => [r.roomId, r]));

    const known = getActiveRooms().map((room) => ({
      id: room.id,
      label: room.name,
      room: room.roomNumber,
      people: byRoom.get(room.id)?.people ?? [],
    }));

    const activeIds = new Set(getActiveRooms().map((r) => r.id));
    const extra = Array.from(byRoom.entries())
      .filter(([roomId]) => !activeIds.has(roomId))
      .map(([roomId, entry]) => ({
        id: roomId,
        label: entry.roomLabel,
        room: entry.room,
        people: entry.people,
      }));

    return [...known, ...extra];
  })();

  const trackedCount = occupancy.reduce((sum, r) => sum + r.people.length, 0);

  return (
    <div className='glass-panel border-navy-800 p-6 rounded-lg'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-white font-bold text-lg flex items-center gap-2'>
          <i className='fa-solid fa-door-open text-orange-400'></i>
          Inside Right Now
        </h2>
        <span className='text-navy-300 text-sm'>
          {insideCount} {insideCount === 1 ? 'person' : 'people'} in the building
        </span>
      </div>

      <p className='text-navy-400 text-xs mb-4'>
        {trackedCount} of {insideCount}{' '}
        {insideCount === 1 ? 'person has' : 'people have'} scanned a room door
        code. Anyone in the building without a room is in a corridor or the lobby.
      </p>

      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3'>
        {occupancy.map(({ id, label, room, people }) => (
          <div
            key={id}
            className='rounded-lg border border-navy-700 bg-navy-900/40 p-4'
          >
            <div className='flex items-center justify-between mb-2'>
              <div>
                <p className='text-white font-semibold text-sm'>{label}</p>
                <p className='text-navy-400 text-xs'>{room}</p>
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
                      {person.enteredAt.toLocaleTimeString('en-US', {
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
