# Implementation Plan: Identity & Memory Layer

**Project:** Found in Translation (`found-in-translation` repo, branch `feature/t2-ui-cleanup`)
**Live:** foundintranslation.app
**Created:** 2026-03-16

---

## Phase 0: Documentation & Prerequisites

### What this phase establishes
Before writing any code, set up the Supabase project for auth + database and verify all APIs we'll use exist.

### Tasks

1. **Verify Supabase project exists and get credentials**
   - Need: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - Use Rube MCP `RUBE_MANAGE_CONNECTIONS` to verify Supabase connection
   - Add vars to `.env` and `.env.example`
   - Add vars to Vercel project via Vercel MCP or CLI

2. **Install `@supabase/supabase-js`**
   - Currently NOT installed (confirmed: not in package.json)
   - `npm install @supabase/supabase-js`
   - Use `@supabase/ssr` for Next.js App Router server-side usage

3. **Update CSP headers in `next.config.js`**
   - Current CSP (lines 4-32) does NOT allow Supabase domains
   - Add to `connect-src`: `https://*.supabase.co wss://*.supabase.co`
   - Add to `img-src`: `https://*.supabase.co` (for potential avatar/storage)

4. **Enable Google OAuth in Supabase Dashboard**
   - Supabase Dashboard > Authentication > Providers > Google
   - Need Google Cloud OAuth client ID + secret
   - Set redirect URL to `https://foundintranslation.app/auth/callback`

### Verification
- [ ] `@supabase/supabase-js` in package.json
- [ ] `.env` has all three Supabase vars
- [ ] Vercel env vars set
- [ ] CSP headers updated
- [ ] Google OAuth enabled in Supabase dashboard

### Anti-patterns
- Do NOT use `@supabase/auth-helpers-nextjs` (deprecated) -- use `@supabase/ssr` instead
- Do NOT put `SUPABASE_SERVICE_ROLE_KEY` in `NEXT_PUBLIC_*` vars

---

## Phase 1: Supabase Client & Auth Foundation

### What this phase builds
Supabase client creation, auth hook, and the auth callback route. No UI changes yet -- just the plumbing.

### Tasks

1. **Create `lib/supabase.ts`** -- Browser client
   ```typescript
   import { createBrowserClient } from '@supabase/ssr'

   export function createClient() {
     return createBrowserClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
     )
   }
   ```

2. **Create `lib/supabase-server.ts`** -- Server client for API routes
   ```typescript
   import { createClient } from '@supabase/supabase-js'

   export function createServiceClient() {
     return createClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.SUPABASE_SERVICE_ROLE_KEY!
     )
   }
   ```

3. **Create `hooks/useSession.ts`** -- Auth state hook
   - Initialize Supabase client
   - Listen to `onAuthStateChange`
   - Expose: `session`, `user`, `signInWithGoogle()`, `signOut()`, `loading`
   - On first load, check for existing session silently

4. **Create `app/auth/callback/route.ts`** -- OAuth callback handler
   - Exchange auth code for session using `supabase.auth.exchangeCodeForSession()`
   - Redirect to `/` after success

5. **Create `middleware.ts`** -- Session refresh middleware
   - Use `@supabase/ssr` `createServerClient` pattern
   - Refresh session on every request (prevents stale tokens)
   - Do NOT block any routes -- all routes remain accessible without auth

### Key files to reference
- `app/layout.tsx` -- may need Supabase provider wrapper
- `next.config.js` -- CSP headers (updated in Phase 0)

### Verification
- [ ] `createClient()` returns a working Supabase client
- [ ] `useSession()` returns null when not logged in, user object when logged in
- [ ] Google OAuth flow completes and redirects back to app
- [ ] Middleware refreshes session without blocking unauthenticated users
- [ ] All existing features still work without signing in

### Anti-patterns
- Do NOT require auth for any existing feature
- Do NOT use `getSession()` on the server (use `getUser()` for security)
- Do NOT create a SessionProvider context wrapper -- use the hook directly

