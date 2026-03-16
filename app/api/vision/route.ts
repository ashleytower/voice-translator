import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { verifyAuth, standardError } from '@/lib/api-utils';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const user = await verifyAuth();
  if (!user) {
    return standardError('Unauthorized', 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return standardError('Invalid JSON body', 400);
  }

  const { imageBase64, targetLanguage, mode } = body;

  if (!imageBase64 || !targetLanguage) {
    return standardError('Missing required fields: imageBase64, targetLanguage', 400);
  }

  const apiKey = process.env.GOOGLE_API_KEY || '';
  const ai = new GoogleGenAI({ apiKey });
  const modelName = 'gemini-1.5-flash';

  if (mode === 'dish') {
    const prompt = `You are a food expert helping a traveler understand what they're looking at.
Analyze this image of a dish or food item.
Provide your response in ${targetLanguage} for the description and dish name fields.
Also provide the local/original name in the local script.
Return ONLY valid JSON — no markdown, no extra text.`;

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] || imageBase64 } },
          ],
        }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              dishName: { type: Type.STRING },
              localName: { type: Type.STRING },
              description: { type: Type.STRING },
              ingredients: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              dietaryFlags: {
                type: Type.OBJECT,
                properties: {
                  vegetarian: { type: Type.BOOLEAN },
                  vegan: { type: Type.BOOLEAN },
                  glutenFree: { type: Type.BOOLEAN },
                  nutFree: { type: Type.BOOLEAN },
                  dairyFree: { type: Type.BOOLEAN },
                },
                required: ['vegetarian', 'vegan', 'glutenFree', 'nutFree', 'dairyFree'],
              },
              cuisineType: { type: Type.STRING },
              spiceLevel: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
            },
            required: ['dishName', 'localName', 'description', 'ingredients', 'dietaryFlags', 'cuisineType', 'spiceLevel', 'confidence'],
          },
        },
      });
      if (!response.text) throw new Error('No response text');
      return NextResponse.json(JSON.parse(response.text));
    } catch (error) {
      console.error('Gemini Dish API Error:', error);
      return standardError('Failed to analyze dish', 500);
    }
  }

  // Default to camera translation
  const prompt = `You are a travel assistant helping someone read a menu, sign, or notice.
Analyze this image and extract ALL visible text.
Translate everything into ${targetLanguage}.
Return ONLY valid JSON — no markdown, no extra text.`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] || imageBase64 } },
        ],
      }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extractedText: { type: Type.STRING },
            translatedText: { type: Type.STRING },
            detectedLanguage: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            segments: {
              type: Type.ARRAY,
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
    if (!response.text) throw new Error('No response text');
    return NextResponse.json(JSON.parse(response.text));
  } catch (error) {
    console.error('Gemini Camera API Error:', error);
    return standardError('Failed to translate image', 500);
  }
}
