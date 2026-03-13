import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomNav } from './BottomNav';

describe('BottomNav', () => {
  it('renders Camera tab', () => {
    render(<BottomNav activeTab="chat" onTabChange={vi.fn()} />);
    expect(screen.getByText('Scan')).toBeInTheDocument();
  });

  it('calls onTabChange with "camera" when Scan is clicked', () => {
    const onTabChange = vi.fn();
    render(<BottomNav activeTab="chat" onTabChange={onTabChange} />);
    fireEvent.click(screen.getByText('Scan'));
    expect(onTabChange).toHaveBeenCalledWith('camera');
  });

  it('marks Scan as active when activeTab is "camera"', () => {
    render(<BottomNav activeTab="camera" onTabChange={vi.fn()} />);
    const scanButton = screen.getByText('Scan').closest('button');
    expect(scanButton?.className).toContain('text-primary');
  });
});
