import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VoiceOrb } from './VoiceOrb';

describe('VoiceOrb', () => {
  it('renders the orb element', () => {
    render(<VoiceOrb state="idle" />);
    const orb = screen.getByTestId('voice-orb');
    expect(orb).toBeInTheDocument();
  });

  it('applies idle state styling', () => {
    render(<VoiceOrb state="idle" />);
    const orb = screen.getByTestId('voice-orb');
    expect(orb).toHaveClass('state-idle');
  });

  it('applies connecting state styling', () => {
    render(<VoiceOrb state="connecting" />);
    const orb = screen.getByTestId('voice-orb');
    expect(orb).toHaveClass('state-connecting');
  });

  it('applies listening state styling', () => {
    render(<VoiceOrb state="listening" />);
    const orb = screen.getByTestId('voice-orb');
    expect(orb).toHaveClass('state-listening');
  });

  it('applies speaking state styling', () => {
    render(<VoiceOrb state="speaking" />);
    const orb = screen.getByTestId('voice-orb');
    expect(orb).toHaveClass('state-speaking');
  });

  it('shows pulsating animation', () => {
    render(<VoiceOrb state="listening" />);
    const orb = screen.getByTestId('voice-orb');
    expect(orb).toHaveClass('animate-pulse');
  });

  it('accepts custom className', () => {
    render(<VoiceOrb state="idle" className="custom-class" />);
    const orb = screen.getByTestId('voice-orb');
    expect(orb).toHaveClass('custom-class');
  });
});
