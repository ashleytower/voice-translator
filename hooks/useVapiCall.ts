import { useState, useRef, useCallback, useEffect } from 'react';
import { CallRequest, CallStatus, CallTranscript, CallResult } from '@/types';

export interface UseVapiCallReturn {
  status: CallStatus;
  transcript: CallTranscript[];
  duration: number;
  result: CallResult | null;
  error: string | null;
  startCall: (request: CallRequest) => Promise<void>;
  endCall: () => Promise<void>;
  resetCall: () => void;
}

// Map VAPI call statuses to our internal CallStatus type
function mapVapiStatus(vapiStatus: string): CallStatus | null {
  switch (vapiStatus) {
    case 'queued':
    case 'ringing':
      return 'ringing';
    case 'in-progress':
    case 'forwarding':
      return 'in-progress';
    case 'ended':
    case 'completed':
      return 'ended';
    case 'failed':
    case 'no-answer':
    case 'busy':
    case 'canceled':
      return 'error';
    default:
      return null;
  }
}

function parseVapiMessages(messages: unknown[]): CallTranscript[] {
  return (messages as { role: string; message?: string; content?: string; time?: number }[])
    .filter((m) => m.role === 'bot' || m.role === 'user')
    .map((m) => ({
      role: m.role === 'bot' ? ('assistant' as const) : ('user' as const),
      text: m.message ?? m.content ?? '',
      timestamp: new Date(m.time ?? Date.now()).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));
}

export function useVapiCall(): UseVapiCallReturn {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [transcript, setTranscript] = useState<CallTranscript[]>([]);
  const [duration, setDuration] = useState(0);
  const [result, setResult] = useState<CallResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const callIdRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (durationIntervalRef.current !== null) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const pollCallStatus = useCallback(async (callId: string) => {
    try {
      const res = await fetch(`/api/call?callId=${encodeURIComponent(callId)}`);
      if (!res.ok) return;

      const data = await res.json();
      const mappedStatus = mapVapiStatus(data.status);

      if (mappedStatus !== null) {
        setStatus(mappedStatus);
      }

      const parsedMessages = parseVapiMessages(data.messages ?? []);

      if (mappedStatus === 'ended') {
        cleanup();
        setResult({
          status: 'success',
          duration: Math.round((Date.now() - startTimeRef.current) / 1000),
          summary: data.summary || 'Call completed',
          transcript: parsedMessages,
        });
      } else if (mappedStatus === 'error') {
        cleanup();
        setError(data.endedReason || 'Call failed');
      }

      if (parsedMessages.length > 0) {
        setTranscript(parsedMessages);
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
    callIdRef.current = null;

    try {
      const res = await fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'Failed to start call');
      }

      const { callId } = (await res.json()) as { callId: string };
      callIdRef.current = callId;
      startTimeRef.current = Date.now();
      setStatus('ringing');

      // Duration counter ticks every second
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      // Poll VAPI for call status every 2 seconds
      pollIntervalRef.current = setInterval(() => {
        pollCallStatus(callId);
      }, 2000);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [pollCallStatus]);

  const endCall = useCallback(async () => {
    const callId = callIdRef.current;
    cleanup();

    if (callId) {
      try {
        await fetch(`/api/call?callId=${encodeURIComponent(callId)}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('[useVapiCall] End call error:', err);
      }
    }

    setStatus('ended');
    callIdRef.current = null;
  }, [cleanup]);

  const resetCall = useCallback(() => {
    cleanup();
    setStatus('idle');
    setTranscript([]);
    setDuration(0);
    setResult(null);
    setError(null);
    callIdRef.current = null;
  }, [cleanup]);

  return { status, transcript, duration, result, error, startCall, endCall, resetCall };
}
