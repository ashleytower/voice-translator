import { CameraTranslationResult } from '@/types';

const FALLBACK: CameraTranslationResult = {
  extractedText: '',
  translatedText: 'Translation unavailable',
  detectedLanguage: 'Unknown',
  confidence: 0,
  segments: [],
};

export async function translateCameraImage(
  imageBase64: string,
  targetLanguage: string
): Promise<CameraTranslationResult> {
  try {
    const response = await fetch('/api/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64,
        targetLanguage,
        mode: 'translate',
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Camera translate error:', error);
    return FALLBACK;
  }
}
