'use client';

import React from 'react';
import { Message } from '@/types';
import { Star, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatBubbleProps {
  message: Message;
  onToggleFavorite?: (id: string) => void;
  onPlayAudio?: (text: string, langCode: string) => void;
  targetLangCode?: string;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  onToggleFavorite,
  onPlayAudio,
  targetLangCode,
}) => {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex flex-col items-end animate-fade-up mb-3">
        <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2.5">
          {message.attachment && (
            <div className="mb-2 -mx-1 -mt-0.5">
              <img
                src={message.attachment}
                alt="Attachment"
                className="w-full h-auto rounded-xl max-h-48 object-cover"
              />
            </div>
          )}
          <p className="text-sm leading-relaxed">{message.text}</p>
        </div>
        <div className="flex items-center gap-0.5 mt-1 mr-1">
          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(message.id)}
              className={cn(
                'w-11 h-11 flex items-center justify-center transition-colors',
                message.isFavorite
                  ? 'text-amber-400'
                  : 'text-muted-foreground/20 hover:text-muted-foreground/50'
              )}
              aria-label={message.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className={cn('h-3.5 w-3.5', message.isFavorite && 'fill-current')} />
            </button>
          )}
          <span className="text-[10px] text-muted-foreground/40">
            {message.timestamp}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start animate-fade-up mb-3">
      <div className="max-w-[85%] bg-secondary/60 rounded-2xl rounded-tl-sm px-4 py-2.5">
        {message.translation && (
          <div className="space-y-0.5 mb-2">
            <p className="text-sm font-medium leading-relaxed text-foreground">
              {message.translation}
            </p>
            {message.pronunciation && (
              <p className="text-xs text-muted-foreground/70 italic">
                {message.pronunciation}
              </p>
            )}
          </div>
        )}

        {message.translation && (
          <div className="h-px bg-border/40 my-2" />
        )}

        <p className="text-sm text-muted-foreground leading-relaxed">{message.text}</p>
      </div>

      <div className="flex items-center gap-0.5 mt-1 ml-1">
        {onToggleFavorite && (
          <button
            onClick={() => onToggleFavorite(message.id)}
            className={cn(
              'w-11 h-11 flex items-center justify-center transition-colors',
              message.isFavorite
                ? 'text-amber-400'
                : 'text-muted-foreground/20 hover:text-muted-foreground/50'
            )}
            aria-label={message.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star className={cn('h-3.5 w-3.5', message.isFavorite && 'fill-current')} />
          </button>
        )}
        {onPlayAudio && message.translation && targetLangCode && (
          <button
            onClick={() => onPlayAudio(message.translation!, targetLangCode)}
            className="w-11 h-11 flex items-center justify-center text-muted-foreground/30 hover:text-indigo-400 transition-colors"
            aria-label="Play audio translation"
          >
            <Volume2 className="h-3.5 w-3.5" />
          </button>
        )}
        <span className="text-[10px] text-muted-foreground/40">
          {message.timestamp}
        </span>
      </div>
    </div>
  );
};

export default ChatBubble;
