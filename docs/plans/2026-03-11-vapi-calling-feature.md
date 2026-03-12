# VAPI Calling Feature - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add AI voice agent calling to Fluent so users can tap a phone button in chat, enter a number + instructions, and have a VAPI-powered AI make the call in the target language while showing a live translated transcript.

**Architecture:** Next.js API route proxies VAPI calls (keeps API key server-side). A `useVapiCall` hook manages call lifecycle via VAPI's WebSocket events. A `CallSheet` bottom-sheet component surfaces in the chat view with live transcript, call controls, and status.

**Tech Stack:** VAPI API (outbound calls), Next.js API routes, React hooks, Tailwind/Shadcn UI, Vitest

---

## VAPI Account Context

- **Phone number ID:** `8da70eaa-17e4-4e9d-ad53-d070833edd8b` (+14385447557)
- **Existing assistants:** Max - Personal Assistant, Max - MTL Craft Cocktails
- **New assistant needed:** "Fluent - Travel Concierge" (multilingual, Claude Haiku, Deepgram Nova 3, ElevenLabs)

## Existing Codebase Context

- **App entry:** `app/page.tsx` - manages messages, voice state, view routing
- **Input:** `components/chat/InputArea.tsx` - textarea + mic + image buttons
- **Chat:** `components/chat/ChatBubble.tsx` - user/assistant message bubbles
- **Types:** `types.ts` - Message, Language, ViewMode, AppSettings
- **Constants:** `lib/constants.ts` - LANGUAGES array (en, ja, es, fr, ko, zh)
- **Voice hook:** `hooks/useVoiceTranslator.ts` - Deepgram STT + Gemini + Cartesia TTS
- **CSP:** `next.config.js` - Content-Security-Policy headers need VAPI domains added
- **Tests:** Vitest + React Testing Library

---

### Task 1: Create VAPI Travel Concierge Assistant

**No code changes.** Use VAPI MCP tools to create the assistant.

**Step 1: Create the assistant via MCP**

Call `mcp__vapi__create_assistant` with:
- **name:** "Fluent - Travel Concierge"
- **model:** Claude 3.5 Haiku (`claude-3-5-haiku-20241022`) via Anthropic
- **transcriber:** Deepgram Nova 3 with `language: "multi"` (auto-detect)
- **voice:** ElevenLabs `eleven_turbo_v2_5` with a neutral voice
- **system prompt** (dynamic, but base template):

```
You are a helpful travel assistant making a phone call on behalf of a traveler.

TASK: {{task_description}}

LANGUAGE: Speak entirely in {{target_language}}. Only switch to English if the person on the other end switches first.

BEHAVIOR:
- Be polite, efficient, and natural-sounding
- State the request clearly and concisely
- If they can't accommodate, ask about alternatives
- Confirm all details before ending the call
- Thank them and say goodbye politely

CALLER INFO:
- Calling on behalf of: {{user_name}}
- Party size: {{party_size}} (if applicable)
- Date: {{date}} (if applicable)
- Time: {{time}} (if applicable)
- Special requests: {{special_requests}} (if applicable)

When the call is complete, summarize what was agreed upon.
```

**Step 2: Note the assistant ID** for use in the API route.

---

### Task 2: Add Types

**Files:**
- Modify: `types.ts`

**Step 1: Add call-related types to `types.ts`**

```typescript
export interface CallRequest {
  phoneNumber: string;        // E.164 format
  taskDescription: string;    // What the AI should do
  targetLanguage: string;     // Language name (e.g., "Japanese")
  userName?: string;
  partySize?: number;
  date?: string;
  time?: string;
  specialRequests?: string;
}

export interface CallTranscript {
  role: 'assistant' | 'user';  // AI agent or person on phone
  text: string;
  timestamp: string;
}

export type CallStatus = 'idle' | 'starting' | 'ringing' | 'in-progress' | 'ended' | 'error';

export interface CallResult {
  status: 'success' | 'failed';
  duration: number;           // seconds
  summary: string;
  transcript: CallTranscript[];
}
```

---

### Task 3: Create Next.js API Route

**Files:**
- Create: `app/api/call/route.ts`

**Step 1: Write the API route**

This route:
1. Accepts POST with `CallRequest` body
2. Calls VAPI's `/call` endpoint to initiate outbound call
3. Returns `{ callId, listenUrl }` to the client

