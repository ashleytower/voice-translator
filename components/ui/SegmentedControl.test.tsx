import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SegmentedControl } from './SegmentedControl';

describe('SegmentedControl', () => {
  const segments = ['Translate', 'Dish', 'Price'];

  it('renders all segments', () => {
    render(<SegmentedControl segments={segments} activeIndex={0} onChange={vi.fn()} />);
    expect(screen.getByText('Translate')).toBeInTheDocument();
    expect(screen.getByText('Dish')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
  });

  it('calls onChange with correct index on click', () => {
    const onChange = vi.fn();
    render(<SegmentedControl segments={segments} activeIndex={0} onChange={onChange} />);
    fireEvent.click(screen.getByText('Price'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('applies active styling to selected segment', () => {
    render(<SegmentedControl segments={segments} activeIndex={1} onChange={vi.fn()} />);
    const dishBtn = screen.getByText('Dish');
    expect(dishBtn.className).toContain('font-semibold');
  });
});
