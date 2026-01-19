# Universal Voice Translator - Design Document

**Date:** 2025-01-19
**Status:** Approved
**Working Title:** LiveTranslate (TBD)

---

## Overview

A real-time voice translator for travelers that works with any language pair. Point, speak, get instant translation. Secondary feature: camera-based currency conversion that reads any price and converts to your home currency.

### Target User

Travelers who need quick, hands-free translation in foreign countries. The app should feel like having a bilingual friend in your pocket.

### Core Value Props

- **Zero friction** - Auto-detects what you're speaking, just pick where you're going
- **Real-time voice** - Full duplex audio via Gemini Live (you can interrupt, natural conversation flow)
- **Smart currency** - Point camera at any price tag, get instant conversion to your currency
- **Works offline-ish** - PWA installable, UI cached (translation needs connection)

### Non-Goals (YAGNI)

- Text-only translation
- Translation history/saving
- Social/sharing features
- Phrasebook or learning mode
- Offline translation

---

## Core Features

### Single Unified Mode

No tabs, no mode switching. The app is always:
- Listening to your microphone
- Watching through your camera
- Ready to respond

User speaks naturally:
- "What did he just say?" → Gemini translates what it heard
- "How much is this in Canadian?" → Gemini reads the price tag, converts
- "What does that sign say?" → Gemini reads and translates text in view
- "How do I say 'thank you'?" → Gemini speaks the phrase in target language

### Language Settings

- **Target language:** Searchable dropdown (50+ languages), persisted to localStorage
- **Home currency:** Searchable dropdown (set once), persisted to localStorage
- Both accessible via a minimal settings panel

### System Prompt (dynamic)

```
You are a real-time travel translator and assistant.
Target language: {targetLanguage}
User's home currency: {homeCurrency}

- When user speaks in any language, respond with translation in {targetLanguage}
- When user asks about prices visible in camera, convert to {homeCurrency}
- Keep responses brief and natural - speak like a helpful friend
- If asked how to say something, speak the phrase clearly
```

---

## Architecture

### Frontend (Next.js 14 + App Router)

```
app/
├── layout.tsx              # Root layout, metadata, fonts
├── page.tsx                # Main app (single page)
├── globals.css             # Base styles, CSS vars
└── components/
    ├── TranslatorCore.tsx      # Main logic, useGeminiLive hook
    ├── VoiceOrb.tsx            # 21.dev animated orb (listening/speaking states)
    ├── LanguagePicker.tsx      # Searchable dropdown (Aceternity)
    ├── CurrencyPicker.tsx      # Searchable dropdown (Aceternity)
    ├── SettingsPanel.tsx       # Slide-out settings (Aceternity)
    ├── TranscriptBubbles.tsx   # Chat-style conversation display
    └── CameraFeed.tsx          # Background video element
```

### Backend (Supabase Edge Function)

```
supabase/functions/
└── gemini-live-proxy/
    └── index.ts            # WebSocket proxy (keeps API key secure)
```

### External Services

- Gemini Live 2.5 (voice + vision)
- ExchangeRate API (currency rates, fetched on mount)

### Data Flow

```
User speaks/shows camera
        ↓
    Browser (mic + camera)
        ↓ WebSocket
    Supabase Proxy
        ↓ WSS
    Gemini Live 2.5
        ↓
    Audio response + transcript
        ↓
    Browser (plays audio, shows text)
```

---

## UI/UX Design

### Layout (Single Screen)

```
┌─────────────────────────────────────┐
│  ⚙️ Settings                    [EN]│  ← Minimal header, language chip
├─────────────────────────────────────┤
│                                     │
│         (Camera feed fills          │
│          background, subtle         │
│          dark overlay)              │
│                                     │
│     ┌───────────────────────┐       │
│     │  Transcript bubbles   │       │  ← Floating over camera
│     │  (scrollable)         │       │
│     └───────────────────────┘       │
│                                     │
│            ◉ Voice Orb              │  ← 21.dev animated orb
│         "Listening..."              │
│                                     │
└─────────────────────────────────────┘
```

### Voice Orb States (21.dev)

