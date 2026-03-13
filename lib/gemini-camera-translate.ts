import { GoogleGenAI, Type } from '@google/genai';
import { CameraTranslationResult } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAI = (): any => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
  return new GoogleGenAI({ apiKey });
};

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
    const ai = getAI();

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `You are a travel assistant helping someone read a menu, sign, or notice.
Analyze this image and extract ALL visible text.
Translate everything into ${targetLanguage}.
Return ONLY valid JSON matching this exact structure — no markdown, no extra text.`,
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: imageBase64,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extractedText: {
              type: Type.STRING,
              description: 'All text found in the image, preserving layout as best as possible',
            },
            translatedText: {
              type: Type.STRING,
              description: `Full translation of all text into ${targetLanguage}`,
            },
            detectedLanguage: {
              type: Type.STRING,
              description: 'The primary language detected in the image',
            },
            confidence: {
              type: Type.NUMBER,
              description: 'Confidence score 0-1',
            },
            segments: {
              type: Type.ARRAY,
              description: 'Individual text regions with their translations',
              items: {
                type: Type.OBJECT,
                properties: {
                  region: { type: Type.STRING },
                  original: { type: Type.STRING },
                  translated: { type: Type.STRING },
                },
                required: ['region', 'original', 'translated'],
              },
            },
          },
          required: ['extractedText', 'translatedText', 'detectedLanguage', 'confidence', 'segments'],
        },
      },
    });

    if (!response.text) return FALLBACK;

    const parsed = JSON.parse(response.text);
    return {
      extractedText: parsed.extractedText ?? '',
      translatedText: parsed.translatedText ?? 'Translation unavailable',
      detectedLanguage: parsed.detectedLanguage ?? 'Unknown',
      confidence: parsed.confidence ?? 0,
      segments: Array.isArray(parsed.segments) ? parsed.segments : [],
    };
  } catch (error) {
    console.error('Camera translate error:', error);
    return FALLBACK;
  }
}
