import React from 'react';
import { cn } from '@/lib/utils';

interface CurrencyCardProps {
  symbol: string;
  amount: number;
  label?: string;
  className?: string;
}

export function CurrencyCard({ symbol, amount, label, className }: CurrencyCardProps) {
  const formatAmount = (value: number): string => {
    // Handle decimals properly
    if (value % 1 !== 0) {
      return value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    // Format integers with commas
    return value.toLocaleString('en-US');
  };

  return (
    <div
      data-testid="currency-card"
      className={cn(
        'relative rounded-xl border border-white/20',
        'bg-gradient-to-br from-white/10 to-white/5',
        'backdrop-blur-md',
        'shadow-lg',
        'p-6',
        'transition-all duration-300',
        'hover:shadow-xl hover:scale-105',
        className
      )}
    >
      <div className="flex flex-col gap-2">
        {label && (
          <span
            data-testid="currency-label"
            className="text-xs font-semibold opacity-70 uppercase tracking-wide"
          >
            {label}
          </span>
        )}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{symbol}</span>
          <span className="text-4xl font-bold tracking-tight">
            {formatAmount(amount)}
          </span>
        </div>
      </div>
    </div>
  );
}
