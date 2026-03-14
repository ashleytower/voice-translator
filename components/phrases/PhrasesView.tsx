'use client';

import React from 'react';
import { Message } from '@/types';
import { Volume2, X, BookmarkCheck } from 'lucide-react';

interface PhrasesViewProps {
  messages: Message[];
  onToggleFavorite: (id: string) => void;
  onPlayAudio: (text: string, langCode: string) => void;
  targetLangCode: string;
}

export const PhrasesView: React.FC<PhrasesViewProps> = ({
  messages,
  onToggleFavorite,
  onPlayAudio,
  targetLangCode,
}) => {
  const phrases = messages.filter((m) => m.isFavorite && m.translation);

  if (phrases.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="h-16 w-16 rounded-full bg-[#2C2C2E] flex items-center justify-center mb-4">
          <BookmarkCheck className="h-8 w-8 text-[rgba(235,235,245,0.3)]" />
        </div>
        <p className="text-base font-medium text-foreground">No saved phrases yet</p>
        <p className="text-sm text-[rgba(235,235,245,0.6)] mt-2 max-w-[260px]">
          Star translations in chat to save them here for quick playback
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-5 py-4">
        <h1 className="text-xl font-semibold">Saved Phrases</h1>
        <p className="text-sm text-[rgba(235,235,245,0.6)] mt-1">{phrases.length} phrases</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-3">
          {phrases.map((phrase) => (
            <div
              key={phrase.id}
              className="rounded-2xl bg-[#1C1C1E] border border-white/[0.06] p-4"
            >
              <p className="text-[17px] font-medium leading-relaxed">{phrase.translation}</p>

              {phrase.pronunciation && (
                <p className="text-sm text-[#64B5F6]/70 mt-1">{phrase.pronunciation}</p>
              )}

              <p className="text-sm text-[rgba(235,235,245,0.6)] mt-2">{phrase.text}</p>

              <div className="flex items-center gap-2 mt-3">
                <button
                  aria-label="Play phrase"
                  onClick={() => onPlayAudio(phrase.translation!, targetLangCode)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#64B5F6] text-black text-sm font-semibold min-h-[44px]"
                >
                  <Volume2 className="h-4 w-4" />
                  Play
                </button>
                <div className="flex-1" />
                <button
                  aria-label="Remove phrase"
                  onClick={() => onToggleFavorite(phrase.id)}
                  className="flex items-center justify-center w-11 h-11 rounded-full text-[rgba(235,235,245,0.3)] hover:text-[#FF453A] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PhrasesView;
