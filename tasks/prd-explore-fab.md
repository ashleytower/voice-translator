[PRD]
# PRD: Google Maps Explore with FAB Speed Dial

## Overview

Add a "discover nearby places" feature to the Found in Translation voice-translator app using a Floating Action Button (FAB) Speed Dial pattern. Instead of adding a tab to the already-full bottom nav, a floating compass button sits above the nav bar. Tapping it fans out 5 category buttons (Restaurants, Stations, Konbini, Pharmacy, ATMs). Selecting a category opens a split-screen map view: Google Map top 55%, horizontal photo-first card carousel bottom 45%.

**Problem:** 85% of travelers decide activities after arriving at their destination. In Japan, language barriers make discovery especially painful -- you can't read restaurant signs, don't know where the nearest konbini is, and can't evaluate options from Japanese-only reviews. Currently, travelers juggle Google Maps + Google Translate + TripAdvisor. This feature consolidates discovery into the same app they're already using for translation.

**UX Research Insight:** The app must feel easier than opening Google Maps. Photo-first cards are critical because travelers in Japan can't read Japanese text on listings. The FAB pattern keeps the nav bar clean while making Explore feel like a power feature, not another tab.

**Architecture:** Client-side map rendering via `@vis.gl/react-google-maps` (Google's official React wrapper, 13kB gzipped). Server-side Places API calls from Next.js API routes with field masks for cost control. Geolocation via `navigator.geolocation.watchPosition`. Falls back to Tokyo Station coordinates if permission denied.

**Phase 1 (this PRD):** FAB + map + nearby search + card carousel + category presets
**Phase 2 (future):** Call to Reserve via Vapi, translated reviews via Gemini, directions, "Get Me Back"
**Phase 3 (future):** Voice-powered map queries ("Find me ramen nearby"), context-aware phrasebook
**Phase 4 (future):** Price-level filtering, location-tagged phrases, offline caching

## Goals

- Users can discover nearby places by category without leaving the app
- Photo-first card carousel enables decision-making without reading Japanese
- FAB Speed Dial keeps existing nav bar clean (no new tab)
- Server-side Places API calls minimize client-side API cost exposure
- Geolocation falls back gracefully to Tokyo Station if denied
- Split-screen map + carousel matches proven discovery UX patterns (Apple Maps, Airbnb)

## Quality Gates

These commands must pass for every user story:
- `npm run ci` (runs typecheck + lint + test + build)

For UI stories, also include:
- Verify in browser using dev server (`npm run dev`)

## User Stories

### US-001: Add 'explore' ViewMode and install map library

**Description:** As a developer, I want the `explore` view mode registered in the type system and the Google Maps React library installed so that subsequent stories can build on them.

**Acceptance Criteria:**
- [ ] `ViewMode` type in `types.ts` (line 112) updated to include `'explore'`: `'translate' | 'camera' | 'convert' | 'settings' | 'phrases' | 'explore'`
- [ ] `@vis.gl/react-google-maps` installed as a dependency via `npm install @vis.gl/react-google-maps`
- [ ] `.env.local` updated with placeholder keys: `NEXT_PUBLIC_GOOGLE_MAPS_KEY=your-client-key` and `GOOGLE_MAPS_SERVER_KEY=your-server-key`
- [ ] `.env.example` file created (or updated) with the same placeholder keys for documentation
- [ ] No existing tests break after the type change (the BottomNav and other components should still compile since they reference specific ViewMode values, not exhaustive switches)

### US-002: Create useGeolocation hook

**Description:** As a user, I want the app to know my current location so that nearby place searches are relevant to where I actually am.

**Acceptance Criteria:**
- [ ] New file: `hooks/useGeolocation.ts`
- [ ] Hook returns `{ latitude: number | null, longitude: number | null, error: string | null, loading: boolean }`
- [ ] Uses `navigator.geolocation.watchPosition` for continuous updates with `enableHighAccuracy: true`
- [ ] Falls back to Tokyo Station coordinates (`35.6812, 139.7671`) when permission is denied or geolocation is unavailable, with `error` set to a descriptive message
- [ ] Cleans up watcher on unmount via `navigator.geolocation.clearWatch`
- [ ] New test file: `hooks/__tests__/useGeolocation.test.ts` with tests for: success case, denied permission fallback, unavailable API fallback
- [ ] Tests mock `navigator.geolocation` -- do NOT call the real API

### US-003: Create Places API server route

**Description:** As a developer, I want a server-side API route that proxies Google Places Nearby Search so that the API key stays on the server and field masks control cost.

**Acceptance Criteria:**
- [ ] New file: `app/api/places/nearby/route.ts`
- [ ] Accepts GET requests with query params: `lat`, `lng`, `type` (Google place type string), `radius` (default 1000m)
- [ ] Uses `GOOGLE_MAPS_SERVER_KEY` env var (NOT the public key)
- [ ] Calls Google Places API (New) Nearby Search endpoint: `https://places.googleapis.com/v1/places:searchNearby`
- [ ] Request body includes `includedTypes`, `locationRestriction` (circle with center and radius), and `maxResultCount: 20`
- [ ] Uses field mask header `X-Goog-FieldMask` to request only: `places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours,places.nationalPhoneNumber,places.photos,places.primaryType,places.priceLevel`
- [ ] Returns cleaned JSON array of places with fields: `id, name, address, lat, lng, rating, ratingCount, isOpen, phone, photoRef, type, priceLevel`
- [ ] For photo references, constructs a photo URL using the Places photo endpoint: `https://places.googleapis.com/v1/{photoRef}/media?maxWidthPx=400&key=...` using the server key
- [ ] Returns 400 for missing `lat`/`lng`/`type` params
- [ ] Returns 500 with generic error message (no key leakage) on API failure
- [ ] New test file: `app/api/places/nearby/__tests__/route.test.ts` testing: valid request, missing params, API error handling
- [ ] Tests mock the fetch call to Google -- do NOT call the real API

### US-004: Create useNearbyPlaces hook

**Description:** As a developer, I want a React hook that fetches nearby places by category from our API route so that components can consume place data reactively.

**Acceptance Criteria:**
- [ ] New file: `hooks/useNearbyPlaces.ts`
- [ ] Hook signature: `useNearbyPlaces(lat: number | null, lng: number | null, category: PlaceCategory | null)`
- [ ] New type `PlaceCategory` exported from `types.ts`: `'restaurant' | 'train_station' | 'convenience_store' | 'pharmacy' | 'atm'`
- [ ] New type `NearbyPlace` exported from `types.ts` with fields: `id, name, address, lat, lng, rating, ratingCount, isOpen, phone, photoUrl, type, priceLevel`
- [ ] Hook returns `{ places: NearbyPlace[], loading: boolean, error: string | null }`
- [ ] Fetches from `/api/places/nearby?lat=...&lng=...&type=...&radius=1000`
- [ ] Does NOT fetch when `lat`, `lng`, or `category` is null
- [ ] Caches results per category in a `useRef` map to avoid redundant fetches when switching between categories
- [ ] New test file: `hooks/__tests__/useNearbyPlaces.test.ts` testing: successful fetch, null params skip, error handling, cache hit
- [ ] Tests mock fetch -- do NOT call the real API

### US-005: Create FAB Speed Dial component

**Description:** As a user, I want a floating compass button that expands to show place categories so that I can start exploring without a dedicated tab cluttering the navigation.

**Acceptance Criteria:**
- [ ] New file: `components/explore/FabSpeedDial.tsx`
- [ ] Renders a 56px circular button with warm orange gradient matching the orb: `radial-gradient(circle at 35% 30%, #f8d5a3, #e8956d 40%, #c96a3a 75%, #9e4a20)`
- [ ] Button contains a compass SVG icon (Lucide `Compass` or equivalent inline SVG)
- [ ] Positioned `fixed` at bottom-right, 90px from bottom, 16px from right edge
- [ ] Box shadow: `0 4px 16px rgba(0,0,0,0.4), 0 0 24px rgba(210,120,60,0.3)`
- [ ] On click, compass icon rotates 45 degrees with `cubic-bezier(0.34, 1.56, 0.64, 1)` easing
- [ ] Expands 5 category items vertically upward, each with 44px circle + text label:
  - Restaurants (red `#e85d4a`, utensils icon)
  - Stations (blue `#4A90D9`, train icon)
  - Konbini (green `#48bb78`, store icon)
  - Pharmacy (purple `#9f7aea`, pill icon)
  - ATMs (gold `#ecc94b`, banknote icon)
- [ ] Staggered entrance: 50ms delay between items, 250ms animation duration, spring easing
- [ ] Dimmed backdrop overlay (`rgba(0,0,0,0.4)`) appears behind expanded items, clicking it collapses
- [ ] Props: `onCategorySelect: (category: PlaceCategory) => void`, `visible: boolean`
- [ ] Component is hidden when `visible` is false (when map view is showing or camera mode is active)
- [ ] Uses Tailwind classes where possible, inline styles only for gradients and complex animations
- [ ] `aria-label="Explore nearby places"` on the FAB trigger
- [ ] New test file: `components/explore/__tests__/FabSpeedDial.test.tsx` testing: renders when visible, hidden when not, click expands, category click fires callback, backdrop click collapses

### US-006: Create ExploreView with map and card carousel

**Description:** As a user, I want to see nearby places on a map with a scrollable card carousel below so that I can visually browse and compare options.

**Acceptance Criteria:**
- [ ] New file: `components/explore/ExploreView.tsx`
- [ ] Component is a full-height overlay that slides up from the bottom with `cubic-bezier(0.34, 1.56, 0.64, 1)` transition when `visible` is true
- [ ] Top 55%: Google Map via `<APIProvider>` and `<Map>` from `@vis.gl/react-google-maps`
- [ ] Map uses dark style matching the app aesthetic (use `mapId` with a cloud-styled dark map, or inline `styles` array with dark colors)
- [ ] Shows user location as a blue pulsing dot (`#4A90D9`) with accuracy ring
- [ ] Shows place markers using `<AdvancedMarkerElement>` with colored circles matching the category color
- [ ] Bottom 45%: horizontal scrollable card carousel with `overflow-x: auto` and `snap-x snap-mandatory` scroll snap
- [ ] Each place card is 200px wide with:
  - Photo (100px tall) loaded from the `photoUrl` field, with a colored fallback showing a category emoji if no photo
  - Place name (13px, semibold, white)
  - Distance + price level (11px, dim text)
  - Star rating (11px, gold `#f5c842`)
  - Open/closed badge (green "Open" / red "Closed")
- [ ] Back button (top-left, 32px circle, frosted glass `rgba(0,0,0,0.5)` + `backdrop-blur`) returns to previous view
- [ ] Selected category label (top bar, frosted glass pill) shows which category is active
- [ ] Loading state: skeleton cards while places are fetching
- [ ] Empty state: "No places found nearby" message when results are empty
- [ ] Props: `category: PlaceCategory, lat: number, lng: number, places: NearbyPlace[], loading: boolean, onBack: () => void`
- [ ] New test file: `components/explore/__tests__/ExploreView.test.tsx` testing: renders map container, shows place cards, back button fires callback, loading skeleton, empty state

### US-007: Create PlaceCard component

**Description:** As a user, I want each place card to show me a photo, name, rating, and status at a glance so I can make quick decisions without reading Japanese.

**Acceptance Criteria:**
- [ ] New file: `components/explore/PlaceCard.tsx`
- [ ] Renders a 200px-wide card with 14px border-radius, dark surface background (`#222` / `surface2`)
- [ ] Photo area: 100px tall, `object-cover`, with colored emoji fallback if `photoUrl` is null
- [ ] Info area: 10px padding with:
  - Name: 13px, font-semibold, white text, single-line with `text-ellipsis overflow-hidden`
  - Meta line: 11px, dim text, shows formatted distance (e.g., "0.3 km") and price level (e.g., "$$")
  - Rating line: 11px, gold stars + numeric rating + rating count in parens
  - Open/closed: small pill badge, green bg + "Open" or red bg + "Closed"
- [ ] Phone number shown as a tappable link (`tel:` href) if available -- small phone icon + number
- [ ] Props: `place: NearbyPlace, categoryColor: string`
- [ ] New test file: `components/explore/__tests__/PlaceCard.test.tsx` testing: renders all fields, handles missing photo, handles missing phone, truncates long names

### US-008: Wire explore flow into page.tsx

**Description:** As a user, I want the FAB and explore view connected so that tapping a category shows me nearby places on a map and I can return to my previous view.

**Acceptance Criteria:**
- [ ] In `app/page.tsx`:
  - Import `FabSpeedDial`, `ExploreView`, `useGeolocation`, `useNearbyPlaces`
  - Add state: `exploreCategory: PlaceCategory | null` (null = explore not active)
  - Call `useGeolocation()` to get `lat, lng`
  - Call `useNearbyPlaces(lat, lng, exploreCategory)` to get `places, loading`
  - Render `<FabSpeedDial>` with `visible={viewMode !== 'camera' && exploreCategory === null}` and `onCategorySelect` sets `exploreCategory`
  - Render `<ExploreView>` with `visible={exploreCategory !== null}` and `onBack` sets `exploreCategory` back to null
  - FAB renders OUTSIDE the `renderCurrentView()` switch, at the same level as `<BottomNav>`
  - ExploreView renders as an overlay on top of the current view (not inside the switch)
- [ ] The BottomNav remains visible behind the FAB (FAB has higher z-index)
- [ ] When ExploreView is open, the BottomNav is hidden or covered by the overlay
- [ ] Selecting a different category while ExploreView is open updates the results without closing/reopening
- [ ] No regressions: translate, scan, convert, phrases, settings views all still work identically
- [ ] Test: update existing `app/__tests__/page.test.tsx` (or create if it doesn't exist) to verify FAB renders, category selection shows ExploreView, back button hides it

### US-009: Visual verification and polish

**Description:** As a developer, I want to visually verify the complete explore flow in the browser to catch any layout, animation, or interaction issues.

**Acceptance Criteria:**
- [ ] Run `npm run dev` and open the app in Chrome mobile emulator (iPhone 14 Pro, 393x852)
- [ ] FAB compass button is visible in bottom-right corner, above the nav bar, not overlapping any nav elements
- [ ] Tapping FAB shows 5 category buttons with staggered animation, backdrop dims behind them
- [ ] Tapping backdrop collapses the FAB
- [ ] Tapping "Restaurants" collapses FAB and slides up the map + carousel view
- [ ] Map renders with dark theme, user location dot visible (or Tokyo Station fallback)
- [ ] Place markers appear on the map in the correct category color
- [ ] Card carousel scrolls horizontally with snap behavior
- [ ] Place cards show photos (or emoji fallbacks), names, ratings, open/closed status
- [ ] Back button smoothly transitions back to the previous view
- [ ] FAB reappears after returning from map view
- [ ] No layout shift, no overflow, no z-index conflicts with orb or other elements
- [ ] Works on both mobile viewport and desktop browser window
- [ ] All animations use the spring curve `cubic-bezier(0.34, 1.56, 0.64, 1)` consistently

## Functional Requirements

- FR-1: The FAB must be rendered as a `position: fixed` element, not inside the BottomNav component
- FR-2: The ExploreView must use `@vis.gl/react-google-maps` `<APIProvider>` with `NEXT_PUBLIC_GOOGLE_MAPS_KEY`
- FR-3: All Places API calls must go through the server route `/api/places/nearby` using `GOOGLE_MAPS_SERVER_KEY` -- never expose server key to the client
- FR-4: Photo URLs must be constructed server-side using the server key, returned as full URLs the client can use directly in `<img>` tags
- FR-5: The map must use a dark color scheme consistent with the app's warm dark theme
- FR-6: Geolocation fallback coordinates must be Tokyo Station (`35.6812, 139.7671`)
- FR-7: Place cards must be photo-first (100px photo area) because travelers cannot read Japanese text listings
- FR-8: The FAB must be hidden during camera mode (`viewMode === 'camera'`) to avoid overlapping the camera UI
- FR-9: Category results must be cached client-side per-session to avoid redundant API calls when switching categories
- FR-10: The Google Maps JS SDK loads externally (~200-350kB) and must not be imported into the Next.js bundle -- `@vis.gl/react-google-maps` handles this automatically via script injection

## Non-Goals (Out of Scope)

- **No directions/routing** -- Phase 2
- **No "Call to Reserve" button** -- Phase 2 (phone numbers are shown but not connected to Vapi yet)
- **No translated reviews** -- Phase 2
- **No voice commands for map search** -- Phase 3
- **No "Get Me Back to Hotel" button** -- Phase 2
- **No offline caching** -- Phase 4
- **No price-level filtering UI** -- Phase 4
- **No place detail bottom sheet** -- Phase 2 (cards show summary info only in Phase 1)
- **No search bar or text search** -- future
- **No saved/bookmarked places** -- future

## Technical Considerations

- **API Cost Control:** Places API (New) Nearby Search is Pro tier -- 5,000 free requests/month. Field masks reduce per-request cost. Server-side proxying prevents key exposure. Cache aggressively client-side.
- **Map Loading:** The Maps JS SDK loads ~200-350kB externally. Use `loading="lazy"` on the APIProvider if supported, or only mount the map when explore view is opened.
- **Photo URLs:** Place photos require a separate API call per photo. In Phase 1, construct the URL server-side and pass it to the client. Consider caching photo URLs or using thumbnail sizes (400px max width) to reduce bandwidth.
- **Dark Map Style:** Either use a Cloud-based Map ID with a styled map, or pass an inline `styles` JSON array with dark colors. The inline approach requires no additional Google Cloud Console setup.
- **Type Safety:** All new types (`PlaceCategory`, `NearbyPlace`) go in `types.ts`. The `ViewMode` union gets `'explore'` added. Ensure exhaustive switch patterns in `page.tsx` handle the new mode.
- **Existing API Route Pattern:** Follow the same pattern as `app/api/call/route.ts` and `app/api/price-check/route.ts` for the new places route.
- **Animation Consistency:** All transitions use the spring curve `cubic-bezier(0.34, 1.56, 0.64, 1)` already established in the orb and BottomNav.

## Success Metrics

- FAB is discoverable: users tap it within the first session
- Map loads in under 2 seconds on 4G connection
- Place cards render with photos for >80% of results
- No Places API key exposed in client-side network requests
- All 9 user stories pass `npm run ci` independently
- Zero regressions in existing translate/scan/convert/phrases functionality

## Open Questions

- Should the FAB pulse or glow on first app launch to draw attention? (Onboarding hint)
- Should we add a "Search this area" button when the user pans the map?
- In Phase 2, should tapping a place card open a bottom sheet or navigate to a detail page?
- Should category selection persist across app sessions, or always reset to null?
[/PRD]
