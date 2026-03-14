'use client';

import React, { useRef, useState } from 'react';
import { DollarSign, ImagePlus, Phone, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InputAreaProps {
  onSend: (text: string, attachment?: string) => void;
  isLoading: boolean;
  isLive?: boolean;
  onToggleLive?: () => void;
  onStartCall?: () => void;
}

export const InputArea: React.FC<InputAreaProps> = ({
  onSend,
  isLoading,
  isLive,
  onStartCall,
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

  const canSend = (input.trim() || attachment) && !isLoading;

  return (
    <div className="w-full">
      {/* Image Preview */}
      {attachment && (
        <div className="mb-3 relative inline-block">
          <img
            src={attachment}
            alt="Preview"
            className="h-20 w-auto rounded-xl object-cover"
          />
          <button
            onClick={removeAttachment}
            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className={cn(
        'flex items-end gap-1.5 rounded-2xl bg-secondary/50 p-1.5 transition-colors',
        isLive && 'ring-1 ring-red-500/30 bg-red-500/5'
      )}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        <button
          onClick={onStartCall}
          disabled={isLive}
          className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-30"
          aria-label="Make a phone call"
        >
          <Phone className="h-[18px] w-[18px]" />
        </button>

        <button
          onClick={handleFileClick}
          disabled={isLive}
          className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30"
        >
          <ImagePlus className="h-[18px] w-[18px]" />
        </button>

        <button
          onClick={() => {
            setInput('Convert ');
            textareaRef.current?.focus();
          }}
          disabled={isLive || isLoading}
          className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30"
          aria-label="Quick convert price"
        >
          <DollarSign className="h-[18px] w-[18px]" />
        </button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-sm resize-none max-h-32 py-2 px-1 placeholder:text-muted-foreground/50"
          placeholder={
            isLive
              ? 'Listening...'
              : isLoading
              ? 'Translating...'
              : 'Type or tap the orb to speak...'
          }
          rows={1}
          disabled={isLoading || isLive}
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'h-9 w-9 shrink-0 flex items-center justify-center rounded-xl transition-all duration-200',
            canSend
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'text-muted-foreground/30'
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default InputArea;
