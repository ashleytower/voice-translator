export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateCallId(callId: string | null): callId is string {
  return callId !== null && UUID_REGEX.test(callId);
}

export async function POST(request: NextRequest) {
  if (!VAPI_API_KEY || !VAPI_PHONE_NUMBER_ID) {
    return NextResponse.json(
      { error: 'VAPI not configured' },
      { status: 500 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { phoneNumber, taskDescription, targetLanguage, userName } = body as {
    phoneNumber?: string;
    taskDescription?: string;
    targetLanguage?: string;
    userName?: string;
  };

  if (!phoneNumber || !taskDescription || !targetLanguage) {
    return NextResponse.json(
      { error: 'phoneNumber, taskDescription, and targetLanguage are required' },
      { status: 400 }
    );
  }

  // Only include name context if provided (for reservations etc.)
  const nameContext = userName ? `\nIf they need a name, use: ${userName}.` : '';

  const systemPrompt = `You are on a live phone call with a business RIGHT NOW. You are the caller.

Your request: ${taskDescription}
Language: ${targetLanguage}${nameContext}

Say hello in ${targetLanguage} and ask your question. Be natural and brief, 1-2 sentences per turn. Respond to what the other person says — have a real conversation.

If they ask something you can't answer, say "one moment" in ${targetLanguage} and call check_with_user. If you reach voicemail, leave a short message after the beep.`;

  // Transient assistant — full config inline, no assistantId + overrides
  const assistant = {
    serverUrl: 'https://translator-t2.vercel.app/api/vapi/webhook',
    model: {
      provider: 'anthropic',
      model: 'claude-3-7-sonnet-20250219',
      messages: [{ role: 'system', content: systemPrompt }],
      tools: [
        {
          type: 'function',
          async: false,
          function: {
            name: 'check_with_user',
            description: 'Ask the real user for their decision. Use when the business asks a question you cannot answer.',
            parameters: {
              type: 'object',
              required: ['question'],
              properties: {
                question: {
                  type: 'string',
                  description: 'The question to ask the user, in English.',
                },
                options: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional choices in English.',
                },
              },
            },
          },
        },
      ],
    },
    voice: {
      provider: '11labs',
      voiceId: 'ErXwobaYiN019PkySvjV',
      model: 'eleven_multilingual_v2',
    },
    transcriber: {
      provider: 'deepgram',
      model: 'nova-3',
    },
    firstMessageMode: 'assistant-speaks-first-with-model-generated-message',
    backgroundSound: 'off',
    backgroundDenoisingEnabled: true,
  };

  let response: Response;
  try {
    response = await fetch('https://api.vapi.ai/call', {
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
  } catch (err) {
    console.error('[VAPI] Network error initiating call:', err);
    return NextResponse.json({ error: 'Failed to reach VAPI' }, { status: 502 });
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[VAPI] Call creation failed:', response.status, errorText);
    return NextResponse.json(
      { error: `VAPI error (${response.status}): ${errorText}` },
      { status: response.status }
    );
  }

  const call = await response.json();

  return NextResponse.json({
    callId: call.id,
    status: call.status,
    monitorUrl: call.monitor?.listenUrl || null,
    controlUrl: call.monitor?.controlUrl || null,
  });
}

export async function GET(request: NextRequest) {
  if (!VAPI_API_KEY) {
    return NextResponse.json({ error: 'VAPI not configured' }, { status: 500 });
  }

  const callId = request.nextUrl.searchParams.get('callId');
  if (!validateCallId(callId)) {
    return NextResponse.json({ error: 'Invalid or missing callId' }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(`https://api.vapi.ai/call/${callId}`, {
      headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` },
    });
  } catch (err) {
    console.error('[VAPI] Network error fetching call:', err);
    return NextResponse.json({ error: 'Failed to reach VAPI' }, { status: 502 });
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[VAPI] Get call failed:', errorText);
    return NextResponse.json({ error: 'Failed to get call' }, { status: response.status });
  }

  return NextResponse.json(await response.json());
}

export async function PATCH(request: NextRequest) {
  if (!VAPI_API_KEY) {
    return NextResponse.json({ error: 'VAPI not configured' }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { callId, message } = body as { callId?: string; message?: string };
  if (!validateCallId(callId ?? null) || !message?.trim()) {
    return NextResponse.json({ error: 'Valid callId and message are required' }, { status: 400 });
  }

  let response: Response;
  try {
    // Inject a system message into the active call to redirect the AI
    response = await fetch(`https://api.vapi.ai/call/${callId}/say`, {
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
  } catch (err) {
    console.error('[VAPI] Network error sending message:', err);
    return NextResponse.json({ error: 'Failed to reach VAPI' }, { status: 502 });
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[VAPI] Say message failed:', response.status, errorText);
    return NextResponse.json(
      { error: `VAPI error (${response.status}): ${errorText}` },
      { status: response.status }
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  if (!VAPI_API_KEY) {
    return NextResponse.json({ error: 'VAPI not configured' }, { status: 500 });
  }

  const callId = request.nextUrl.searchParams.get('callId');
  if (!validateCallId(callId)) {
    return NextResponse.json({ error: 'Invalid or missing callId' }, { status: 400 });
  }

  let response: Response;
  try {
    // VAPI ends calls via POST to /call/{id}/hang, not DELETE
    response = await fetch(`https://api.vapi.ai/call/${callId}/hang`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` },
    });
  } catch (err) {
    console.error('[VAPI] Network error ending call:', err);
    return NextResponse.json({ success: false }, { status: 502 });
  }

  return NextResponse.json({ success: response.ok });
}
