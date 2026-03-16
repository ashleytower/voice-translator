export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, standardError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/supabase-server';

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateCallId(callId: string | null): callId is string {
  return callId !== null && UUID_REGEX.test(callId);
}

export async function POST(request: NextRequest) {
  const user = await verifyAuth();
  if (!user) {
    return standardError('Unauthorized', 401);
  }

  if (!VAPI_API_KEY || !VAPI_PHONE_NUMBER_ID) {
    return standardError('VAPI not configured', 500);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return standardError('Invalid request body', 400);
  }

  const { phoneNumber, taskDescription, targetLanguage, userName } = body as {
    phoneNumber?: string;
    taskDescription?: string;
    targetLanguage?: string;
    userName?: string;
  };

  if (!phoneNumber || !taskDescription || !targetLanguage) {
    return standardError('phoneNumber, taskDescription, and targetLanguage are required', 400);
  }

  // Only include name context if provided (for reservations etc.)
  const nameContext = userName ? `\nIf they need a name, use: ${userName}.` : '';

  const systemPrompt = `You are making a phone call to a business RIGHT NOW. Speak only in ${targetLanguage}.

Your task: ${taskDescription}${nameContext}

RULES:
- Your FIRST message must greet AND ask your question in one sentence.
- Keep every reply to 1-2 sentences in ${targetLanguage}.
- LISTEN to what they say and respond naturally.
- ONLY do what the task says. If the task is to "check" or "ask about" something, gather the info (price, times, availability) then thank them and say goodbye. Do NOT buy, book, or commit to anything unless the task explicitly says to.
- If they offer to sell or book something, say you need to check with someone first and you'll call back, then end the call politely.
- If you reach voicemail, leave a short message after the beep.
- Never narrate your actions. Never speak in English. Never break character.`;

  // Transient assistant — full config inline, no assistantId + overrides
  const assistant = {
    serverUrl: `${request.nextUrl.origin}/api/vapi/webhook`,
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }],
    },
    voice: {
      provider: '11labs',
      voiceId: 'EXAVITQu4vr4xnSDxMaL',
      model: 'eleven_multilingual_v2',
    },
    transcriber: {
      provider: 'deepgram',
      model: 'nova-3',
      language: 'multi',
    },
    firstMessageMode: 'assistant-speaks-first-with-model-generated-message',
    backgroundSound: 'off',
    backgroundDenoisingEnabled: true,
  };

  try {
    const response = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistant,
        phoneNumberId: VAPI_PHONE_NUMBER_ID,
        customer: {
          number: phoneNumber,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[VAPI] Call creation failed:', response.status, errorText);
      return standardError(`VAPI error (${response.status}): ${errorText}`, response.status);
    }

    const call = await response.json();

    const supabase = createServiceClient();
    await supabase.from('vapi_calls').insert({
      id: call.id,
      user_id: user.id,
      transcript: [],
      updated_at: new Date().toISOString()
    });

    return NextResponse.json({
      callId: call.id,
      status: call.status,
      monitorUrl: call.monitor?.listenUrl || null,
      controlUrl: call.monitor?.controlUrl || null,
    });
  } catch (err) {
    console.error('[VAPI] Network error initiating call:', err);
    return standardError('Failed to reach VAPI', 502);
  }
}

export async function GET(request: NextRequest) {
  const user = await verifyAuth();
  if (!user) {
    return standardError('Unauthorized', 401);
  }

  if (!VAPI_API_KEY) {
    return standardError('VAPI not configured', 500);
  }

  const callId = request.nextUrl.searchParams.get('callId');
  if (!validateCallId(callId)) {
    return standardError('Invalid or missing callId', 400);
  }

  try {
    const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
      headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[VAPI] Get call failed:', errorText);
      return standardError('Failed to get call', response.status);
    }

    return NextResponse.json(await response.json());
  } catch (err) {
    console.error('[VAPI] Network error fetching call:', err);
    return standardError('Failed to reach VAPI', 502);
  }
}

export async function PATCH(request: NextRequest) {
  const user = await verifyAuth();
  if (!user) {
    return standardError('Unauthorized', 401);
  }

  if (!VAPI_API_KEY) {
    return standardError('VAPI not configured', 500);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return standardError('Invalid request body', 400);
  }

  const { callId, message } = body as { callId?: string; message?: string };
  if (!validateCallId(callId ?? null) || !message?.trim()) {
    return standardError('Valid callId and message are required', 400);
  }

  try {
    // Inject a system message into the active call to redirect the AI
    const response = await fetch(`https://api.vapi.ai/call/${callId}/say`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        endCallAfterSpoken: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[VAPI] Say message failed:', response.status, errorText);
      return standardError(`VAPI error (${response.status}): ${errorText}`, response.status);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[VAPI] Network error sending message:', err);
    return standardError('Failed to reach VAPI', 502);
  }
}

export async function DELETE(request: NextRequest) {
  const user = await verifyAuth();
  if (!user) {
    return standardError('Unauthorized', 401);
  }

  if (!VAPI_API_KEY) {
    return standardError('VAPI not configured', 500);
  }

  const callId = request.nextUrl.searchParams.get('callId');
  if (!validateCallId(callId)) {
    return standardError('Invalid or missing callId', 400);
  }

  try {
    // VAPI ends calls via POST to /call/{id}/hang, not DELETE
    const response = await fetch(`https://api.vapi.ai/call/${callId}/hang`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` },
    });
    return NextResponse.json({ success: response.ok });
  } catch (err) {
    console.error('[VAPI] Network error ending call:', err);
    return NextResponse.json({ success: false }, { status: 502 });
  }
}
