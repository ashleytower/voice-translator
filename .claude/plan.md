# Voice Translator - Fix All Issues Plan

## Summary
Fix mic functionality by adding system prompt to Edge Function, install UI components, and create onboarding flow.

## Tasks

### 1. Fix System Prompt (Server-Side)
**File:** `supabase/functions/gemini-live-proxy/index.ts`

The `getSystemPrompt()` function in page.tsx is never used because gemini-live-react doesn't accept a systemPrompt parameter. System prompts must be configured in the WebSocket proxy.

**Changes:**
- Add system instruction to the Gemini session setup in the Edge Function
- Include the universal translator prompt with currency conversion context
- Redeploy the Edge Function

### 2. Install UI Components
**Commands:**
```bash
npx shadcn@latest init
npx shadcn@latest add button card dialog
```

**Note:** Aceternity UI requires shadcn as a base. We'll install shadcn first, then add Aceternity components as needed for the onboarding flow.

### 3. Create Onboarding Flow
**New File:** `app/components/Onboarding.tsx`

**Features:**
- Welcome screen explaining app capabilities
- Permission request cards (microphone, camera)
- Glassmorphism styling matching existing theme
- Dismissable with localStorage persistence

**Flow:**
1. Check if user has seen onboarding (localStorage)
2. If not, show modal overlay with:
   - App title and description
   - Microphone permission explanation
   - Camera permission explanation
   - "Get Started" button
3. On button click, trigger permissions and close

### 4. Clean Up Unused Code
**File:** `app/page.tsx`

- Remove the unused `getSystemPrompt()` function (now handled server-side)
- Import and integrate Onboarding component

### 5. Test Complete Flow
- Verify Edge Function deploys with system prompt
- Test onboarding appears on first visit
- Test permissions are requested correctly
- Test mic and camera work after permissions granted

## File Changes Summary
| File | Action |
|------|--------|
| supabase/functions/gemini-live-proxy/index.ts | Modify - add system prompt |
| app/components/Onboarding.tsx | Create - onboarding modal |
| app/page.tsx | Modify - integrate onboarding, remove unused code |
| package.json | Modify - add shadcn dependencies |
| components.json | Create - shadcn config |
| tailwind.config.js | Modify - shadcn integration |

## Deployment Steps
1. Make code changes
2. `supabase functions deploy gemini-live-proxy`
3. `git add . && git commit && git push` (triggers Vercel deploy)
