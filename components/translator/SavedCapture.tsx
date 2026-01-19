'use client';

import { SavedItem } from '@/hooks/useSavedItems';

interface SavedCaptureProps {
  item: SavedItem;
  onDelete?: (id: string) => void;
  showTimestamp?: boolean;
}

export function SavedCapture({ item, onDelete, showTimestamp = true }: SavedCaptureProps) {
  if (item.type !== 'capture') {
    return null;
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors">
      <div className="flex flex-col gap-2">
        <img
          src={item.content}
          alt="Saved capture"
          className="rounded max-h-64 w-auto object-contain"
        />
        
        {showTimestamp && (
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(item.timestamp)}
          </span>
        )}
        
        {onDelete && (
          <button
            onClick={() => onDelete(item.id)}
            className="text-xs text-red-500 hover:text-red-600 self-end"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
