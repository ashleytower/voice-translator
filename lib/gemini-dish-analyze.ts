import { GoogleGenAI, Type } from '@google/genai';
import type { DishAnalysis } from '@/types';

const FALLBACK: DishAnalysis = {
  dishName: 'Unknown dish',
  localName: '',
  description: 'Could not analyze this dish.',
  ingredients: [],
  dietaryFlags: {
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    nutFree: false,
    dairyFree: false,
  },
  cuisineType: 'Unknown',
  spiceLevel: 'unknown',
  confidence: 0,
};

export async function analyzeDish(
  imageBase64: string,
  targetLanguage: string
): Promise<DishAnalysis> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '' });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          {
            text: `You are a food expert helping a traveler understand what they're looking at.
Analyze this image of a dish or food item.
Provide your response in ${targetLanguage} for the description and dish name fields.
Also provide the local/original name in the local script.
Return ONLY valid JSON — no markdown, no extra text.`,
          },
          { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
        ],
      }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dishName: { type: Type.STRING, description: `Dish name in ${targetLanguage}` },
            localName: { type: Type.STRING, description: 'Name in the original local script/language' },
            description: { type: Type.STRING, description: `Brief description in ${targetLanguage}` },
            ingredients: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Main ingredients',
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
            spiceLevel: { type: Type.STRING, description: 'mild, medium, hot, or unknown' },
            confidence: { type: Type.NUMBER, description: 'Confidence score 0-1' },
          },
          required: ['dishName', 'localName', 'description', 'ingredients', 'dietaryFlags', 'cuisineType', 'spiceLevel', 'confidence'],
        },
      },
    });

    if (!response.text) return FALLBACK;
    return JSON.parse(response.text) as DishAnalysis;
  } catch (error) {
    console.error('Dish analyze error:', error);
    return FALLBACK;
  }
}
