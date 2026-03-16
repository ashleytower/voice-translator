import { describe, it, expect, vi, beforeEach } from 'vitest';
import { translateCameraImage } from '@/lib/gemini-camera-translate';

describe('translateCameraImage', () => {
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

  it('returns a CameraTranslationResult on success', async () => {
    const fakeResult = {
      extractedText: 'ラーメン ¥800',
      translatedText: 'Ramen ¥800',
      detectedLanguage: 'Japanese',
      confidence: 0.95,
      segments: [],
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => fakeResult,
    });

    const result = await translateCameraImage('base64encodedimage==', 'English');

    expect(result.translatedText).toBe('Ramen ¥800');
    expect(result.detectedLanguage).toBe('Japanese');
  });

  it('passes the image and mode to the API', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ translatedText: 'test' }),
    });

    await translateCameraImage('mybase64data', 'Spanish');

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/vision');
    const body = JSON.parse(options.body);
    expect(body.imageBase64).toBe('mybase64data');
    expect(body.targetLanguage).toBe('Spanish');
    expect(body.mode).toBe('translate');
  });

  it('returns a fallback result when API fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('API error'));

    const result = await translateCameraImage('base64data', 'English');

    expect(result.translatedText).toBe('Translation unavailable');
    expect(result.detectedLanguage).toBe('Unknown');
    expect(result.segments).toEqual([]);
  });

  it('returns a fallback result when API returns non-ok', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

    const result = await translateCameraImage('base64data', 'English');

    expect(result.translatedText).toBe('Translation unavailable');
  });
});
