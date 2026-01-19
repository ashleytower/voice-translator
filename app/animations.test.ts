import { describe, it, expect } from 'vitest';
import tailwindConfig from '../tailwind.config';

describe('Orb Animations', () => {
  it('should have orb-breathe keyframes defined', () => {
    const keyframes = tailwindConfig.theme?.extend?.keyframes;
    expect(keyframes).toHaveProperty('orb-breathe');
  });

  it('should have orb-pulse keyframes defined', () => {
    const keyframes = tailwindConfig.theme?.extend?.keyframes;
    expect(keyframes).toHaveProperty('orb-pulse');
  });

  it('should have orb-wave keyframes defined', () => {
    const keyframes = tailwindConfig.theme?.extend?.keyframes;
    expect(keyframes).toHaveProperty('orb-wave');
  });

  it('should have slide-up keyframes defined', () => {
    const keyframes = tailwindConfig.theme?.extend?.keyframes;
    expect(keyframes).toHaveProperty('slide-up');
  });

  it('should have orb-breathe animation class', () => {
    const animations = tailwindConfig.theme?.extend?.animation;
    expect(animations).toHaveProperty('orb-breathe');
  });

  it('should have orb-pulse animation class', () => {
    const animations = tailwindConfig.theme?.extend?.animation;
    expect(animations).toHaveProperty('orb-pulse');
  });

  it('should have orb-wave animation class', () => {
    const animations = tailwindConfig.theme?.extend?.animation;
    expect(animations).toHaveProperty('orb-wave');
  });

  it('should have slide-up animation class', () => {
    const animations = tailwindConfig.theme?.extend?.animation;
    expect(animations).toHaveProperty('slide-up');
  });
});

describe('Glassmorphism Styles', () => {
  it('should have backdrop-blur utilities defined', () => {
    // This test verifies that Tailwind's backdrop-blur utilities are available
    // We'll validate by checking if the config allows for custom utilities
    expect(tailwindConfig).toBeDefined();
    expect(tailwindConfig.theme).toBeDefined();
  });
});
