import React from 'react';
import { MessageCircle } from 'lucide-react';
import type { DishAnalysis } from '@/types';

interface DishCardProps {
  dish: DishAnalysis;
  onChatAboutThis: (dish: DishAnalysis) => void;
}

const DIETARY_LABELS: Record<keyof DishAnalysis['dietaryFlags'], string> = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  glutenFree: 'Gluten-free',
  nutFree: 'Nut-free',
  dairyFree: 'Dairy-free',
};

const SPICE_EMOJI: Record<DishAnalysis['spiceLevel'], string> = {
  mild: '🟢',
  medium: '🟡',
  hot: '🔴',
  unknown: '',
};

export function DishCard({ dish, onChatAboutThis }: DishCardProps) {
  const activeDietaryFlags = (
    Object.entries(dish.dietaryFlags) as [keyof typeof dish.dietaryFlags, boolean][]
  ).filter(([, val]) => val);

  return (
    <div className="rounded-2xl bg-secondary/50 border border-border/30 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-base leading-tight">{dish.dishName}</h3>
          {dish.localName && dish.localName !== dish.dishName && (
            <p className="text-sm text-muted-foreground">{dish.localName}</p>
          )}
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">
          {dish.cuisineType}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">{dish.description}</p>

      {/* Spice level */}
      {dish.spiceLevel !== 'unknown' && (
        <p className="text-xs text-muted-foreground">
          {SPICE_EMOJI[dish.spiceLevel]} {dish.spiceLevel.charAt(0).toUpperCase() + dish.spiceLevel.slice(1)} spice
        </p>
      )}

      {/* Ingredients */}
      {dish.ingredients.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {dish.ingredients.map((ing) => (
            <span
              key={ing}
              className="text-xs px-2 py-0.5 rounded-full bg-background border border-border/50 text-foreground"
            >
              {ing}
            </span>
          ))}
        </div>
      )}

      {/* Dietary flags — only show positive ones */}
      {activeDietaryFlags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeDietaryFlags.map(([key]) => (
            <span
              key={key}
              className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            >
              {DIETARY_LABELS[key]}
            </span>
          ))}
        </div>
      )}

      {/* Chat CTA */}
      <button
        aria-label="chat about this"
        onClick={() => onChatAboutThis(dish)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <MessageCircle className="h-4 w-4" />
        Chat about this
      </button>
    </div>
  );
}

export default DishCard;
