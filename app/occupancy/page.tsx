'use client';

import RoomOccupancy from '@/components/RoomOccupancy';
import AdminPageHeader from '@/components/AdminPageHeader';
import AdminShell from '@/components/AdminShell';
import { useRoleGuard } from '@/hooks/useRoleGuard';

// Who is inside each room right now. Admin-only: it exposes who is inside the
// building and where, so it must not be reachable by a visitor or staff member.
export default function OccupancyPage() {
  const isAllowed = useRoleGuard(['admin'], '/admin');

  if (!isAllowed) {
    return null;
  }

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow='Activity'
        title='Live Occupancy'
        subtitle='Who is inside each room right now'
      />
      <RoomOccupancy />
    </AdminShell>
  );
}
