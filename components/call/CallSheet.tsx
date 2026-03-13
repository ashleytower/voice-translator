'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Clock, MessageSquare, AlertCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { CallRequest, CallStatus, CallTranscript, CallResult } from '@/types';

interface CallSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetLanguage: string;
  chatContext: string;
  defaultPhoneNumber?: string;
  status: CallStatus;
  transcript: CallTranscript[];
  duration: number;
  result: CallResult | null;
  error: string | null;
  pendingDecision?: { question: string; options: string[] | null } | null;
  onStartCall: (request: CallRequest) => void;
  onEndCall: () => void;
  onSendMessage: (message: string) => void;
  onSendDecision?: (decision: string) => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function TranscriptBubble({ entry }: { entry: CallTranscript }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5',
        entry.role === 'assistant' ? 'items-start' : 'items-end'
      )}
    >
      <span className="text-[10px] text-muted-foreground">
        {entry.role === 'assistant' ? 'AI Agent' : 'Recipient'} · {entry.timestamp}
      </span>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
          entry.role === 'assistant'
            ? 'bg-secondary rounded-tl-md'
            : 'bg-primary text-primary-foreground rounded-tr-md'
        )}
      >
        {entry.text}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: CallStatus }) {
  if (status === 'starting') {
    return (
      <Badge className="gap-1.5 bg-yellow-500/20 text-yellow-400 border-yellow-500/30 animate-pulse">
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 inline-block" />
        Starting...
      </Badge>
    );
  }
  if (status === 'ringing') {
    return (
      <Badge className="gap-1.5 bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 inline-block" />
        Ringing...
      </Badge>
    );
  }
  if (status === 'in-progress') {
    return (
      <Badge className="gap-1.5 bg-green-500/20 text-green-400 border-green-500/30">
        <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
        Connected
      </Badge>
    );
  }
  if (status === 'ended') {
    return (
      <Badge variant="secondary" className="gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground inline-block" />
        Ended
      </Badge>
    );
  }
  if (status === 'error') {
    return (
      <Badge variant="destructive" className="gap-1.5">
        <AlertCircle className="h-3 w-3" />
        Error
      </Badge>
    );
  }
  return null;
}

