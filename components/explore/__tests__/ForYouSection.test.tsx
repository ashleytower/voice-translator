import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ForYouSection } from '../ForYouSection';
import type { NearbyPlace } from '@/types';

const makePlace = (overrides: Partial<NearbyPlace> = {}): NearbyPlace => ({
  id: 'place-1',
  name: 'Sushi Dai',
  address: '5-2-1 Tsukiji',
  lat: 35.6654,
  lng: 139.7707,
  rating: 4.7,
  ratingCount: 820,
  isOpen: true,
  phone: null,
  photoUrl: null,
  type: 'restaurant',
  priceLevel: null,
  ...overrides,
});

const makeRecommendations = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    place: makePlace({ id: `rec-${i}`, name: `Rec Place ${i}` }),
    explanation: `Because you loved Place ${i}`,
  }));

describe('ForYouSection', () => {
  it('renders nothing when recommendations is empty', () => {
    const { container } = render(
      <ForYouSection recommendations={[]} loading={false} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows loading skeletons when loading=true', () => {
    render(<ForYouSection recommendations={[]} loading={true} />);
    const skeletons = screen.getAllByTestId('foryou-skeleton');
    expect(skeletons).toHaveLength(3);
  });

  it('renders recommendation cards with place name and explanation', () => {
    const recs = makeRecommendations(2);
    render(<ForYouSection recommendations={recs} loading={false} />);

    expect(screen.getByText('Rec Place 0')).toBeInTheDocument();
    expect(screen.getByText('Rec Place 1')).toBeInTheDocument();
    expect(screen.getByText('Because you loved Place 0')).toBeInTheDocument();
    expect(screen.getByText('Because you loved Place 1')).toBeInTheDocument();
  });

  it('calls onPlaceClick when a card is tapped', () => {
    const recs = makeRecommendations(1);
    const handleClick = vi.fn();
    render(
      <ForYouSection
        recommendations={recs}
        loading={false}
        onPlaceClick={handleClick}
      />
    );

    fireEvent.click(screen.getByText('Rec Place 0'));
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith(recs[0].place);
  });

  it('shows "For You" header', () => {
    const recs = makeRecommendations(1);
    render(<ForYouSection recommendations={recs} loading={false} />);
    expect(screen.getByText('For You')).toBeInTheDocument();
  });

  it('shows header during loading state', () => {
    render(<ForYouSection recommendations={[]} loading={true} />);
    expect(screen.getByText('For You')).toBeInTheDocument();
  });

  it('renders rating when place has one', () => {
    const recs = [
      {
        place: makePlace({ id: 'rated', name: 'Rated Place', rating: 4.5, ratingCount: 100 }),
        explanation: 'Great spot',
      },
    ];
    render(<ForYouSection recommendations={recs} loading={false} />);
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  it('shows emoji fallback when photoUrl is null', () => {
    const recs = [
      {
        place: makePlace({ id: 'no-photo', name: 'No Photo Place', photoUrl: null }),
        explanation: 'Try it',
      },
    ];
    render(<ForYouSection recommendations={recs} loading={false} />);
    expect(screen.getByTestId('foryou-photo-fallback-no-photo')).toBeInTheDocument();
  });
});
