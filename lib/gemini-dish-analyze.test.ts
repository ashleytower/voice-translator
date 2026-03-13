import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent: vi.fn() },
  })),
  Type: {
    OBJECT: 'object',
    STRING: 'string',
    NUMBER: 'number',
    ARRAY: 'array',
    BOOLEAN: 'boolean',
  },
}));

import { GoogleGenAI } from '@google/genai';
import { analyzeDish } from '@/lib/gemini-dish-analyze';

describe('analyzeDish', () => {
  let mockGenerateContent: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateContent = vi.fn();
    (GoogleGenAI as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      models: { generateContent: mockGenerateContent },
    }));
  });

  it('returns a DishAnalysis on success', async () => {
    const fakeDish = {
      dishName: 'Ramen',
      localName: 'ラーメン',
      description: 'Noodle soup',
      ingredients: ['noodles', 'broth', 'pork'],
      dietaryFlags: { vegetarian: false, vegan: false, glutenFree: false, nutFree: true, dairyFree: true },
      cuisineType: 'Japanese',
      spiceLevel: 'mild',
      confidence: 0.95,
    };
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(fakeDish) });

    const result = await analyzeDish('base64imagedata', 'English');

    expect(result.dishName).toBe('Ramen');
    expect(result.localName).toBe('ラーメン');
    expect(result.ingredients).toContain('noodles');
  });

  it('passes image as inlineData with image/jpeg mimeType', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        dishName: 'test', localName: 'test', description: 'test',
        ingredients: [], dietaryFlags: { vegetarian: false, vegan: false, glutenFree: false, nutFree: false, dairyFree: false },
        cuisineType: 'test', spiceLevel: 'unknown', confidence: 1,
      }),
    });

    await analyzeDish('mybase64', 'French');

    const callArgs = mockGenerateContent.mock.calls[0][0];
    const imagePart = callArgs.contents[0].parts.find(
      (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData
    );
    expect(imagePart.inlineData.mimeType).toBe('image/jpeg');
    expect(imagePart.inlineData.data).toBe('mybase64');
  });

  it('includes target language in prompt', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        dishName: '', localName: '', description: '', ingredients: [],
        dietaryFlags: { vegetarian: false, vegan: false, glutenFree: false, nutFree: false, dairyFree: false },
        cuisineType: '', spiceLevel: 'unknown', confidence: 0,
      }),
    });

    await analyzeDish('img', 'Spanish');

    const callArgs = mockGenerateContent.mock.calls[0][0];
    const textPart = callArgs.contents[0].parts.find((p: { text?: string }) => p.text);
    expect(textPart.text).toContain('Spanish');
  });

  it('returns fallback when Gemini throws', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('quota'));

    const result = await analyzeDish('img', 'English');

    expect(result.dishName).toBe('Unknown dish');
    expect(result.ingredients).toEqual([]);
  });

  it('returns fallback when response.text is null', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: null });

    const result = await analyzeDish('img', 'English');

    expect(result.dishName).toBe('Unknown dish');
  });
});
