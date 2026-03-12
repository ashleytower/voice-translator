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