```typescript
// app/api/call/route.ts
import { NextRequest, NextResponse } from 'next/server';

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID;
const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;

export async function POST(request: NextRequest) {
  if (!VAPI_API_KEY || !VAPI_PHONE_NUMBER_ID || !VAPI_ASSISTANT_ID) {
    return NextResponse.json(
      { error: 'VAPI not configured' },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { phoneNumber, taskDescription, targetLanguage, userName, partySize, date, time, specialRequests } = body;

  if (!phoneNumber || !taskDescription || !targetLanguage) {
    return NextResponse.json(
      { error: 'phoneNumber, taskDescription, and targetLanguage are required' },
      { status: 400 }
    );
  }

  // Build variable overrides for the system prompt template
  const assistantOverrides = {
    variableValues: {
      task_description: taskDescription,
      target_language: targetLanguage,
      user_name: userName || 'a traveler',
      party_size: partySize?.toString() || 'not specified',
      date: date || 'not specified',
      time: time || 'not specified',
      special_requests: specialRequests || 'none',
    },
  };

  const response = await fetch('https://api.vapi.ai/call', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assistantId: VAPI_ASSISTANT_ID,
      assistantOverrides,
      phoneNumberId: VAPI_PHONE_NUMBER_ID,
      customer: {
        number: phoneNumber,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[VAPI] Call creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to initiate call' },
      { status: response.status }
    );
  }

  const call = await response.json();

  return NextResponse.json({
    callId: call.id,
    listenUrl: call.monitor?.listenUrl || null,
    controlUrl: call.monitor?.controlUrl || null,
  });
}
```

**Step 2: Add env vars to `.env.example`**

```bash
# VAPI (AI Voice Calling)
VAPI_API_KEY=your-vapi-api-key-here
VAPI_PHONE_NUMBER_ID=8da70eaa-17e4-4e9d-ad53-d070833edd8b
VAPI_ASSISTANT_ID=your-assistant-id-here
```

---

### Task 4: Create `useVapiCall` Hook

**Files:**
- Create: `hooks/useVapiCall.ts`

**Step 1: Write the hook**

The hook:
1. Calls the API route to start a call
2. Polls VAPI `/call/{id}` for status updates (via API route)
3. Manages call state (status, transcript, duration, result)
4. Provides `startCall`, `endCall`, `injectMessage` functions

```typescript
// hooks/useVapiCall.ts
import { useState, useRef, useCallback } from 'react';
import { CallRequest, CallStatus, CallTranscript, CallResult } from '@/types';

export interface UseVapiCallReturn {
  status: CallStatus;
  transcript: CallTranscript[];
  duration: number;
  result: CallResult | null;
  error: string | null;
  startCall: (request: CallRequest) => Promise<void>;
  endCall: () => Promise<void>;
}

export function useVapiCall(): UseVapiCallReturn {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [transcript, setTranscript] = useState<CallTranscript[]>([]);
  const [duration, setDuration] = useState(0);
  const [result, setResult] = useState<CallResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const callIdRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const pollCallStatus = useCallback(async (callId: string) => {
    try {
      const res = await fetch(`/api/call?callId=${callId}`);
      if (!res.ok) return;

      const data = await res.json();

      // Update status
      if (data.status === 'ringing') setStatus('ringing');
      else if (data.status === 'in-progress') setStatus('in-progress');
      else if (data.status === 'ended' || data.status === 'completed') {
        setStatus('ended');
        cleanup();
        setResult({
          status: 'success',
          duration: Math.round((Date.now() - startTimeRef.current) / 1000),
          summary: data.summary || 'Call completed',
          transcript: data.messages?.filter(
            (m: { role: string }) => m.role === 'assistant' || m.role === 'user'
          ).map((m: { role: string; content: string; time: number }) => ({
            role: m.role as 'assistant' | 'user',
            text: m.content,
            timestamp: new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          })) || [],
        });
      } else if (data.status === 'failed') {
        setStatus('error');
        setError(data.endedReason || 'Call failed');
        cleanup();
      }

      // Update transcript from messages
      if (data.messages) {
        const transcriptEntries: CallTranscript[] = data.messages
          .filter((m: { role: string }) => m.role === 'bot' || m.role === 'user')
          .map((m: { role: string; message: string; time: number; secondsFromStart: number }) => ({
            role: m.role === 'bot' ? 'assistant' as const : 'user' as const,
            text: m.message,
            timestamp: new Date(m.time || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }));
        setTranscript(transcriptEntries);
      }
    } catch (err) {
      console.error('[useVapiCall] Poll error:', err);
    }
  }, [cleanup]);

  const startCall = useCallback(async (request: CallRequest) => {
    setStatus('starting');
    setError(null);
    setTranscript([]);
    setResult(null);
    setDuration(0);

    try {
      const res = await fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start call');
      }

      const { callId } = await res.json();
      callIdRef.current = callId;
      startTimeRef.current = Date.now();
      setStatus('ringing');

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      // Poll for status every 2 seconds
      pollIntervalRef.current = setInterval(() => {
        pollCallStatus(callId);
      }, 2000);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [pollCallStatus]);

  const endCall = useCallback(async () => {
    if (!callIdRef.current) return;
    cleanup();

    try {
      await fetch(`/api/call?callId=${callIdRef.current}`, { method: 'DELETE' });
    } catch (err) {
      console.error('[useVapiCall] End call error:', err);
    }

    setStatus('ended');
    callIdRef.current = null;
  }, [cleanup]);

  return { status, transcript, duration, result, error, startCall, endCall };
}
```

