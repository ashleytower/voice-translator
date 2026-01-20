'use client';

import React, { useRef, useState } from 'react';

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
    <div className="p-6 bg-gradient-to-t from-background-dark via-background-dark/95 to-transparent sticky bottom-0 z-20">
      {/* Image Preview */}
      {attachment && (
        <div className="mb-4 relative inline-block animate-in slide-in-from-bottom-2 fade-in duration-300">
          <img
            src={attachment}
            alt="Preview"
            className="h-24 w-auto rounded-xl border border-white/20 shadow-lg object-cover"
          />
          <button
            onClick={removeAttachment}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
          >
            <span className="material-symbols-outlined text-xs font-bold">close</span>
          </button>
        </div>
      )}

      <div
        className={`flex items-end gap-3 glass-morphic p-2 rounded-[2.5rem] pr-2 shadow-2xl transition-all duration-300 ${
          isLive ? 'border-fluent-primary/50 bg-fluent-primary/5' : ''
        }`}
      >
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        <button
          onClick={handleFileClick}
          disabled={isLive}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors active:scale-95 ${
            isLive
              ? 'text-gray-600 cursor-not-allowed'
              : 'text-gray-400 hover:text-fluent-primary'
          }`}
        >
          <span className="material-symbols-outlined">add_photo_alternate</span>
        </button>

        <div className="flex-1 pb-3 pl-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className={`w-full bg-transparent border-none focus:ring-0 text-sm resize-none max-h-32 py-0 transition-colors ${
              isLive
                ? 'placeholder:text-fluent-primary/70 text-fluent-primary'
                : 'placeholder:text-gray-600'
            }`}
            placeholder={
              isLive
                ? 'Listening...'
                : isLoading
                ? 'AI is thinking...'
                : 'Type a message...'
            }
            rows={1}
            disabled={isLoading || isLive}
          />
        </div>

        <button
          onClick={handleMicClick}
          disabled={isLoading && !isLive}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-background-dark shadow-lg active:scale-90 transition-all
            ${
              isLive
                ? 'bg-red-500 shadow-red-500/30 animate-pulse'
                : input.length > 0 || attachment
                ? 'bg-gradient-to-br from-fluent-primary to-fluent-secondary shadow-fluent-primary/30'
                : 'bg-gradient-to-br from-fluent-primary to-fluent-secondary shadow-fluent-primary/30'
            }
            ${isLoading && !isLive ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {input.length > 0 || attachment ? (
            <span className="material-symbols-outlined font-bold">send</span>
          ) : isLive ? (
            <span className="material-symbols-outlined font-bold text-white">stop</span>
          ) : (
            <span className="material-symbols-outlined font-bold">mic</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default InputArea;
