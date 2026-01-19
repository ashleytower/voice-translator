# 日本語 Translator

Real-time English ↔ Japanese voice translator with currency converter. Built for your Japan trip.

## Features

- **Voice Translation**: Tap to speak, get instant translation via Gemini 2.5 Flash Native Audio
- **Currency Converter**: Point camera at prices, converts JPY ↔ CAD automatically
- **Mode Toggle**: Switch between Translate and Currency modes
- **Direction Toggle**: EN→JP or JP→EN translation
- **PWA**: Install on home screen, works offline (cached assets)

## Stack

- Next.js 14 (App Router)
- Gemini 2.5 Flash Native Audio API
- Supabase Edge Functions (WebSocket proxy)
- ExchangeRate-API (currency rates)

## Deployment

### 1. Deploy Supabase Edge Function

```bash
cd supabase/functions/gemini-live-proxy

# Set your Gemini API key
supabase secrets set GOOGLE_AI_API_KEY=your-key-here

# Deploy
supabase functions deploy gemini-live-proxy
```

### 2. Configure Environment

```bash
cp .env.example .env.local

# Edit .env.local with your Supabase project URL
NEXT_PUBLIC_PROXY_URL=wss://YOUR_PROJECT.supabase.co/functions/v1/gemini-live-proxy
```

### 3. Deploy to Vercel

```bash
npm install
vercel deploy --prod
```

Or connect repo to Vercel dashboard for auto-deploy.

### 4. Set Vercel Environment Variable

In Vercel dashboard → Settings → Environment Variables:
- `NEXT_PUBLIC_PROXY_URL` = your Supabase function URL

## Local Development

```bash
npm install
npm run dev
```

Note: WebSocket proxy must be deployed for voice features to work locally.

## Usage

1. **Translation Mode**: Tap mic, speak in English or Japanese, hear translation
2. **Currency Mode**: Tap camera, point at price, tap screen to capture and convert

## Architecture

```
Browser → Supabase Edge Function → Gemini 2.5 Flash Native Audio
                ↓
         Tool Calling (currency)
                ↓
         ExchangeRate-API
```

All audio processing happens in Gemini. The proxy handles auth and WebSocket bridging.
