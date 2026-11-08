/**
 * Navigation model for the admin console.
 *
 * One list drives the desktop sidebar, the mobile profile menu and the mobile
 * dashboard shortcuts, so a page added here appears everywhere at once instead
 * of drifting between three hand-written menus.
 */
export interface AdminNavItem {
  href: string;
  icon: string;
  /** Full label used in the sidebar and profile menu. */
  title: string;
  /** Compact label for narrow tiles. */
  short: string;
  description: string;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: 'Overview',
    items: [
      {
        href: '/admin',
        icon: 'fa-gauge-high',
        title: 'Dashboard',
        short: 'Dashboard',
        description: 'Live building activity',
      },
    ],
  },
  {
    label: 'Activity',
    items: [
      {
        href: '/admin/records',
        icon: 'fa-table',
        title: 'Attendance Records',
        short: 'Attendance',
        description: 'Who checked in and out of the building',
      },
      {
        href: '/admin/room-records',
        icon: 'fa-door-open',
        title: 'Room Visits',
        short: 'Room visits',
        description: 'Who entered each room, and when',
      },
      {
        href: '/occupancy',
        icon: 'fa-user-group',
        title: 'Room Occupancy',
        short: 'Occupancy',
        description: 'See who is inside each room right now',
      },
    ],
  },
  {
    label: 'Manage',
    items: [
      {
        href: '/admin/rooms',
        icon: 'fa-door-closed',
        title: 'Manage Rooms',
        short: 'Rooms',
        description: 'Add, rename or retire rooms and their codes',
      },
      {
        href: '/admin/users',
        icon: 'fa-users-gear',
        title: 'Manage Users',
        short: 'Users',
        description: 'Accounts, passes and trainee details',
      },
      {
        href: '/admin/lookups',
        icon: 'fa-list-check',
        title: 'Form Options',
        short: 'Options',
        description: 'Purposes and courses used across forms',
      },
    ],
  },
  {
    label: 'Tools',
    items: [
      {
        href: '/station',
        icon: 'fa-qrcode',
        title: 'QR Station',
        short: 'QR Station',
        description: 'Attendance and room door codes',
      },
    ],
  },
];

/** Flat list for surfaces that do not need the group headings. */
export const ADMIN_NAV: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

/**
 * True when `pathname` belongs to `href`.
 *
 * `/admin` is matched exactly because every other admin route starts with it;
 * a prefix check there would light up the dashboard on every page.
 */
export function isAdminNavActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}
