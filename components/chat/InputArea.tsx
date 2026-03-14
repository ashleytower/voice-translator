'use client';

import React, { useRef, useState, useEffect } from 'react';
import { DollarSign, ImagePlus, Phone, Send, X, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { HOME_CURRENCIES } from '@/lib/currency-constants';

interface InputAreaProps {
  onSend: (text: string, attachment?: string) => void;
  isLoading: boolean;
  isLive?: boolean;
  onToggleLive?: () => void;
  onStartCall?: () => void;
  homeCurrency?: string;
  foreignCurrency?: string;
}

export const InputArea: React.FC<InputAreaProps> = ({
  onSend,
  isLoading,
  isLive,
  onStartCall,
  homeCurrency = 'CAD',
  foreignCurrency = 'USD',
}) => {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [showConverter, setShowConverter] = useState(false);
  const [convertAmount, setConvertAmount] = useState('');
  const [convertFrom, setConvertFrom] = useState(foreignCurrency);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const convertInputRef = useRef<HTMLInputElement>(null);

  const { convert } = useExchangeRates();
  const homeInfo = HOME_CURRENCIES.find(c => c.code === homeCurrency) || HOME_CURRENCIES[0];
  const fromInfo = HOME_CURRENCIES.find(c => c.code === convertFrom);

  // Update foreign currency when prop changes
  useEffect(() => {
    setConvertFrom(foreignCurrency);
  }, [foreignCurrency]);

  // Auto-focus the converter input when opened
  useEffect(() => {
    if (showConverter) {
      setTimeout(() => convertInputRef.current?.focus(), 50);
    }
  }, [showConverter]);

  const numericAmount = parseFloat(convertAmount) || 0;
  const convertedValue = numericAmount > 0 ? convert(numericAmount, convertFrom, homeCurrency) : 0;

  const handleSend = () => {
    if ((input.trim() || attachment) && !isLoading) {
      onSend(input, attachment || undefined);
      setInput('');
      setAttachment(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const canSend = (input.trim() || attachment) && !isLoading;

  return (
    <div className="w-full">
      {/* Image Preview */}
      {attachment && (
        <div className="mb-3 relative inline-block">
          <img
            src={attachment}
            alt="Preview"
            className="h-20 w-auto rounded-xl object-cover"
          />
          <button
            onClick={removeAttachment}
            className="absolute -top-3 -right-3 w-11 h-11 rounded-full flex items-center justify-center"
            aria-label="Remove attachment"
          >
            <span className="h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center">
              <X className="h-3 w-3" />
            </span>
          </button>
        </div>
      )}

      {/* Inline Quick Converter */}
      {showConverter && (
        <div className="mb-2 rounded-2xl bg-secondary/80 backdrop-blur-sm border border-border/50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Quick Convert</span>
            <button
              onClick={() => { setShowConverter(false); setConvertAmount(''); }}
              className="w-11 h-11 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Close converter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={convertInputRef}
              type="number"
              inputMode="decimal"
              value={convertAmount}
              onChange={(e) => setConvertAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-background/80 rounded-xl px-3 py-2 text-lg font-semibold border border-border/50 focus:border-primary/50 focus:outline-none transition-colors"
            />
            <select
              value={convertFrom}
              onChange={(e) => setConvertFrom(e.target.value)}
              className="bg-background/80 rounded-xl px-2 py-2 text-sm font-medium border border-border/50 focus:border-primary/50 focus:outline-none transition-colors"
            >
              {HOME_CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
              ))}
            </select>
          </div>

          {numericAmount > 0 && (
            <div className="flex flex-col items-center gap-1 py-1">
              <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-lg font-bold text-primary">
                {homeInfo.symbol}{convertedValue.toFixed(2)} {homeCurrency}
              </p>
              <p className="text-[11px] text-muted-foreground">
                1 {convertFrom} = {homeInfo.symbol}{convert(1, convertFrom, homeCurrency).toFixed(4)} {homeCurrency}
              </p>
            </div>
          )}
        </div>
      )}

      <div className={cn(
        'flex items-end gap-1.5 rounded-2xl bg-secondary/50 p-1.5 transition-colors',
        isLive && 'ring-1 ring-red-500/30 bg-red-500/5'
      )}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        <button
          onClick={onStartCall}
          disabled={isLive}
          className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-30"
          aria-label="Make a phone call"
        >
          <Phone className="h-[18px] w-[18px]" />
        </button>

        <button
          onClick={handleFileClick}
          disabled={isLive}
          className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30"
          aria-label="Attach image"
        >
          <ImagePlus className="h-[18px] w-[18px]" />
        </button>

        <button
          onClick={() => setShowConverter(!showConverter)}
          disabled={isLive || isLoading}
          className={cn(
            'h-11 w-11 shrink-0 flex items-center justify-center rounded-xl transition-colors disabled:opacity-30',
            showConverter
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          )}
          aria-label="Quick convert price"
        >
          <DollarSign className="h-[18px] w-[18px]" />
        </button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-sm resize-none max-h-32 py-2 px-1 placeholder:text-muted-foreground/50"
          placeholder={
            isLive
              ? 'Listening...'
              : isLoading
              ? 'Translating...'
              : 'Type or tap the orb to speak...'
          }
          rows={1}
          disabled={isLoading || isLive}
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'h-11 w-11 shrink-0 flex items-center justify-center rounded-xl transition-all duration-200',
            canSend
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'text-muted-foreground/30'
          )}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default InputArea;
