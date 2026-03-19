import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the @google/genai module
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return {
      models: {
        generateContent: vi.fn(),
      },
    };
  }),
  Type: {
    OBJECT: 'object',
    STRING: 'string',
    NUMBER: 'number',
    ARRAY: 'array',
  },
}));

import { GoogleGenAI } from '@google/genai';
import { translateCameraImage } from '@/lib/gemini-camera-translate';

describe('translateCameraImage', () => {
  let mockGenerateContent: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateContent = vi.fn();
    (GoogleGenAI as ReturnType<typeof vi.fn>).mockImplementation(function () {
      return {
        models: { generateContent: mockGenerateContent },
      };
    });
  });

  it('returns a CameraTranslationResult on success', async () => {
    const fakeResult = {
      extractedText: 'ラーメン ¥800',
      translatedText: 'Ramen ¥800',
      detectedLanguage: 'Japanese',
      confidence: 0.95,
      segments: [{ region: 'center', original: 'ラーメン', translated: 'Ramen' }],
    };

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(fakeResult),
    });

    const result = await translateCameraImage('base64encodedimage==', 'English');

    expect(result.translatedText).toBe('Ramen ¥800');
    expect(result.detectedLanguage).toBe('Japanese');
    expect(result.segments).toHaveLength(1);
  });

  it('passes the image as inlineData with jpeg mimeType', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        extractedText: 'test',
        translatedText: 'test',
        detectedLanguage: 'English',
        confidence: 1,
        segments: [],
      }),
    });

    await translateCameraImage('mybase64data', 'Spanish');

    const callArgs = mockGenerateContent.mock.calls[0][0];
    const imagePart = callArgs.contents[0].parts.find(
      (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData
    );
    expect(imagePart).toBeDefined();
    expect(imagePart.inlineData.mimeType).toBe('image/jpeg');
    expect(imagePart.inlineData.data).toBe('mybase64data');
  });

  it('returns a fallback result when Gemini throws', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('API error'));

    const result = await translateCameraImage('base64data', 'English');

    expect(result.translatedText).toBe('Translation unavailable');
    expect(result.detectedLanguage).toBe('Unknown');
    expect(result.segments).toEqual([]);
  });

  it('returns a fallback result when Gemini returns no text', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: null });

    const result = await translateCameraImage('base64data', 'English');

    expect(result.translatedText).toBe('Translation unavailable');
  });

  it('includes target language in prompt content', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        extractedText: '',
        translatedText: '',
        detectedLanguage: 'French',
        confidence: 0.9,
        segments: [],
      }),
    });

    await translateCameraImage('imagedata', 'Japanese');

    const callArgs = mockGenerateContent.mock.calls[0][0];
    const textPart = callArgs.contents[0].parts.find(
      (p: { text?: string }) => p.text
    );
    expect(textPart.text).toContain('Japanese');
  });
});
