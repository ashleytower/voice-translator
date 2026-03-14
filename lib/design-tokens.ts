export const DARK_THEME = {
  background: '#000000',
  surface: '#1C1C1E',
  surface2: '#2C2C2E',
  surface3: '#3A3A3C',
  primary: '#64B5F6',
  primaryContainer: '#1A3A5C',
  primaryDim: 'rgba(100,181,246,0.12)',
  success: '#30D158',
  destructive: '#FF453A',
  warning: '#FFD60A',
  label: '#FFFFFF',
  labelSecondary: 'rgba(235,235,245,0.6)',
  labelTertiary: 'rgba(235,235,245,0.3)',
  separator: 'rgba(84,84,88,0.6)',
  separatorOpaque: '#38383A',
} as const;

export const TOUCH_TARGETS = {
  minimum: 44,
  standard: 48,
} as const;

export const DESIGN_TOKENS = {
  tabBarHeight: '64px',
  topBarHeight: '56px',
  inputBarHeight: '48px',
  cardRadius: '16px',
  sheetRadius: '20px',
  segmentedHeight: '36px',
  shutterSize: '72px',
  orbSize: 160,
  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
  },
} as const;
