'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePlus, Send, Mic, Square, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InputAreaProps {
  onSend: (text: string, attachment?: string) => void;
  isLoading: boolean;
  isLive?: boolean;
  onToggleLive?: () => void;
}

export const InputArea: React.FC<InputAreaProps> = ({
  onSend,
  isLoading,
  isLive,
  onToggleLive,
}) => {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((input.trim() || attachment) && !isLoading) {
      onSend(input, attachment || undefined);
      setInput('');
      setAttachment(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleMicClick = () => {
    if (input.length > 0 || attachment) {
      handleSend();
    } else if (onToggleLive) {
      onToggleLive();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-4 border-t border-border bg-background">
      {/* Image Preview */}
      {attachment && (
        <div className="mb-3 relative inline-block">
          <img
            src={attachment}
            alt="Preview"
            className="h-20 w-auto rounded-lg border border-border object-cover"
          />
          <Button
            variant="destructive"
            size="icon"
            onClick={removeAttachment}
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className={cn(
        'flex items-end gap-2 rounded-xl border border-input bg-background p-2',
        isLive && 'border-destructive bg-destructive/5'
      )}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        <Button
          variant="ghost"
          size="icon"
          onClick={handleFileClick}
          disabled={isLive}
          className="h-9 w-9 shrink-0 text-muted-foreground"
        >
          <ImagePlus className="h-5 w-5" />
        </Button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-sm resize-none max-h-32 py-2',
            isLive && 'text-destructive placeholder:text-destructive/60'
          )}
          placeholder={
            isLive
              ? 'Listening...'
              : isLoading
              ? 'Processing...'
              : 'Type a message...'
          }
          rows={1}
          disabled={isLoading || isLive}
        />

        <Button
          onClick={handleMicClick}
          disabled={isLoading && !isLive}
          size="icon"
          className={cn(
            'h-9 w-9 shrink-0 rounded-lg',
            isLive
              ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground animate-pulse-soft'
              : input.length > 0 || attachment
              ? 'bg-primary hover:bg-primary/90'
              : 'bg-primary hover:bg-primary/90'
          )}
        >
          {input.length > 0 || attachment ? (
            <Send className="h-4 w-4" />
          ) : isLive ? (
            <Square className="h-4 w-4 fill-current" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default InputArea;
