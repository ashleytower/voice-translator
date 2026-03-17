import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FamiliarSpotsBanner } from '../FamiliarSpotsBanner';
import type { NearbyPlace } from '@/types';

const makePlace = (overrides: Partial<NearbyPlace> = {}): NearbyPlace => ({
  id: 'place-1',
  name: '% Arabica',
  address: '6 Chome Jingumae',
  lat: 35.6625,
  lng: 139.7120,
  rating: 4.6,
  ratingCount: 540,
  isOpen: true,
  phone: null,
  photoUrl: null,
  type: 'cafe',
  priceLevel: null,
  ...overrides,
});

const makeMatches = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    savedPlaceName: `Chain ${i}`,
    savedCity: `City ${i}`,
    nearbyPlace: makePlace({
      id: `match-${i}`,
      name: `Chain ${i}`,
      lat: 35.6625 + i * 0.001,
      lng: 139.712 + i * 0.001,
    }),
  }));

describe('FamiliarSpotsBanner', () => {
  it('renders nothing when matches is empty', () => {
    const { container } = render(<FamiliarSpotsBanner matches={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows the first match banner text', () => {
    const matches = makeMatches(1);
    render(<FamiliarSpotsBanner matches={matches} />);
    expect(screen.getByText(/Chain 0/)).toBeInTheDocument();
    expect(screen.getByText(/nearby/i)).toBeInTheDocument();
  });

  it('shows "+N more" when multiple matches', () => {
    const matches = makeMatches(3);
    render(<FamiliarSpotsBanner matches={matches} />);
    expect(screen.getByText(/\+2 more familiar spots/)).toBeInTheDocument();
  });

  it('does not show "+N more" for a single match', () => {
    const matches = makeMatches(1);
    render(<FamiliarSpotsBanner matches={matches} />);
    expect(screen.queryByText(/more familiar spots/)).not.toBeInTheDocument();
  });

  it('calls onTap when banner is clicked', () => {
    const matches = makeMatches(1);
    const handleTap = vi.fn();
    render(<FamiliarSpotsBanner matches={matches} onTap={handleTap} />);

    fireEvent.click(screen.getByTestId('familiar-spots-banner'));
    expect(handleTap).toHaveBeenCalledTimes(1);
    expect(handleTap).toHaveBeenCalledWith(matches[0].nearbyPlace);
  });
});
