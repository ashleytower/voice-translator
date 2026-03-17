# Product Requirements Document: Travel Memory

**Product:** Found in Translation (foundintranslation.app)
**Feature:** Travel Memory -- cross-city personalized recommendations
**Author:** Architecture Agent
**Date:** 2026-03-17
**Status:** Draft

---

## 1. Problem Statement

Travel apps forget you the moment you leave a city. A traveler who loved omakase in Osaka has to start from scratch when they land in Tokyo. Saved places are flat lists with no intelligence. Camera scans vanish when the session ends.

Found in Translation already captures memory-worthy events (starred places, dish scans, camera translations, favorited phrases, completed phone calls) into `memory_nodes`. But these memories are write-only -- nothing reads them to generate recommendations, and camera photos are discarded after analysis.

**Travel Memory** closes that loop: the app remembers what you loved and uses it to recommend what to try next, in any city.

---

## 2. Core Experiences

These three scenarios define "done":

1. **Cross-city taste matching**: "You loved Sushi Dai in Osaka. Here are 3 similar omakase spots near you in Tokyo's Tsukiji area."
2. **Chain/brand awareness**: "You saved % Arabica in Kyoto. There is a % Arabica 4 minutes from your hotel in Shinjuku."
3. **Category affinity surfacing**: "You rated izakayas 5 stars in Osaka. Golden Gai is a 6 min walk -- 200+ tiny bars."

---

## 3. User Stories and Acceptance Criteria

### US-1: Photo persistence on camera scans

**As a** paid user,
**I want** photos from my dish, price, and translation scans saved alongside the analysis,
**so that** I can review what I saw and share it later.

**Acceptance Criteria:**
- When a camera scan completes (dish, price, translate), the captured JPEG is uploaded to Supabase Storage.
- The resulting `memory_nodes` row contains a `photo_path` in its `metadata` field pointing to the stored file.
- Free-tier users see scan results during the session but photos are not persisted after the session ends.
- Paid-tier users can view past scans with photos in a "Memory" section.
- Photos are compressed to under 200KB before upload.

### US-2: Explicit place rating

**As a** signed-in user,
**I want** to rate places I have visited on a 1-5 scale,
**so that** the app understands my preferences beyond binary save/unsave.

**Acceptance Criteria:**
- Saved places show a 5-star rating control in the place detail view.
- Rating writes a `preference` memory node with `{ place_id, rating, cuisine_type, categories }`.
- Default state is "unrated" (null), not zero.
- Rating updates are idempotent -- re-rating the same place updates the existing preference node.

### US-3: Cross-city recommendations on Explore

**As a** signed-in user arriving in a new city,
**I want** to see personalized recommendations based on what I enjoyed in previous cities,
**so that** I discover places I will probably like without manual searching.

**Acceptance Criteria:**
- A "For You" section appears at the top of the Explore view when the user has 3+ rated/saved places.
- Recommendations are based on cuisine type, place categories, price level, and rating patterns from the user's memory.
- Each recommendation includes a one-line explanation: "Because you loved [place] in [city]".
- Recommendations use the Google Places API filtered by the inferred preferences.
- The system works with as few as 3 data points (graceful degradation, not empty states).

### US-4: Brand/chain detection

**As a** signed-in user,
**I want** the app to notify me when a brand or chain I previously saved has a location nearby,
**so that** I can visit familiar spots in unfamiliar cities.

**Acceptance Criteria:**
- When the user opens Explore, the system checks if any saved place names match nearby results (fuzzy match on business name).
- Matches appear as a banner: "% Arabica is 4 min away" with a tap-to-navigate action.
- Matching is case-insensitive and handles minor name variations (e.g., "% ARABICA" vs "% Arabica Kyoto").

### US-5: Free vs paid tier gating

**As a** free-tier user,
**I want** to use all scan features with session-only history,
**so that** I can evaluate the app before committing to a paid plan.

**Acceptance Criteria:**
- Free tier: Unlimited scans. Results visible during the current session (localStorage). No photo persistence. No cross-city recommendations.
- Paid tier: Photos + analyses saved permanently in Supabase. Cross-city recommendations. Full memory timeline.
- Upgrade prompt appears when a free user tries to access "Memory" or "For You" sections.
- Downgrade does not delete existing data -- it becomes inaccessible until re-upgrade.

### US-6: Memory timeline

