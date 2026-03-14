import React, { useState, useRef, useEffect } from 'react';
import { Check, Pencil, Search, ArrowDown, TrendingDown, TrendingUp, Loader2, RefreshCw, Save } from 'lucide-react';
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
  onClearDeal?: () => void;
  dealResult?: DealResult | null;
  isCheckingDeal?: boolean;
  exchangeRate?: number;
  onSave?: () => void;
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
  onClearDeal,
  dealResult,
  isCheckingDeal = false,
  exchangeRate,
  onSave,
}: PriceCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(price.productName);
  const inputRef = useRef<HTMLInputElement>(null);

  const verdict = dealResult ? VERDICT_STYLES[dealResult.verdict] : null;
  const isPositiveDeal = dealResult?.verdict === 'great_deal' || dealResult?.verdict === 'good_deal';
  const displayName = editName || price.productName;
  const hasName = displayName && displayName.trim().length > 0;
  const nameChanged = editName.trim() !== price.productName.trim();

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleNameSubmit = () => {
    setIsEditing(false);
    if (editName.trim()) {
      onClearDeal?.();
      onCheckDeal(editName.trim());
    }
  };

  const handleRecheck = () => {
    onClearDeal?.();
    onCheckDeal(displayName);
  };

  return (
    <div className="rounded-2xl bg-secondary/50 border border-border/30 p-4 space-y-3">
      {/* Header with editable product name */}
      <div className="flex items-start justify-between gap-2">
        {isEditing ? (
          <div className="flex-1 flex items-center gap-1.5">
            <input
              ref={inputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleNameSubmit(); }}
              placeholder="What is this item?"
              className="flex-1 bg-background/80 rounded-lg px-2 py-1 text-base font-semibold border border-primary/50 focus:outline-none"
            />
            <button
              onClick={handleNameSubmit}
              className="h-8 px-3 flex items-center gap-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shrink-0"
            >
              <Check className="h-3.5 w-3.5" />
              Update
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 text-left group"
          >
            <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">
              {hasName ? displayName : 'Tap to describe item'}
            </h3>
            <Pencil className="h-3 w-3 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
          </button>
        )}
        {!isEditing && price.storeName && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">
            {price.storeName}
          </span>
        )}
      </div>

      {/* Price conversion */}
      <div className="flex flex-col items-center gap-1 py-2">
        <span className="text-lg font-bold text-foreground">
          {formatPrice(price.price, foreignSymbol, price.currency)}
        </span>
        <div className="flex flex-col items-center gap-0.5">
          <ArrowDown className="h-4 w-4 text-muted-foreground" />
          {exchangeRate != null && (
            <span className="text-[12px] text-[rgba(235,235,245,0.3)] tabular-nums">
              1 {price.currency} = {exchangeRate.toFixed(3)} {homeCurrency}
            </span>
          )}
        </div>
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
      {!dealResult && !isEditing && (
        <button
          aria-label="check deal"
          onClick={() => onCheckDeal(displayName || '')}
          disabled={isCheckingDeal || !hasName}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors',
            hasName
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'border border-border/50 text-muted-foreground',
            (isCheckingDeal || !hasName) && 'opacity-60 cursor-not-allowed'
          )}
        >
          {isCheckingDeal ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {isCheckingDeal ? 'Checking...' : hasName ? 'Check Deal' : 'Name the item first'}
        </button>
      )}

      {/* Re-check after verdict with corrected name */}
      {dealResult && !isEditing && (
        <button
          onClick={handleRecheck}
          disabled={isCheckingDeal}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors border border-border/30"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Re-check deal
        </button>
      )}

      {onSave && !isEditing && (
        <button
          onClick={onSave}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-white/[0.06] text-[rgba(235,235,245,0.6)] hover:text-white hover:bg-[#2C2C2E] transition-colors mt-2"
        >
          <Save className="h-4 w-4" />
          Save to chat
        </button>
      )}
    </div>
  );
}

export default PriceCard;