---

## Phase 2: Database Schema & RLS

### What this phase builds
The two Supabase tables (`traveler_profiles`, `memory_nodes`) with Row Level Security.

### Tasks

1. **Create migration: `supabase/migrations/20260316_identity_memory.sql`**

   ```sql
   -- Traveler profile
   CREATE TABLE traveler_profiles (
     user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
     languages text[] DEFAULT ARRAY['en'],
     travel_style text DEFAULT 'balanced'
       CHECK (travel_style IN ('budget', 'balanced', 'luxury')),
     dietary text[] DEFAULT ARRAY[]::text[],
     home_currency text DEFAULT 'CAD',
     onboarded_at timestamptz,
     updated_at timestamptz DEFAULT now()
   );

   -- Memory nodes
   CREATE TABLE memory_nodes (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     type text NOT NULL
       CHECK (type IN ('place', 'preference', 'expense', 'dish', 'phrase', 'event')),
     content text NOT NULL,
     metadata jsonb DEFAULT '{}',
     created_at timestamptz DEFAULT now()
   );

   -- Indexes
   CREATE INDEX idx_memory_nodes_user ON memory_nodes(user_id);
   CREATE INDEX idx_memory_nodes_type ON memory_nodes(user_id, type);
   CREATE INDEX idx_memory_nodes_created ON memory_nodes(user_id, created_at DESC);

   -- RLS: traveler_profiles
   ALTER TABLE traveler_profiles ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Users read own profile"
     ON traveler_profiles FOR SELECT
     USING (auth.uid() = user_id);

   CREATE POLICY "Users insert own profile"
     ON traveler_profiles FOR INSERT
     WITH CHECK (auth.uid() = user_id);

   CREATE POLICY "Users update own profile"
     ON traveler_profiles FOR UPDATE
     USING (auth.uid() = user_id)
     WITH CHECK (auth.uid() = user_id);

   -- RLS: memory_nodes
   ALTER TABLE memory_nodes ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Users read own memories"
     ON memory_nodes FOR SELECT
     USING (auth.uid() = user_id);

   CREATE POLICY "Users insert own memories"
     ON memory_nodes FOR INSERT
     WITH CHECK (auth.uid() = user_id);

   CREATE POLICY "Users delete own memories"
     ON memory_nodes FOR DELETE
     USING (auth.uid() = user_id);
   ```

2. **Run migration in Supabase Dashboard SQL Editor** or via CLI

3. **Generate TypeScript types** (optional but recommended)
   - `npx supabase gen types typescript --project-id <id> > types/database.ts`
   - Or manually define the types to match the schema

### Verification
- [ ] Both tables exist in Supabase Dashboard > Table Editor
- [ ] RLS enabled on both tables (shield icon visible)
- [ ] Anon user cannot read/write without auth token
- [ ] Authenticated user can only access their own rows

### Anti-patterns
- Do NOT use `FOR ALL` policies with self-referencing checks (causes infinite recursion)
- Do NOT skip `WITH CHECK` on INSERT policies (learned from Travel-App Sprint 5)
- Do NOT add vector/embedding columns yet -- Phase 1 uses tag-based retrieval

---

## Phase 3: Onboarding Flow

### What this phase builds
A lightweight 3-question onboarding screen for first-time authenticated users.

### Tasks

1. **Create `app/onboarding/page.tsx`** -- Onboarding screen
   - Full-screen card with 3 steps (can be single page with sections):
     - Step 1: "What languages do you need?" -- multi-select chips from LANGUAGES constant
     - Step 2: "How do you travel?" -- single select: Budget / Balanced / Luxury
     - Step 3: "Any dietary needs?" -- multi-select chips: Vegetarian, Vegan, Halal, Kosher, No shellfish, No nuts, None
   - On submit: write `traveler_profiles` row with `onboarded_at: new Date()`
   - Redirect to `/` after completion
   - Design: match existing app aesthetic (dark theme, rounded cards, Tailwind)

