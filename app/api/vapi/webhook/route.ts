export const runtime = 'edge';

import { callTranscripts, pendingDecisions, TranscriptEntry } from '@/lib/vapi-state';

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const message = body.message as Record<string, unknown> | undefined;
  if (!message) {
    return new Response('OK', { status: 200 });
  }

  const type = message.type as string | undefined;
  const callId = (message.call as Record<string, unknown> | undefined)?.id as string | undefined;

  if (!callId) {
    return new Response('OK', { status: 200 });
  }

  switch (type) {
    case 'transcript': {
      // Only store final transcripts to avoid duplicates from interim events
      if (message.transcriptType === 'final' && message.transcript) {
        const now = new Date().toISOString();
        const entry: TranscriptEntry = {
          role: (message.role as string) ?? 'unknown',
          text: message.transcript as string,
          timestamp: now,
        };
        const existing = callTranscripts.get(callId) ?? [];
        callTranscripts.set(callId, [...existing, entry]);
      }
      break;
    }

    case 'conversation-update': {
      const conversation = message.conversation as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(conversation)) {
        const now = new Date().toISOString();
        const entries: TranscriptEntry[] = conversation
          .filter((m) => m.role === 'assistant' || m.role === 'user' || m.role === 'bot')
          .map((m) => ({
            role: m.role as string,
            text: ((m.content ?? m.message ?? '') as string),
            timestamp: now,
          }));
        if (entries.length > 0) {
          callTranscripts.set(callId, entries);
        }
      }
      break;
    }

    case 'status-update': {
      console.log(`[webhook] status-update callId=${callId} status=${message.status}`);
      break;
    }

    case 'end-of-call-report': {
      console.log(`[webhook] end-of-call-report callId=${callId}`);
      pendingDecisions.delete(callId);
      break;
    }

    case 'tool-calls': {
      const toolCallList = message.toolCallList as Array<Record<string, unknown>> | undefined;
      if (!Array.isArray(toolCallList)) {
        return new Response('OK', { status: 200 });
      }

      const toolCall = toolCallList.find(
        (tc) =>
          (tc.function as Record<string, unknown> | undefined)?.name === 'check_with_user'
      );

      if (!toolCall) {
        return new Response(
          JSON.stringify({ results: [] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const toolCallId = toolCall.id as string;
      const fnArgs = (toolCall.function as Record<string, unknown>)?.arguments as
        | Record<string, unknown>
        | string
        | undefined;

      let parsedArgs: { question?: string; options?: string[] } = {};
      if (typeof fnArgs === 'string') {
        try {
          parsedArgs = JSON.parse(fnArgs);
        } catch {
          parsedArgs = {};
        }
      } else if (typeof fnArgs === 'object' && fnArgs !== null) {
        parsedArgs = fnArgs as { question?: string; options?: string[] };
      }

      const question = parsedArgs.question ?? 'What would you like to do?';
      const options = parsedArgs.options;

      // Store pending decision — client polls /api/vapi/transcript to see this
      pendingDecisions.set(callId, {
        question,
        options,
        resolved: false,
      });

      // Also add a transcript entry so the question appears in the chat
      const now = new Date().toISOString();
      const questionEntry: TranscriptEntry = {
        role: 'system',
        text: `[Decision needed] ${question}${options ? ` Options: ${options.join(', ')}` : ''}`,
        timestamp: now,
      };
      const existing = callTranscripts.get(callId) ?? [];
      callTranscripts.set(callId, [...existing, questionEntry]);

      // Hold response until client resolves the decision (or 120s timeout)
      const MAX_WAIT_MS = 120_000;
      const POLL_INTERVAL_MS = 500;
      const deadline = Date.now() + MAX_WAIT_MS;

      const waitForDecision = (): Promise<string> =>
        new Promise((resolve) => {
          const poll = () => {
            const decision = pendingDecisions.get(callId);
            if (decision?.resolved && decision.answer !== undefined) {
              pendingDecisions.delete(callId);
              resolve(decision.answer);
              return;
            }
            if (Date.now() >= deadline) {
              pendingDecisions.delete(callId);
              resolve('No response from client within timeout.');
              return;
            }
            setTimeout(poll, POLL_INTERVAL_MS);
          };
          poll();
        });

      const answer = await waitForDecision();

      return new Response(
        JSON.stringify({
          results: [{ toolCallId, result: answer }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    default:
      break;
  }

  return new Response('OK', { status: 200 });
}
