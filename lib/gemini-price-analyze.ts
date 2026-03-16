import { GoogleGenAI, Type } from '@google/genai';
import type { PriceAnalysis } from '@/types';

const FALLBACK: PriceAnalysis = {
  productName: 'Unknown product',
  storeName: '',
  price: 0,
  currency: 'USD',
  confidence: 0,
};

export async function analyzePrice(
  imageBase64: string
): Promise<PriceAnalysis> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '' });

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{
        role: 'user',
        parts: [
          {
            text: `You are a shopping assistant helping a traveler understand pricing. Look at this image of a price tag, receipt, shelf label, or product. Extract the product name, store/brand name (if visible), exact price amount as a number, and the currency code (ISO 4217 like USD, JPY, EUR). If the currency isn't explicit, infer from context (language, currency symbol). Return ONLY valid JSON.`,
          },
          { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
        ],
      }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            productName: { type: Type.STRING, description: 'Name of the product' },
            storeName: { type: Type.STRING, description: 'Store or brand name if visible' },
            price: { type: Type.NUMBER, description: 'Exact price as a number' },
            currency: { type: Type.STRING, description: 'ISO 4217 currency code e.g. USD, JPY, EUR' },
            confidence: { type: Type.NUMBER, description: 'Confidence score 0-1' },
          },
          required: ['productName', 'storeName', 'price', 'currency', 'confidence'],
        },
      },
    });

    if (!response.text) return FALLBACK;
    return JSON.parse(response.text) as PriceAnalysis;
  } catch (error) {
    console.error('Price analyze error:', error);
    return FALLBACK;
  }
}
