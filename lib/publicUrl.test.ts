import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SITE_ORIGIN,
  fetchOrientationStatus,
  registrationUrl,
  siteOrigin,
} from './publicUrl.ts';

// The QR is printed and scanned by a phone, so the URL it encodes is effectively
// frozen in the physical world. These tests pin the two properties that matter:
// it is absolute (a relative path scans as nothing useful), and it never carries
// a double slash that would only surface after printing.

describe('siteOrigin', () => {
  test('falls back to localhost when nothing else is known', () => {
    // No window in node, and NEXT_PUBLIC_APP_URL is unset under `node --test`
    // unless the operator exported it.
    assert.equal(siteOrigin(), DEFAULT_SITE_ORIGIN);
  });

  test('a configured origin is used and trailing slashes trimmed', () => {
    const before = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://hyt.example.com///';
    try {
      assert.equal(siteOrigin(), 'https://hyt.example.com');
      assert.equal(registrationUrl(), 'https://hyt.example.com/register');
    } finally {
      if (before === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = before;
    }
  });

  test('the CONFIGURED origin beats the live one', () => {
    // This is the entire point of the precedence order, and the failure it
    // prevents is only visible on a deployment platform: printing the poster
    // from a Vercel preview build would otherwise bake a throwaway preview
    // hostname into a physical artefact that outlives the preview.
    const before = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://hyt-wayfinder.vercel.app';
    try {
      assert.equal(siteOrigin(), 'https://hyt-wayfinder.vercel.app');
      assert.ok(registrationUrl().includes('hyt-wayfinder.vercel.app'));
    } finally {
      if (before === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = before;
    }
  });

  test('an empty configured value is ignored, not encoded', () => {
    // '' is falsy and must fall through rather than yielding a relative
    // '/register', which a phone scanning the QR cannot act on.
    const before = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = '';
    try {
      assert.equal(siteOrigin(), DEFAULT_SITE_ORIGIN);
      assert.ok(registrationUrl().startsWith('http'));
    } finally {
      if (before === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = before;
    }
  });
});

describe('fetchOrientationStatus', () => {
  // Minimal stand-in for the Supabase client. Typed loosely on purpose: the real
  // one has a far bigger surface, and these tests are about how the helper
  // interprets what comes back - not about Supabase.
  const stub = (impl: (fn: string, args: Record<string, unknown>) => unknown) =>
    ({ rpc: impl }) as never;

  test('returns the record for a known cohort member', async () => {
    const row = {
      orientation_status: 'approved',
      full_name: 'Gemmalyn Ocbina Aranda',
      programme: 'Barista NC II',
    };
    const result = await fetchOrientationStatus(
      'gemmaaranda05@gmail.com',
      stub(() => Promise.resolve({ data: [row], error: null }))
    );
    assert.deepEqual(result, row);
  });

  test('returns null for someone not in the cohort', async () => {
    // The critical distinction: a genuine walk-in is NOT declined. Treating an
    // empty result as "declined" would turn every first-time visitor away.
    const result = await fetchOrientationStatus(
      'stranger@example.com',
      stub(() => Promise.resolve({ data: [], error: null }))
    );
    assert.equal(result, null);
  });

  test('returns null when the RPC errors, and does not throw', async () => {
    // Happens if migration 20260101000013 has not been applied. Registration
    // must still work; it just cannot show a verdict.
    const result = await fetchOrientationStatus(
      'gemmaaranda05@gmail.com',
      stub(() =>
        Promise.resolve({ data: null, error: { message: 'function does not exist' } })
      )
    );
    assert.equal(result, null);
  });

  test('returns null when the RPC rejects outright', async () => {
    const result = await fetchOrientationStatus(
      'gemmaaranda05@gmail.com',
      stub(() => Promise.reject(new Error('network down')))
    );
    assert.equal(result, null);
  });

  test('skips the call for input that cannot be an address', async () => {
    let called = false;
    const client = stub(() => {
      called = true;
      return Promise.resolve({ data: [], error: null });
    });
    assert.equal(await fetchOrientationStatus('', client), null);
    assert.equal(await fetchOrientationStatus('   ', client), null);
    assert.equal(await fetchOrientationStatus('not-an-email', client), null);
    // No round trip per keystroke while someone is still typing.
    assert.equal(called, false);
  });

  test('trims the address before sending it', async () => {
    let seen: unknown;
    await fetchOrientationStatus(
      '  gemmaaranda05@gmail.com  ',
      stub((_fn, args) => {
        seen = args.p_email;
        return Promise.resolve({ data: [], error: null });
      })
    );
    assert.equal(seen, 'gemmaaranda05@gmail.com');
  });

  test('preserves a declined verdict rather than collapsing it', async () => {
    const result = await fetchOrientationStatus(
      'declined@example.com',
      stub(() =>
        Promise.resolve({
          data: [
            {
              orientation_status: 'declined',
              full_name: 'Someone Declined',
              programme: null,
            },
          ],
          error: null,
        })
      )
    );
    assert.equal(result?.orientation_status, 'declined');
  });

  test('tolerates a non-array payload', async () => {
    const result = await fetchOrientationStatus(
      'x@example.com',
      stub(() => Promise.resolve({ data: null, error: null }))
    );
    assert.equal(result, null);
  });
});
  describe('registrationUrl', () => {
  test('is absolute and points at /register', () => {
    const url = registrationUrl();
    assert.ok(url.startsWith('http://') || url.startsWith('https://'));
    assert.ok(url.endsWith('/register'));
  });

  test('contains no doubled slash in the path', () => {
    // 'https://host//register' would 404 on some hosts, and the mistake is
    // invisible in a QR until someone scans it on a real phone.
    const path = registrationUrl().replace(/^https?:\/\/[^/]+/, '');
    assert.equal(path, '/register');
  });

  test('does not point at the admin-only station', () => {
    // /station is role-guarded and redirects non-admins to /admin, so a poster
    // aiming there would dead-end every walk-in.
    assert.ok(!registrationUrl().includes('/station'));
  });
});