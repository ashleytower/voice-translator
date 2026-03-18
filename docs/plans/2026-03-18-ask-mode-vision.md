# Ask Mode - Future Vision Doc

**Status:** Planning (not yet in development)
**Depends on:** Explore recommendations wiring (Task B) being shipped first

---

## The Problem

Found in Translation is a pure translator -- everything spoken gets translated. There is no way for the user to ask the app a question like "What should I order?" or "What's good around me?" because that sentence would be translated to the target language and spoken aloud.

The app accumulates rich context about the traveler over time:
- Saved/starred places across cities
- Photos of dishes they liked
- "No onions" and dietary preferences captured from conversations
- Places they had the AI call for reservations
- Ratings and expense tracking
- Cross-city travel history

But there's no surface for that intelligence to come through as personalized answers.

## The Vision

**Ask Mode** is a toggle that switches the voice pipeline from "translate everything" to "answer me using what you know about me."

### User Stories

**Cross-city discovery:**
> User starred a coffee shop in Kyoto. Now in Tokyo. Opens Explore.
> App proactively suggests: "You loved % Arabica in Kyoto -- there's one 3 blocks away."
> User taps it, hits "Directions" -> opens Google Maps with walking directions.

**Conversational recommendations:**
> User toggles Ask Mode. Says: "What's good around me?"
> App responds with voice: "Based on your history, you love ramen and tend to pick budget spots. There's a highly rated ramen place 5 minutes walk -- Ichiran. Want directions?"
> User: "No, I don't want ramen tonight. Something different."
> App: "Got it, no ramen. You also liked that Thai place in Osaka. There's a Thai restaurant nearby with 4.6 stars. Want to try it?"
> User: "Sure, directions."
> App opens Google Maps.

**Negative preference learning:**
> User: "I don't like Italian food."
> App stores negative preference signal (cuisine:italian, score: -1.0).
> Future recommendations never suggest Italian restaurants.
> Next time: "I know you said no Italian -- how about this French bistro instead?"

**Hidden gem discovery:**
> User: "What's off the beaten path around here?"
> App uses Gemini + nearby places + user preferences + low review count filter to find places that match their taste but aren't tourist traps.

### How It Works

```
Normal Mode:  User speaks -> Deepgram STT -> Gemini TRANSLATE -> Cartesia TTS -> speaks translation
Ask Mode:     User speaks -> Deepgram STT -> Gemini ASSISTANT (with full memory context) -> Cartesia TTS -> speaks answer
```

The Gemini prompt in Ask Mode would include:
- Full traveler context (assembled from memories)
- Current location (lat/lng)
- Nearby places from Google Maps
- User preferences with scores
- Negative preferences
- Recent conversation history

### UI

- Toggle button in the chat header or bottom nav (mic icon changes to a "?" or brain icon)
- When in Ask Mode, the orb color/animation changes to indicate "assistant mode"
- Responses appear in chat as assistant messages (not translation bubbles)
- If the response includes a place, it renders as a tappable card with photo + directions link
- "Directions" button deep-links to Google Maps: `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG`

### New Capabilities Needed

1. **Ask Mode toggle** -- UI switch + state in page.tsx
2. **Assistant Gemini prompt** -- separate prompt path that skips translation, includes full memory context + nearby places
3. **Negative preference signals** -- store dislikes (not just likes) in user_preferences with negative scores
4. **Place card in chat** -- render a mini PlaceCard inside chat bubbles when the assistant suggests a location
5. **Conversational memory** -- remember within a session what was already suggested/rejected

### Database Changes

- `user_preferences.score` already supports negative values (numeric type, no constraint)
- No schema changes needed -- just need to emit negative signals

### What We Ship First (Phase B - current sprint)

Before Ask Mode, we're shipping:
1. Recommendations wired into Explore view (For You + Familiar Spots)
2. Google Maps directions deep-links on all place cards
3. This validates the recommendation engine end-to-end with real users

### Implementation Phases (future)

**Phase A1: Negative preferences**
- Add negative signal extraction ("I don't like X" -> store with value -1.0)
- Filter recommendations to exclude negative-scored categories
- Small change, high impact

**Phase A2: Ask Mode toggle + assistant prompt**
- Add toggle UI
- Build assistant prompt with full memory context
- Route voice pipeline through assistant path when toggled

**Phase A3: Place cards in chat**
- When assistant suggests a place, render it as a tappable card
- Include photo, rating, directions link
- Tapping opens Explore view centered on that place

**Phase A4: Conversational context**
- Track what was suggested/rejected in current session
- "You already said no to X" awareness
- Progressive narrowing of suggestions

---

## Open Questions

1. Should Ask Mode work via text chat too, or voice only?
2. Should the app auto-detect intent ("What should I order?" is clearly a question, not a translation request)?
3. How do we handle the cold start -- new users with no memories get generic recommendations?
4. Should Ask Mode be a paid-only feature?
