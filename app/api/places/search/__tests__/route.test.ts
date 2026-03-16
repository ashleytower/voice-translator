import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/places/search');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

function makePlacesApiResponse(overrides?: Partial<{ places: unknown[] }>) {
  return {
    places: overrides?.places ?? [
      {
        id: 'ChIJ_coffee1',
        displayName: { text: 'Blue Bottle Coffee', languageCode: 'en' },
        formattedAddress: '1-2-3 Shibuya, Tokyo',
        location: { latitude: 35.6595, longitude: 139.7004 },
        rating: 4.3,
        userRatingCount: 850,
        currentOpeningHours: { openNow: true },
        nationalPhoneNumber: '03-5555-1234',
        photos: [{ name: 'places/ChIJ_coffee1/photos/photo-ref-1' }],
        primaryType: 'cafe',
        priceLevel: 'PRICE_LEVEL_MODERATE',
      },
    ],
  };
}

const FAKE_SERVER_KEY = 'test-google-server-key-12345';

describe('GET /api/places/search', () => {
  const originalFetch = global.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv('GOOGLE_MAPS_SERVER_KEY', FAKE_SERVER_KEY);
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns cleaned places for a valid text search', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => makePlacesApiResponse(),
    });

    const { GET } = await import('../route');
    const res = await GET(makeRequest({ query: 'coffee', lat: '35.6595', lng: '139.7004' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe('Blue Bottle Coffee');
    expect(body[0].type).toBe('cafe');
  });

  it('sends textQuery and locationBias to Google Places API', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => makePlacesApiResponse({ places: [] }),
    });

    const { GET } = await import('../route');
    await GET(makeRequest({ query: 'ramen', lat: '35.66', lng: '139.77' }));

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];

    expect(url).toBe('https://places.googleapis.com/v1/places:searchText');
    expect(options.method).toBe('POST');
    expect(options.headers['X-Goog-Api-Key']).toBe(FAKE_SERVER_KEY);

    const requestBody = JSON.parse(options.body);
    expect(requestBody.textQuery).toBe('ramen');
    expect(requestBody.locationBias.circle.center).toEqual({
      latitude: 35.66,
      longitude: 139.77,
    });
  });

  it('works without location parameters', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => makePlacesApiResponse({ places: [] }),
    });

    const { GET } = await import('../route');
    const res = await GET(makeRequest({ query: 'sushi' }));

    expect(res.status).toBe(200);

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(requestBody.textQuery).toBe('sushi');
    expect(requestBody.locationBias).toBeUndefined();
  });

  it('returns 400 when query is missing', async () => {
    const { GET } = await import('../route');
    const res = await GET(makeRequest({ lat: '35.66', lng: '139.77' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('returns 500 when API key is not configured', async () => {
    vi.stubEnv('GOOGLE_MAPS_SERVER_KEY', '');
    const { GET } = await import('../route');
    const res = await GET(makeRequest({ query: 'ramen' }));
    expect(res.status).toBe(500);
  });

  it('returns 500 with generic error on API failure (no key leakage)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => `API key ${FAKE_SERVER_KEY} is invalid`,
    });

    const { GET } = await import('../route');
    const res = await GET(makeRequest({ query: 'ramen', lat: '35.66', lng: '139.77' }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain(FAKE_SERVER_KEY);
  });

  it('returns 500 on network failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network timeout'));

    const { GET } = await import('../route');
    const res = await GET(makeRequest({ query: 'ramen', lat: '35.66', lng: '139.77' }));

    expect(res.status).toBe(500);
  });

  it('uses proxy photo URLs without exposing server key', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => makePlacesApiResponse(),
    });

    const { GET } = await import('../route');
    const res = await GET(makeRequest({ query: 'coffee', lat: '35.66', lng: '139.77' }));
    const body = await res.json();

    expect(body[0].photoUrl).toContain('/api/places/photo?ref=');
    expect(body[0].photoUrl).not.toContain(FAKE_SERVER_KEY);
  });

  it('returns empty array when API returns no places', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ places: [] }),
    });

    const { GET } = await import('../route');
    const res = await GET(makeRequest({ query: 'nonexistent', lat: '35.66', lng: '139.77' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual([]);
  });
});
