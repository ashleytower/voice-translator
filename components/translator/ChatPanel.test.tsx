import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatPanel } from './ChatPanel';

describe('ChatPanel', () => {
  it('renders the chat panel container', () => {
    render(<ChatPanel />);
    const panel = screen.getByTestId('chat-panel');
    expect(panel).toBeInTheDocument();
  });

  it('applies glassmorphic styling', () => {
    render(<ChatPanel />);
    const panel = screen.getByTestId('chat-panel');
    expect(panel).toHaveClass('backdrop-blur-md');
  });

  it('renders children content', () => {
    render(
      <ChatPanel>
        <div data-testid="test-child">Test Content</div>
      </ChatPanel>
    );
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    render(<ChatPanel className="custom-panel" />);
    const panel = screen.getByTestId('chat-panel');
    expect(panel).toHaveClass('custom-panel');
  });

  it('has scroll container for messages', () => {
    render(<ChatPanel />);
    const panel = screen.getByTestId('chat-panel');
    expect(panel).toHaveClass('overflow-y-auto');
  });

  it('has proper border and shadow styling', () => {
    render(<ChatPanel />);
    const panel = screen.getByTestId('chat-panel');
    expect(panel).toHaveClass('border');
    expect(panel).toHaveClass('shadow-xl');
  });
});
