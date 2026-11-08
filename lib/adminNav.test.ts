import assert from 'node:assert/strict';
import test from 'node:test';
import { ADMIN_NAV, ADMIN_NAV_GROUPS, isAdminNavActive } from './adminNav.ts';

test('the dashboard is only active on its exact route', () => {
  assert.equal(isAdminNavActive('/admin', '/admin'), true);
  assert.equal(isAdminNavActive('/admin/records', '/admin'), false);
  assert.equal(isAdminNavActive('/admin/users', '/admin'), false);
});

test('admin sub-pages stay active on their own nested routes', () => {
  assert.equal(isAdminNavActive('/admin/records', '/admin/records'), true);
  assert.equal(
    isAdminNavActive('/admin/records/2026', '/admin/records'),
    true
  );
  assert.equal(isAdminNavActive('/admin/rooms', '/admin/records'), false);
});

test('tools outside /admin use the same exact-or-nested rule', () => {
  assert.equal(isAdminNavActive('/occupancy', '/occupancy'), true);
  assert.equal(isAdminNavActive('/station', '/station'), true);
  assert.equal(isAdminNavActive('/admin', '/station'), false);
});

test('a path that merely starts with the href is not a match', () => {
  assert.equal(isAdminNavActive('/administer', '/admin'), false);
  assert.equal(isAdminNavActive('/occupancy-extra', '/occupancy'), false);
});

test('every destination is unique and has a compact label', () => {
  const hrefs = ADMIN_NAV.map((item) => item.href);
  assert.equal(new Set(hrefs).size, hrefs.length);

  for (const item of ADMIN_NAV) {
    assert.ok(item.short.trim().length > 0, `${item.href} needs a short label`);
    assert.ok(item.title.trim().length > 0, `${item.href} needs a title`);
    assert.ok(item.icon.startsWith('fa-'), `${item.href} needs a Font Awesome icon`);
  }
});

test('the grouped view contains every flat destination exactly once', () => {
  const grouped = ADMIN_NAV_GROUPS.flatMap((group) => group.items);
  assert.deepEqual(grouped, ADMIN_NAV);
  assert.ok(ADMIN_NAV_GROUPS.every((group) => group.items.length > 0));
});
