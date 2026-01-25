'use client';

import React from 'react';
import { Message } from '@/types';
import { Star, Volume2, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
      <div className="flex flex-col items-end animate-fade-up">
        <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3 relative">
          {message.attachment && (
            <div className="mb-2 -mx-2 -mt-1">
              <img
                src={message.attachment}
                alt="Attachment"
                className="w-full h-auto rounded-lg max-h-48 object-cover"
              />
            </div>
          )}
          <p className="text-sm">{message.text}</p>
          {onToggleFavorite && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleFavorite(message.id)}
              className={cn(
                'absolute -top-1 -right-1 h-6 w-6',
                message.isFavorite
                  ? 'text-yellow-500'
                  : 'text-primary-foreground/30 hover:text-primary-foreground/60'
              )}
            >
              <Star className={cn('h-3 w-3', message.isFavorite && 'fill-current')} />
            </Button>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground mt-1 mr-1">
          {message.timestamp}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start animate-fade-up">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center">
          <Bot className="h-3 w-3 text-muted-foreground" />
        </div>
        <span className="text-xs text-muted-foreground">Assistant</span>
      </div>
      <div className="max-w-[80%] bg-secondary rounded-2xl rounded-tl-md px-4 py-3 relative">
        <div className="absolute top-2 right-2 flex gap-1">
          {onToggleFavorite && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleFavorite(message.id)}
              className={cn(
                'h-6 w-6',
                message.isFavorite
                  ? 'text-yellow-500'
                  : 'text-muted-foreground/30 hover:text-muted-foreground'
              )}
            >
              <Star className={cn('h-3 w-3', message.isFavorite && 'fill-current')} />
            </Button>
          )}
          {onPlayAudio && message.translation && targetLangCode && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onPlayAudio(message.translation!, targetLangCode)}
              className="h-6 w-6 text-muted-foreground/50 hover:text-muted-foreground"
            >
              <Volume2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        {message.translation && (
          <div className="pr-14 space-y-1 mb-2">
            <p className="text-sm font-medium">{message.translation}</p>
            {message.pronunciation && (
              <p className="text-xs text-muted-foreground">{message.pronunciation}</p>
            )}
          </div>
        )}

        {message.translation && <div className="h-px bg-border mb-2" />}

        <p className="text-sm text-muted-foreground">{message.text}</p>
      </div>
    </div>
  );
};

export default ChatBubble;
