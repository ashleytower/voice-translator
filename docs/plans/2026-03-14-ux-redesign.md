# UX Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the voice-translator app navigation, camera result display, voice feedback, and saved phrases based on Apple HIG + Material Design 3 research findings.

**Architecture:** The app is a single-page Next.js 14 app with a `ViewMode` state machine in `app/page.tsx`. All views render inside `<main>`, with `BottomNav` always visible except during camera mode. The redesign changes the tab structure from [Chat, Saved, Scan, Settings] to [Translate, Scan, Convert, Phrases], moves settings to a header gear icon, merges voice+chat into one "Translate" tab, upgrades FavoritesView into a quick-play Phrases tab, adds a bottom sheet for camera results, and replaces camera mode pills with an iOS segmented control.

**Tech Stack:** Next.js 14, React 18, Tailwind CSS, Radix UI, Lucide icons, Vitest + Testing Library

**Branch:** `feature/t2-ui-cleanup` (existing work branch)

**Research:** See `/docs/research/` in the `ux-research` worktree for full audit reports.

---

## Phase 1: Design Tokens + Types (foundation)

### Task 1: Update ViewMode type and design tokens

**Files:**
- Modify: `types.ts:112` (ViewMode type)
- Create: `lib/design-tokens.ts`

**Step 1: Write the failing test**

Create `lib/design-tokens.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/ashleytower/Documents/GitHub/voice-translator && npx vitest run lib/design-tokens.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Create design tokens file**

Create `lib/design-tokens.ts`:

```typescript
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
  minimum: 44,  // Apple HIG
  standard: 48, // Material Design
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
```

**Step 4: Update ViewMode type**

In `types.ts`, change line 112:

```typescript
// Old:
export type ViewMode = 'chat' | 'camera' | 'currency' | 'settings' | 'favs';

// New:
export type ViewMode = 'translate' | 'camera' | 'convert' | 'settings' | 'phrases';
```

**Step 5: Run test to verify it passes**

Run: `cd /Users/ashleytower/Documents/GitHub/voice-translator && npx vitest run lib/design-tokens.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator
git add types.ts lib/design-tokens.ts lib/design-tokens.test.ts
git commit -m "feat: add design tokens and update ViewMode for redesign"
```

---

## Phase 2: Bottom Navigation Redesign

### Task 2: Redesign BottomNav component

**Files:**
- Modify: `components/layout/BottomNav.tsx`
- Modify: `components/layout/BottomNav.test.tsx`

**Step 1: Update the test file**

Replace `components/layout/BottomNav.test.tsx`:

```typescript
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
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/ashleytower/Documents/GitHub/voice-translator && npx vitest run components/layout/BottomNav.test.tsx`
Expected: FAIL (old nav has Chat/Saved/Settings, not Translate/Convert/Phrases)

**Step 3: Rewrite BottomNav component**

Replace `components/layout/BottomNav.tsx`:

```tsx
'use client';

