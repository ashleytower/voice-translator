'use client';

import React from 'react';
import { Message } from '@/types';

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
      <div className="flex flex-col items-end group animate-in slide-in-from-right-5 duration-300">
        <div className="max-w-[85%] glass-morphic rounded-3xl rounded-tr-none p-4 shadow-xl relative pr-10 overflow-hidden">
          {message.attachment && (
            <div className="mb-3 -mx-4 -mt-4">
              <img
                src={message.attachment}
                alt="Upload"
                className="w-full h-auto object-cover max-h-60"
              />
            </div>
          )}
          <p className="text-[15px] leading-relaxed break-words">{message.text}</p>
          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(message.id)}
              className={`absolute top-2 right-2 p-1 rounded-full transition-colors ${
                message.isFavorite
                  ? 'text-fluent-primary'
                  : 'text-white/10 hover:text-white/40'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[16px] ${
                  message.isFavorite ? 'font-variation-fill' : ''
                }`}
              >
                star
              </span>
            </button>
          )}
        </div>
        <span className="text-[10px] text-gray-500 mt-2 mr-2 font-medium uppercase tracking-widest">
          Sent {message.timestamp}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start group animate-in slide-in-from-left-5 duration-300">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-lg bg-fluent-primary/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-[14px] text-fluent-primary">
            smart_toy
          </span>
        </div>
        <span className="text-[10px] font-bold text-fluent-primary tracking-widest uppercase">
          Companion AI
        </span>
      </div>
      <div className="max-w-[85%] bg-gradient-to-br from-fluent-primary/10 to-fluent-secondary/10 backdrop-blur-2xl border border-fluent-primary/20 rounded-3xl rounded-tl-none p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2 flex gap-1">
          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(message.id)}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors active:scale-95 ${
                message.isFavorite
                  ? 'text-fluent-primary'
                  : 'text-fluent-primary/20 hover:text-fluent-primary/50'
              }`}
            >
              <span
                className={`material-symbols-outlined text-lg ${
                  message.isFavorite ? 'font-variation-fill' : ''
                }`}
              >
                star
              </span>
            </button>
          )}
          <button
            onClick={() => {
              if (onPlayAudio && message.translation && targetLangCode) {
                onPlayAudio(message.translation, targetLangCode);
              }
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full text-fluent-primary/50 hover:text-fluent-primary transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">volume_up</span>
          </button>
        </div>

        {message.translation && (
          <>
            <p className="text-lg font-bold text-white mb-1 pr-6">
              {message.translation}
            </p>
            <p className="text-xs text-fluent-primary/70 font-medium mb-3">
              {message.pronunciation}
            </p>
            <div className="h-px bg-white/10 w-full mb-3"></div>
          </>
        )}

        <p className="text-sm text-gray-300">{message.text}</p>
      </div>
    </div>
  );
};

export default ChatBubble;
