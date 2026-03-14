import { describe, it, expect } from 'vitest';
import { DESIGN_TOKENS, DARK_THEME, TOUCH_TARGETS } from './design-tokens';

describe('design-tokens', () => {
  it('exports dark theme colors', () => {
    expect(DARK_THEME.background).toBe('#000000');
    expect(DARK_THEME.surface).toBe('#1C1C1E');
    expect(DARK_THEME.primary).toBe('#64B5F6');
  });

  it('exports touch target minimums', () => {
    expect(TOUCH_TARGETS.minimum).toBe(44);
    expect(TOUCH_TARGETS.standard).toBe(48);
  });

  it('exports spacing scale', () => {
    expect(DESIGN_TOKENS.spacing[4]).toBe('16px');
    expect(DESIGN_TOKENS.tabBarHeight).toBe('64px');
  });
});
