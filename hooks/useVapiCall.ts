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
  sendMessage: (message: string) => Promise<void>;
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
  const wsRef = useRef<WebSocket | null>(null);
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

  // Connect to VAPI monitor WebSocket for real-time transcript
  const connectMonitor = useCallback((monitorUrl: string) => {
    try {
      const ws = new WebSocket(monitorUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // conversation-update has the full conversation array
          if (data.type === 'conversation-update' && Array.isArray(data.conversation)) {
            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const entries: CallTranscript[] = data.conversation
              .filter((m: { role: string }) => m.role === 'assistant' || m.role === 'user')
              .map((m: { role: string; content?: string }) => ({
                role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
                text: m.content ?? '',
                timestamp: now,
              }));
            if (entries.length > 0) {
              setTranscript(entries);
            }
          }

          // Individual transcript events
          if (data.type === 'transcript' && data.transcript) {
            if (data.transcriptType === 'final') {
              const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              setTranscript((prev) => [
                ...prev,
                {
                  role: data.role === 'bot' || data.role === 'assistant' ? ('assistant' as const) : ('user' as const),
                  text: data.transcript,
                  timestamp: now,
                },
              ]);
            }
          }

          // Status changes from monitor
          if (data.type === 'status-update') {
            const mapped = mapVapiStatus(data.status);
            if (mapped) setStatus(mapped);
          }

          // Call ended
          if (data.type === 'end-of-call-report') {
            setStatus('ended');
            setResult({
              status: 'success',
              duration: Math.round((Date.now() - startTimeRef.current) / 1000),
              summary: data.summary || 'Call completed',
              transcript: data.messages ? parseVapiMessages(data.messages) : [],
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

  const pollCallStatus = useCallback(async (callId: string) => {
    try {
      const res = await fetch(`/api/call?callId=${encodeURIComponent(callId)}`);
      if (!res.ok) return;

      const data = await res.json();
      const mappedStatus = mapVapiStatus(data.status);

      if (mappedStatus !== null) {
        setStatus(mappedStatus);
      }

      // Try every possible location for transcript messages
      const msgs = data.messages ?? data.artifact?.messages ?? [];
      let parsedMessages = parseVapiMessages(msgs);

      // Fallback: parse the plain transcript string if no structured messages
      if (parsedMessages.length === 0 && data.transcript) {
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        parsedMessages = [{
          role: 'assistant' as const,
          text: data.transcript,
          timestamp: now,
        }];
      }

      // Always update transcript from poll (WebSocket is bonus, not gate)
      if (parsedMessages.length > 0) {
        setTranscript(parsedMessages);
      }

      if (mappedStatus === 'ended') {
        cleanup();
        setResult({
          status: 'success',
          duration: Math.round((Date.now() - startTimeRef.current) / 1000),
          summary: data.summary || data.artifact?.summary || 'Call completed',
          transcript: parsedMessages,
        });
      } else if (mappedStatus === 'error') {
        cleanup();
        setError(data.endedReason || 'Call failed');
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

      const { callId, monitorUrl } = (await res.json()) as { callId: string; monitorUrl: string | null };
      callIdRef.current = callId;
      startTimeRef.current = Date.now();
      setStatus('ringing');

      // Connect to real-time WebSocket monitor if available
      if (monitorUrl) {
        connectMonitor(monitorUrl);
      }

      // Duration counter ticks every second
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      // Poll VAPI for status (fallback for transcript if no WS)
      pollIntervalRef.current = setInterval(() => {
        pollCallStatus(callId);
      }, 2000);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [pollCallStatus, connectMonitor]);

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

  const resetCall = useCallback(() => {
    cleanup();
    setStatus('idle');
    setTranscript([]);
    setDuration(0);
    setResult(null);
    setError(null);
    callIdRef.current = null;
  }, [cleanup]);

  return { status, transcript, duration, result, error, startCall, endCall, sendMessage, resetCall };
}