**As a** paid user,
**I want** a chronological timeline of my travel memories grouped by city,
**so that** I can revisit my experiences.

**Acceptance Criteria:**
- Memory view shows cards grouped by city/date with photo thumbnails.
- Each card shows: photo (if available), place/dish name, date, city, scan type.
- Tapping a card shows the full analysis (dish details, translation, price breakdown).
- Cards can be deleted individually.

---

## 4. Data Model Changes

### 4.1 Existing tables (no changes needed)

**`traveler_profiles`** -- already has `languages`, `travel_style`, `dietary`, `home_currency`. No schema changes.

**`memory_nodes`** -- already has `type`, `content`, `metadata` (jsonb). The metadata field is flexible enough to store additional attributes without schema migration.

### 4.2 New column on memory_nodes

```sql
-- Migration: 20260317_travel_memory.sql

-- Add city context to memory nodes for cross-city queries
ALTER TABLE memory_nodes
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS photo_path text;

-- Index for city-based queries (cross-city recommendations)
CREATE INDEX IF NOT EXISTS idx_memory_nodes_city
  ON memory_nodes(user_id, city);

-- Index for geo-proximity queries
CREATE INDEX IF NOT EXISTS idx_memory_nodes_geo
  ON memory_nodes(user_id, lat, lng)
  WHERE lat IS NOT NULL;
```

**Rationale for columns vs metadata jsonb:** City and coordinates are queried in every recommendation call. Promoting them to columns enables indexed filtering instead of jsonb path scanning. `photo_path` is also a column because it drives storage lifecycle (cleanup, tier gating).

### 4.3 New table: user_subscriptions

```sql
CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free', 'paid')),
  started_at timestamptz,
  expires_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Only server (service role) can insert/update subscriptions
-- No INSERT/UPDATE policies for anon/authenticated -- webhook handles this
```

### 4.4 New table: user_preferences (aggregated taste profile)

```sql
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,       -- e.g. 'cuisine:japanese', 'type:izakaya', 'chain:% Arabica'
  score numeric NOT NULL DEFAULT 0, -- weighted preference score
  sample_count int NOT NULL DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(user_id, category)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user
  ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_score
  ON user_preferences(user_id, score DESC);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);
```

**Rationale:** A materialized preference table avoids re-scanning all `memory_nodes` on every recommendation request. Updated incrementally when new memories are written.

### 4.5 Supabase Storage bucket

```
Bucket: memory-photos
  Path pattern: {user_id}/{memory_node_id}.jpg
  Public: No (signed URLs only)
  Max file size: 500KB
  Allowed MIME types: image/jpeg
```

RLS policy on storage:

```sql
-- Users can upload to their own folder
CREATE POLICY "Users upload own photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'memory-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own photos
CREATE POLICY "Users read own photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'memory-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own photos
CREATE POLICY "Users delete own photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'memory-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

### 4.6 Updated TypeScript types

```typescript
// types/database.ts additions

export type SubscriptionTier = 'free' | 'paid'

export interface UserSubscription {
  user_id: string
  tier: SubscriptionTier
  started_at: string | null
  expires_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  updated_at: string
}

export interface UserPreference {
  id: string
  user_id: string
  category: string    // e.g. 'cuisine:japanese', 'type:izakaya'
  score: number
  sample_count: number
  last_updated: string
}

// Extended MemoryNode
export interface MemoryNode {
  id: string
  user_id: string
  type: MemoryNodeType
  content: string
  metadata: Record<string, unknown>
  city: string | null
  country: string | null
  lat: number | null
  lng: number | null
  photo_path: string | null
  created_at: string
}

export type MemoryNodeType =
  | 'place'
  | 'preference'
  | 'expense'
  | 'dish'
  | 'phrase'
  | 'event'
