'use client';

import React from 'react';
import { Message } from '@/types';

interface FavoritesViewProps {
  messages: Message[];
  onToggleMessageFavorite: (id: string) => void;
  onPlayAudio: (text: string, langCode: string) => void;
  onBack: () => void;
  targetLangCode: string;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  messages,
  onToggleMessageFavorite,
  onPlayAudio,
  onBack,
  targetLangCode,
}) => {
  const favoriteMessages = messages.filter((m) => m.isFavorite);

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-white/30">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-3xl">bookmark</span>
      </div>
      <p className="text-sm font-medium">No saved phrases yet</p>
      <p className="text-xs text-white/20 mt-1">Star messages to save them here</p>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 bg-background-dark">
      {/* Header */}
      <div className="pt-10 pb-4 px-6 flex items-center gap-4 bg-background-dark/40 backdrop-blur-md sticky top-0 z-20 border-b border-white/5">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full glass-morphic flex items-center justify-center hover:bg-white/10 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Saved Phrases</h1>
          <p className="text-[10px] text-white/50 uppercase tracking-widest">
            {favoriteMessages.length} items
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 no-scrollbar pb-24">
        {favoriteMessages.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="space-y-3">
            {favoriteMessages.map((message) => (
              <div key={message.id} className="glass-panel-light rounded-2xl p-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {message.translation && (
                      <p className="text-lg font-bold text-white mb-1 truncate">
                        {message.translation}
                      </p>
                    )}
                    {message.pronunciation && (
                      <p className="text-sm text-fluent-primary/70 mb-2 italic">
                        {message.pronunciation}
                      </p>
                    )}
                    <p className="text-sm text-gray-400 truncate">{message.text}</p>
                    <p className="text-[10px] text-white/30 mt-2">{message.timestamp}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {message.translation && (
                      <button
                        onClick={() => onPlayAudio(message.translation!, targetLangCode)}
                        className="w-9 h-9 rounded-full bg-fluent-primary/10 flex items-center justify-center text-fluent-primary hover:bg-fluent-primary/20 transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">volume_up</span>
                      </button>
                    )}
                    <button
                      onClick={() => onToggleMessageFavorite(message.id)}
                      className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-fluent-primary hover:bg-white/10 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg font-variation-fill">
                        star
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesView;
