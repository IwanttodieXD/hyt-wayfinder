-- Rooms for the HYT building.
--
-- qr_value is what gets printed on each door. The room number is encoded in it,
-- so a code is readable and stable even if the display name changes later.
--
-- Run AFTER 20260101000001_full_schema.sql.

INSERT INTO public.rooms (room_number, name, floor, qr_value) VALUES
  -- 2nd floor: two tech rooms
  ('Room 201', 'Tech Room 201',      '2', 'HYT-ROOM-01:ROOM-201'),
  ('Room 202', 'Tech Room 202',      '2', 'HYT-ROOM-01:ROOM-202'),

  -- 3rd floor: four rooms
  ('Room 301', 'Room 301',           '3', 'HYT-ROOM-01:ROOM-301'),
  ('Room 302', 'Room 302',           '3', 'HYT-ROOM-01:ROOM-302'),
  ('Room 303', 'Room 303',           '3', 'HYT-ROOM-01:ROOM-303'),
  ('Room 304', 'Room 304',           '3', 'HYT-ROOM-01:ROOM-304'),

  -- 4th floor: four rooms
  ('Room 401', 'Room 401',           '4', 'HYT-ROOM-01:ROOM-401'),
  ('Room 402', 'Room 402',           '4', 'HYT-ROOM-01:ROOM-402'),
  ('Room 403', 'Room 403',           '4', 'HYT-ROOM-01:ROOM-403'),
  ('Room 404', 'Room 404',           '4', 'HYT-ROOM-01:ROOM-404'),

  -- Roof
  ('Roofdeck', 'Roofdeck',          'Roof', 'HYT-ROOM-01:ROOFDECK');
