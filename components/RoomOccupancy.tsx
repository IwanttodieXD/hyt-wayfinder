'use client';

import { useEffect, useState } from 'react';
import { useRecordsStore } from '@/store/recordsStore';
import { useRoomPresenceStore } from '@/store/roomPresenceStore';
import { useRoomsStore } from '@/store/roomsStore';
import { useLiveData } from '@/hooks/useLiveData';
import LiveBadge from '@/components/LiveBadge';

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
 * Rooms are bucketed into one container per floor, so the page reads as a
 * building rather than a flat list of cards. A floor heading carries that
 * floor's headcount, which is the question a front desk actually asks ("how busy
 * is 3rd floor?") - without it you would have to add up the room badges yourself.
 *
 * Every room is a button that drops down the people inside it. Several can be
 * open at once - comparing two rooms is the main reason to want this, so forcing
 * one open at a time would work against it. Empty rooms stay clickable rather
 * than being disabled, so "this room is empty" is something you confirm rather
 * than something you infer from a control that refuses to respond.
 */
/**
 * Floor ordering. Mirrors FLOOR_ORDER in roomsStore: `rooms.floor` is TEXT, so a
 * plain sort would put 'Roof' before '3'. Ranked explicitly instead.
 *
 * Kept in step with the store's own ordering rather than re-deriving it, so the
 * groups here appear in the same sequence the rooms were fetched in.
 */
const FLOOR_ORDER: Record<string, number> = { G: 0, '2': 1, '3': 2, '4': 3, Roof: 4 };

/** '2' -> '2nd Floor', 'Roof' -> 'Roof'. For the group heading. */
function floorLabel(floor: string): string {
  if (floor === 'Roof') return 'Roof';
  if (floor === 'G') return 'Ground Floor';
  const n = Number(floor);
  if (Number.isNaN(n)) return floor;
  // 1st, 2nd, 3rd, 4th... Only the 11th/12th/13th need the 'th' special case
  // in this building, but the rule is written out so it stays correct if a
  // floor is ever added beyond 4.
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? 'th'
      : n % 10 === 1
        ? 'st'
        : n % 10 === 2
          ? 'nd'
          : n % 10 === 3
            ? 'rd'
            : 'th';
  return `${n}${suffix} Floor`;
}

export default function RoomOccupancy() {
  const { getActiveCount } = useRecordsStore();
  const { getOccupancyByRoom } = useRoomPresenceStore();
  const { getActiveRooms, getAllRooms, fetchRooms } = useRoomsStore();

  // Room ids the visitor has opened. A Set rather than a single id so opening one
  // room never closes another.
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());

  // Rooms are fetched once - they change rarely. The live figures come from
  // useLiveData below, so this page polls attendance and presence on the same
  // cadence as every other admin view instead of its own separate loop.
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const { lastRefreshed } = useLiveData({
    records: 'today',
    presence: 'today',
  });

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
  //
  // Each entry carries its floor so the render below can put it in the right
  // group. A retired room is looked up in the full room list to recover its
  // floor; if it is not there either (deactivated then hard-deleted from the
  // table) it lands in an "Other" group rather than being hidden.
  const entries = (() => {
    const byRoom = new Map(getOccupancyByRoom().map((r) => [r.roomId, r]));

    const allRooms = getAllRooms();
    const floorOf = new Map(allRooms.map((room) => [room.id, room.floor]));

    const known = getActiveRooms().map((room) => ({
      id: room.id,
      label: room.name,
      room: room.roomNumber,
      floor: room.floor,
      people: byRoom.get(room.id)?.people ?? [],
    }));

    const activeIds = new Set(getActiveRooms().map((r) => r.id));
    const extra = Array.from(byRoom.entries())
      .filter(([roomId]) => !activeIds.has(roomId))
      .map(([roomId, entry]) => ({
        id: roomId,
        label: entry.roomLabel,
        room: entry.room,
        floor: floorOf.get(roomId) ?? '',
        people: entry.people,
      }));

    return [...known, ...extra];
  })();

  const trackedCount = entries.reduce((sum, r) => sum + r.people.length, 0);

  // Bucket into floors. `entries` is already floor-ordered by the store, and Map
  // preserves insertion order, so the groups come out ground-first without a
  // second sort. Retired rooms are appended last by the spread above, so they
  // land in whatever group their floor maps to, or in a trailing one.
  const groups: { floor: string; rooms: typeof entries }[] = [];
  for (const entry of entries) {
    const existing = groups.find((g) => g.floor === entry.floor);
    if (existing) {
      existing.rooms.push(entry);
    } else {
      groups.push({ floor: entry.floor, rooms: [entry] });
    }
  }

  groups.sort(
    (a, b) =>
      (FLOOR_ORDER[a.floor] ?? 99) - (FLOOR_ORDER[b.floor] ?? 99)
  );

  return (
    <div className='glass-panel border-navy-800 p-6 rounded-lg'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-white font-bold text-lg flex items-center gap-2'>
          <i className='fa-solid fa-door-open text-orange-400'></i>
          Inside Right Now
        </h2>
        <div className='text-right'>
          <span className='block text-navy-300 text-sm'>
            {insideCount} {insideCount === 1 ? 'person' : 'people'} in the building
          </span>
          {/* Says out loud that these numbers refresh themselves. Someone deciding
              where to send a visitor should not have to guess how old the figures
              are, and "just now" is also the cheapest proof the polling is alive. */}
          <span className='block mt-1'>
            <LiveBadge lastRefreshed={lastRefreshed} />
          </span>
        </div>
      </div>

      <p className='text-navy-400 text-xs mb-4'>
        Tap a room to see who is inside it. {trackedCount} of {insideCount}{' '}
        {insideCount === 1 ? 'person has' : 'people have'} scanned a room door
        code. Anyone in the building without a room is in a corridor or the lobby.
      </p>

      {/* One container per floor, so the page reads as a building rather than a flat
          list of cards. Each heading carries that floor's headcount, which is the
          number a front desk actually asks for ("how busy is 3rd floor?"). */}
      <div className='space-y-5'>
        {groups.map((group) => {
          const groupPeople = group.rooms.reduce(
            (sum, r) => sum + r.people.length,
            0
          );

          return (
            <section key={group.floor || 'unknown'}>
              <div className='flex items-center gap-3 mb-2'>
                <h3 className='text-orange-300 font-semibold text-sm uppercase tracking-wider flex-shrink-0'>
                  {group.floor ? floorLabel(group.floor) : 'Other Rooms'}
                </h3>
                <div className='flex-1 h-px bg-navy-800' />
                <span className='text-navy-400 text-xs whitespace-nowrap'>
                  {groupPeople}{' '}
                  {groupPeople === 1 ? 'person' : 'people'} ·{' '}
                  {group.rooms.length}{' '}
                  {group.rooms.length === 1 ? 'room' : 'rooms'}
                </span>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 items-start'>
                {group.rooms.map(({ id, label, room, people }) => {
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
                          <p className='text-white font-semibold text-sm truncate'>
                            {label}
                          </p>
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
                            <p className='text-navy-500 text-xs pt-3'>
                              Nobody is in this room.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
