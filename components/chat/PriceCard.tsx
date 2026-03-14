import React from 'react';
import { MessageCircle, Search, ArrowDown, TrendingDown, TrendingUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PriceAnalysis } from '@/types';

interface DealResult {
  verdict: 'great_deal' | 'good_deal' | 'fair' | 'skip';
  homePrice: string;
  savings: string;
  explanation: string;
}

interface PriceCardProps {
  price: PriceAnalysis;
  convertedAmount: number;
  homeCurrency: string;
  homeSymbol: string;
  foreignSymbol: string;
  onCheckDeal: (productName: string) => void;
  onChatAboutThis: (price: PriceAnalysis) => void;
  dealResult?: DealResult | null;
  isCheckingDeal?: boolean;
}

const VERDICT_STYLES: Record<DealResult['verdict'], { bg: string; text: string; label: string }> = {
  great_deal: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    label: 'Great Deal!',
  },
  good_deal: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-300',
    label: 'Good Deal',
  },
  fair: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    label: 'Fair Price',
  },
  skip: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    label: 'Better at Home',
  },
};

function formatPrice(amount: number, symbol: string, currency: string): string {
  return `${symbol}${amount.toFixed(2)} ${currency}`;
}

export function PriceCard({
  price,
  convertedAmount,
  homeCurrency,
  homeSymbol,
  foreignSymbol,
  onCheckDeal,
  onChatAboutThis,
  dealResult,
  isCheckingDeal = false,
}: PriceCardProps) {
  const verdict = dealResult ? VERDICT_STYLES[dealResult.verdict] : null;
  const isPositiveDeal = dealResult?.verdict === 'great_deal' || dealResult?.verdict === 'good_deal';

  return (
    <div className="rounded-2xl bg-secondary/50 border border-border/30 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-base leading-tight">{price.productName}</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">
          {price.storeName}
        </span>
      </div>

      {/* Price conversion */}
      <div className="flex flex-col items-center gap-1 py-2">
        <span className="text-lg font-bold text-foreground">
          {formatPrice(price.price, foreignSymbol, price.currency)}
        </span>
        <ArrowDown className="h-4 w-4 text-muted-foreground" />
        <span className="text-lg font-bold text-primary">
          {formatPrice(convertedAmount, homeSymbol, homeCurrency)}
        </span>
      </div>

      {/* Deal verdict */}
      {dealResult && verdict && (
        <div className="rounded-xl bg-background/50 border border-border/30 p-3 space-y-2">
          <div className="flex items-center gap-2">
            {isPositiveDeal ? (
              <TrendingDown className="h-4 w-4 text-emerald-400" />
            ) : (
              <TrendingUp className="h-4 w-4 text-red-400" />
            )}
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                verdict.bg,
                verdict.text
              )}
            >
              {verdict.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Home retail: {dealResult.homePrice}
          </p>
          <p
            className={cn(
              'text-sm font-medium',
              isPositiveDeal ? 'text-emerald-400' : 'text-red-400'
            )}
          >
            {dealResult.savings}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {dealResult.explanation}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {!dealResult && (
          <button
            aria-label="check deal"
            onClick={() => onCheckDeal(price.productName)}
            disabled={isCheckingDeal}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors',
              'border border-border/50 text-foreground hover:bg-secondary/80',
              isCheckingDeal && 'opacity-60 cursor-not-allowed'
            )}
          >
            {isCheckingDeal ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {isCheckingDeal ? 'Checking...' : 'Check Deal'}
          </button>
        )}
        <button
          aria-label="chat about this"
          onClick={() => onChatAboutThis(price)}
          className={cn(
            'flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors',
            dealResult ? 'w-full' : 'flex-1'
          )}
        >
          <MessageCircle className="h-4 w-4" />
          Chat about this
        </button>
      </div>
    </div>
  );
}

export default PriceCard;
