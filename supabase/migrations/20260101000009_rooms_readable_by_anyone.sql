-- ============================================================================
-- HYT Wayfinder - make `rooms` readable before sign-in
--
-- Problem: the public registration form has a room picker, and it runs BEFORE
-- anyone has signed in. The policy from migration 001,
--
--   CREATE POLICY "rooms readable when signed in"
--     ON public.rooms FOR SELECT USING (auth.role() = 'authenticated');
--
-- returns zero rows to the `anon` role, so a brand-new visitor saw an empty
-- "Assigned room" dropdown. `purposes` was already opened to everyone in
-- migration 002 for exactly this reason; `rooms` was left behind, even though
-- the comment in migration 001 states "rooms and purposes are readable by
-- anyone". This migration makes the policy match that stated intent.
--
-- Safe: `rooms` is pure lookup data - room number, display name, floor, and the
-- door QR value that is printed on the physical door anyway. It holds no user
-- information. Writing is still admin-only ("admins manage rooms", is_admin()).
--
-- The register form needs the room *id* (it is written to
-- `users.pending_room_id`), so a client-side fallback list is not an option -
-- the real rows must be readable. That is why this is a policy change rather
-- than another hardcoded fallback.
--
-- Idempotent: safe to run more than once.
-- ============================================================================

DROP POLICY IF EXISTS "rooms readable when signed in" ON public.rooms;
DROP POLICY IF EXISTS "rooms readable by anyone" ON public.rooms;

CREATE POLICY "rooms readable by anyone"
  ON public.rooms FOR SELECT
  USING (TRUE);
