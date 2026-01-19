import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSavedItems } from './useSavedItems';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useSavedItems', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('initializes with empty array when no saved items exist', () => {
    const { result } = renderHook(() => useSavedItems());
    expect(result.current.items).toEqual([]);
  });

  it('loads saved items from localStorage on mount', () => {
    const mockItems = [
      { id: '1', type: 'conversion', content: 'Hello', timestamp: Date.now() },
      { id: '2', type: 'capture', content: 'data:image/png;base64,abc', timestamp: Date.now() },
    ];
    localStorage.setItem('saved-items', JSON.stringify(mockItems));

    const { result } = renderHook(() => useSavedItems());
    expect(result.current.items).toEqual(mockItems);
  });

  it('saves a new item to localStorage', () => {
    const { result } = renderHook(() => useSavedItems());
    
    act(() => {
      result.current.saveItem({
        type: 'conversion',
        content: 'Test content',
      });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toMatchObject({
      type: 'conversion',
      content: 'Test content',
    });
    expect(result.current.items[0].id).toBeDefined();
    expect(result.current.items[0].timestamp).toBeDefined();

    const storedItems = JSON.parse(localStorage.getItem('saved-items') || '[]');
    expect(storedItems).toHaveLength(1);
  });

  it('deletes an item by id', () => {
    const { result } = renderHook(() => useSavedItems());
    
    act(() => {
      result.current.saveItem({ type: 'conversion', content: 'Item 1' });
      result.current.saveItem({ type: 'conversion', content: 'Item 2' });
    });

    const itemIdToDelete = result.current.items[0].id;

    act(() => {
      result.current.deleteItem(itemIdToDelete);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].content).toBe('Item 1');

    const storedItems = JSON.parse(localStorage.getItem('saved-items') || '[]');
    expect(storedItems).toHaveLength(1);
  });

  it('clears all items', () => {
    const { result } = renderHook(() => useSavedItems());
    
    act(() => {
      result.current.saveItem({ type: 'conversion', content: 'Item 1' });
      result.current.saveItem({ type: 'conversion', content: 'Item 2' });
    });

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.items).toEqual([]);
    const storedItems = JSON.parse(localStorage.getItem('saved-items') || '[]');
    expect(storedItems).toEqual([]);
  });

  it('handles corrupted localStorage data gracefully', () => {
    localStorage.setItem('saved-items', 'invalid json');

    const { result } = renderHook(() => useSavedItems());
    expect(result.current.items).toEqual([]);
  });

  it('saves items in reverse chronological order (newest first)', () => {
    const { result } = renderHook(() => useSavedItems());
    
    act(() => {
      result.current.saveItem({ type: 'conversion', content: 'First' });
    });
    
    const firstTimestamp = result.current.items[0].timestamp;

    act(() => {
      result.current.saveItem({ type: 'conversion', content: 'Second' });
    });

    expect(result.current.items[0].content).toBe('Second');
    expect(result.current.items[1].content).toBe('First');
    expect(result.current.items[0].timestamp).toBeGreaterThanOrEqual(firstTimestamp);
  });

  it('enforces maximum of 50 saved items', () => {
    const { result } = renderHook(() => useSavedItems());
    
    act(() => {
      for (let i = 0; i < 60; i++) {
        result.current.saveItem({ type: 'conversion', content: `Item ${i}` });
      }
    });

    expect(result.current.items).toHaveLength(50);
    expect(result.current.items[0].content).toBe('Item 59'); // Most recent
  });
});
