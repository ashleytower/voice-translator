'use client';

import React from 'react';
import { Language } from '@/types';
import { Button } from '@/components/ui/button';
import { X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LanguagePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (lang: Language) => void;
  languages: Language[];
  selectedLanguage: Language;
  title?: string;
}

export const LanguagePicker: React.FC<LanguagePickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  languages,
  selectedLanguage,
  title = 'Select Language',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full sm:max-w-md bg-background border border-border rounded-t-xl sm:rounded-xl shadow-lg max-h-[80vh] flex flex-col animate-fade-up">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                onSelect(lang);
                onClose();
              }}
              className={cn(
                'w-full p-3 rounded-lg flex items-center justify-between transition-colors',
                lang.code === selectedLanguage.code
                  ? 'bg-secondary'
                  : 'hover:bg-secondary/50'
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{lang.flag}</span>
                <span className="text-sm font-medium">{lang.name}</span>
              </div>

              {lang.code === selectedLanguage.code && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LanguagePicker;
