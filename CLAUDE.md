# Found in Translation

Voice-first travel translation app. Next.js 14 (App Router) + TypeScript + Tailwind + Supabase + Vercel.

## Quick Commands

```bash
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm test             # Vitest watch mode
npm run test:run     # Vitest single run
npm run typecheck    # TypeScript check
npm run ci           # All checks: lint + test + typecheck + build
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 App Router |
| Language | TypeScript 5.4 |
| Styling | Tailwind CSS 3.4 + Radix UI + CVA |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| AI Translation | Google Gemini 2.5 Flash |
| Speech-to-Text | Deepgram (WebSocket streaming) |
| Text-to-Speech | Cartesia (WebSocket streaming) |
| Voice Calling | VAPI (AI phone agent) |
| Maps | Google Maps Platform (Places, Autocomplete, Photos) |
| Payments | Stripe (checkout + webhooks) |
| Testing | Vitest + Testing Library (jsdom) |
| Deploy | Vercel (auto-deploy from main) |

## Project Structure

```
app/
  api/
    call/              # VAPI call initiation + control
    webhooks/stripe/   # Stripe webhook
    subscription/      # Checkout + status
    places/            # Google Maps proxy (autocomplete, nearby, search, photo)
    memories/          # Timeline, recommend, photo
    preferences/       # Preference aggregation
    price-check/       # Tavily price comparison
    vapi/              # VAPI webhooks + decision + transcript (edge runtime)
  auth/callback/       # OAuth callback
  components/          # Page-level components (Onboarding, ProfileOnboarding)
  page.tsx             # Main translator app (single-page, state-driven views)
  layout.tsx           # Root layout with PWA metadata

components/
  ui/                  # Shadcn/Radix primitives
  chat/                # Chat interface (bubbles, input, language picker, dish/price cards)
  call/                # VAPI call UI (CallSheet)
  explore/             # Location discovery (ExploreView, FabSpeedDial)
  currency/            # Currency converter
  settings/            # App settings
  voice/               # Orb visualizer (idle/listening/speaking/processing/call)
  translator/          # Camera + translation UI
  memory/              # Memory timeline + cards
  phrases/             # Saved phrases browser
  layout/              # Header + BottomNav

hooks/
  useVoiceTranslator   # Deepgram STT -> Gemini -> Cartesia TTS orchestration
  useVapiCall          # VAPI call state management
  useSession           # Supabase auth + profile
  useAppSettings       # localStorage settings
  useGeolocation       # Browser geolocation
  useNearbyPlaces      # Google Maps nearby
  useSavedPlaces       # User saved locations
  useSavedItems        # Saved translations
  useRecommendations   # Preference-based recs
  useExchangeRates     # Real-time exchange rates

lib/
  gemini-service       # Translate + chat API (text + image)
  gemini-camera-translate  # OCR translation from photos
  gemini-dish-analyze  # Food identification from photos
  gemini-price-analyze # Price detection from photos
  deepgram-client      # WebSocket STT client
  cartesia-client      # WebSocket TTS client
  supabase / supabase-server  # Client + server Supabase init
  memory               # Save memory nodes + preference signals
  preference-engine    # Extract signals, update user preferences
  subscription         # Check subscription tier
  context              # Assemble traveler context from memories
  chain-matcher        # Match places to known chains
  photo-upload         # Supabase Storage upload
  audio-capture / audio-player / audio-recorder  # Audio utilities

supabase/
  migrations/          # SQL migrations (tracked in git)
  functions/           # Edge functions (gemini-live-proxy)

types/
  database.ts          # Full Supabase schema types
```

## Database Schema (Supabase)

**traveler_profiles** - User profile + preferences
- `user_id`, `languages[]`, `travel_style`, `dietary[]`, `home_currency`, `home_city`, `phone_number`, `email`, `onboarded_at`

**memory_nodes** - Geo-tagged memories (phrases, dishes, places, expenses, events)
- `id`, `user_id`, `type`, `content`, `metadata(jsonb)`, `city`, `country`, `lat`, `lng`, `photo_path`

**user_subscriptions** - Stripe-managed subscription state
- `user_id`, `tier(free|paid)`, `started_at`, `expires_at`, `stripe_customer_id`, `stripe_subscription_id`

**user_preferences** - Learned taste signals
- `id`, `user_id`, `category`, `score`, `sample_count`

All tables use RLS. Service role key only for Stripe webhook.

## Key Patterns

- **Single-page app**: `page.tsx` manages view state (translate, camera, convert, phrases, settings, explore)
- **Voice pipeline**: Deepgram STT -> Gemini translate -> Cartesia TTS (all WebSocket streaming)
- **Fire-and-forget preferences**: Preference engine runs async after memory save, never blocks UI
- **VAPI system prompt injection**: User context (phone, city, task) injected via API per call
- **Soft subscription gating**: Free tier has limited access, not hard blocks
- **localStorage + Supabase sync**: Messages/settings in localStorage, synced to Supabase for cross-device

## Environment Variables

```
# AI (public - client-side)
NEXT_PUBLIC_GOOGLE_API_KEY
NEXT_PUBLIC_DEEPGRAM_API_KEY
NEXT_PUBLIC_CARTESIA_API_KEY

# VAPI (server-only)
VAPI_API_KEY
VAPI_PHONE_NUMBER_ID
VAPI_ASSISTANT_ID

# Maps (split client/server)
NEXT_PUBLIC_GOOGLE_MAPS_KEY
GOOGLE_MAPS_SERVER_KEY

# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Stripe
STRIPE_SECRET_KEY
STRIPE_PRICE_ID
STRIPE_WEBHOOK_SECRET

# Optional
TAVILY_API_KEY
NEXT_PUBLIC_APP_URL
```

## Conventions

- TDD: Write failing test first, then implement
- Components: PascalCase. Hooks: camelCase with `use` prefix
- API routes: Named exports (POST, GET, PATCH, DELETE)
- "use client" only when needed. Server components by default
- RLS enforced at DB level. Never bypass except Stripe webhook
- Tests: Vitest + Testing Library. Mock fetch/APIs with vitest.mock()
- Path alias: `@/*` maps to project root

## Domain

- **URL**: foundintranslation.app
- **Brand**: Found in Translation
- **Target user**: Travelers who need real-time voice translation, menu reading, and local discovery
- **Monetization**: Free tier + "Travel Memory Pass" paid subscription via Stripe