import React from 'react';
import { ViewMode } from '@/types';
import { Mic, ScanLine, ArrowLeftRight, BookmarkCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavTab {
  viewMode: ViewMode;
  label: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
}

const TABS: NavTab[] = [
  {
    viewMode: 'translate',
    label: 'Translate',
    icon: <Mic className="h-6 w-6" strokeWidth={1.5} />,
    activeIcon: <Mic className="h-6 w-6" strokeWidth={2} />,
  },
  {
    viewMode: 'camera',
    label: 'Scan',
    icon: <ScanLine className="h-6 w-6" strokeWidth={1.5} />,
    activeIcon: <ScanLine className="h-6 w-6" strokeWidth={2} />,
  },
  {
    viewMode: 'convert',
    label: 'Convert',
    icon: <ArrowLeftRight className="h-6 w-6" strokeWidth={1.5} />,
    activeIcon: <ArrowLeftRight className="h-6 w-6" strokeWidth={2} />,
  },
  {
    viewMode: 'phrases',
    label: 'Phrases',
    icon: <BookmarkCheck className="h-6 w-6" strokeWidth={1.5} />,
    activeIcon: <BookmarkCheck className="h-6 w-6" strokeWidth={2} />,
  },
];

interface BottomNavProps {
  activeTab: ViewMode;
  onTabChange: (tab: ViewMode) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  // Hide nav during camera mode (camera is full-screen overlay)
  if (activeTab === 'camera') return null;

  return (
    <nav className="h-16 pb-safe flex items-center justify-around bg-[#1C1C1E]/80 backdrop-blur-xl border-t border-white/[0.06]">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.viewMode;
        return (
          <button
            key={tab.viewMode}
            onClick={() => onTabChange(tab.viewMode)}
            className={cn(
              'flex flex-col items-center gap-1 min-w-16 min-h-12 px-3 py-2 transition-colors',
              isActive ? 'text-[#64B5F6]' : 'text-[rgba(235,235,245,0.6)] active:text-white'
            )}
          >
            <div className="relative flex items-center justify-center">
              {isActive && (
                <div className="tab-pill absolute w-16 h-8 rounded-2xl bg-[rgba(100,181,246,0.12)]" />
              )}
              <span className="relative z-10">{isActive ? tab.activeIcon : tab.icon}</span>
            </div>
            <span className={cn(
              'text-[11px] tracking-wide',
              isActive ? 'font-semibold' : 'font-medium'
            )}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/ashleytower/Documents/GitHub/voice-translator && npx vitest run components/layout/BottomNav.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator
git add components/layout/BottomNav.tsx components/layout/BottomNav.test.tsx
git commit -m "feat: redesign BottomNav with Translate/Scan/Convert/Phrases tabs"
```

---

## Phase 3: Header + Settings Migration

### Task 3: Move settings to header gear icon only

**Files:**
- Modify: `components/layout/Header.tsx`

**Step 1: Update Header component**

The Header already has `onSettingsClick` prop with a gear icon. The only change is to ensure it's always present (not conditionally rendered) and uses the proper touch target size.

Replace `components/layout/Header.tsx`:

```tsx
'use client';

import React from 'react';
import { Settings } from 'lucide-react';

interface HeaderProps {
  onSettingsClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSettingsClick }) => {
  return (
    <header className="px-5 py-3 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-xl">
      <h1 className="text-xl font-serif tracking-tight text-foreground">
        Found in Translation
      </h1>
      <button
        onClick={onSettingsClick}
        aria-label="Settings"
        className="flex items-center justify-center w-11 h-11 -mr-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
      >
        <Settings className="h-5 w-5" />
      </button>
    </header>
  );
};

export default Header;
```

Key changes:
- `onSettingsClick` is now required (not optional)
- Touch target: `w-11 h-11` (44px) meets Apple HIG minimum
- `aria-label="Settings"` for accessibility

**Step 2: Commit**

```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator
git add components/layout/Header.tsx
git commit -m "feat: make settings gear always visible in header with 44px touch target"
```

---

## Phase 4: Wire Up Page.tsx with New ViewModes

### Task 4: Update page.tsx view routing

**Files:**
- Modify: `app/page.tsx`

This is the central wiring task. Update all ViewMode references from old to new.

**Step 1: Update all ViewMode references in page.tsx**

Apply these changes to `app/page.tsx`:

1. Change initial state: `useState<ViewMode>('chat')` -> `useState<ViewMode>('translate')`

2. Rename `renderChatView` to `renderTranslateView` (same content, new name)

3. Update `renderFavoritesView` to `renderPhrasesView`, change `onBack` to `() => setViewMode('translate')`

4. Update `renderCurrencyView` to `renderConvertView`, change `onBack` to `() => setViewMode('translate')`

5. Update `renderSettingsView`, change `onBack` to `() => setViewMode('translate')`

6. Update `renderCurrentView` switch:
```typescript
const renderCurrentView = () => {
  switch (viewMode) {
    case 'translate':
      return renderTranslateView();
    case 'phrases':
      return renderPhrasesView();
    case 'convert':
      return renderConvertView();
    case 'settings':
      return renderSettingsView();
    case 'camera':
      return (
        <CameraTranslateView
          toLang={toLang}
          fromLang={fromLang}
          homeCurrency={settings.homeCurrency}
          onClose={() => setViewMode('translate')}
          onSaveTranslation={handleSaveCamera}
          onSaveDish={handleSaveDish}
        />
      );
    default:
      return renderTranslateView();
  }
};
```

7. Update `handleSettingsClick`: already correct (sets 'settings')

8. Update `handleSaveCamera`: change `setViewMode('chat')` -> `setViewMode('translate')`

9. Update `handleSaveDish`: change `setViewMode('chat')` -> `setViewMode('translate')`

10. Make `onSettingsClick` non-optional in Header call:
```tsx
<Header onSettingsClick={handleSettingsClick} />
```
Remove `onClearHistory` prop (not used in redesigned header).

**Step 2: Run full test suite**

Run: `cd /Users/ashleytower/Documents/GitHub/voice-translator && npx vitest run`
Expected: All tests pass (some may need ViewMode string updates)

**Step 3: Fix any failing tests**

Update any test that references `'chat'` ViewMode to `'translate'`, `'favs'` to `'phrases'`, `'currency'` to `'convert'`.

**Step 4: Commit**

```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator
git add app/page.tsx
git commit -m "feat: wire new ViewMode routing - translate/scan/convert/phrases"
```

---

## Phase 5: Camera Segmented Control

### Task 5: Replace mode pills with iOS segmented control

**Files:**
- Create: `components/ui/SegmentedControl.tsx`
- Create: `components/ui/SegmentedControl.test.tsx`
- Modify: `components/CameraTranslate/CameraTranslateView.tsx`

**Step 1: Write the failing test**

Create `components/ui/SegmentedControl.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SegmentedControl } from './SegmentedControl';

describe('SegmentedControl', () => {
  const segments = ['Translate', 'Dish', 'Price'];

  it('renders all segments', () => {
    render(<SegmentedControl segments={segments} activeIndex={0} onChange={vi.fn()} />);
    expect(screen.getByText('Translate')).toBeInTheDocument();
    expect(screen.getByText('Dish')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
  });

  it('calls onChange with correct index on click', () => {
    const onChange = vi.fn();
    render(<SegmentedControl segments={segments} activeIndex={0} onChange={onChange} />);
    fireEvent.click(screen.getByText('Price'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('applies active styling to selected segment', () => {
    render(<SegmentedControl segments={segments} activeIndex={1} onChange={vi.fn()} />);
    const dishBtn = screen.getByText('Dish');
    expect(dishBtn.className).toContain('font-semibold');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/ashleytower/Documents/GitHub/voice-translator && npx vitest run components/ui/SegmentedControl.test.tsx`

**Step 3: Create SegmentedControl component**

Create `components/ui/SegmentedControl.tsx`:

```tsx
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SegmentedControlProps {
  segments: string[];
  activeIndex: number;
  onChange: (index: number) => void;
  className?: string;
}

export function SegmentedControl({ segments, activeIndex, onChange, className }: SegmentedControlProps) {
  const width = `calc(${100 / segments.length}% - 2px)`;

  return (
    <div className={cn('relative flex bg-white/[0.06] rounded-[18px] p-0.5 h-9', className)}>
      {/* Sliding indicator */}
      <div
        className="absolute top-0.5 bottom-0.5 rounded-2xl bg-[#64B5F6] shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
        style={{
          width,
          transform: `translateX(calc(${activeIndex * 100}% + ${activeIndex * 2}px))`,
        }}
      />

      {/* Segment buttons */}
      {segments.map((label, i) => (
        <button
          key={label}
          onClick={() => onChange(i)}
          className={cn(
            'flex-1 relative z-10 flex items-center justify-center text-[13px] transition-colors duration-200',
            i === activeIndex
              ? 'text-black font-semibold'
              : 'text-[rgba(235,235,245,0.6)] font-medium'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/ashleytower/Documents/GitHub/voice-translator && npx vitest run components/ui/SegmentedControl.test.tsx`

**Step 5: Replace mode pills in CameraTranslateView**

In `components/CameraTranslate/CameraTranslateView.tsx`:

1. Add import: `import { SegmentedControl } from '@/components/ui/SegmentedControl';`

2. Replace the mode toggle section (around lines 311-326):

```tsx
{/* Old mode pills - REPLACE WITH: */}
<SegmentedControl
  segments={['Translate', 'Dish', 'Price']}
  activeIndex={['translate', 'dish', 'price'].indexOf(cameraMode)}
  onChange={(i) => {
    const modes: CameraMode[] = ['translate', 'dish', 'price'];
    setCameraMode(modes[i]);
    setResult(null);
    setDishResult(null);
    setPriceResult(null);
    setDealResult(null);
    setCameraState('ready');
  }}
  className="mx-4 mb-3"
/>
```

3. Update the bottom dock background to translucent:
Change `bg-background/95 backdrop-blur-xl` to `bg-black/60 backdrop-blur-xl`

4. Increase shutter button: change `h-16 w-16` to `h-[72px] w-[72px]`

5. Update scan frame to use corner accents instead of border rectangle.

**Step 6: Run camera tests**

Run: `cd /Users/ashleytower/Documents/GitHub/voice-translator && npx vitest run components/CameraTranslate/CameraTranslateView.test.tsx`

**Step 7: Commit**

```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator
git add components/ui/SegmentedControl.tsx components/ui/SegmentedControl.test.tsx components/CameraTranslate/CameraTranslateView.tsx
git commit -m "feat: iOS segmented control for camera modes + larger shutter + corner scan frame"
```

---

## Phase 6: Voice Orb + Transcript Feedback

### Task 6: Improve voice feedback visibility

**Files:**
- Modify: `app/page.tsx` (translate view section)
- Modify: `components/voice/Orb.tsx` (if size/style changes needed)

**Step 1: Update orb size and transcript styling in page.tsx**

In the `renderTranslateView` (formerly `renderChatView`) function:

1. Change orb size: `size={120}` -> `size={160}`

2. Update transcript preview styling:
```tsx
{/* Old: */}
<p className="text-xs text-center text-muted-foreground/60 italic truncate">

{/* New: */}
<p className="text-[15px] text-center text-[rgba(235,235,245,0.8)] truncate">
```

3. Add language pair display above the orb area (in the dock section):
```tsx
{/* Language pair - above orb */}
<div className="flex items-center justify-center gap-3 py-2">
  <span className="text-base font-semibold text-foreground">{fromLang.name}</span>
  <button
    onClick={handleSwapLanguages}
    className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary/60"
  >
    <ArrowLeftRight className="h-4 w-4 text-[#64B5F6]" />
  </button>
  <span className="text-base font-semibold text-foreground">{toLang.name}</span>
</div>
```

(Add `ArrowLeftRight` to the lucide-react imports if not already present.)

**Step 2: Run full test suite**

Run: `cd /Users/ashleytower/Documents/GitHub/voice-translator && npx vitest run`

**Step 3: Commit**

```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator
git add app/page.tsx
git commit -m "feat: larger orb (160px), readable transcript, language pair display"
```

---

## Phase 7: Phrases Tab (upgraded FavoritesView)

### Task 7: Upgrade FavoritesView to PhrasesView with quick-play cards

**Files:**
- Rename: `components/favorites/FavoritesView.tsx` -> `components/phrases/PhrasesView.tsx`
- Create: `components/phrases/PhrasesView.test.tsx`

**Step 1: Write the failing test**

Create `components/phrases/PhrasesView.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhrasesView } from './PhrasesView';
import type { Message } from '@/types';

const mockMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    text: 'I am allergic to nuts.',
    translation: 'Je suis allergique aux noix.',
    pronunciation: 'zhuh swee ah-lair-zheek oh nwah',
    timestamp: '2:30 PM',
    isFavorite: true,
  },
  {
    id: '2',
    role: 'assistant',
    text: 'Where is the bathroom?',
    translation: 'Ou sont les toilettes?',
    timestamp: '2:31 PM',
    isFavorite: true,
  },
  {
    id: '3',
    role: 'assistant',
    text: 'Not saved',
    timestamp: '2:32 PM',
    isFavorite: false,
  },
];

describe('PhrasesView', () => {
  it('shows only favorited messages', () => {
    render(
      <PhrasesView
        messages={mockMessages}
        onToggleFavorite={vi.fn()}
        onPlayAudio={vi.fn()}
        targetLangCode="fr"
      />
    );
    expect(screen.getByText('Je suis allergique aux noix.')).toBeInTheDocument();
    expect(screen.queryByText('Not saved')).not.toBeInTheDocument();
  });

  it('plays audio on tap', () => {
    const onPlayAudio = vi.fn();
    render(
      <PhrasesView
        messages={mockMessages}
        onToggleFavorite={vi.fn()}
        onPlayAudio={onPlayAudio}
        targetLangCode="fr"
      />
    );
    // Tap the first phrase card play button
    const playButtons = screen.getAllByLabelText('Play phrase');
    fireEvent.click(playButtons[0]);
    expect(onPlayAudio).toHaveBeenCalledWith('Je suis allergique aux noix.', 'fr');
  });

  it('shows empty state when no phrases saved', () => {
    render(
      <PhrasesView
        messages={[]}
        onToggleFavorite={vi.fn()}
        onPlayAudio={vi.fn()}
        targetLangCode="fr"
      />
    );
    expect(screen.getByText(/no saved phrases/i)).toBeInTheDocument();
  });

  it('has remove button for each phrase', () => {
    const onToggleFavorite = vi.fn();
    render(
      <PhrasesView
        messages={mockMessages}
        onToggleFavorite={onToggleFavorite}
        onPlayAudio={vi.fn()}
        targetLangCode="fr"
      />
    );
    const removeButtons = screen.getAllByLabelText('Remove phrase');
    fireEvent.click(removeButtons[0]);
    expect(onToggleFavorite).toHaveBeenCalledWith('1');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/ashleytower/Documents/GitHub/voice-translator && npx vitest run components/phrases/PhrasesView.test.tsx`

**Step 3: Create PhrasesView component**

Create `components/phrases/PhrasesView.tsx`:

```tsx
'use client';

import React from 'react';
import { Message } from '@/types';
import { Volume2, X, BookmarkCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhrasesViewProps {
  messages: Message[];
  onToggleFavorite: (id: string) => void;
  onPlayAudio: (text: string, langCode: string) => void;
  targetLangCode: string;
}

export const PhrasesView: React.FC<PhrasesViewProps> = ({
  messages,
  onToggleFavorite,
  onPlayAudio,
  targetLangCode,
}) => {
  const phrases = messages.filter((m) => m.isFavorite && m.translation);

  if (phrases.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="h-16 w-16 rounded-full bg-[#2C2C2E] flex items-center justify-center mb-4">
          <BookmarkCheck className="h-8 w-8 text-[rgba(235,235,245,0.3)]" />
        </div>
        <p className="text-base font-medium text-foreground">No saved phrases yet</p>
        <p className="text-sm text-[rgba(235,235,245,0.6)] mt-2 max-w-[260px]">
          Star translations in chat to save them here for quick playback
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-5 py-4">
        <h1 className="text-xl font-semibold">Saved Phrases</h1>
        <p className="text-sm text-[rgba(235,235,245,0.6)] mt-1">{phrases.length} phrases</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-3">
          {phrases.map((phrase) => (
            <div
              key={phrase.id}
              className="rounded-2xl bg-[#1C1C1E] border border-white/[0.06] p-4"
            >
              {/* Translation (primary - what gets spoken) */}
              <p className="text-[17px] font-medium leading-relaxed">{phrase.translation}</p>

              {/* Pronunciation */}
              {phrase.pronunciation && (
                <p className="text-sm text-[#64B5F6]/70 mt-1">{phrase.pronunciation}</p>
              )}

              {/* Original text */}
              <p className="text-sm text-[rgba(235,235,245,0.6)] mt-2">{phrase.text}</p>

              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  aria-label="Play phrase"
                  onClick={() => onPlayAudio(phrase.translation!, targetLangCode)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#64B5F6] text-black text-sm font-semibold min-h-[44px]"
                >
                  <Volume2 className="h-4 w-4" />
                  Play
                </button>
                <div className="flex-1" />
                <button
                  aria-label="Remove phrase"
                  onClick={() => onToggleFavorite(phrase.id)}
                  className="flex items-center justify-center w-11 h-11 rounded-full text-[rgba(235,235,245,0.3)] hover:text-[#FF453A] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PhrasesView;
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/ashleytower/Documents/GitHub/voice-translator && npx vitest run components/phrases/PhrasesView.test.tsx`

**Step 5: Wire PhrasesView in page.tsx**

In `app/page.tsx`:
1. Replace import: `FavoritesView` -> `PhrasesView from '@/components/phrases/PhrasesView'`
2. Update `renderPhrasesView`:

```tsx
const renderPhrasesView = () => (
  <div className="flex flex-col flex-1 overflow-hidden bg-background">
    <Header onSettingsClick={handleSettingsClick} />
    <PhrasesView
      messages={messages}
      onToggleFavorite={handleToggleFavorite}
      onPlayAudio={handlePlayAudio}
      targetLangCode={toLang.code}
    />
  </div>
);
```

**Step 6: Run full test suite**

Run: `cd /Users/ashleytower/Documents/GitHub/voice-translator && npx vitest run`

**Step 7: Commit**

```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator
git add components/phrases/PhrasesView.tsx components/phrases/PhrasesView.test.tsx app/page.tsx
git commit -m "feat: PhrasesView tab with quick-play cards for saved translations"
```

---

## Phase 8: PriceCard Exchange Rate + Save Action

### Task 8: Show exchange rate and add save action to PriceCard

**Files:**
- Modify: `components/chat/PriceCard.tsx`
- Modify: `components/CameraTranslate/CameraTranslateView.tsx`

**Step 1: Update PriceCard to show exchange rate**

Add a new prop to PriceCardProps:

```typescript
interface PriceCardProps {
  // ... existing props
  exchangeRate?: number;  // NEW: the raw rate (e.g., 1.365)
  onSave?: () => void;    // NEW: save this result
}
```

In the price display section, between foreign price and home price, add:

```tsx
{exchangeRate && (
  <span className="text-[13px] text-[rgba(235,235,245,0.3)]">
    1 {price.currency} = {exchangeRate.toFixed(3)} {homeCurrency}
  </span>
)}
```

Add a save button to the action area (after deal verdict or as an additional row):

```tsx
{onSave && (
  <button
    onClick={onSave}
    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-white/[0.06] text-[rgba(235,235,245,0.6)] hover:text-white hover:bg-[#2C2C2E] transition-colors mt-2"
  >
    <Save className="h-4 w-4" />
    Save to chat
  </button>
)}
```

**Step 2: Pass exchange rate from CameraTranslateView**

In `CameraTranslateView.tsx`, compute the rate and pass it:

```tsx
const exchangeRate = priceResult
  ? convert(1, priceResult.currency, homeCurrency)
  : undefined;

<PriceCard
  price={priceResult}
  convertedAmount={convert(priceResult.price, priceResult.currency, homeCurrency)}
  homeCurrency={homeCurrency}
  homeSymbol={homeInfo.symbol}
  foreignSymbol={...}
  exchangeRate={exchangeRate}
  onCheckDeal={handleCheckDeal}
  onClearDeal={() => setDealResult(null)}
  dealResult={dealResult}
  isCheckingDeal={isCheckingDeal}
/>
```

**Step 3: Run tests**

Run: `cd /Users/ashleytower/Documents/GitHub/voice-translator && npx vitest run`

**Step 4: Commit**

```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator
git add components/chat/PriceCard.tsx components/CameraTranslate/CameraTranslateView.tsx
git commit -m "feat: show exchange rate in PriceCard + add save action"
```

---

## Phase 9: Touch Target Audit

### Task 9: Fix all sub-44px touch targets

**Files:**
- Modify: `components/chat/ChatBubble.tsx` (star + audio buttons)
- Modify: `components/chat/InputArea.tsx` (tool buttons)

**Step 1: Audit and fix ChatBubble**

In `ChatBubble.tsx`, find any `h-8 w-8` or smaller button and increase to `h-11 w-11` (44px):

- Star/favorite button
- Audio play button

**Step 2: Audit and fix InputArea**

In `InputArea.tsx`, increase all icon buttons from 32-36px to minimum 44px touch targets.

**Step 3: Run tests**

Run: `cd /Users/ashleytower/Documents/GitHub/voice-translator && npx vitest run`

**Step 4: Commit**

```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator
git add components/chat/ChatBubble.tsx components/chat/InputArea.tsx
git commit -m "fix: increase all touch targets to 44px minimum (Apple HIG)"
```

---

## Phase 10: Final Integration + Cleanup

### Task 10: Remove dead code and verify

**Files:**
- Delete: `components/favorites/FavoritesView.tsx` (replaced by PhrasesView)
- Modify: `app/page.tsx` (remove any leftover old imports)

**Step 1: Delete old FavoritesView**

```bash
rm /Users/ashleytower/Documents/GitHub/voice-translator/components/favorites/FavoritesView.tsx
```

**Step 2: Run full CI**

```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator
npx tsc --noEmit && npx vitest run && npx next lint && npx next build
```

All four checks must pass.

**Step 3: Commit**

```bash
cd /Users/ashleytower/Documents/GitHub/voice-translator
git add -A
git commit -m "chore: remove old FavoritesView, clean up dead imports"
```

---

## Summary of All Changes

| Phase | What Changes | Files |
|-------|-------------|-------|
| 1 | Design tokens + ViewMode type | `types.ts`, `lib/design-tokens.ts` |
| 2 | BottomNav redesign (4 new tabs) | `components/layout/BottomNav.tsx` |
| 3 | Header settings gear (44px target) | `components/layout/Header.tsx` |
| 4 | Page.tsx view routing | `app/page.tsx` |
| 5 | Camera segmented control | `components/ui/SegmentedControl.tsx`, `CameraTranslateView.tsx` |
| 6 | Voice orb + transcript feedback | `app/page.tsx`, `components/voice/Orb.tsx` |
| 7 | PhrasesView tab | `components/phrases/PhrasesView.tsx` |
| 8 | PriceCard exchange rate + save | `components/chat/PriceCard.tsx` |
| 9 | Touch target audit (44px min) | `ChatBubble.tsx`, `InputArea.tsx` |
| 10 | Dead code cleanup + CI | all |

## Dependencies Between Tasks

```
Task 1 (types) ──> Task 2 (nav) ──> Task 4 (page wiring)
                                        │
Task 3 (header) ────────────────────────┘
                                        │
Task 5 (segmented) ─────────────────────┤ (independent)
Task 6 (orb feedback) ──────────────────┤ (independent)
Task 7 (phrases) ───────────────────────┤ (depends on Task 4)
Task 8 (price card) ────────────────────┤ (independent)
Task 9 (touch targets) ─────────────────┤ (independent)
                                        │
                                  Task 10 (cleanup)
```

Tasks 5, 6, 8, 9 are independent and can run in parallel after Task 4 is complete.
Task 7 depends on Task 4 (needs PhrasesView wired in page.tsx).
