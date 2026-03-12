export const runtime = 'edge';
export const preferredRegion = 'iad1';

import { NextRequest, NextResponse } from 'next/server';

// ── In-memory state (shared across concurrent requests in the same Edge isolate) ──

interface TranscriptEntry {
  role: string;
  text: string;
  timestamp: string;
}

interface PendingDecision {
  question: string;
  options?: string[];
  resolved: boolean;
  answer?: string;
}

const callTranscripts = new Map<string, TranscriptEntry[]>();
const pendingDecisions = new Map<string, PendingDecision>();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Route dispatcher ──

export async function POST(
  request: NextRequest,
  { params }: { params: { action: string[] } }
) {
  const action = params.action[0];
  switch (action) {
    case 'webhook':
      return handleWebhook(request);
    case 'decision':
      return handleDecision(request);
    default:
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { action: string[] } }
) {
  const action = params.action[0];
  switch (action) {
    case 'transcript':
      return handleTranscript(request);
    default:
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

// ── Webhook: receives VAPI server events in real time ──

async function handleWebhook(request: NextRequest): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const message = body.message as Record<string, unknown> | undefined;
  if (!message) return new Response('OK');

  const type = message.type as string | undefined;
  const callId = (message.call as Record<string, unknown> | undefined)?.id as string | undefined;
  if (!callId) return new Response('OK');

  switch (type) {
    case 'transcript': {
      if (message.transcriptType === 'final' && message.transcript) {
        const entry: TranscriptEntry = {
          role: (message.role as string) ?? 'unknown',
          text: message.transcript as string,
          timestamp: new Date().toISOString(),
        };
        const existing = callTranscripts.get(callId) ?? [];
        callTranscripts.set(callId, [...existing, entry]);
      }
      break;
    }

    case 'conversation-update': {
      const conversation = message.conversation as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(conversation)) {
        const now = new Date().toISOString();
        const entries: TranscriptEntry[] = conversation
          .filter((m) => m.role === 'assistant' || m.role === 'user' || m.role === 'bot')
          .map((m) => ({
            role: m.role as string,
            text: (m.content ?? m.message ?? '') as string,
            timestamp: now,
          }));
        if (entries.length > 0) {
          callTranscripts.set(callId, entries);
        }
      }
      break;
    }

    case 'tool-calls': {
      const toolCallList = message.toolCallList as Array<Record<string, unknown>> | undefined;
      if (!Array.isArray(toolCallList)) return new Response('OK');

      const toolCall = toolCallList.find(
        (tc) => (tc.function as Record<string, unknown> | undefined)?.name === 'check_with_user'
      );

      if (!toolCall) {
        return NextResponse.json({ results: [] });
      }

      const toolCallId = toolCall.id as string;
      const fnArgs = (toolCall.function as Record<string, unknown>)?.arguments as
        | Record<string, unknown>
        | string
        | undefined;

      let parsedArgs: { question?: string; options?: string[] } = {};
      if (typeof fnArgs === 'string') {
        try { parsedArgs = JSON.parse(fnArgs); } catch { /* empty */ }
      } else if (typeof fnArgs === 'object' && fnArgs !== null) {
        parsedArgs = fnArgs as { question?: string; options?: string[] };
      }

      const question = parsedArgs.question ?? 'What would you like to do?';
      const options = parsedArgs.options;

      // Store pending decision — client sees this via /api/vapi/transcript
      pendingDecisions.set(callId, { question, options, resolved: false });

      // Add to transcript so question appears in chat
      const existing = callTranscripts.get(callId) ?? [];
      callTranscripts.set(callId, [
        ...existing,
        {
          role: 'system',
          text: `[Decision needed] ${question}${options ? ` Options: ${options.join(', ')}` : ''}`,
          timestamp: new Date().toISOString(),
        },
      ]);

      // Hold response for up to 20s waiting for the user's decision.
      // Edge Runtime allows 25s; we leave 5s margin for overhead.
      const TIMEOUT_MS = 20_000;
      const POLL_MS = 300;
      const deadline = Date.now() + TIMEOUT_MS;

      const answer = await new Promise<string>((resolve) => {
        const poll = () => {
          const decision = pendingDecisions.get(callId);
          if (decision?.resolved && decision.answer) {
            pendingDecisions.delete(callId);
            resolve(decision.answer);
            return;
          }
          if (Date.now() >= deadline) {
            pendingDecisions.delete(callId);
            resolve('The client did not respond yet. Politely ask the person to hold a bit longer.');
            return;
          }
          setTimeout(poll, POLL_MS);
        };
        poll();
      });

      return NextResponse.json({
        results: [{ toolCallId, result: answer }],
      });
    }

    case 'end-of-call-report': {
      pendingDecisions.delete(callId);
      break;
    }

    default:
      break;
  }

  return new Response('OK');
}

// ── Transcript: client polls for real-time transcript + pending decisions ──

async function handleTranscript(request: NextRequest): Promise<Response> {
  const callId = request.nextUrl.searchParams.get('callId');
  if (!callId || !UUID_REGEX.test(callId)) {
    return NextResponse.json({ error: 'Invalid callId' }, { status: 400 });
  }

  const pending = pendingDecisions.get(callId);

  return NextResponse.json({
    callId,
    transcript: callTranscripts.get(callId) ?? [],
    pendingDecision: pending
      ? { question: pending.question, options: pending.options ?? null, resolved: pending.resolved }
      : null,
  });
}

// ── Decision: user sends their answer; resolves the held webhook response ──

async function handleDecision(request: NextRequest): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { callId, decision } = body as { callId?: string; decision?: string };
  if (!callId || !UUID_REGEX.test(callId)) {
    return NextResponse.json({ error: 'Invalid callId' }, { status: 400 });
  }
  if (typeof decision !== 'string' || !decision.trim()) {
    return NextResponse.json({ error: 'decision required' }, { status: 400 });
  }

  const pending = pendingDecisions.get(callId);
  if (!pending) {
    return NextResponse.json({ success: false, reason: 'No pending decision' });
  }

  // Resolve — the webhook poll loop in handleWebhook picks this up
  pending.resolved = true;
  pending.answer = decision.trim();

  return NextResponse.json({ success: true });
}
