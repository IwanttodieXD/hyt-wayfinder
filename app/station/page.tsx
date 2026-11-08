'use client';

import KioskStationView from '@/components/KioskStationView';
import AdminShell from '@/components/AdminShell';
import { useRoleGuard } from '@/hooks/useRoleGuard';

// The attendance station is an admin-only tool: it scans other people's QR
// codes, so it must never be reachable by a visitor.
export default function StationPage() {
  const isAllowed = useRoleGuard(['admin'], '/admin');

  if (!isAllowed) {
    return null;
  }

  return (
    <AdminShell>
      <KioskStationView />
    </AdminShell>
  );
}
