import { describe, it, expect } from 'vitest';
import type { CameraTranslationResult } from '@/types';

describe('CameraTranslationResult type', () => {
  it('has all required fields', () => {
    const result: CameraTranslationResult = {
      extractedText: 'ラーメン ¥800',
      translatedText: 'Ramen ¥800',
      detectedLanguage: 'Japanese',
      confidence: 0.95,
      segments: [
        { region: 'center', original: 'ラーメン', translated: 'Ramen' }
      ],
    };
    expect(result.translatedText).toBe('Ramen ¥800');
    expect(result.segments).toHaveLength(1);
  });
});
