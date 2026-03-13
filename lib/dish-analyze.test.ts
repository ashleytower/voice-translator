import { describe, it, expect } from 'vitest';
import type { DishAnalysis } from '@/types';

describe('DishAnalysis type', () => {
  it('has all required fields', () => {
    const dish: DishAnalysis = {
      dishName: 'Tonkatsu',
      localName: '豚カツ',
      description: 'Breaded pork cutlet, fried golden',
      ingredients: ['pork', 'breadcrumbs', 'egg', 'flour'],
      dietaryFlags: {
        vegetarian: false,
        vegan: false,
        glutenFree: false,
        nutFree: true,
        dairyFree: true,
      },
      cuisineType: 'Japanese',
      spiceLevel: 'mild',
      confidence: 0.92,
    };
    expect(dish.dishName).toBe('Tonkatsu');
    expect(dish.dietaryFlags.vegetarian).toBe(false);
    expect(dish.spiceLevel).toBe('mild');
  });
});
