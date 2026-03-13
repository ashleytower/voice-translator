import { useState, useRef, useCallback, useEffect } from 'react';
import { CallRequest, CallStatus, CallTranscript, CallResult } from '@/types';

export interface UseVapiCallReturn {
  status: CallStatus;
  transcript: CallTranscript[];
  duration: number;
  result: CallResult | null;
  error: string | null;
  pendingDecision: { question: string; options: string[] | null } | null;
  startCall: (request: CallRequest) => Promise<void>;
  endCall: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  sendDecision: (decision: string) => Promise<void>;
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
  const [pendingDecision, setPendingDecision] = useState<{
    question: string;
    options: string[] | null;
  } | null>(null);

  const callIdRef = useRef<string | null>(null);
  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (statusPollRef.current !== null) {
      clearInterval(statusPollRef.current);
      statusPollRef.current = null;
    }
    if (transcriptPollRef.current !== null) {
      clearInterval(transcriptPollRef.current);
      transcriptPollRef.current = null;
    }
    if (durationIntervalRef.current !== null) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (wsRef.current !== null) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Connect to VAPI monitor WebSocket — raw audio only, used as a fallback status signal
  const connectMonitor = useCallback((monitorUrl: string) => {
    try {
      const ws = new WebSocket(monitorUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);

          if (data.type === 'status-update') {
            const mapped = mapVapiStatus(data.status as string);
            if (mapped) setStatus(mapped);
          }

          if (data.type === 'end-of-call-report') {
            setStatus('ended');
            setResult({
              status: 'success',
              duration: Math.round((Date.now() - startTimeRef.current) / 1000),
              summary: (data.summary as string) || 'Call completed',
              transcript: data.messages ? parseVapiMessages(data.messages as unknown[]) : [],
            });
            cleanup();
          }
        } catch (err) {
          console.error('[useVapiCall] WS parse error:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[useVapiCall] WS error:', err);
      };

      ws.onclose = () => {
        wsRef.current = null;
      };
    } catch (err) {
      console.error('[useVapiCall] WS connect error:', err);
    }
  }, [cleanup]);

  // Poll VAPI status endpoint to detect call end/error
  const pollCallStatus = useCallback(async (callId: string) => {
    try {
      const res = await fetch(`/api/call?callId=${encodeURIComponent(callId)}`);
      if (!res.ok) return;

      const data = await res.json() as Record<string, unknown>;
      const mappedStatus = mapVapiStatus(data.status as string);

      if (mappedStatus !== null) {
        setStatus(mappedStatus);
      }

      // Use VAPI call messages as fallback transcript if webhook transcript is empty
      if (mappedStatus === 'in-progress' || mappedStatus === 'ended') {
        const msgs = (
          data.messages ??
          (data.artifact as Record<string, unknown> | undefined)?.messages ??
          []
        ) as unknown[];
        const parsed = parseVapiMessages(msgs);
        if (parsed.length > 0) {
          setTranscript((prev) => parsed.length > prev.length ? parsed : prev);
        }
      }

      if (mappedStatus === 'ended') {
        const msgs = (data.messages ?? (data.artifact as Record<string, unknown> | undefined)?.messages ?? []) as unknown[];
        const parsedMessages = parseVapiMessages(msgs);
        cleanup();
        setResult({
          status: 'success',
          duration: Math.round((Date.now() - startTimeRef.current) / 1000),
          summary: (data.summary ?? (data.artifact as Record<string, unknown> | undefined)?.summary ?? 'Call completed') as string,
          transcript: parsedMessages,
        });
      } else if (mappedStatus === 'error') {
        cleanup();
        setError((data.endedReason as string) || 'Call failed');
      }
    } catch (err) {
      console.error('[useVapiCall] Status poll error:', err);
    }
  }, [cleanup]);

  // Poll our webhook-backed transcript endpoint for real-time transcript and pending decisions
  const pollTranscript = useCallback(async (callId: string) => {
    try {
      const res = await fetch(`/api/vapi/transcript?callId=${encodeURIComponent(callId)}`);
      if (!res.ok) return;

      const data = await res.json() as {
        transcript: Array<{ role: string; text: string; timestamp: string }>;
        pendingDecision: { question: string; options: string[] | null; resolved: boolean } | null;
      };

      if (Array.isArray(data.transcript) && data.transcript.length > 0) {
        const entries: CallTranscript[] = data.transcript.map((e) => ({
          role: e.role === 'assistant' || e.role === 'bot' ? ('assistant' as const) : ('user' as const),
          text: e.text,
          timestamp: new Date(e.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        }));
        setTranscript(entries);
      }

      if (data.pendingDecision && !data.pendingDecision.resolved) {
        setPendingDecision({
          question: data.pendingDecision.question,
          options: data.pendingDecision.options,
        });
      } else {
        setPendingDecision(null);
      }
    } catch (err) {
      console.error('[useVapiCall] Transcript poll error:', err);
    }
  }, []);

  const startCall = useCallback(async (request: CallRequest) => {
    setStatus('starting');
    setError(null);
    setTranscript([]);
    setResult(null);
    setDuration(0);
    setPendingDecision(null);
    callIdRef.current = null;

    try {
      const res = await fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error || 'Failed to start call');
      }

      const { callId, monitorUrl } = (await res.json()) as {
        callId: string;
        monitorUrl: string | null;
        controlUrl: string | null;
      };
      callIdRef.current = callId;
      startTimeRef.current = Date.now();
      setStatus('ringing');

      // Connect to VAPI WebSocket for status signals (not transcript)
      if (monitorUrl) {
        connectMonitor(monitorUrl);
      }

      // Duration counter
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      // Poll VAPI for call status (ended, error detection)
      statusPollRef.current = setInterval(() => {
        pollCallStatus(callId);
      }, 3000);

      // Poll our webhook transcript endpoint every 1.5 seconds for real-time transcript
      transcriptPollRef.current = setInterval(() => {
        pollTranscript(callId);
      }, 1500);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [pollCallStatus, pollTranscript, connectMonitor]);

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

  const sendMessage = useCallback(async (message: string) => {
    const callId = callIdRef.current;
    if (!callId || !message.trim()) return;

    try {
      const res = await fetch('/api/call', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId, message: message.trim() }),
      });

      if (!res.ok) {
        console.error('[useVapiCall] Send message failed:', await res.text());
      }
    } catch (err) {
      console.error('[useVapiCall] Send message error:', err);
    }
  }, []);

  const sendDecision = useCallback(async (decision: string) => {
    const callId = callIdRef.current;
    if (!callId || !decision.trim()) return;

    try {
      const res = await fetch('/api/vapi/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId, decision: decision.trim() }),
      });

      if (!res.ok) {
        console.error('[useVapiCall] Send decision failed:', await res.text());
      } else {
        // Immediately clear the local pending decision UI
        setPendingDecision(null);
      }
    } catch (err) {
      console.error('[useVapiCall] Send decision error:', err);
    }
  }, []);

  const resetCall = useCallback(() => {
    cleanup();
    setStatus('idle');
    setTranscript([]);
    setDuration(0);
    setResult(null);
    setError(null);
    setPendingDecision(null);
    callIdRef.current = null;
  }, [cleanup]);

  return {
    status,
    transcript,
    duration,
    result,
    error,
    pendingDecision,
    startCall,
    endCall,
    sendMessage,
    sendDecision,
    resetCall,
  };
}
