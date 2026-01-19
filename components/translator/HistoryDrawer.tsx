'use client';

import { useState } from 'react';
import { History, Trash2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useSavedItems } from '@/hooks/useSavedItems';

export function HistoryDrawer() {
  const { items, deleteItem, clearAll } = useSavedItems();
  const [open, setOpen] = useState(false);

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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="history-drawer-trigger"
        >
          <History className="h-5 w-5" />
          {items.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-500 text-xs text-white flex items-center justify-center">
              {items.length > 9 ? '9+' : items.length}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>
              History {items.length > 0 && `(${items.length} items)`}
            </span>
            {items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                data-testid="clear-all-button"
                className="text-red-500 hover:text-red-600"
              >
                Clear All
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-full mt-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <History className="h-12 w-12 mb-4 opacity-20" />
              <p>No saved items yet</p>
              <p className="text-sm">Your saved translations and captures will appear here</p>
            </div>
          ) : (
            <div className="space-y-3 pb-20">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-3 bg-card hover:bg-accent/50 transition-colors relative group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {item.type === 'conversion' ? (
                        <p className="text-sm break-words">{item.content}</p>
                      ) : (
                        <img
                          src={item.content}
                          alt="Saved capture"
                          className="rounded max-h-48 w-auto"
                        />
                      )}
                      <span
                        className="text-xs text-muted-foreground mt-1 block"
                        data-testid={`item-timestamp-${item.id}`}
                      >
                        {formatTimestamp(item.timestamp)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteItem(item.id)}
                      data-testid={`delete-item-${item.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
