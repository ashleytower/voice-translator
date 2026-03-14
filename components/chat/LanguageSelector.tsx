'use client';

import React, { useState } from 'react';
import { Language } from '@/types';
import { LANGUAGES } from '@/lib/constants';
import { LanguagePicker } from './LanguagePicker';
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
      <div className="px-5 py-2 flex items-center gap-3">
        <button
          onClick={() => setIsFromOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-secondary/60 hover:bg-secondary transition-colors"
        >
          <span className="text-base leading-none">{fromLang.flag}</span>
          <span className="text-sm font-medium text-foreground">{fromLang.name}</span>
        </button>

        <button
          onClick={onSwap}
          className="h-11 w-11 shrink-0 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 active:scale-90"
          aria-label="Swap languages"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>

        <button
          onClick={() => setIsToOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-secondary/60 hover:bg-secondary transition-colors"
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
