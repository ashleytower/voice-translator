import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/places/photo');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

const FAKE_SERVER_KEY = 'test-server-key-photo';

describe('GET /api/places/photo', () => {
  const originalFetch = global.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv('GOOGLE_MAPS_SERVER_KEY', FAKE_SERVER_KEY);
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns 400 when ref param is missing', async () => {
    const { GET } = await import('../route');
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('ref');
  });

  it('returns 400 for invalid photo reference format', async () => {
    const { GET } = await import('../route');
    const res = await GET(makeRequest({ ref: 'not-a-valid-ref' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid');
  });

  it('returns 500 when server key is not configured', async () => {
    vi.stubEnv('GOOGLE_MAPS_SERVER_KEY', '');
    const { GET } = await import('../route');
    const res = await GET(makeRequest({ ref: 'places/abc/photos/def' }));
    expect(res.status).toBe(500);
  });

  it('calls Google API with skipHttpRedirect=true and streams image back', async () => {
    const photoRef = 'places/ChIJ_test/photos/photo-ref-123';
    const fakeImageBody = new ReadableStream();

    // First fetch: Google API returns photoUri
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ photoUri: 'https://lh3.googleusercontent.com/fake-photo' }),
    });

    // Second fetch: CDN returns image bytes
    fetchMock.mockResolvedValueOnce({
      ok: true,
      body: fakeImageBody,
      headers: new Headers({ 'Content-Type': 'image/jpeg' }),
    });

    const { GET } = await import('../route');
    const res = await GET(makeRequest({ ref: photoRef }));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/jpeg');
    expect(res.headers.get('Cache-Control')).toContain('max-age=86400');

    // Verify first fetch used skipHttpRedirect=true with server key
    const firstCallUrl = fetchMock.mock.calls[0][0] as string;
    expect(firstCallUrl).toContain('skipHttpRedirect=true');
    expect(firstCallUrl).toContain(`key=${FAKE_SERVER_KEY}`);
    expect(firstCallUrl).toContain(photoRef);

    // Verify second fetch hit the CDN URI
    expect(fetchMock.mock.calls[1][0]).toBe('https://lh3.googleusercontent.com/fake-photo');
  });

  it('returns 502 when Google API call fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    const { GET } = await import('../route');
    const res = await GET(makeRequest({ ref: 'places/abc/photos/def' }));
    expect(res.status).toBe(502);
  });

  it('returns error when Google API returns non-ok', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    const { GET } = await import('../route');
    const res = await GET(makeRequest({ ref: 'places/abc/photos/def' }));
    expect(res.status).toBe(403);
  });

  it('returns 404 when photoUri is missing from response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const { GET } = await import('../route');
    const res = await GET(makeRequest({ ref: 'places/abc/photos/def' }));
    expect(res.status).toBe(404);
  });

  it('uses default maxWidth=400 when not specified', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ photoUri: 'https://lh3.googleusercontent.com/fake' }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      body: new ReadableStream(),
      headers: new Headers({ 'Content-Type': 'image/png' }),
    });

    const { GET } = await import('../route');
    await GET(makeRequest({ ref: 'places/abc/photos/def' }));

    const firstCallUrl = fetchMock.mock.calls[0][0] as string;
    expect(firstCallUrl).toContain('maxWidthPx=400');
  });
});
