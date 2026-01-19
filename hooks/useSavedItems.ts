import { useState, useEffect } from 'react';

const STORAGE_KEY = 'saved-items';
const MAX_ITEMS = 50;

export interface SavedItem {
  id: string;
  type: 'conversion' | 'capture';
  content: string;
  timestamp: number;
}

export interface SaveItemInput {
  type: 'conversion' | 'capture';
  content: string;
}

export function useSavedItems() {
  const [items, setItems] = useState<SavedItem[]>([]);

  // Load items from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setItems(parsed);
      }
    } catch (error) {
      console.error('Failed to load saved items:', error);
      setItems([]);
    }
  }, []);

  // Save items to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save items:', error);
    }
  }, [items]);

  const saveItem = (input: SaveItemInput) => {
    const newItem: SavedItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type: input.type,
      content: input.content,
      timestamp: Date.now(),
    };

    setItems((prev) => {
      const updated = [newItem, ...prev];
      // Enforce max items limit
      return updated.slice(0, MAX_ITEMS);
    });
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearAll = () => {
    setItems([]);
  };

  return {
    items,
    saveItem,
    deleteItem,
    clearAll,
  };
}