2. **Update `hooks/useSession.ts`** to include profile loading
   - After auth state loads, fetch `traveler_profiles` for the user
   - Expose: `profile`, `isOnboarded` (profile exists and has `onboarded_at`)
   - If authenticated but not onboarded → app shows onboarding

3. **Update `app/page.tsx`** -- Conditional routing
   - If `useSession()` returns authenticated + not onboarded → show onboarding
   - If not authenticated → app works as-is (no change to existing UX)
   - If authenticated + onboarded → app works with profile loaded

4. **Migrate existing `Onboarding.tsx` component**
   - Current: `app/components/Onboarding.tsx` uses localStorage key `found-in-translation-onboarded`
   - Replace: check `profile.onboarded_at` instead of localStorage
   - Keep localStorage fallback for unauthenticated users

### Key files to modify
- `app/page.tsx` (lines 59-69 -- state declarations, add session/profile)
- `app/components/Onboarding.tsx` (line 14 -- localStorage key)
- `lib/constants.ts` (LANGUAGES array -- reuse for language chips)

### Verification
- [ ] First-time Google sign-in → sees onboarding
- [ ] Complete onboarding → traveler_profiles row created
- [ ] Return visit → goes straight to app, no onboarding
- [ ] Unauthenticated user → app works exactly as before
- [ ] Onboarding completes in under 30 seconds

### Anti-patterns
- Do NOT block the app for unauthenticated users
- Do NOT build a multi-page wizard -- single scrollable card is enough
- Do NOT store onboarding answers in localStorage (use Supabase)

---

## Phase 4: Context Assembly & Gemini Integration

### What this phase builds
Fetch profile + recent memories, assemble a personalized system prompt, and inject it into every Gemini call.

### Tasks

1. **Create `lib/context.ts`** -- Context assembly
   ```typescript
   export async function assembleContext(
     supabase: SupabaseClient,
     userId: string
   ): Promise<string | null>
   ```
   - Fetch `traveler_profiles` for user
   - Fetch last 20 `memory_nodes` ordered by `created_at DESC`
   - Build a system prompt section with profile + memories
   - Return null if no profile exists (unauthenticated user)
   - Cache result in memory (invalidate on new memory write)

