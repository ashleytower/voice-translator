export const runtime = 'edge';
export const preferredRegion = 'iad1';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

// ── Types ──

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
  const supabase = createServiceClient();
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

        const { data } = await supabase.from('vapi_calls').select('transcript').eq('id', callId).single();
        const existing = (data?.transcript as TranscriptEntry[]) ?? [];

        await supabase.from('vapi_calls').upsert({
          id: callId,
          transcript: [...existing, entry],
          updated_at: new Date().toISOString()
        });
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
           await supabase.from('vapi_calls').upsert({
            id: callId,
            transcript: entries,
            updated_at: new Date().toISOString()
          });
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

      const decision: PendingDecision = { question, options, resolved: false };

      const { data } = await supabase.from('vapi_calls').select('transcript').eq('id', callId).single();
      const existing = (data?.transcript as TranscriptEntry[]) ?? [];

      await supabase.from('vapi_calls').upsert({
        id: callId,
        pending_decision: decision,
        transcript: [
          ...existing,
          {
            role: 'system',
            text: `[Decision needed] ${question}${options ? ` Options: ${options.join(', ')}` : ''}`,
            timestamp: new Date().toISOString(),
          },
        ],
        updated_at: new Date().toISOString()
      });

      // Hold response for up to 20s waiting for the user's decision.
      const TIMEOUT_MS = 20_000;
      const POLL_MS = 1000;
      const deadline = Date.now() + TIMEOUT_MS;

      const answer = await new Promise<string>((resolve) => {
        const poll = async () => {
          const { data: pollData } = await supabase.from('vapi_calls').select('pending_decision').eq('id', callId).single();
          const currentDecision = pollData?.pending_decision as PendingDecision | null;

          if (currentDecision?.resolved && currentDecision.answer) {
            await supabase.from('vapi_calls').update({ pending_decision: null }).eq('id', callId);
            resolve(currentDecision.answer);
            return;
          }
          if (Date.now() >= deadline) {
            await supabase.from('vapi_calls').update({ pending_decision: null }).eq('id', callId);
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
       await supabase.from('vapi_calls').update({ pending_decision: null }).eq('id', callId);
      break;
    }

    default:
      break;
  }

  return new Response('OK');
}

// ── Transcript: client polls for real-time transcript + pending decisions ──

async function handleTranscript(request: NextRequest): Promise<Response> {
  const supabase = createServiceClient();
  const callId = request.nextUrl.searchParams.get('callId');
  if (!callId || !UUID_REGEX.test(callId)) {
    return NextResponse.json({ error: 'Invalid callId' }, { status: 400 });
  }

  const { data } = await supabase.from('vapi_calls').select('transcript, pending_decision').eq('id', callId).single();

  return NextResponse.json({
    callId,
    transcript: data?.transcript ?? [],
    pendingDecision: data?.pending_decision ?? null,
  });
}

// ── Decision: user sends their answer; resolves the held webhook response ──

async function handleDecision(request: NextRequest): Promise<Response> {
  const supabase = createServiceClient();
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

  const { data } = await supabase.from('vapi_calls').select('pending_decision').eq('id', callId).single();
  const pending = data?.pending_decision as PendingDecision | null;

  if (!pending) {
    return NextResponse.json({ success: false, reason: 'No pending decision' });
  }

  pending.resolved = true;
  pending.answer = decision.trim();

  await supabase.from('vapi_calls').update({ pending_decision: pending }).eq('id', callId);

  return NextResponse.json({ success: true });
}
