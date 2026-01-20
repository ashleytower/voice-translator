'use client';

import React, { useState } from 'react';
import { Language } from '@/types';
import { LANGUAGES } from '@/lib/constants';
import { LanguagePicker } from './LanguagePicker';

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
      <div className="px-6 py-4 flex items-center justify-center gap-3 relative z-10">
        <button
          onClick={() => setIsFromOpen(true)}
          className="flex-1 glass-morphic rounded-2xl py-3 px-4 flex items-center justify-between group active:scale-95 transition-all"
        >
          <span className="text-xs font-bold text-gray-400 group-hover:text-fluent-primary uppercase tracking-tighter">
            From
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{fromLang.name}</span>
            <span className="material-symbols-outlined text-sm opacity-50">
              expand_more
            </span>
          </div>
        </button>

        <button
          onClick={onSwap}
          className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 active:rotate-180 transition-all"
        >
          <span className="material-symbols-outlined text-xs text-fluent-primary">
            sync_alt
          </span>
        </button>

        <button
          onClick={() => setIsToOpen(true)}
          className="flex-1 glass-morphic rounded-2xl py-3 px-4 flex items-center justify-between group active:scale-95 transition-all"
        >
          <span className="text-xs font-bold text-gray-400 group-hover:text-fluent-primary uppercase tracking-tighter">
            To
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-fluent-primary">
              {toLang.name}
            </span>
            <span className="material-symbols-outlined text-sm opacity-50 text-fluent-primary">
              expand_more
            </span>
          </div>
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
