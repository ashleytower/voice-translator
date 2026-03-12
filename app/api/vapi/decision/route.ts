import { NextRequest, NextResponse } from 'next/server';
import { pendingDecisions } from '@/lib/vapi-state';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { callId, decision } = body as { callId?: string; decision?: string };

  if (!callId || !UUID_REGEX.test(callId)) {
    return NextResponse.json({ error: 'Invalid or missing callId' }, { status: 400 });
  }

  if (typeof decision !== 'string' || !decision.trim()) {
    return NextResponse.json({ error: 'decision must be a non-empty string' }, { status: 400 });
  }

  const pending = pendingDecisions.get(callId);
  if (!pending) {
    // No pending decision — return 200 so the caller doesn't error
    return NextResponse.json({ success: false, reason: 'No pending decision for this callId' });
  }

  // Resolve the decision — the webhook poll loop picks this up
  pending.resolved = true;
  pending.answer = decision.trim();

  return NextResponse.json({ success: true });
}
