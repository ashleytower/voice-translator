import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DishCard } from './DishCard';
import type { DishAnalysis } from '@/types';

const mockDish: DishAnalysis = {
  dishName: 'Tonkatsu',
  localName: '豚カツ',
  description: 'Breaded pork cutlet',
  ingredients: ['pork', 'breadcrumbs', 'egg'],
  dietaryFlags: { vegetarian: false, vegan: false, glutenFree: false, nutFree: true, dairyFree: true },
  cuisineType: 'Japanese',
  spiceLevel: 'mild',
  confidence: 0.92,
};

describe('DishCard', () => {
  it('renders dish name and local name', () => {
    render(<DishCard dish={mockDish} onChatAboutThis={vi.fn()} />);
    expect(screen.getByText('Tonkatsu')).toBeInTheDocument();
    expect(screen.getByText('豚カツ')).toBeInTheDocument();
  });

  it('renders cuisine type and description', () => {
    render(<DishCard dish={mockDish} onChatAboutThis={vi.fn()} />);
    expect(screen.getByText('Japanese')).toBeInTheDocument();
    expect(screen.getByText('Breaded pork cutlet')).toBeInTheDocument();
  });

  it('renders ingredient list', () => {
    render(<DishCard dish={mockDish} onChatAboutThis={vi.fn()} />);
    expect(screen.getByText('pork')).toBeInTheDocument();
    expect(screen.getByText('breadcrumbs')).toBeInTheDocument();
  });

  it('shows dietary flags — only positive ones', () => {
    render(<DishCard dish={mockDish} onChatAboutThis={vi.fn()} />);
    // Nut-free and dairy-free are true
    expect(screen.getByText(/nut.free/i)).toBeInTheDocument();
    expect(screen.getByText(/dairy.free/i)).toBeInTheDocument();
    // Vegetarian is false — should not appear
    expect(screen.queryByText(/vegetarian/i)).not.toBeInTheDocument();
  });

  it('calls onChatAboutThis when the button is clicked', () => {
    const onChat = vi.fn();
    render(<DishCard dish={mockDish} onChatAboutThis={onChat} />);
    fireEvent.click(screen.getByRole('button', { name: /chat about this/i }));
    expect(onChat).toHaveBeenCalledWith(mockDish);
  });
});
