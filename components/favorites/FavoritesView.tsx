'use client';

import React from 'react';
import { Message } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bookmark, Volume2, Star } from 'lucide-react';

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
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
        <Bookmark className="h-8 w-8" />
      </div>
      <p className="font-medium">No saved phrases yet</p>
      <p className="text-sm text-muted-foreground mt-1">Star messages to save them here</p>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Saved Phrases</h1>
          <p className="text-xs text-muted-foreground">{favoriteMessages.length} items</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {favoriteMessages.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="space-y-2">
            {favoriteMessages.map((message) => (
              <div key={message.id} className="rounded-lg border border-border p-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {message.translation && (
                      <p className="font-medium mb-1">{message.translation}</p>
                    )}
                    {message.pronunciation && (
                      <p className="text-sm text-primary/70 mb-2">{message.pronunciation}</p>
                    )}
                    <p className="text-sm text-muted-foreground">{message.text}</p>
                    <p className="text-xs text-muted-foreground mt-2">{message.timestamp}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {message.translation && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onPlayAudio(message.translation!, targetLangCode)}
                        className="h-8 w-8"
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onToggleMessageFavorite(message.id)}
                      className="h-8 w-8 text-yellow-500"
                    >
                      <Star className="h-4 w-4 fill-current" />
                    </Button>
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