2. **Modify `lib/gemini-service.ts`** -- Accept context parameter
   - Current signature: `translateAndChat(text, fromLang, toLang, imageBase64?)`
   - New signature: `translateAndChat(text, fromLang, toLang, imageBase64?, travelerContext?)`
   - Append `travelerContext` to existing system prompt when provided
   - `quickTranslate()` does NOT need context (it's for call transcript relay, speed matters)

3. **Wire context into `app/page.tsx`**
   - On app load (or on auth state change), call `assembleContext()`
   - Store result in `travelerContextRef` (useRef, not state -- avoids re-renders)
   - Pass to `translateAndChat()` in `handleSend()` (line 302)
   - Pass to `translateAndChat()` in `processTranscript()` via `useVoiceTranslator` config

4. **Update `hooks/useVoiceTranslator.ts`** -- Accept context
   - Add `travelerContext?: string` to `VoiceTranslatorConfig`
   - Pass through to `translateAndChat()` call (line 63)

### Example assembled context
```
TRAVELER PROFILE:
- Languages: English (native), Japanese (learning)
- Travel style: Balanced
- Dietary: Vegetarian
- Home currency: CAD

RECENT MEMORIES:
- Saved "Maisen Tonkatsu" restaurant in Omotesando, Tokyo (rated 4.5 stars)
- Scanned dish: Tonkatsu - breaded pork cutlet, Japanese cuisine
- Called restaurant Sushi Dai to make a reservation for 2
- Favorite phrase: "Sumimasen, eigo no menu wa arimasu ka?" (Do you have an English menu?)
```

### Key files to modify
- `lib/gemini-service.ts` (lines 10-15 signature, lines 21-30 system prompt)
- `hooks/useVoiceTranslator.ts` (line 14 config interface, line 63 translateAndChat call)
- `app/page.tsx` (lines 75-97 handleVoiceTranslation, lines 299-302 handleSend)

### Verification
- [ ] Unauthenticated user: Gemini calls work exactly as before (no context)
- [ ] Authenticated user: Gemini system prompt includes profile section
- [ ] Authenticated user with memories: Gemini system prompt includes recent memories
- [ ] Voice translation pipeline still works with context injected
- [ ] Text translation pipeline still works with context injected
- [ ] No regression in translation quality or speed

### Anti-patterns
- Do NOT fetch context on every Gemini call (fetch once, cache, invalidate on write)
- Do NOT add context to `quickTranslate()` (used for real-time call relay, needs speed)
- Do NOT block the UI while context loads -- use existing prompt if context fetch is slow

---

## Phase 5: Event-Driven Memory Writes

### What this phase builds
Automatically save memories when users interact with memory-worthy features.

### Tasks

1. **Create `app/api/save-memory/route.ts`** -- Server-side memory write
   - POST endpoint accepting: `{ type, content, metadata }`
   - Uses service role key to write `memory_nodes`
   - Validates auth token from request headers
   - Returns the created memory node

2. **Create `lib/memory.ts`** -- Client-side helper
   ```typescript
   export async function saveMemory(
     type: 'place' | 'preference' | 'expense' | 'dish' | 'phrase' | 'event',
     content: string,
     metadata?: Record<string, unknown>
   ): Promise<void>
   ```
   - Calls POST `/api/save-memory`
   - Fire-and-forget (don't block UI)
   - No-op if user is not authenticated

3. **Wire into existing features** (event-driven, not transcript-based):

   | Event | Location | Memory Type | Content |
   |-------|----------|-------------|---------|
   | Star a place | `useSavedPlaces.ts` → `toggleSave()` | `place` | "Saved {name} in {address}" |
   | Scan a dish | `page.tsx` → `handleSaveDish()` | `dish` | "{dishName} ({localName}) - {description}" |
   | Complete a call | `page.tsx` → `handleCallSheetOpenChange()` | `event` | "Called {phone}: {summary}" |
   | Favorite a message | `page.tsx` → `handleToggleFavorite()` | `phrase` | "{translation}" |
   | Camera translation | `page.tsx` → `handleSaveCamera()` | `phrase` | "{extractedText} → {translatedText}" |
   | Update settings | `useAppSettings.ts` → `updateSetting()` | `preference` | "{key}: {value}" |

4. **Invalidate context cache** after memory write
   - After `saveMemory()` succeeds, mark context as stale
   - Next Gemini call fetches fresh context

### Key files to modify
- `hooks/useSavedPlaces.ts` (line 22 -- toggleSave function, add saveMemory call)
- `app/page.tsx` (lines 354-391 -- handleSaveDish, handleSaveCamera, handleToggleFavorite, handleCallSheetOpenChange)
- `hooks/useAppSettings.ts` (line 31 -- updateSetting)

### Verification
- [ ] Starring a place creates a memory_nodes row
- [ ] Scanning a dish creates a memory_nodes row
- [ ] Completing a call creates a memory_nodes row
- [ ] Favoriting a translation creates a memory_nodes row
- [ ] Memory writes don't block UI (fire-and-forget)
- [ ] Unauthenticated users: no errors, no writes attempted
- [ ] Memory appears in Gemini context on next session

### Anti-patterns
- Do NOT parse transcripts for memory extraction (Phase 2+ feature)
- Do NOT write a memory on every translation (too noisy)
- Do NOT use Supabase client-side for writes (use API route with service key for RLS bypass)
  - Actually: client-side writes WITH RLS are fine since policies enforce ownership
  - Use client-side writes with anon key -- simpler, no API route needed
  - Service key route only needed if writing on behalf of user from server context

---

## Phase 6: Migrate localStorage to Supabase Sync

### What this phase builds
For authenticated users, sync localStorage data to Supabase so it persists across devices.

### Tasks

1. **Saved places** -- already handled by Phase 5 (memory_nodes type 'place')
   - Keep localStorage as local cache
   - On auth, sync: upload local saved places as memory_nodes
   - On load, merge: Supabase memories + localStorage

2. **App settings** -- sync to `traveler_profiles`
   - `homeCurrency` → already in traveler_profiles
   - `defaultFromLang` / `defaultToLang` → already in traveler_profiles.languages
   - `autoPlay`, `hapticFeedback`, `saveHistory` → add to traveler_profiles as jsonb `preferences` column
   - Keep localStorage as offline fallback

3. **Message history** -- optional sync
   - Messages are high-volume, low-value for persistence
   - Keep in localStorage only (don't sync to Supabase)
   - Favorited messages are already saved as memory_nodes type 'phrase'

4. **First-sign-in migration**
   - When user signs in for first time, check localStorage for existing data
   - Upload existing saved places and favorites as memory_nodes
   - Populate traveler_profiles from existing settings
   - Show brief "Syncing your data..." indicator
   - Clear migration flag to prevent re-upload

### Key files to modify
- `hooks/useSavedPlaces.ts` -- add Supabase read/write alongside localStorage
- `hooks/useAppSettings.ts` -- sync settings to traveler_profiles
- `hooks/useSession.ts` -- trigger first-sign-in migration

### Verification
- [ ] Sign in on device A, star places → sign in on device B, places appear
- [ ] Settings changes sync to traveler_profiles
- [ ] Existing localStorage data migrates on first sign-in
- [ ] Unauthenticated users: localStorage works exactly as before
- [ ] Offline usage: localStorage cache works, syncs when online

### Anti-patterns
- Do NOT delete localStorage after migration (keep as offline cache)
- Do NOT sync message history (too much data, low value)
- Do NOT block app load on sync -- do it in background

---

## Phase Summary

| Phase | What | Files Changed | Depends On |
|-------|------|---------------|------------|
| 0 | Prerequisites | package.json, .env, next.config.js | Nothing |
| 1 | Auth plumbing | lib/supabase.ts, hooks/useSession.ts, middleware.ts, app/auth/callback/route.ts | Phase 0 |
| 2 | Database schema | supabase/migrations/*.sql | Phase 0 |
| 3 | Onboarding UI | app/onboarding/page.tsx, app/page.tsx | Phase 1 + 2 |
| 4 | Context assembly | lib/context.ts, lib/gemini-service.ts, hooks/useVoiceTranslator.ts | Phase 2 + 3 |
| 5 | Memory writes | lib/memory.ts, useSavedPlaces.ts, page.tsx event handlers | Phase 2 |
| 6 | localStorage sync | useSavedPlaces.ts, useAppSettings.ts, useSession.ts | Phase 5 |

**Phases 1+2 can run in parallel** (no dependency between auth and schema).
**Phases 4+5 can run in parallel** (context reads and memory writes are independent).
**Phase 6 depends on Phase 5** (needs memory write infrastructure).

---

## Definition of Done

- [ ] User can sign in with Google (one tap)
- [ ] First-time user sees onboarding, completes in under 30 seconds
- [ ] Returning user's profile loads silently -- no friction
- [ ] Gemini calls receive personalized system prompt with profile + relevant memories
- [ ] Starring a place, scanning a dish, completing a call, favoriting a translation automatically saves as memories
- [ ] Memories appear in Gemini context on next interaction
- [ ] All existing app functionality (Translate, Scan, Convert, Phrases, Explore) works unchanged
- [ ] RLS enabled -- users cannot access each other's data
- [ ] No new infrastructure -- everything runs on existing Vercel + Supabase
- [ ] Unauthenticated users experience zero changes from current behavior
