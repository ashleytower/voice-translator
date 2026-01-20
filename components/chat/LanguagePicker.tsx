'use client';

import React from 'react';
import { Language } from '@/types';

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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 flex flex-col justify-end sm:justify-center">
      <div className="absolute inset-0" onClick={onClose}></div>

      <div className="relative bg-background-dark/90 border-t border-white/10 rounded-t-3xl sm:rounded-3xl sm:mx-6 max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-10 duration-300 w-full sm:w-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/5"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                onSelect(lang);
                onClose();
              }}
              className={`w-full p-4 rounded-xl flex items-center justify-between group active:scale-[0.98] transition-all border ${
                lang.code === selectedLanguage.code
                  ? 'bg-fluent-primary/10 border-fluent-primary/50'
                  : 'bg-white/5 border-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{lang.flag}</span>
                <span
                  className={`text-sm font-bold ${
                    lang.code === selectedLanguage.code
                      ? 'text-fluent-primary'
                      : 'text-white'
                  }`}
                >
                  {lang.name}
                </span>
              </div>

              {lang.code === selectedLanguage.code && (
                <span className="material-symbols-outlined text-fluent-primary">
                  check_circle
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LanguagePicker;
