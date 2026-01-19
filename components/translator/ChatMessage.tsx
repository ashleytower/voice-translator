import React from 'react';
import { cn } from '@/lib/utils';

export type MessageRole = 'user' | 'assistant' | 'system';

interface ChatMessageProps {
  role: MessageRole;
  content: string;
  timestamp?: Date;
  className?: string;
}

export function ChatMessage({ role, content, timestamp, className }: ChatMessageProps) {
  const roleStyles = {
    user: 'bg-blue-500/20 border-blue-500/30 ml-auto',
    assistant: 'bg-green-500/20 border-green-500/30 mr-auto',
    system: 'bg-gray-500/20 border-gray-500/30 mx-auto',
  };

  const roleLabels = {
    user: 'You',
    assistant: 'Assistant',
    system: 'System',
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      data-testid="chat-message"
      className={cn(
        'relative max-w-[80%] rounded-2xl border p-4 mb-3',
        'backdrop-blur-sm',
        'transition-all duration-200',
        `role-${role}`,
        roleStyles[role],
        className
      )}
    >
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold opacity-70">
          {roleLabels[role]}
        </span>
        <p className="text-sm leading-relaxed">{content}</p>
        {timestamp && (
          <span
            data-testid="message-timestamp"
            className="text-xs opacity-50 mt-1"
          >
            {formatTime(timestamp)}
          </span>
        )}
      </div>
    </div>
  );
}
