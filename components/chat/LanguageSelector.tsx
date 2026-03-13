'use client';

import React, { useState } from 'react';
import { Language } from '@/types';
import { LANGUAGES } from '@/lib/constants';
import { LanguagePicker } from './LanguagePicker';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight } from 'lucide-react';

interface LanguageSelectorProps {
  fromLang: Language;
  toLang: Language;
  onSwap: () => void;
  onFromChange: (lang: Language) => void;
  onToChange: (lang: Language) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  fromLang,
  toLang,
  onSwap,
  onFromChange,
  onToChange,
}) => {
  const [isFromOpen, setIsFromOpen] = useState(false);
  const [isToOpen, setIsToOpen] = useState(false);

  return (
    <>
      <div className="px-4 py-2.5 flex items-center gap-2 border-b border-border bg-background">
        <button
          onClick={() => setIsFromOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-full border border-border bg-secondary hover:border-primary/40 hover:bg-secondary/80 transition-colors"
        >
          <span className="text-base leading-none">{fromLang.flag}</span>
          <span className="text-sm font-medium text-foreground">{fromLang.name}</span>
        </button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onSwap}
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
        </Button>

        <button
          onClick={() => setIsToOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-full border border-border bg-secondary hover:border-primary/40 hover:bg-secondary/80 transition-colors"
        >
          <span className="text-base leading-none">{toLang.flag}</span>
          <span className="text-sm font-medium text-foreground">{toLang.name}</span>
        </button>
      </div>

      <LanguagePicker
        isOpen={isFromOpen}
        onClose={() => setIsFromOpen(false)}
        onSelect={onFromChange}
        languages={LANGUAGES}
        selectedLanguage={fromLang}
        title="Translate From"
      />

      <LanguagePicker
        isOpen={isToOpen}
        onClose={() => setIsToOpen(false)}
        onSelect={onToChange}
        languages={LANGUAGES}
        selectedLanguage={toLang}
        title="Translate To"
      />
    </>
  );
};

export default LanguageSelector;
