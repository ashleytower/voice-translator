import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessage } from './ChatMessage';

describe('ChatMessage', () => {
  it('renders message content', () => {
    render(<ChatMessage role="user" content="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('applies user role styling', () => {
    render(<ChatMessage role="user" content="User message" />);
    const message = screen.getByTestId('chat-message');
    expect(message).toHaveClass('role-user');
  });

  it('applies assistant role styling', () => {
    render(<ChatMessage role="assistant" content="Assistant message" />);
    const message = screen.getByTestId('chat-message');
    expect(message).toHaveClass('role-assistant');
  });

  it('applies system role styling', () => {
    render(<ChatMessage role="system" content="System message" />);
    const message = screen.getByTestId('chat-message');
    expect(message).toHaveClass('role-system');
  });

  it('displays timestamp when provided', () => {
    const timestamp = new Date('2026-01-19T15:30:00');
    render(<ChatMessage role="user" content="Test" timestamp={timestamp} />);
    expect(screen.getByText(/03:30 PM/)).toBeInTheDocument();
  });

  it('does not display timestamp when not provided', () => {
    render(<ChatMessage role="user" content="Test" />);
    const message = screen.getByTestId('chat-message');
    expect(message.querySelector('[data-testid="message-timestamp"]')).not.toBeInTheDocument();
  });

  it('accepts custom className', () => {
    render(<ChatMessage role="user" content="Test" className="custom-message" />);
    const message = screen.getByTestId('chat-message');
    expect(message).toHaveClass('custom-message');
  });

  it('displays role label', () => {
    render(<ChatMessage role="assistant" content="Test" />);
    expect(screen.getByText(/assistant/i)).toBeInTheDocument();
  });
});
