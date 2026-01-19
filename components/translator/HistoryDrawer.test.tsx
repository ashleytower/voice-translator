import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HistoryDrawer } from './HistoryDrawer';

// Mock the useSavedItems hook
const mockSaveItem = vi.fn();
const mockDeleteItem = vi.fn();
const mockClearAll = vi.fn();

vi.mock('@/hooks/useSavedItems', () => ({
  useSavedItems: () => ({
    items: mockItems,
    saveItem: mockSaveItem,
    deleteItem: mockDeleteItem,
    clearAll: mockClearAll,
  }),
}));

let mockItems: any[] = [];

describe('HistoryDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockItems = [];
  });

  it('renders the drawer trigger button', () => {
    render(<HistoryDrawer />);
    const trigger = screen.getByTestId('history-drawer-trigger');
    expect(trigger).toBeInTheDocument();
  });

  it('opens the drawer when trigger is clicked', () => {
    render(<HistoryDrawer />);
    const trigger = screen.getByTestId('history-drawer-trigger');
    
    fireEvent.click(trigger);
    
    const drawer = screen.getByRole('dialog');
    expect(drawer).toBeInTheDocument();
  });

  it('displays empty state when no items exist', () => {
    mockItems = [];
    
    render(<HistoryDrawer />);
    fireEvent.click(screen.getByTestId('history-drawer-trigger'));
    
    expect(screen.getByText(/no saved items/i)).toBeInTheDocument();
  });

  it('displays saved conversion items', () => {
    mockItems = [
      { id: '1', type: 'conversion', content: 'Hello World', timestamp: Date.now() },
      { id: '2', type: 'conversion', content: 'Goodbye', timestamp: Date.now() },
    ];
    
    render(<HistoryDrawer />);
    fireEvent.click(screen.getByTestId('history-drawer-trigger'));
    
    expect(screen.getByText('Hello World')).toBeInTheDocument();
    expect(screen.getByText('Goodbye')).toBeInTheDocument();
  });

  it('displays saved capture items', () => {
    mockItems = [
      { id: '1', type: 'capture', content: 'data:image/png;base64,abc', timestamp: Date.now() },
    ];
    
    render(<HistoryDrawer />);
    fireEvent.click(screen.getByTestId('history-drawer-trigger'));
    
    const image = screen.getByAltText('Saved capture');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'data:image/png;base64,abc');
  });

  it('calls deleteItem when delete button is clicked', () => {
    mockItems = [
      { id: 'test-id', type: 'conversion', content: 'Test', timestamp: Date.now() },
    ];
    
    render(<HistoryDrawer />);
    fireEvent.click(screen.getByTestId('history-drawer-trigger'));
    
    const deleteButton = screen.getByTestId('delete-item-test-id');
    fireEvent.click(deleteButton);
    
    expect(mockDeleteItem).toHaveBeenCalledWith('test-id');
  });

  it('calls clearAll when clear all button is clicked', () => {
    mockItems = [
      { id: '1', type: 'conversion', content: 'Test 1', timestamp: Date.now() },
      { id: '2', type: 'conversion', content: 'Test 2', timestamp: Date.now() },
    ];
    
    render(<HistoryDrawer />);
    fireEvent.click(screen.getByTestId('history-drawer-trigger'));
    
    const clearAllButton = screen.getByTestId('clear-all-button');
    fireEvent.click(clearAllButton);
    
    expect(mockClearAll).toHaveBeenCalled();
  });

  it('displays item count in header', () => {
    mockItems = [
      { id: '1', type: 'conversion', content: 'Test 1', timestamp: Date.now() },
      { id: '2', type: 'conversion', content: 'Test 2', timestamp: Date.now() },
      { id: '3', type: 'capture', content: 'data:image/png;base64,abc', timestamp: Date.now() },
    ];
    
    render(<HistoryDrawer />);
    fireEvent.click(screen.getByTestId('history-drawer-trigger'));
    
    expect(screen.getByText(/3 items/i)).toBeInTheDocument();
  });

  it('displays timestamp for each item', () => {
    const testTimestamp = new Date('2026-01-19T15:30:00').getTime();
    mockItems = [
      { id: '1', type: 'conversion', content: 'Test', timestamp: testTimestamp },
    ];
    
    render(<HistoryDrawer />);
    fireEvent.click(screen.getByTestId('history-drawer-trigger'));
    
    expect(screen.getByTestId('item-timestamp-1')).toBeInTheDocument();
  });
});
