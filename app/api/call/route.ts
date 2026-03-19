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

  const { phoneNumber, taskDescription, targetLanguage, userName, userPhone, userCity } = body as {
    phoneNumber?: string;
    taskDescription?: string;
    targetLanguage?: string;
    userName?: string;
    userPhone?: string;
    userCity?: string;
  };

  if (!phoneNumber || !taskDescription || !targetLanguage) {
    return NextResponse.json(
      { error: 'phoneNumber, taskDescription, and targetLanguage are required' },
      { status: 400 }
    );
  }

  // Only include name context if provided (for reservations etc.)
  const nameContext = userName ? `\nIf they need a name, use: ${userName}.` : '';
  const phoneContext = userPhone ? `\nThe client's callback number is ${userPhone}.` : '';
  const cityContext = userCity ? `\nThe client is based in ${userCity}.` : '';

  const systemPrompt = `You are making a phone call to a business RIGHT NOW on behalf of a client. Speak only in ${targetLanguage}.

Your task: ${taskDescription}${nameContext}${phoneContext}${cityContext}

LISTENING RULES:
- WAIT for the person to finish speaking before you respond. Do not interrupt.
- After you ask a question, STAY SILENT and wait for their full answer.
- If you hear background noise, wait at least 3 seconds of silence before assuming they are done.
- Repeat back key details you hear to confirm understanding (times, dates, prices).

FLOW:
1. Greet the business and state your request in ${targetLanguage}.
2. LISTEN. Let the business respond fully. Do NOT interrupt.
3. When the business provides information, options, times, prices, or asks a question:
   -> Call check_with_user with EXACTLY what the business said. Do NOT invent or assume anything.
4. Wait for the check_with_user result. The business hears "One moment please" automatically.
5. Relay the client's decision to the business naturally in ${targetLanguage}.
6. Repeat steps 2-5 until the task is complete.
7. Thank them and say goodbye ONLY after the task is fully resolved.

CRITICAL:
- NEVER call check_with_user before the business has spoken at least once with real information.
- NEVER invent, assume, or hallucinate options. Only relay EXACTLY what the business says.
- NEVER end the call when alternatives are offered. ALWAYS check with user first.
- If unsure whether to check with user, CHECK. Err on the side of checking too much.

DECISION RULES:
- When the business offers alternatives, options, or asks you to choose — you MUST call the check_with_user tool BEFORE accepting or declining anything.
- When calling check_with_user, politely tell the business "One moment please, let me check" in ${targetLanguage}, then call the tool.
- After getting the user's answer from check_with_user, relay it to the business naturally.
- NEVER accept, decline, or commit to anything without checking with the user first via check_with_user.
- NEVER hang up or end the call when alternatives are offered. Always check with the user.

CONVERSATION RULES:
- Your FIRST message must greet AND ask your question in one sentence in ${targetLanguage}.
- Keep every reply to 1-2 sentences in ${targetLanguage}.
- If you reach voicemail, leave a short message after the beep.
- Once the task is complete (reservation confirmed, info gathered, etc.), thank them and say goodbye.
- Never narrate your actions. Never speak in English. Never break character.`;

  // Transient assistant — full config inline, no assistantId + overrides
  const assistant = {
    serverUrl: 'https://foundintranslation.app/api/vapi/webhook',
    model: {
      provider: 'openai',
      model: 'gpt-4.1-mini',
      messages: [{ role: 'system', content: systemPrompt }],
    },
    tools: [
      {
        type: 'function' as const,
        async: false,
        function: {
          name: 'check_with_user',
          description: 'Ask the client (user) a question and wait for their decision. ONLY call this AFTER the business has spoken at least once and provided real information (times, prices, options, questions). NEVER call before hearing from the business. Use this EVERY TIME the business offers alternatives, asks a question requiring client decision, or provides options to choose from.',
          parameters: {
            type: 'object',
            properties: {
              question: {
                type: 'string',
                description: 'The question to ask the user, in English. Summarize what the business said and what options are available.',
              },
              options: {
                type: 'array',
                items: { type: 'string' },
                description: 'Available options to present to the user, if applicable.',
              },
            },
            required: ['question'],
          },
        },
        messages: [
          {
            type: 'request-start',
            content: 'One moment please, let me check with my client.',
          },
          {
            type: 'request-response-delayed',
            content: 'Still checking, thank you for your patience.',
            timingMilliseconds: 10000,
          },
          {
            type: 'request-failed',
            content: 'I apologize, I was unable to reach my client. Could you repeat that?',
          },
        ],
        server: {
          url: 'https://foundintranslation.app/api/vapi/webhook',
          timeoutSeconds: 25,
        },
      },
    ],
    voice: {
      provider: '11labs',
      voiceId: 'EXAVITQu4vr4xnSDxMaL',
      model: 'eleven_multilingual_v2',
    },
    transcriber: {
      provider: 'deepgram',
      model: 'nova-3',
      language: 'multi',
      endpointing: 800,
    },
    firstMessageMode: 'assistant-speaks-first-with-model-generated-message',
    backgroundSound: 'off',
    backgroundDenoisingEnabled: true,
    silenceTimeoutSeconds: 30,
    backchannelingEnabled: false,
    startSpeakingPlan: {
      waitSeconds: 1.2,
      smartEndpointingEnabled: true,
      transcriptionEndpointingPlan: {
        onPunctuationSeconds: 1.5,
        onNoPunctuationSeconds: 3.0,
        onNumberSeconds: 2.0,
      },
    },
    stopSpeakingPlan: {
      numWords: 2,
      voiceSeconds: 0.2,
      backoffSeconds: 2.0,
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
