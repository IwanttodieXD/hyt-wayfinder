'use client';

import { useEffect, useState } from 'react';
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
 *
 * Every room is a button that drops down the people inside it. Several can be
 * open at once - comparing two rooms is the main reason to want this, so forcing
 * one open at a time would work against it. Empty rooms stay clickable rather
 * than being disabled, so "this room is empty" is something you confirm rather
 * than something you infer from a control that refuses to respond.
 */
export default function RoomOccupancy() {
  const { getActiveCount, fetchTodayRecords } = useRecordsStore();
  const { getOccupancyByRoom, fetchTodayPresence } = useRoomPresenceStore();
  const { getActiveRooms, getAllRooms, fetchRooms } = useRoomsStore();

  // Room ids the visitor has opened. A Set rather than a single id so opening one
  // room never closes another.
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTodayRecords();
    fetchTodayPresence();
    fetchRooms();
  }, [fetchTodayRecords, fetchTodayPresence, fetchRooms]);

  const toggleRoom = (roomId: string) =>
    setExpandedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      return next;
    });

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
        Tap a room to see who is inside it. {trackedCount} of {insideCount}{' '}
        {insideCount === 1 ? 'person has' : 'people have'} scanned a room door
        code. Anyone in the building without a room is in a corridor or the lobby.
      </p>

      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 items-start'>
        {occupancy.map(({ id, label, room, people }) => {
          const isExpanded = expandedRooms.has(id);

          return (
            <div
              key={id}
              className='rounded-lg border border-navy-700 bg-navy-900/40 overflow-hidden'
            >
              {/* The whole header is the button, so the hit area covers the room
                  name, the number and the count badge - not just the chevron. */}
              <button
                type='button'
                onClick={() => toggleRoom(id)}
                aria-expanded={isExpanded}
                className='w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-navy-800/40 transition-colors'
              >
                <div className='min-w-0'>
                  <p className='text-white font-semibold text-sm truncate'>{label}</p>
                  <p className='text-navy-400 text-xs'>{room}</p>
                </div>

                <div className='flex items-center gap-2 flex-shrink-0'>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      people.length > 0
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-navy-700/40 text-navy-400 border border-navy-700'
                    }`}
                  >
                    {people.length}
                  </span>
                  <i
                    className={`fa-solid fa-chevron-down text-navy-300 text-xs transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  ></i>
                </div>
              </button>

              {isExpanded && (
                <div className='px-4 pb-4 border-t border-navy-800'>
                  {people.length > 0 ? (
                    <ul className='space-y-1.5 pt-3'>
                      {people.map((person) => (
                        <li
                          key={person.id}
                          className='flex items-center justify-between gap-2 text-sm'
                        >
                          <span className='flex items-center gap-2 text-navy-200 min-w-0'>
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
                    <p className='text-navy-500 text-xs pt-3'>Nobody is in this room.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