```

---

## 5. Recommendation Engine Design

### 5.1 Architecture decision: Gemini-powered vs rule-based

| Approach | Pros | Cons |
|----------|------|------|
| **Rule-based filtering** | Predictable, fast, no API cost, debuggable | Cannot capture nuanced taste patterns |
| **Gemini LLM ranking** | Understands nuance ("loved hole-in-wall ramen" -> recommends similar vibes) | API cost per recommendation, latency, non-deterministic |
| **Hybrid (chosen)** | Rules for candidate generation, Gemini for ranking/explanation | Two-step process, slightly more complex |

**Decision: Hybrid approach.** Use rule-based filtering to generate a candidate set of 20-30 places from Google Places API, then pass the candidates + user preference summary to Gemini for ranking and explanation generation. This keeps API costs bounded (one Gemini call per recommendation refresh, not per place) and produces human-readable explanations.

### 5.2 Preference extraction pipeline

When a new memory is written:

1. **Extract signals from the memory metadata:**
   - `type: 'place'` -> extract `cuisine_type`, `place_categories`, `price_level` from the place data
   - `type: 'dish'` -> extract `cuisine_type`, `ingredients`, `dietary_flags`
   - `type: 'preference'` (explicit rating) -> extract `place_id`, `rating`, `categories`
   - `type: 'event'` (phone call) -> extract venue type from call context

2. **Update `user_preferences` table:**
   - Upsert category scores using exponential moving average:
     ```
     new_score = (old_score * sample_count + signal_value) / (sample_count + 1)
     ```
   - Signal values: explicit 5-star rating = rating/5, saved place = 0.7, dish scan = 0.5, revisit = 1.0
   - Categories are hierarchical tags: `cuisine:japanese`, `cuisine:japanese:ramen`, `type:izakaya`, `price:moderate`, `chain:% Arabica`

3. **Recency weighting:** Preferences decay over time. Memories older than 6 months have their signal value halved. This prevents stale preferences from dominating.

### 5.3 Recommendation generation flow

```
User opens Explore view
        |
        v
[1] Fetch top 10 user_preferences (by score)
        |
        v
[2] For top 3 cuisine/type preferences:
    Call Google Places API with:
      - includedTypes matching the preference
      - locationRestriction: user's current position, 2km radius
      - rankPreference: POPULARITY (not DISTANCE)
        |
        v
[3] Deduplicate results, remove already-saved places
        |
        v
[4] Build candidate list (max 15 places)
        |
        v
[5] Call Gemini with:
    - User preference summary (top categories + scores)
    - Recent memories (last 10, with city context)
    - Candidate places (name, type, rating, price level)
    - Prompt: "Rank these 15 places for this traveler.
      Return top 5 with a one-line explanation each."
        |
        v
[6] Cache result for 1 hour (invalidate on location change > 500m)
        |
        v
[7] Return ranked recommendations with explanations
```

### 5.4 Chain/brand matching

Separate from the Gemini-powered recommendations, this is a simple string-matching system:

1. On Explore view load, fetch all saved place names from `memory_nodes WHERE type='place'`.
2. When nearby places load from Google Places API, do a fuzzy name match (Levenshtein distance <= 3 or substring containment after normalization).
3. Surface matches as a "Familiar Spots" banner above the "For You" section.

This requires zero API calls beyond what the Explore view already makes.

### 5.5 Cold start strategy

| Memory count | Behavior |
|-------------|----------|
| 0-2 memories | No "For You" section. Standard Explore view only. |
| 3-5 memories | "For You" section with rule-based only (no Gemini call). Simple: "You saved 2 Japanese restaurants. Here are more nearby." |
| 6+ memories | Full hybrid pipeline with Gemini ranking and explanations. |

---

## 6. Photo Storage Architecture

### 6.1 Upload flow

```
Camera scan completes (dish/price/translate)
        |
        v
[Client] Display result to user (unchanged)
        |
        v
[Client] Check: is user authenticated AND paid tier?
    No  --> Store result in localStorage (session-only). Done.
    Yes --> Continue
        |
        v
[Client] Compress JPEG to max 200KB using canvas.toBlob(quality: 0.7)
        |
        v
[Client] Upload to Supabase Storage:
         bucket: 'memory-photos'
         path: '{user_id}/{memory_node_id}.jpg'
        |
        v
[Client] Write memory_node with photo_path set
```

### 6.2 Retrieval flow

```
Memory timeline loads
        |
        v
[Client] Fetch memory_nodes with photo_path IS NOT NULL
        |
        v
[Client] For each photo_path, request signed URL from Supabase Storage
         (1 hour expiry, batched)
        |
        v