**Step 2: Add GET and DELETE to the API route** for polling and ending calls

```typescript
// Add to app/api/call/route.ts

export async function GET(request: NextRequest) {
  const callId = request.nextUrl.searchParams.get('callId');
  if (!callId) {
    return NextResponse.json({ error: 'callId required' }, { status: 400 });
  }

  const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
    headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` },
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'Failed to get call' }, { status: response.status });
  }

  return NextResponse.json(await response.json());
}

export async function DELETE(request: NextRequest) {
  const callId = request.nextUrl.searchParams.get('callId');
  if (!callId) {
    return NextResponse.json({ error: 'callId required' }, { status: 400 });
  }

  const response = await fetch(`https://api.vapi.ai/call/${callId}/hang`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` },
  });

  return NextResponse.json({ success: response.ok });
}
```

---

### Task 5: Create CallSheet Component

**Files:**
- Create: `components/call/CallSheet.tsx`

**Step 1: Build the bottom sheet UI**

Features:
- Slide-up sheet (Radix Dialog or custom) over the chat
- Phone number input + task description textarea + "Call" button (pre-call)
- During call: live transcript, status badge, duration timer, end call button
- After call: result summary, "Done" button that adds summary to chat

The component receives `targetLanguage` from the parent and passes it to the API.

Use existing Shadcn `Sheet` or `Dialog` component pattern. Style with Tailwind matching existing dark theme.

---

### Task 6: Add Phone Button to InputArea

**Files:**
- Modify: `components/chat/InputArea.tsx`

**Step 1: Add phone icon button**

Add a `Phone` icon from lucide-react next to the image picker button. When tapped, it calls `onStartCall()` callback which the parent uses to open the CallSheet.

```tsx
// Add to InputAreaProps:
onStartCall?: () => void;

// Add button next to ImagePlus button:
<Button
  variant="ghost"
  size="icon"
  onClick={onStartCall}
  disabled={isLive}
  className="h-9 w-9 shrink-0 text-muted-foreground"
>
  <Phone className="h-5 w-5" />
</Button>
```

---

### Task 7: Wire Up in page.tsx

**Files:**
- Modify: `app/page.tsx`

**Step 1: Integrate CallSheet and useVapiCall**

- Import `useVapiCall` and `CallSheet`
- Add `showCallSheet` state
- Pass `onStartCall` to `InputArea`
- When call completes, add result summary as a chat message
- Pass `toLang` as the target language for the call

---

### Task 8: Update CSP and Environment

**Files:**
- Modify: `next.config.js` - Add `https://api.vapi.ai` to `connect-src`
- Modify: `.env.example` - Add VAPI env vars

---

### Task 9: Write Tests

**Files:**
- Create: `__tests__/hooks/useVapiCall.test.ts`
- Create: `__tests__/components/CallSheet.test.tsx`

**Step 1: Hook tests**
- Test startCall sets status to 'starting' then 'ringing'
- Test error handling when API returns error
- Test endCall cleans up intervals
- Test transcript updates from poll

**Step 2: Component tests**
- Test CallSheet renders phone number input
- Test call button disabled without phone number
- Test transcript display during call
- Test result display after call

---

### Task 10: Commit and Deploy

**Step 1: Commit all changes**
```bash
git add -A
git commit -m "feat: add VAPI AI calling for multilingual phone calls"
```

**Step 2: Set Vercel env vars**
- `VAPI_API_KEY` (server-side only, not NEXT_PUBLIC)
- `VAPI_PHONE_NUMBER_ID`
- `VAPI_ASSISTANT_ID`

**Step 3: Deploy**
Push to branch, create PR.
