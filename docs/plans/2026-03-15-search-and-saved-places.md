# Search Mode + Saved Places Implementation Plan

**Goal:** Add standalone search (search without selecting a category first) and saved/starred places that persist on the map.

**Architecture:** Decouple ExploreView visibility from category selection. Add a `useSavedPlaces` hook backed by localStorage. Render saved places as distinct star markers on the map.

**Tech Stack:** React hooks, localStorage, @vis.gl/react-google-maps AdvancedMarker, Vitest

---

## Feature 1: Standalone Search Mode

### Current behavior
- ExploreView is visible only when `exploreCategory !== null`
- User must pick a category from FAB before seeing the map/search bar

### Target behavior
- FAB speed dial gets a "Search" button (magnifying glass icon)
- Tapping "Search" opens ExploreView with no category selected, search bar focused
- User can type any query immediately
- Category buttons still work as before

### Changes required

**page.tsx:**
- Add `showExplore` boolean state (decouple from `exploreCategory`)
- `ExploreView visible={showExplore}` instead of `visible={exploreCategory !== null}`
- FabSpeedDial gets `onSearchSelect` callback
- `handleExploreBack` resets both states

**FabSpeedDial.tsx:**
- Add `onSearchSelect?: () => void` prop
- Add "Search" button at top of speed dial (magnifying glass, neutral gray color)

**ExploreView.tsx:**
- Handle `category === null` as "search mode" -- show search bar, hide category pill
- Auto-focus search input when opened in search mode

---

## Feature 2: Saved/Starred Places

### Target behavior
- Each PlaceCard has a star/bookmark button
- Tapping it saves the place to localStorage
- Saved places appear as star markers on the map (gold color)
- Saved places persist across sessions
- Stars visible regardless of current category or search

### Changes required

**hooks/useSavedPlaces.ts:**
- `savedPlaces: NearbyPlace[]` -- all saved places
- `toggleSave(place: NearbyPlace): void` -- add or remove
- `isSaved(placeId: string): boolean` -- check status
- Backed by localStorage key `'fit-saved-places'`

**PlaceCard.tsx:**
- Add `isSaved?: boolean` and `onToggleSave?: (place: NearbyPlace) => void` props
- Star button in top-left corner (filled gold when saved, outline when not)

**ExploreView.tsx:**
- Accept `savedPlaces`, `onToggleSave`, `isSaved` props
- Render saved place markers on map with gold star icon
- Pass save props through to PlaceCard

**page.tsx:**
- Wire `useSavedPlaces` hook
- Pass saved state to ExploreView

---

## Task Breakdown

| # | Task | Independent? |
|---|------|-------------|
| 1 | `useSavedPlaces` hook + tests | Yes |
| 2 | FabSpeedDial search button + tests | Yes |
| 3 | PlaceCard star button + tests | Yes (interface only) |
| 4 | ExploreView wiring (search mode + saved markers) | Depends on 1-3 |
| 5 | page.tsx wiring | Depends on 1-4 |
| 6 | Code review + verify | Depends on all |

## Future phases
- Phase 2: Sync saved places to Supabase for cross-device persistence
- Phase 3: "Saved Places" view accessible from bottom nav
- Phase 4: Share saved places as a trip itinerary
