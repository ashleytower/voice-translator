import { NextRequest, NextResponse } from 'next/server';
import { callTranscripts, pendingDecisions } from '@/lib/vapi-state';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const callId = request.nextUrl.searchParams.get('callId');

  if (!callId || !UUID_REGEX.test(callId)) {
    return NextResponse.json({ error: 'Invalid or missing callId' }, { status: 400 });
  }

  const transcript = callTranscripts.get(callId) ?? [];
  const pending = pendingDecisions.get(callId) ?? null;

  return NextResponse.json({
    callId,
    transcript,
    pendingDecision: pending
      ? {
          question: pending.question,
          options: pending.options ?? null,
          resolved: pending.resolved,
        }
      : null,
  });
}
