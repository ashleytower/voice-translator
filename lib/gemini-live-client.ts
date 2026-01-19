/**
 * Gemini Live API Client
 * Based on google-gemini/live-api-web-console
 */

import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

export interface LiveClientConfig {
  systemInstruction?: string;
  responseModalities?: Modality[];
  speechConfig?: {
    voiceConfig?: {
      prebuiltVoiceConfig?: {
        voiceName: string;
      };
    };
  };
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export class GeminiLiveClient {
  private client: GoogleGenAI;
  private session: Awaited<ReturnType<GoogleGenAI['live']['connect']>> | null = null;
  private _status: ConnectionStatus = 'disconnected';
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (...args: unknown[]) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((cb) => cb(...args));
  }

  async connect(model: string, config: LiveClientConfig): Promise<boolean> {
    console.log('[DEBUG GeminiLiveClient] connect() called with model:', model);

    if (this._status === 'connected') {
      console.log('[DEBUG GeminiLiveClient] Already connected, disconnecting first');
      await this.disconnect();
    }

    this._status = 'connecting';
    this.emit('statuschange', this._status);
    console.log('[DEBUG GeminiLiveClient] Status set to connecting, calling client.live.connect...');

    try {
      this.session = await this.client.live.connect({
        model,
        config: {
          systemInstruction: config.systemInstruction,
          responseModalities: config.responseModalities || [Modality.AUDIO],
          speechConfig: config.speechConfig,
        },
        callbacks: {
          onopen: () => {
            console.log('[DEBUG GeminiLiveClient] onopen callback fired');
            this._status = 'connected';
            this.emit('statuschange', this._status);
            this.emit('open');
          },
          onmessage: (message: LiveServerMessage) => {
            this.handleMessage(message);
          },
          onerror: (event: ErrorEvent) => {
            console.error('[DEBUG GeminiLiveClient] onerror callback fired:', event);
            this._status = 'error';
            this.emit('statuschange', this._status);
            this.emit('error', new Error(event.message || 'Connection error'));
          },
          onclose: () => {
            console.log('[DEBUG GeminiLiveClient] onclose callback fired');
            this._status = 'disconnected';
            this.emit('statuschange', this._status);
            this.emit('close');
          },
        },
      });

      console.log('[DEBUG GeminiLiveClient] client.live.connect returned successfully');
      return true;
    } catch (error) {
      console.error('[DEBUG GeminiLiveClient] client.live.connect threw error:', error);
      this._status = 'error';
      this.emit('statuschange', this._status);
      this.emit('error', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
    this._status = 'disconnected';
    this.emit('statuschange', this._status);
  }

  private handleMessage(message: LiveServerMessage): void {
    // Handle audio data
    if (message.serverContent?.modelTurn?.parts) {
      for (const part of message.serverContent.modelTurn.parts) {
        if (part.inlineData?.mimeType?.startsWith('audio/')) {
          const audioData = part.inlineData.data;
          if (audioData) {
            this.emit('audio', audioData);
          }
        }
        if (part.text) {
          this.emit('text', part.text);
        }
      }
    }

    // Handle turn complete
    if (message.serverContent?.turnComplete) {
      this.emit('turncomplete');
    }

    // Handle tool calls
    if (message.toolCall) {
      this.emit('toolcall', message.toolCall);
    }

    // Handle interruption
    if (message.serverContent?.interrupted) {
      this.emit('interrupted');
    }
  }

  sendAudio(base64Audio: string): void {
    if (!this.session) return;

    this.session.sendRealtimeInput({
      media: {
        mimeType: 'audio/pcm;rate=16000',
        data: base64Audio,
      },
    });
  }

  sendImage(base64Image: string, mimeType: string = 'image/jpeg'): void {
    if (!this.session) return;

    this.session.sendRealtimeInput({
      media: {
        mimeType,
        data: base64Image,
      },
    });
  }

  sendText(text: string): void {
    if (!this.session) return;

    this.session.sendClientContent({
      turns: [
        {
          role: 'user',
          parts: [{ text }],
        },
      ],
      turnComplete: true,
    });
  }

  sendToolResponse(functionResponses: Array<{ id: string; response: Record<string, unknown> }>): void {
    if (!this.session) return;

    this.session.sendToolResponse({ functionResponses });
  }
}
