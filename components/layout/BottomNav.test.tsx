import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomNav } from './BottomNav';

describe('BottomNav', () => {
  it('renders all four tabs with labels', () => {
    render(<BottomNav activeTab="translate" onTabChange={vi.fn()} />);
    expect(screen.getByText('Translate')).toBeInTheDocument();
    expect(screen.getByText('Scan')).toBeInTheDocument();
    expect(screen.getByText('Convert')).toBeInTheDocument();
    expect(screen.getByText('Phrases')).toBeInTheDocument();
  });

  it('calls onTabChange with "camera" when Scan is clicked', () => {
    const onTabChange = vi.fn();
    render(<BottomNav activeTab="translate" onTabChange={onTabChange} />);
    fireEvent.click(screen.getByText('Scan'));
    expect(onTabChange).toHaveBeenCalledWith('camera');
  });

  it('calls onTabChange with "convert" when Convert is clicked', () => {
    const onTabChange = vi.fn();
    render(<BottomNav activeTab="translate" onTabChange={onTabChange} />);
    fireEvent.click(screen.getByText('Convert'));
    expect(onTabChange).toHaveBeenCalledWith('convert');
  });

  it('calls onTabChange with "phrases" when Phrases is clicked', () => {
    const onTabChange = vi.fn();
    render(<BottomNav activeTab="translate" onTabChange={onTabChange} />);
    fireEvent.click(screen.getByText('Phrases'));
    expect(onTabChange).toHaveBeenCalledWith('phrases');
  });

  it('marks Translate as active when activeTab is "translate"', () => {
    render(<BottomNav activeTab="translate" onTabChange={vi.fn()} />);
    const tab = screen.getByText('Translate').closest('button');
    expect(tab?.querySelector('.tab-pill')).toBeInTheDocument();
  });

  it('does not render Settings tab', () => {
    render(<BottomNav activeTab="translate" onTabChange={vi.fn()} />);
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('hides nav during camera mode', () => {
    const { container } = render(<BottomNav activeTab="camera" onTabChange={vi.fn()} />);
    expect(container.querySelector('nav')).not.toBeInTheDocument();
  });
});
