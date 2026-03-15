import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Helpers ──

function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/places/nearby');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

// Minimal Google Places (New) API response shape
function makePlacesApiResponse(overrides?: Partial<{places: unknown[]}>) {
  return {
    places: overrides?.places ?? [
      {
        id: 'ChIJ_abc123',
        displayName: { text: 'Sushi Dai', languageCode: 'en' },
        formattedAddress: '5-2-1 Tsukiji, Chuo City, Tokyo',
        location: { latitude: 35.6654, longitude: 139.7707 },
        rating: 4.6,
        userRatingCount: 1200,
        currentOpeningHours: { openNow: true },
        nationalPhoneNumber: '03-1234-5678',
        photos: [
          { name: 'places/ChIJ_abc123/photos/photo-ref-1' },
          { name: 'places/ChIJ_abc123/photos/photo-ref-2' },
        ],
        primaryType: 'restaurant',
        priceLevel: 'PRICE_LEVEL_MODERATE',
      },
      {
        id: 'ChIJ_xyz789',
        displayName: { text: 'Lawson', languageCode: 'en' },
        formattedAddress: '1-1-1 Shibuya, Tokyo',
        location: { latitude: 35.6595, longitude: 139.7004 },
        rating: 3.8,
        userRatingCount: 450,
        // No opening hours
        // No phone
        // No photos
        primaryType: 'convenience_store',
        // No priceLevel
      },
    ],
  };
}

const FAKE_SERVER_KEY = 'test-google-server-key-12345';

describe('GET /api/places/nearby', () => {
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

  // ── Happy path ──

  it('returns cleaned places for a valid request', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => makePlacesApiResponse(),
    });

    // Dynamic import so env var is picked up fresh each test
    const { GET } = await import('../route');
    const res = await GET(makeRequest({ lat: '35.6654', lng: '139.7707', type: 'restaurant' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(2);

    // First place — all fields present
    const first = body[0];
    expect(first).toEqual({
      id: 'ChIJ_abc123',
      name: 'Sushi Dai',
      address: '5-2-1 Tsukiji, Chuo City, Tokyo',
      lat: 35.6654,
      lng: 139.7707,
      rating: 4.6,
      ratingCount: 1200,
      isOpen: true,
      phone: '03-1234-5678',
      photoUrl: `https://places.googleapis.com/v1/places/ChIJ_abc123/photos/photo-ref-1/media?maxWidthPx=400&skipHttpRedirect=false&key=${FAKE_SERVER_KEY}`,
      type: 'restaurant',
      priceLevel: 'PRICE_LEVEL_MODERATE',
    });

    // Second place — nullable fields should be null
    const second = body[1];
    expect(second.isOpen).toBeNull();
    expect(second.phone).toBeNull();
    expect(second.photoUrl).toBeNull();
    expect(second.priceLevel).toBeNull();
  });

  it('uses default radius of 1000 when not provided', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => makePlacesApiResponse({ places: [] }),
    });

    const { GET } = await import('../route');
    await GET(makeRequest({ lat: '35.6654', lng: '139.7707', type: 'restaurant' }));

    const fetchCall = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    expect(requestBody.locationRestriction.circle.radius).toBe(1000);
  });

  it('respects custom radius parameter', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => makePlacesApiResponse({ places: [] }),
    });

    const { GET } = await import('../route');
    await GET(makeRequest({ lat: '35.6654', lng: '139.7707', type: 'restaurant', radius: '2500' }));

    const fetchCall = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    expect(requestBody.locationRestriction.circle.radius).toBe(2500);
  });

  it('sends correct headers and body to Google Places API', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => makePlacesApiResponse({ places: [] }),
    });

    const { GET } = await import('../route');
    await GET(makeRequest({ lat: '35.6654', lng: '139.7707', type: 'restaurant' }));

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];

    // URL
    expect(url).toBe('https://places.googleapis.com/v1/places:searchNearby');

    // Method
    expect(options.method).toBe('POST');

    // Headers
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers['X-Goog-Api-Key']).toBe(FAKE_SERVER_KEY);
    expect(options.headers['X-Goog-FieldMask']).toContain('places.id');
    expect(options.headers['X-Goog-FieldMask']).toContain('places.displayName');
    expect(options.headers['X-Goog-FieldMask']).toContain('places.photos');

    // Body
    const requestBody = JSON.parse(options.body);
    expect(requestBody.includedTypes).toEqual(['restaurant']);
    expect(requestBody.maxResultCount).toBe(20);
    expect(requestBody.locationRestriction.circle.center).toEqual({
      latitude: 35.6654,
      longitude: 139.7707,
    });
  });

  // ── Photo URL construction ──

  it('constructs photo URLs using the first photo reference', async () => {
    const photoName = 'places/ChIJ_test/photos/special-ref-abc';
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => makePlacesApiResponse({
        places: [
          {
            id: 'ChIJ_test',
            displayName: { text: 'Test Place' },
            formattedAddress: '123 Test St',
            location: { latitude: 1, longitude: 2 },
            rating: 4.0,
            userRatingCount: 10,
            primaryType: 'restaurant',
            photos: [{ name: photoName }, { name: 'places/ChIJ_test/photos/second-ref' }],
          },
        ],
      }),
    });

    const { GET } = await import('../route');
    const res = await GET(makeRequest({ lat: '1', lng: '2', type: 'restaurant' }));
    const body = await res.json();

    expect(body[0].photoUrl).toBe(
      `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&skipHttpRedirect=false&key=${FAKE_SERVER_KEY}`
    );
  });

  // ── Validation: missing params ──

  it('returns 400 when lat is missing', async () => {
    const { GET } = await import('../route');
    const res = await GET(makeRequest({ lng: '139.77', type: 'restaurant' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('returns 400 when lng is missing', async () => {
    const { GET } = await import('../route');
    const res = await GET(makeRequest({ lat: '35.66', type: 'restaurant' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('returns 400 when type is missing', async () => {
    const { GET } = await import('../route');
    const res = await GET(makeRequest({ lat: '35.66', lng: '139.77' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  // ── Error handling: API failure ──

  it('returns 500 with generic error on API failure (no key leakage)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => `API key ${FAKE_SERVER_KEY} is invalid`,
    });

    const { GET } = await import('../route');
    const res = await GET(makeRequest({ lat: '35.66', lng: '139.77', type: 'restaurant' }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
    // Must not leak the API key in the response
    expect(JSON.stringify(body)).not.toContain(FAKE_SERVER_KEY);
  });

  it('returns 500 with generic error on network failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network timeout'));

    const { GET } = await import('../route');
    const res = await GET(makeRequest({ lat: '35.66', lng: '139.77', type: 'restaurant' }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(JSON.stringify(body)).not.toContain(FAKE_SERVER_KEY);
  });

  // ── Edge case: empty results ──

  it('returns empty array when API returns no places', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ places: [] }),
    });

    const { GET } = await import('../route');
    const res = await GET(makeRequest({ lat: '35.66', lng: '139.77', type: 'atm' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual([]);
  });

  it('returns empty array when API returns no places key', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const { GET } = await import('../route');
    const res = await GET(makeRequest({ lat: '35.66', lng: '139.77', type: 'atm' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual([]);
  });
});
