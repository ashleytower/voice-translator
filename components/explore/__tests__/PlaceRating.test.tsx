import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaceRating } from '../PlaceRating';

describe('PlaceRating', () => {
  it('renders 5 stars', () => {
    render(<PlaceRating rating={null} onRate={() => {}} />);
    const stars = screen.getAllByRole('button');
    expect(stars).toHaveLength(5);
  });

  it('shows filled stars up to the rating value', () => {
    render(<PlaceRating rating={3} onRate={() => {}} />);
    const stars = screen.getAllByRole('button');

    // Stars 1-3 should be filled (gold fill)
    for (let i = 0; i < 3; i++) {
      const path = stars[i].querySelector('path');
      expect(path).toHaveAttribute('fill', '#f5c842');
    }

    // Stars 4-5 should be outlined (no fill)
    for (let i = 3; i < 5; i++) {
      const path = stars[i].querySelector('path');
      expect(path).toHaveAttribute('fill', 'none');
    }
  });

  it('shows all outline stars when rating is null', () => {
    render(<PlaceRating rating={null} onRate={() => {}} />);
    const stars = screen.getAllByRole('button');

    for (let i = 0; i < 5; i++) {
      const path = stars[i].querySelector('path');
      expect(path).toHaveAttribute('fill', 'none');
      expect(path).toHaveAttribute('stroke', 'rgba(255,255,255,0.5)');
    }
  });

  it('calls onRate with the star number when clicked', () => {
    const handleRate = vi.fn();
    render(<PlaceRating rating={null} onRate={handleRate} />);

    fireEvent.click(screen.getByLabelText('Rate 3 out of 5 stars'));
    expect(handleRate).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByLabelText('Rate 1 out of 5 stars'));
    expect(handleRate).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByLabelText('Rate 5 out of 5 stars'));
    expect(handleRate).toHaveBeenCalledWith(5);
  });

  it('calls onRate(null) when clicking the currently active star (toggle off)', () => {
    const handleRate = vi.fn();
    render(<PlaceRating rating={3} onRate={handleRate} />);

    fireEvent.click(screen.getByLabelText('Rate 3 out of 5 stars'));
    expect(handleRate).toHaveBeenCalledWith(null);
  });

  it('respects disabled state', () => {
    const handleRate = vi.fn();
    render(<PlaceRating rating={2} onRate={handleRate} disabled />);

    const stars = screen.getAllByRole('button');
    for (const star of stars) {
      expect(star).toBeDisabled();
    }

    fireEvent.click(screen.getByLabelText('Rate 4 out of 5 stars'));
    expect(handleRate).not.toHaveBeenCalled();
  });

  it('has correct aria-labels', () => {
    render(<PlaceRating rating={null} onRate={() => {}} />);

    expect(screen.getByLabelText('Rate 1 out of 5 stars')).toBeInTheDocument();
    expect(screen.getByLabelText('Rate 2 out of 5 stars')).toBeInTheDocument();
    expect(screen.getByLabelText('Rate 3 out of 5 stars')).toBeInTheDocument();
    expect(screen.getByLabelText('Rate 4 out of 5 stars')).toBeInTheDocument();
    expect(screen.getByLabelText('Rate 5 out of 5 stars')).toBeInTheDocument();
  });
});
