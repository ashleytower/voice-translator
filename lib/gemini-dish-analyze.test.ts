import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeDish } from '@/lib/gemini-dish-analyze';

describe('analyzeDish', () => {
  const originalFetch = global.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns a DishAnalysis on success', async () => {
    const fakeResult = {
      dishName: 'Ramen',
      localName: 'ラーメン',
      description: 'Japanese noodle soup',
      ingredients: ['noodles', 'broth'],
      dietaryFlags: { vegetarian: false, vegan: false, glutenFree: false, nutFree: true, dairyFree: true },
      cuisineType: 'Japanese',
      spiceLevel: 'mild',
      confidence: 0.95,
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => fakeResult,
    });

    const result = await analyzeDish('base64imagedata', 'English');

    expect(result.dishName).toBe('Ramen');
    expect(result.localName).toBe('ラーメン');
    expect(result.ingredients).toContain('noodles');
  });

  it('passes image and mode to the API', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await analyzeDish('mybase64', 'French');

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/vision');
    const body = JSON.parse(options.body);
    expect(body.imageBase64).toBe('mybase64');
    expect(body.targetLanguage).toBe('French');
    expect(body.mode).toBe('dish');
  });

  it('returns fallback when API throws', async () => {
    fetchMock.mockRejectedValueOnce(new Error('API error'));

    const result = await analyzeDish('img', 'English');

    expect(result.dishName).toBe('Unknown dish');
  });

  it('returns fallback when API returns non-ok', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

    const result = await analyzeDish('img', 'English');

    expect(result.dishName).toBe('Unknown dish');
  });
});
