export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID;
const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateCallId(callId: string | null): callId is string {
  return callId !== null && UUID_REGEX.test(callId);
}

export async function POST(request: NextRequest) {
  if (!VAPI_API_KEY || !VAPI_PHONE_NUMBER_ID || !VAPI_ASSISTANT_ID) {
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

  const { phoneNumber, taskDescription, targetLanguage, userName, partySize, date, time, specialRequests } = body as {
    phoneNumber?: string;
    taskDescription?: string;
    targetLanguage?: string;
    userName?: string;
    partySize?: number;
    date?: string;
    time?: string;
    specialRequests?: string;
  };

  if (!phoneNumber || !taskDescription || !targetLanguage) {
    return NextResponse.json(
      { error: 'phoneNumber, taskDescription, and targetLanguage are required' },
      { status: 400 }
    );
  }

  const name = userName || 'a traveler';

  const systemPrompt = [
    'You are ALREADY connected to a business on the phone. The call is live. You are the CALLER.',
    'Do NOT ask for a phone number, restaurant name, or any other details. You have everything you need.',
    '',
    `Your task: ${taskDescription}`,
    `Speak in: ${targetLanguage}`,
    `Name for booking: ${name}`,
    '',
    'Wait for the other person to speak first. Once they greet you or you hear their voice, respond naturally.',
    '',
    `When a live person answers, greet them and state your request in ${targetLanguage}. One greeting plus one request sentence.`,
    '',
    'VOICEMAIL: If you hear a recorded greeting followed by a beep, leave a brief message:',
    `"Hello, my name is ${name}. ${taskDescription}. Please call me back. Thank you." Then call check_with_user to notify the user.`,
    '',
    'PHONE MENU: If you hear "press 1 for..." options, pick the one closest to your task. If on hold, wait patiently.',
    `If on hold over 60 seconds, call check_with_user to ask if the user wants to keep waiting.`,
    '',
    'RULES:',
    `- ALWAYS speak in ${targetLanguage}. Never switch to English unless the target language is English.`,
    '- Be brief. Max 1-2 sentences per turn.',
    '- NEVER mention a client or say on behalf of anyone. You are the customer.',
    `- If the business offers an alternative or asks a question you cannot answer: say something natural like "hold on one second, let me check" in ${targetLanguage}, then IMMEDIATELY call check_with_user. Never decide yourself.`,
    `- After check_with_user returns the answer, relay it naturally in ${targetLanguage}.`,
    '- Never repeat your original request after being offered an alternative.',
    '- Once confirmed, thank them and wrap up.',
  ].join('\n');

  const assistantOverrides = {
    model: {
      provider: 'anthropic' as const,
      model: 'claude-3-5-haiku-20241022',
      messages: [{ role: 'system' as const, content: systemPrompt }],
      tools: [
        {
          type: 'function' as const,
          async: false,
          function: {
            name: 'check_with_user',
            description: 'Pause and check with the real person for their decision. Use this IMMEDIATELY when the business asks a question, offers an alternative, or needs any decision.',
            parameters: {
              type: 'object' as const,
              required: ['question'],
              properties: {
                question: {
                  type: 'string' as const,
                  description: 'The question or choice to present to the user. Always write this in English so the user can read it.',
                },
                options: {
                  type: 'array' as const,
                  items: { type: 'string' as const },
                  description: 'Optional list of choices in English.',
                },
              },
            },
          },
        },
      ],
    },
    firstMessageMode: 'assistant-waits-for-user' as const,
    voice: {
      provider: '11labs' as const,
      voiceId: 'ErXwobaYiN019PkySvjV',
      model: 'eleven_multilingual_v2' as const,
    },
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
        assistantId: VAPI_ASSISTANT_ID,
        assistantOverrides,
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
