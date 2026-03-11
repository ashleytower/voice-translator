'use client';

import { useState, useEffect, useCallback } from 'react';

interface ExchangeRates {
  [currency: string]: number;
}

interface UseExchangeRatesReturn {
  rates: ExchangeRates;
  isLoading: boolean;
  lastUpdated: string | null;
  convert: (amount: number, from: string, to: string) => number;
}

const CACHE_KEY = 'fluent-exchange-rates';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export function useExchangeRates(baseCurrency: string = 'USD'): UseExchangeRatesReturn {
  const [rates, setRates] = useState<ExchangeRates>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const fetchRates = async () => {
      // Check cache first
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { rates: cachedRates, base, timestamp } = JSON.parse(cached);
          if (base === baseCurrency && Date.now() - timestamp < CACHE_DURATION) {
            setRates(cachedRates);
            setLastUpdated(new Date(timestamp).toLocaleTimeString());
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // Cache miss, fetch fresh
      }

      try {
        const res = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
        const data = await res.json();
        if (data.result === 'success') {
          setRates(data.rates);
          const now = Date.now();
          setLastUpdated(new Date(now).toLocaleTimeString());
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            rates: data.rates,
            base: baseCurrency,
            timestamp: now,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRates();
  }, [baseCurrency]);

  const convert = useCallback((amount: number, from: string, to: string): number => {
    if (!rates[from] || !rates[to]) return 0;
    // Convert: amount in "from" -> base -> "to"
    const inBase = amount / rates[from];
    return inBase * rates[to];
  }, [rates]);

  return { rates, isLoading, lastUpdated, convert };
}
