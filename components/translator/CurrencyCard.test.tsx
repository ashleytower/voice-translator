import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CurrencyCard } from './CurrencyCard';

describe('CurrencyCard', () => {
  it('renders currency symbol', () => {
    render(<CurrencyCard symbol="¥" amount={1000} />);
    expect(screen.getByText('¥')).toBeInTheDocument();
  });

  it('renders amount value', () => {
    render(<CurrencyCard symbol="$" amount={500} />);
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('formats large numbers with commas', () => {
    render(<CurrencyCard symbol="¥" amount={1000000} />);
    expect(screen.getByText('1,000,000')).toBeInTheDocument();
  });

  it('displays currency label when provided', () => {
    render(<CurrencyCard symbol="¥" amount={1000} label="Japanese Yen" />);
    expect(screen.getByText('Japanese Yen')).toBeInTheDocument();
  });

  it('does not display label when not provided', () => {
    render(<CurrencyCard symbol="$" amount={100} />);
    const card = screen.getByTestId('currency-card');
    expect(card.querySelector('[data-testid="currency-label"]')).not.toBeInTheDocument();
  });

  it('applies glassmorphic styling', () => {
    render(<CurrencyCard symbol="€" amount={200} />);
    const card = screen.getByTestId('currency-card');
    expect(card).toHaveClass('backdrop-blur-md');
  });

  it('accepts custom className', () => {
    render(<CurrencyCard symbol="£" amount={300} className="custom-card" />);
    const card = screen.getByTestId('currency-card');
    expect(card).toHaveClass('custom-card');
  });

  it('displays decimal values correctly', () => {
    render(<CurrencyCard symbol="$" amount={99.99} />);
    expect(screen.getByText('99.99')).toBeInTheDocument();
  });

  it('handles zero amount', () => {
    render(<CurrencyCard symbol="$" amount={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
