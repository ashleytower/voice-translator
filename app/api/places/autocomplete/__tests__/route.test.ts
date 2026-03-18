import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/places/autocomplete');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

const FAKE_SERVER_KEY = 'AIzaFake123';

describe('GET /api/places/autocomplete', () => {
  beforeEach(() => {
    vi.stubEnv('GOOGLE_MAPS_SERVER_KEY', FAKE_SERVER_KEY);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('returns 400 when input is missing', async () => {
    const { GET } = await import('../route');
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 when input is too short', async () => {
    const { GET } = await import('../route');
    const res = await GET(makeRequest({ input: 'ab' }));
    expect(res.status).toBe(400);
  });

  it('returns predictions on success', async () => {
    const mockPredictions = [
      {
        place_id: 'ChIJ1234',
        description: 'Montreal, QC, Canada',
        structured_formatting: {
          main_text: 'Montreal',
          secondary_text: 'QC, Canada',
        },
      },
    ];
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'OK', predictions: mockPredictions }))
    );

    const { GET } = await import('../route');
    const res = await GET(makeRequest({ input: 'Mont' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.predictions).toHaveLength(1);
    expect(data.predictions[0].description).toBe('Montreal, QC, Canada');
  });

  it('returns 500 when server key missing', async () => {
    vi.stubEnv('GOOGLE_MAPS_SERVER_KEY', '');
    const { GET } = await import('../route');
    const res = await GET(makeRequest({ input: 'Montreal' }));
    expect(res.status).toBe(500);
  });
});
