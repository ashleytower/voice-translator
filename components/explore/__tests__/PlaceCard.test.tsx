import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlaceCard } from '../PlaceCard';
import type { NearbyPlace } from '@/types';

const basePlace: NearbyPlace = {
  id: 'place-1',
  name: 'Ichiran Ramen',
  address: '1-22-7 Jinnan, Shibuya',
  lat: 35.6612,
  lng: 139.7003,
  rating: 4.5,
  ratingCount: 312,
  isOpen: true,
  phone: '+81-3-3463-3667',
  photoUrl: 'https://example.com/photo.jpg',
  type: 'restaurant',
  priceLevel: '$$',
};

describe('PlaceCard', () => {
  it('renders place name', () => {
    render(<PlaceCard place={basePlace} categoryColor="#FF6B35" />);
    expect(screen.getByText('Ichiran Ramen')).toBeInTheDocument();
  });

  it('renders photo when photoUrl provided', () => {
    render(<PlaceCard place={basePlace} categoryColor="#FF6B35" />);
    const img = screen.getByRole('img', { name: /ichiran ramen/i });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('shows emoji fallback when photoUrl is null', () => {
    const noPhoto: NearbyPlace = { ...basePlace, photoUrl: null };
    render(<PlaceCard place={noPhoto} categoryColor="#FF6B35" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    // Should show a fallback area with an emoji
    const fallback = screen.getByTestId('photo-fallback');
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveStyle({ backgroundColor: '#FF6B35' });
  });

  it('shows rating with stars and count', () => {
    render(<PlaceCard place={basePlace} categoryColor="#FF6B35" />);
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('(312)')).toBeInTheDocument();
    // At least one star character should be present
    expect(screen.getByText(/★/)).toBeInTheDocument();
  });

  it('shows "Open" badge when isOpen is true', () => {
    render(<PlaceCard place={basePlace} categoryColor="#FF6B35" />);
    const badge = screen.getByText('Open');
    expect(badge).toBeInTheDocument();
  });

  it('shows "Closed" badge when isOpen is false', () => {
    const closed: NearbyPlace = { ...basePlace, isOpen: false };
    render(<PlaceCard place={closed} categoryColor="#FF6B35" />);
    const badge = screen.getByText('Closed');
    expect(badge).toBeInTheDocument();
  });

  it('does not show open/closed badge when isOpen is null', () => {
    const unknown: NearbyPlace = { ...basePlace, isOpen: null };
    render(<PlaceCard place={unknown} categoryColor="#FF6B35" />);
    expect(screen.queryByText('Open')).not.toBeInTheDocument();
    expect(screen.queryByText('Closed')).not.toBeInTheDocument();
  });

  it('renders phone link when phone provided', () => {
    render(<PlaceCard place={basePlace} categoryColor="#FF6B35" />);
    const link = screen.getByRole('link', { name: /call/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'tel:+81-3-3463-3667');
  });

  it('does not render phone when phone is null', () => {
    const noPhone: NearbyPlace = { ...basePlace, phone: null };
    render(<PlaceCard place={noPhone} categoryColor="#FF6B35" />);
    expect(screen.queryByRole('link', { name: /call/i })).not.toBeInTheDocument();
  });

  it('truncates long place names', () => {
    const longName: NearbyPlace = {
      ...basePlace,
      name: 'This Is An Extremely Long Restaurant Name That Should Be Truncated',
    };
    render(<PlaceCard place={longName} categoryColor="#FF6B35" />);
    const nameEl = screen.getByText(longName.name);
    expect(nameEl.className).toMatch(/truncate/);
  });

  it('shows address and price level in meta line', () => {
    render(<PlaceCard place={basePlace} categoryColor="#FF6B35" />);
    expect(screen.getByText(/1-22-7 Jinnan, Shibuya/)).toBeInTheDocument();
    expect(screen.getByText(/\$\$/)).toBeInTheDocument();
  });

  it('shows only address when priceLevel is null', () => {
    const noPrice: NearbyPlace = { ...basePlace, priceLevel: null };
    render(<PlaceCard place={noPrice} categoryColor="#FF6B35" />);
    expect(screen.getByText('1-22-7 Jinnan, Shibuya')).toBeInTheDocument();
  });

  it('does not show rating when rating is null', () => {
    const noRating: NearbyPlace = { ...basePlace, rating: null, ratingCount: 0 };
    render(<PlaceCard place={noRating} categoryColor="#FF6B35" />);
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });
});
