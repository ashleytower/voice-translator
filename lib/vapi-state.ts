/**
 * Module-level Maps for VAPI real-time state.
 * Shared between the webhook, transcript, and decision API routes.
 * Acceptable for a single-user prototype — persists across requests on the same server instance.
 */

export interface TranscriptEntry {
  role: string;
  text: string;
  timestamp: string;
}

export interface PendingDecision {
  question: string;
  options?: string[];
  resolved: boolean;
  answer?: string;
}

export const callTranscripts = new Map<string, TranscriptEntry[]>();
export const pendingDecisions = new Map<string, PendingDecision>();