- **Idle** - Subtle pulse, muted colors
- **Listening** - Expands, reacts to voice amplitude
- **Processing** - Morphing/thinking animation
- **Speaking** - Audio waveform visualization

### UI Components (Aceternity Pro)

- **Searchable Command Menu** - Language & currency pickers (⌘K style)
- **Animated Modal** - Settings panel with spring animations
- **Glassmorphism Cards** - Transcript bubbles with backdrop blur
- **Spotlight Effect** - Subtle glow following interaction

### Color Palette (Dark, Premium)

```
Background:    #09090b (near black)
Surface:       #18181b (zinc-900)
Accent:        #6366f1 (indigo-500) or user picks
Text:          #fafafa (zinc-50)
Muted:         #a1a1aa (zinc-400)
```

### Typography

```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

System UI stack handles non-Latin scripts (CJK, Arabic, Thai, etc.) automatically.

---

## Configuration & Settings

### Settings Panel

```
┌─────────────────────────────────┐
│  Settings                    ✕  │
├─────────────────────────────────┤
│                                 │
│  Target Language                │
│  ┌─────────────────────────┐    │
│  │ 🔍 Search languages...  │    │
│  │ ─────────────────────── │    │
│  │ Japanese       日本語   │    │
│  │ Spanish        Español  │    │
│  │ French         Français │    │
│  │ Mandarin       中文     │    │
│  │ ...50+ more             │    │
│  └─────────────────────────┘    │
│                                 │
│  My Home Currency               │
│  ┌─────────────────────────┐    │
│  │ CAD - Canadian Dollar   │ ▾  │
│  └─────────────────────────┘    │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  Voice                          │
│  ○ Kore (soft, gentle)          │
│  ○ Puck (upbeat)                │
│  ○ Charon (calm)                │
│  ○ Aoede (warm)                 │
│                                 │
└─────────────────────────────────┘
```

### Persisted to localStorage

- `targetLanguage` - ISO code (e.g., "ja", "es", "zh")
- `homeCurrency` - ISO code (e.g., "CAD", "USD", "EUR")
- `voiceName` - Gemini voice preference

### Environment Variables

```env
# Frontend (public)
NEXT_PUBLIC_PROXY_URL=wss://your-project.supabase.co/functions/v1/gemini-live-proxy

# Supabase Edge Function (secret)
GOOGLE_AI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash-preview-native-audio-dialog
```

### Language List (data file)

```ts
// lib/languages.ts
export const LANGUAGES = [
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'zh', name: 'Mandarin', native: '中文' },
  // ... all Gemini-supported languages
]
```

---

## Deployment

### Frontend: Vercel

1. Connect GitHub repo to Vercel
2. Set environment variable:
   `NEXT_PUBLIC_PROXY_URL=wss://xxx.supabase.co/functions/v1/gemini-live-proxy`
3. Deploy (auto-deploys on push to main)

### Backend: Supabase Edge Function

```bash
# One-time setup
supabase init
supabase functions new gemini-live-proxy

# Set secrets
supabase secrets set GOOGLE_AI_API_KEY=your-key
supabase secrets set GEMINI_MODEL=gemini-2.5-flash-preview-native-audio-dialog

# Deploy
supabase functions deploy gemini-live-proxy
```

### Update Flow (when new Gemini model releases)

```bash
# Just update the secret, no code change needed
supabase secrets set GEMINI_MODEL=gemini-2.5-flash-new-version-name
```

---

## Summary

| Aspect | Decision |
|--------|----------|
| **Core UX** | Single unified mode - always listening + seeing |
| **Language** | Auto-detect input, 50+ target languages (searchable) |
| **Currency** | Camera reads any price → converts to home currency |
| **Model** | Gemini 2.5 Live (config-based, easy updates) |
| **UI Stack** | Aceternity Pro + 21.dev voice orbs |
| **Frontend** | Next.js 14, Tailwind, TypeScript |
| **Backend** | Supabase Edge Function (WebSocket proxy) |
| **Hosting** | Vercel (frontend) + Supabase (proxy) |
| **PWA** | Yes - installable, cached assets |
