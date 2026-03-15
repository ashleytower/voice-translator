import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FabSpeedDial } from '../FabSpeedDial';
import type { PlaceCategory } from '@/types';

describe('FabSpeedDial', () => {
  const defaultProps = {
    onCategorySelect: vi.fn(),
    visible: true,
  };

  it('renders FAB button when visible=true', () => {
    render(<FabSpeedDial {...defaultProps} />);
    const button = screen.getByRole('button', { name: /explore nearby places/i });
    expect(button).toBeInTheDocument();
  });

  it('does not render when visible=false', () => {
    render(<FabSpeedDial {...defaultProps} visible={false} />);
    const button = screen.queryByRole('button', { name: /explore nearby places/i });
    expect(button).not.toBeInTheDocument();
  });

  it('shows category items after clicking FAB', () => {
    render(<FabSpeedDial {...defaultProps} />);
    const fab = screen.getByRole('button', { name: /explore nearby places/i });
    fireEvent.click(fab);

    expect(screen.getByText('Restaurants')).toBeInTheDocument();
    expect(screen.getByText('Stations')).toBeInTheDocument();
    expect(screen.getByText('Convenience')).toBeInTheDocument();
    expect(screen.getByText('Pharmacy')).toBeInTheDocument();
    expect(screen.getByText('ATMs')).toBeInTheDocument();
  });

  it('calls onCategorySelect with correct category when item clicked', () => {
    const onCategorySelect = vi.fn();
    render(<FabSpeedDial onCategorySelect={onCategorySelect} visible={true} />);

    const fab = screen.getByRole('button', { name: /explore nearby places/i });
    fireEvent.click(fab);

    const expectedCategories: Array<{ label: string; category: PlaceCategory }> = [
      { label: 'Restaurants', category: 'restaurant' },
      { label: 'Stations', category: 'train_station' },
      { label: 'Convenience', category: 'convenience_store' },
      { label: 'Pharmacy', category: 'pharmacy' },
      { label: 'ATMs', category: 'atm' },
    ];

    for (const { label, category } of expectedCategories) {
      onCategorySelect.mockClear();
      // Re-open FAB if it closed after previous category click
      if (!screen.queryByText(label)) {
        fireEvent.click(screen.getByRole('button', { name: /explore nearby places/i }));
      }
      fireEvent.click(screen.getByText(label));
      expect(onCategorySelect).toHaveBeenCalledWith(category);
    }
  });

  it('collapses when backdrop clicked', () => {
    render(<FabSpeedDial {...defaultProps} />);
    const fab = screen.getByRole('button', { name: /explore nearby places/i });
    fireEvent.click(fab);

    // Category items should be visible
    expect(screen.getByText('Restaurants')).toBeInTheDocument();

    // Click the backdrop overlay
    const backdrop = screen.getByTestId('fab-backdrop');
    fireEvent.click(backdrop);

    // Category items should no longer be visible
    expect(screen.queryByText('Restaurants')).not.toBeInTheDocument();
  });

  it('has correct aria-label on trigger button', () => {
    render(<FabSpeedDial {...defaultProps} />);
    const button = screen.getByRole('button', { name: 'Explore nearby places' });
    expect(button).toHaveAttribute('aria-label', 'Explore nearby places');
  });
});
