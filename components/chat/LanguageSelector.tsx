'use client';

import React, { useState } from 'react';
import { Language } from '@/types';
import { LANGUAGES } from '@/lib/constants';
import { LanguagePicker } from './LanguagePicker';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, ChevronDown } from 'lucide-react';

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
      <div className="px-4 py-3 flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setIsFromOpen(true)}
          className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg border border-input bg-background hover:bg-accent transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{fromLang.flag}</span>
            <span className="text-sm font-medium">{fromLang.name}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onSwap}
          className="h-9 w-9 shrink-0"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </Button>

        <button
          onClick={() => setIsToOpen(true)}
          className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg border border-input bg-background hover:bg-accent transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{toLang.flag}</span>
            <span className="text-sm font-medium">{toLang.name}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