export function CallSheet({
  open,
  onOpenChange,
  targetLanguage,
  status,
  transcript,
  duration,
  result,
  error,
  chatContext,
  defaultPhoneNumber,
  pendingDecision,
  onStartCall,
  onEndCall,
  onSendMessage,
  onSendDecision,
}: CallSheetProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [liveMessage, setLiveMessage] = useState('');

  // Pre-fill task and phone from chat context when sheet opens
  useEffect(() => {
    if (open && status === 'idle') {
      if (chatContext) setTaskDescription(chatContext);
      if (defaultPhoneNumber) setPhoneNumber(defaultPhoneNumber);
    }
  }, [open, status, chatContext, defaultPhoneNumber]);

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript to bottom on new entries
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Reset form when sheet closes after a completed call
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && (status === 'idle' || status === 'ended' || status === 'error')) {
      setPhoneNumber('');
      setTaskDescription('');
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim() || !taskDescription.trim()) return;

    // Normalize to E.164: strip formatting chars, validate
    const stripped = phoneNumber.replace(/[\s\-\(\)]/g, '');
    if (!/^\+\d{7,15}$/.test(stripped)) {
      alert('Enter a valid phone number with country code (e.g. +1 555 123 4567)');
      return;
    }

    const request: CallRequest = {
      phoneNumber: stripped,
      taskDescription: taskDescription.trim(),
      targetLanguage,
    };

    onStartCall(request);
  };

  const isActiveCall = status === 'starting' || status === 'ringing' || status === 'in-progress';
  const isPostCall = status === 'ended' || status === 'error';

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85dvh] flex flex-col p-0 rounded-t-2xl border-border"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <SheetTitle className="text-base">AI Phone Call</SheetTitle>
                <SheetDescription className="text-xs">
                  Calls in {targetLanguage}
                </SheetDescription>
              </div>
            </div>
            {isActiveCall && <StatusBadge status={status} />}
          </div>

          {/* Duration timer during active call */}
          {isActiveCall && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-mono">{formatDuration(duration)}</span>
            </div>
          )}
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* PRE-CALL FORM */}
          {status === 'idle' && (
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Task from chat context - shown as editable summary */}
              {taskDescription && (
                <div className="rounded-lg bg-secondary/50 border border-border px-4 py-3 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Task from chat
                  </p>
                  <textarea
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    rows={2}
                    className="w-full bg-transparent border-none text-sm focus:outline-none resize-none p-0"
                  />
                </div>
              )}

              {/* No chat context - show full task input */}
              {!taskDescription && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground" htmlFor="task-description">
                    What should the AI say?
                  </label>
                  <textarea
                    id="task-description"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="e.g. Make a dinner reservation for 2 at 7pm under Ashley"
                    rows={3}
                    className="w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="phone-number">
                  Phone number
                </label>
                <input
                  id="phone-number"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  required
                  autoComplete="tel"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={!phoneNumber.trim() || !taskDescription.trim()}
              >
                <Phone className="h-4 w-4" />
                Call Now
              </Button>
            </form>
          )}

          {/* DURING CALL: live transcript */}
          {isActiveCall && (
            <div className="px-6 py-4 space-y-3">
              {transcript.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 opacity-30" />
                  <p className="text-sm">Transcript will appear here...</p>
                </div>
              ) : (
                transcript.map((entry, i) => (
                  <TranscriptBubble key={i} entry={entry} />
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
          )}

          {/* POST-CALL: result summary */}
          {isPostCall && (
            <div className="px-6 py-5 space-y-5">
              {/* Error state */}
              {status === 'error' && error && (
                <div className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Success result */}
              {result && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <StatusBadge status="ended" />
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="font-mono">{formatDuration(result.duration)}</span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-secondary px-4 py-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Summary
                    </p>
                    <p className="text-sm">{result.summary}</p>
                  </div>

                  {result.transcript.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Transcript recap
                      </p>
                      <div className="space-y-2.5 max-h-64 overflow-y-auto">
                        {result.transcript.map((entry, i) => (
                          <TranscriptBubble key={i} entry={entry} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => handleOpenChange(false)}
              >
                Done
              </Button>
            </div>
          )}
        </div>

        {/* Footer — only shown during active call */}
        {isActiveCall && (
          <div className="px-6 py-3 border-t border-border shrink-0 space-y-2">
            {/* Decision card — shown when VAPI is holding for user input */}
            {pendingDecision ? (
              <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 px-4 py-3 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-200 font-medium">{pendingDecision.question}</p>
                </div>
                {pendingDecision.options && pendingDecision.options.length > 0 ? (
                  <div className="flex gap-2">
                    {pendingDecision.options.map((opt) => (
                      <Button
                        key={opt}
                        size="sm"
                        variant={opt.toLowerCase().startsWith('y') ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => onSendDecision?.(opt)}
                      >
                        {opt}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => onSendDecision?.('Yes, confirm it')}>
                      Yes
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => onSendDecision?.('No, decline politely')}>
                      No
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (liveMessage.trim()) {
                    onSendMessage(liveMessage.trim());
                    setLiveMessage('');
                  }
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={liveMessage}
                  onChange={(e) => setLiveMessage(e.target.value)}
                  placeholder="Correct or guide the AI..."
                  className="flex-1 rounded-lg border border-input bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!liveMessage.trim()}
                  className="h-9 w-9 shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            )}
            <Button
              variant="destructive"
              className="w-full gap-2"
              onClick={onEndCall}
            >
              <PhoneOff className="h-4 w-4" />
              End Call
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