[Client] Render thumbnail grid with lazy loading
```

### 6.3 Storage cost estimates

| Usage pattern | Photos/day | Size/photo | Trip duration | Total |
|---------------|-----------|------------|---------------|-------|
| Light user | 3 | 150KB | 7 days | 3.1 MB |
| Medium user | 8 | 150KB | 14 days | 16.8 MB |
| Heavy user | 15 | 150KB | 14 days | 31.5 MB |
| Power user | 25 | 200KB | 21 days | 105 MB |

Supabase free tier: 1GB storage. At medium usage, supports ~60 users before hitting limits.
Supabase Pro tier: 100GB storage. Supports ~6,000 medium users.

### 6.4 Cleanup strategy

- Photos linked to deleted memory nodes are cleaned up via a Supabase Edge Function triggered by a database webhook on `memory_nodes` DELETE.
- Users who downgrade from paid to free: photos remain stored but are inaccessible (signed URL generation blocked by tier check).
- Optional future: archive photos older than 1 year to cheaper storage.

---

## 7. Free vs Paid Tier Gating

### 7.1 Feature matrix

| Feature | Free | Paid |
|---------|------|------|
| Voice translation | Unlimited | Unlimited |
| Camera scans (dish/price/translate) | Unlimited | Unlimited |
| Scan result display | Session only | Permanent |
| Photo saving | No | Yes |
| Saved places | Yes (localStorage) | Yes (Supabase synced) |
| Place rating | No | Yes |
| "For You" recommendations | No | Yes |
| Chain/brand alerts | No | Yes |
| Memory timeline | No | Yes |
| AI phone calls | Yes | Yes |
| Gemini context personalization | Basic (profile only) | Full (profile + memories) |

### 7.2 Gating implementation

The tier check is a single function that reads from `user_subscriptions`:

```typescript
// lib/subscription.ts
export async function getUserTier(userId: string): Promise<'free' | 'paid'> {
  const supabase = createClient()
  const { data } = await supabase
    .from('user_subscriptions')
    .select('tier, expires_at')
    .eq('user_id', userId)
    .single()

  if (!data) return 'free'
  if (data.expires_at && new Date(data.expires_at) < new Date()) return 'free'
  return data.tier
}
```

### 7.3 Paywall touchpoints

The paywall appears as a bottom sheet (not a full-screen block) at these moments:

1. Tapping "Memory" tab when on free tier.
2. Tapping "For You" section header on Explore view.
3. After 3rd camera scan in a session, a subtle banner: "Save your scans permanently -- upgrade."
4. When opening a past scan from localStorage that has no photo: "Photos saved on paid plan."

### 7.4 Pricing (product decision, not engineering)

Placeholder: $4.99/month or $29.99/year. Stripe Checkout integration via webhook to update `user_subscriptions`.

---

## 8. API Routes Needed

### 8.1 New routes

| Route | Method | Purpose | Auth required | Tier |
|-------|--------|---------|---------------|------|
| `/api/memories/recommend` | GET | Get personalized recommendations for current location | Yes | Paid |
| `/api/memories/timeline` | GET | Paginated memory timeline grouped by city | Yes | Paid |
| `/api/memories/photo/upload` | POST | Upload compressed photo to Supabase Storage | Yes | Paid |
| `/api/memories/photo/[id]` | GET | Get signed URL for a memory photo | Yes | Paid |
| `/api/memories/rate` | POST | Rate a saved place (1-5 stars) | Yes | Paid |
| `/api/preferences/summary` | GET | Get user's aggregated preference profile | Yes | Paid |
| `/api/subscription/status` | GET | Get current subscription tier and expiry | Yes | Any |
| `/api/subscription/checkout` | POST | Create Stripe Checkout session | Yes | Any |
| `/api/webhooks/stripe` | POST | Handle Stripe subscription events | No (webhook secret) | N/A |

### 8.2 Modified routes

| Route | Change |
|-------|--------|
| `/api/places/nearby` (existing) | Add optional `preferences` parameter to filter by user taste profile |

### 8.3 Modified client-side functions

| Function | Change |
|----------|--------|
| `lib/memory.ts` `saveMemory()` | Add `city`, `country`, `lat`, `lng`, `photo_path` parameters. Trigger preference extraction after write. |
| `lib/context.ts` `assembleContext()` | For paid users, include preference summary and cross-city patterns in Gemini context. |

---

## 9. UI Components Needed

### 9.1 New components

| Component | Location | Description |
|-----------|----------|-------------|
| `ForYouSection` | `components/explore/ForYouSection.tsx` | Horizontal scrollable card list at top of Explore view showing personalized recommendations with explanation text |
| `FamiliarSpotsBanner` | `components/explore/FamiliarSpotsBanner.tsx` | Banner showing chain/brand matches near current location |
| `MemoryTimeline` | `components/memory/MemoryTimeline.tsx` | Chronological card grid of saved memories grouped by city |
| `MemoryCard` | `components/memory/MemoryCard.tsx` | Individual memory card with photo thumbnail, title, date, city |
| `MemoryDetail` | `components/memory/MemoryDetail.tsx` | Full-screen view of a memory with photo, analysis results, location on map |
| `PlaceRating` | `components/explore/PlaceRating.tsx` | 5-star rating control for saved places |
| `PaywallSheet` | `components/subscription/PaywallSheet.tsx` | Bottom sheet upgrade prompt with feature comparison |
| `SubscriptionBadge` | `components/subscription/SubscriptionBadge.tsx` | Small badge showing current tier in settings |

### 9.2 Modified components

| Component | Change |
|-----------|--------|
| `ExploreView.tsx` | Add `ForYouSection` and `FamiliarSpotsBanner` above category chips (paid users only) |
| `PlaceCard.tsx` | Add `PlaceRating` control for saved places |
| `CameraTranslateView.tsx` | After scan completion, trigger photo upload for paid users |
| `BottomNav.tsx` | Add "Memory" tab (or integrate into existing Explore tab as a sub-view) |
| Settings view | Add subscription status display and manage subscription link |

### 9.3 Navigation decision: Memory as a tab vs sub-view

| Option | Pros | Cons |
|--------|------|------|
| **New "Memory" tab in BottomNav** | Clear entry point, dedicated space | 6th tab is crowded, free users see an empty/locked tab |
| **Sub-view within Explore (chosen)** | Natural grouping (explore + remember), no new tab | Slightly less discoverable, requires in-view navigation |

**Decision:** Memory is a sub-view within Explore, accessed via a "Memory" toggle at the top of the Explore view (tabs: "Nearby" | "For You" | "Memory"). This avoids adding a 6th bottom tab and groups related experiences together.

---

## 10. Privacy Considerations

### 10.1 Data stored per user

- Location history (city + coordinates on each memory)
- Food preferences and dietary patterns
- Places visited and rated
- Photos of food, signs, and price tags
- Phone call summaries

### 10.2 Privacy controls required

1. **Data export**: Users can request a full export of their data (GDPR Article 20). Implement as a settings action that generates a ZIP of all memory nodes + photos.
2. **Data deletion**: Users can delete individual memories or request full account deletion. Cascade delete from `auth.users` already handles this for Supabase tables. Storage files need explicit cleanup via Edge Function.
3. **Photo consent**: Before first photo upload, show a one-time notice: "Photos from your scans will be saved to your private account. Only you can see them."
4. **Location precision**: Store city-level precision (city name + approximate coordinates), not exact GPS. Round lat/lng to 3 decimal places (~111m precision) in `memory_nodes`.
5. **No sharing by default**: Memory data is never shared between users. No social features in this phase.
6. **Retention policy**: Memories are retained indefinitely while the account is active. On account deletion, all data (including Storage files) is deleted within 30 days.

### 10.3 Security measures

- All Storage files are private (no public URLs). Signed URLs expire in 1 hour.
- RLS on all tables ensures users can only access their own data.
- Stripe webhook endpoint validates webhook signatures.
- `user_subscriptions` has no client-side INSERT/UPDATE policies -- only the server (via service role from webhook handler) can modify subscription status.
- Photos are not indexed by search engines (no public bucket).

---

## 11. Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal:** Schema migration, photo upload, tier gating plumbing.

Tasks:
1. Run the `20260317_travel_memory.sql` migration (add columns to `memory_nodes`, create `user_subscriptions`, create `user_preferences`).
2. Create `memory-photos` Storage bucket with RLS policies.
3. Update `saveMemory()` to accept and write `city`, `country`, `lat`, `lng`, `photo_path`.
4. Add JPEG compression utility (`lib/image-compress.ts`).
5. Add photo upload function (`lib/photo-upload.ts`).
6. Wire photo upload into `CameraTranslateView.tsx` (dish scan, price scan, camera translate) -- fire-and-forget after displaying results.
7. Add `getUserTier()` function and `useSubscription()` hook.
8. Add `PaywallSheet` component (UI only, no Stripe integration yet).
9. Update `types/database.ts` with new types.

**Verification:** Camera scans save photos to Supabase Storage. `memory_nodes` rows have city/lat/lng populated. Tier check returns 'free' for all users (no subscription rows yet).

**What is deliberately deferred:** Recommendations, timeline UI, Stripe integration, preference extraction.

### Phase 2: Preference Engine (Week 2)
**Goal:** Extract and aggregate user preferences from memory writes.

Tasks:
1. Create `lib/preference-engine.ts` with `extractSignals()` and `updatePreferences()` functions.
2. Wire preference extraction into `saveMemory()` as a post-write side effect.
3. Backfill: create a one-time script to extract preferences from existing `memory_nodes`.
4. Add `PlaceRating` component for saved places.
5. Wire rating into `PlaceCard.tsx` with `saveMemory('preference', ...)` and preference update.
6. Add `/api/preferences/summary` route.
7. Update `assembleContext()` to include preference summary for paid users.

**Verification:** After saving 5+ places and scanning 3+ dishes, `user_preferences` table has correctly weighted entries. Gemini context includes preference summary.

### Phase 3: Recommendations (Week 3)
**Goal:** Cross-city recommendations appear in Explore view.

Tasks:
1. Create `/api/memories/recommend` route implementing the hybrid pipeline (Section 5.3).
2. Create `ForYouSection` component.
3. Create `FamiliarSpotsBanner` component with fuzzy chain matching.
4. Integrate both into `ExploreView.tsx` (paid tier only).
5. Implement recommendation caching (1-hour TTL, invalidate on location change > 500m).
6. Cold start handling: graceful degradation for users with few memories.

**Verification:** User with 6+ memories in Osaka sees personalized recommendations when opening Explore in Tokyo. Chain matches surface when applicable. Users with < 3 memories see standard Explore without "For You".

### Phase 4: Memory Timeline + Stripe (Week 4)
**Goal:** Users can review past memories and pay for premium.

Tasks:
1. Create `MemoryTimeline`, `MemoryCard`, and `MemoryDetail` components.
2. Add Explore sub-navigation: "Nearby" | "For You" | "Memory" tabs.
3. Create `/api/memories/timeline` route with pagination and city grouping.
4. Create `/api/memories/photo/[id]` route for signed URL generation.
5. Integrate Stripe Checkout: `/api/subscription/checkout` and `/api/webhooks/stripe`.
6. Wire `PaywallSheet` to Stripe Checkout flow.
7. Add subscription status to settings view.
8. Create data export function (settings > "Export my data").

**Verification:** Full end-to-end flow: scan dishes in city A, travel to city B, see recommendations, view memory timeline, upgrade via Stripe, access all features.

---

## 12. Dependencies and Risks

### 12.1 Technical dependencies

| Dependency | Status | Risk |
|------------|--------|------|
| Supabase Storage | Available on current plan | Low -- standard feature |
| Supabase Edge Functions (for photo cleanup) | Not currently used | Medium -- new infrastructure to set up |
| Google Places API (for recommendations) | Already integrated | Low -- additional queries per recommendation refresh |
| Gemini 2.5 Flash (for recommendation ranking) | Already integrated | Low -- one additional call per recommendation refresh |
| Stripe | Not integrated | High -- new payment infrastructure, webhook handling, subscription lifecycle |
| Reverse geocoding (city name from lat/lng) | Not integrated | Low -- Google Geocoding API, or derive city from Places API response |

### 12.2 Risks and mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Gemini recommendation quality is poor** | Users see irrelevant suggestions | Medium | Fallback to rule-based only. A/B test Gemini vs rules. Allow users to dismiss bad recommendations (negative signal). |
| **Photo storage costs exceed budget** | Supabase bill spikes | Medium | Enforce 200KB compression limit. Monitor per-user storage usage. Add per-user storage cap (500MB). |
| **Stripe integration delays** | Cannot monetize | Medium | Phase 1-3 work without Stripe. Use a manual "beta tester" flag in `user_subscriptions` to grant paid access during development. |
| **Cross-city recommendations require travel** | Cannot test locally | High | Seed test accounts with memories in multiple cities. Create a "simulate location" developer tool. |
| **Preference extraction produces noisy scores** | Recommendations are random | Medium | Log all preference updates. Add admin view to inspect preference weights. Manual tuning of signal values in Phase 2. |
| **Cold start: new users see no value from Memory** | Churn before reaching paid features | High | Surface Memory value early: after first 3 scans, show "Imagine seeing this in your memory timeline -- save it forever with Pro." Progressive disclosure, not gating. |
| **Privacy concerns with location tracking** | User trust issues | Medium | City-level precision only (3 decimal places). Prominent privacy notice before first memory save. Easy data deletion. No cross-user sharing. |

### 12.3 Open questions (require product decisions)

1. **Pricing**: $4.99/month is a placeholder. Need competitive analysis and willingness-to-pay research.
2. **Free tier memory limit**: Should free users get any persistent memories (e.g., last 10) to demonstrate value? Current decision is no, but this is debatable.
3. **Recommendation refresh frequency**: Currently 1-hour cache. Should it be real-time? Daily? Triggered by opening the tab?
4. **Offline support**: Should paid users be able to view cached memories offline? Significant complexity increase for offline photo viewing.
5. **Multi-device sync latency**: How quickly should new memories appear on a second device? Real-time (Supabase realtime subscriptions) or next-app-load?

---

## 13. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Memory nodes created per active user per day | 5+ | Supabase query |
| Recommendation tap-through rate | 15%+ | Click events on "For You" cards |
| Cross-city recommendation accuracy (user doesn't dismiss) | 70%+ | Dismiss rate on recommendations |
| Free-to-paid conversion from paywall | 5%+ | Stripe events / paywall impressions |
| Photo upload success rate | 99%+ | Upload errors / attempts |
| Recommendation latency (P95) | < 3 seconds | API route timing |
| Memory timeline engagement (views per session) | 1.5+ | Page view events |

---

## 14. Architectural Decision Records

### ADR-001: Hybrid recommendation engine over pure LLM or pure rules

**Status:** Accepted

**Context:** We need to recommend places in a new city based on preferences from previous cities. Pure rule-based filtering (match cuisine type, price level) is fast and predictable but cannot capture nuance. Pure LLM (send all memories to Gemini, ask for recommendations) is flexible but expensive, slow, and non-deterministic.

**Decision:** Use a two-stage hybrid approach. Stage 1: rule-based candidate generation using `user_preferences` table and Google Places API filtering. Stage 2: Gemini ranks the candidates and generates one-line explanations.

**Consequences:**
- Easier: Predictable candidate generation, bounded API cost, debuggable first stage.
- Harder: Two-stage pipeline is more code than either pure approach. Gemini prompt engineering needed for ranking quality.

### ADR-002: Preference scores in a dedicated table over re-scanning memory_nodes

**Status:** Accepted

**Context:** To generate recommendations, we need to know what cuisine types, place categories, and price levels the user prefers. We could scan all `memory_nodes` on every recommendation request, or pre-compute and store aggregated scores.

**Decision:** Maintain a `user_preferences` table updated incrementally on each memory write. Preference scores use exponential moving average with recency decay.

**Consequences:**
- Easier: Recommendation queries are fast (read 10 rows from `user_preferences` instead of scanning hundreds of `memory_nodes`). Scores are inspectable and debuggable.
- Harder: Must keep `user_preferences` in sync with `memory_nodes`. Backfill script needed for existing data. Delete cascading must also clean up preference scores.

### ADR-003: City-level location columns over exact GPS in metadata jsonb

**Status:** Accepted

**Context:** Cross-city recommendations require filtering memories by city. Storing location data only in the `metadata` jsonb column means every query must use jsonb path operators, which cannot be indexed efficiently.

**Decision:** Add `city`, `country`, `lat`, `lng` as dedicated columns on `memory_nodes`. Round coordinates to 3 decimal places (~111m precision) for privacy.

**Consequences:**
- Easier: Indexed city-based queries. Simple `WHERE city = 'Tokyo'` instead of jsonb path. Standard geo-proximity calculations.
- Harder: Migration required for existing rows. Must populate city/country via reverse geocoding on write (or derive from Places API response). Slight schema complexity increase.

### ADR-004: Memory as Explore sub-view over new bottom tab

**Status:** Accepted

**Context:** Memory timeline needs a home in the navigation. Adding a 6th bottom tab ("Memory") would crowd the nav bar and show a locked/empty tab to free users.

**Decision:** Memory is a sub-view within the Explore tab, accessed via in-view tabs: "Nearby" | "For You" | "Memory".

**Consequences:**
- Easier: No bottom nav changes. Natural grouping of location-aware features. Free users never see a locked tab.
- Harder: Slightly less discoverable for new paid users. More complex state management within ExploreView.
