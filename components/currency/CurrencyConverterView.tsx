'use client';

import React, { useState, useEffect } from 'react';
import { Language } from '@/types';

interface CurrencyConverterViewProps {
  currentLanguage: Language;
  onBack: () => void;
}

// Currency data by language code
const CURRENCY_DATA: Record<string, { code: string; symbol: string; name: string; rateToUSD: number }> = {
  ja: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rateToUSD: 0.0067 },
  es: { code: 'EUR', symbol: '€', name: 'Euro', rateToUSD: 1.09 },
  fr: { code: 'EUR', symbol: '€', name: 'Euro', rateToUSD: 1.09 },
  ko: { code: 'KRW', symbol: '₩', name: 'Korean Won', rateToUSD: 0.00075 },
  zh: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', rateToUSD: 0.14 },
  en: { code: 'USD', symbol: '$', name: 'US Dollar', rateToUSD: 1 },
};

// Common amounts for quick conversion
const QUICK_AMOUNTS = [100, 500, 1000, 5000, 10000];

export const CurrencyConverterView: React.FC<CurrencyConverterViewProps> = ({
  currentLanguage,
  onBack,
}) => {
  const currency = CURRENCY_DATA[currentLanguage.code] || CURRENCY_DATA['en'];
  const [amount, setAmount] = useState<string>('');
  const [converted, setConverted] = useState<string>('0.00');

  useEffect(() => {
    const val = parseFloat(amount);
    if (!isNaN(val)) {
      const res = val * currency.rateToUSD;
      setConverted(res.toFixed(2));
    } else {
      setConverted('0.00');
    }
  }, [amount, currency.rateToUSD]);

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 bg-background-dark">
      {/* Header */}
      <div className="pt-10 pb-4 px-6 flex items-center gap-4 bg-background-dark/40 backdrop-blur-md sticky top-0 z-20 border-b border-white/5">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full glass-morphic flex items-center justify-center hover:bg-white/10 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Currency</h1>
          <p className="text-[10px] text-white/50 uppercase tracking-widest">
            {currency.code} to USD
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 no-scrollbar pb-24">
        {/* Main Converter */}
        <div className="space-y-4">
          {/* From Currency */}
          <div className="glass-panel-light p-6 rounded-3xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/50 uppercase tracking-widest">From</span>
              <span className="text-xs text-fluent-primary">{currency.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-white/50">{currency.symbol}</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="flex-1 bg-transparent border-none focus:ring-0 text-4xl font-bold text-white placeholder:text-white/20 text-right"
              />
            </div>
            <div className="text-xs text-white/30 text-right">{currency.code}</div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-fluent-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-fluent-primary">arrow_downward</span>
            </div>
          </div>

          {/* To USD */}
          <div className="glass-panel-light p-6 rounded-3xl space-y-3 border-2 border-fluent-primary/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/50 uppercase tracking-widest">To</span>
              <span className="text-xs text-fluent-primary">US Dollar</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-fluent-primary">$</span>
              <div className="flex-1 text-4xl font-bold text-fluent-primary text-right">
                {converted}
              </div>
            </div>
            <div className="text-xs text-white/30 text-right">USD</div>
          </div>
        </div>

        {/* Quick Amounts */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Quick Convert</h3>
          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value}
                onClick={() => handleQuickAmount(value)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                  amount === value.toString()
                    ? 'bg-fluent-primary text-white'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {currency.symbol}{value.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Exchange Rate Info */}
        <div className="glass-panel-light p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-fluent-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-fluent-primary">info</span>
            </div>
            <div>
              <p className="text-sm text-white">Exchange Rate</p>
              <p className="text-xs text-white/50">
                1 {currency.code} = ${currency.rateToUSD.toFixed(4)} USD
              </p>
            </div>
          </div>
          <p className="text-[10px] text-white/30 mt-3">
            Rates are approximate and for reference only. Actual rates may vary.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CurrencyConverterView;
