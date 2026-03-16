# Found in Translation

AI-powered voice translator for travelers. Speak in your language, hear it in theirs.

**Live:** [foundintranslation.app](https://foundintranslation.app)

## Features

- **Voice Translation**: Tap the orb to speak, get instant translation via Deepgram STT + Gemini + Cartesia TTS
- **Listen Mode**: Toggle "Their turn" to record the other person and translate back to you
- **Camera Translate**: Point camera at signs, menus, or text for instant translation
- **Dish Analysis**: Identify dishes from photos with ingredients and dietary info
- **Currency Converter**: Quick-convert foreign prices inline
- **Phone Calls**: AI agent makes phone calls in the local language on your behalf
- **Explore**: Find nearby restaurants, cafes, pharmacies, and transit with map view
- **Saved Places**: Star locations on the map for quick reference
- **Phrases**: Browse and replay your translation history
- **PWA**: Install on home screen for native app experience

## Stack

- Next.js 14 (App Router)
- Deepgram (Speech-to-Text)
- Gemini 2.5 Flash (Translation)
- Cartesia (Text-to-Speech)
- Google Maps Platform (Explore / Places)
- VAPI (AI phone calls)
- Tailwind CSS + Radix UI

## Local Development

```bash
cp .env.example .env.local  # Fill in API keys
npm install
npm run dev
```

## Deployment

Push to `main` branch for auto-deploy to Vercel.
