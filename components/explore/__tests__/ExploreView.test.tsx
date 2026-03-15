import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ExploreView } from '../ExploreView';
import type { NearbyPlace, PlaceCategory } from '@/types';

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="api-provider">{children}</div>
  ),
  Map: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="google-map">{children}</div>
  ),
  Marker: () => <div data-testid="map-marker" />,
}));

const makePlaces = (count: number): NearbyPlace[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `place-${i}`,
    name: `Place ${i}`,
    address: `${i} Main St`,
    lat: 35.68 + i * 0.001,
    lng: 139.76 + i * 0.001,
    rating: 4.5,
    ratingCount: 100,
    isOpen: true,
    phone: null,
    photoUrl: null,
    type: 'restaurant',
    priceLevel: null,
  }));

const defaultProps = {
  visible: true,
  category: 'restaurant' as PlaceCategory,
  lat: 35.6812,
  lng: 139.7671,
  places: makePlaces(4),
  loading: false,
  onBack: vi.fn(),
};

describe('ExploreView', () => {
  it('renders nothing when visible=false', () => {
    const { container } = render(
      <ExploreView {...defaultProps} visible={false} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders map container when visible=true', () => {
    render(<ExploreView {...defaultProps} />);
    expect(screen.getByTestId('google-map')).toBeInTheDocument();
  });

  it('shows back button', () => {
    render(<ExploreView {...defaultProps} />);
    const button = screen.getByRole('button', { name: /back/i });
    expect(button).toBeInTheDocument();
  });

  it('back button calls onBack', () => {
    const onBack = vi.fn();
    render(<ExploreView {...defaultProps} onBack={onBack} />);
    const button = screen.getByRole('button', { name: /back/i });
    fireEvent.click(button);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows category label', () => {
    render(<ExploreView {...defaultProps} category="restaurant" />);
    expect(screen.getByText('Restaurants')).toBeInTheDocument();
  });

  it('renders place cards for each place', () => {
    const places = makePlaces(4);
    render(<ExploreView {...defaultProps} places={places} />);
    for (const place of places) {
      expect(screen.getByText(place.name)).toBeInTheDocument();
    }
  });

  it('shows loading skeletons when loading=true', () => {
    render(<ExploreView {...defaultProps} loading={true} places={[]} />);
    const skeletons = screen.getAllByTestId('skeleton-card');
    expect(skeletons).toHaveLength(3);
  });

  it('shows empty state when no places and not loading', () => {
    render(<ExploreView {...defaultProps} loading={false} places={[]} />);
    expect(screen.getByText(/no places found nearby/i)).toBeInTheDocument();
  });

  it('renders markers for each place', () => {
    const places = makePlaces(3);
    render(<ExploreView {...defaultProps} places={places} />);
    const markers = screen.getAllByTestId('map-marker');
    expect(markers.length).toBeGreaterThanOrEqual(places.length);
  });

  it('shows nearby count in header', () => {
    const places = makePlaces(4);
    render(<ExploreView {...defaultProps} places={places} />);
    expect(screen.getByText('4 nearby')).toBeInTheDocument();
  });

  it('wraps map in APIProvider', () => {
    render(<ExploreView {...defaultProps} />);
    expect(screen.getByTestId('api-provider')).toBeInTheDocument();
  });

  it('shows user location dot', () => {
    render(<ExploreView {...defaultProps} />);
    expect(screen.getByTestId('user-location-dot')).toBeInTheDocument();
  });
});
