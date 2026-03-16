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
    const response = await fetch('/api/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64,
        targetLanguage,
        mode: 'dish',
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Dish analyze error:', error);
    return FALLBACK;
  }
}
