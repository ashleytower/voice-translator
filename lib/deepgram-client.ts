/**
 * Deepgram Speech-to-Text Client
 * Real-time streaming transcription using WebSocket
 */

export type DeepgramStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface DeepgramConfig {
  apiKey: string;
  language?: string;
  model?: string;
  punctuate?: boolean;
  interimResults?: boolean;
}

export class DeepgramClient {
  private socket: WebSocket | null = null;
  private _status: DeepgramStatus = 'disconnected';
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private config: DeepgramConfig;
  private keepAliveInterval: NodeJS.Timeout | null = null;

  constructor(config: DeepgramConfig) {
    this.config = config;
  }

  get status(): DeepgramStatus {
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

  connect(language: string = 'en'): void {
    if (this._status === 'connected' || this._status === 'connecting') {
      return;
    }

    this._status = 'connecting';
    this.emit('statuschange', this._status);

    const params = new URLSearchParams({
      model: this.config.model || 'nova-2',
      language: language,
      punctuate: String(this.config.punctuate ?? true),
      interim_results: String(this.config.interimResults ?? true),
      encoding: 'linear16',
      sample_rate: '16000',
      channels: '1',
      endpointing: '300',
      smart_format: 'true',
    });

    const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

    this.socket = new WebSocket(wsUrl, ['token', this.config.apiKey]);

    this.socket.onopen = () => {
      console.log('[Deepgram] Connected');
      this._status = 'connected';
      this.emit('statuschange', this._status);
      this.emit('open');

      // Keep connection alive
      this.keepAliveInterval = setInterval(() => {
        if (this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: 'KeepAlive' }));
        }
      }, 10000);
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'Results') {
          const transcript = data.channel?.alternatives?.[0]?.transcript;
          const isFinal = data.is_final;
          const speechFinal = data.speech_final;

          if (transcript) {
            this.emit('transcript', {
              text: transcript,
              isFinal,
              speechFinal,
              confidence: data.channel?.alternatives?.[0]?.confidence || 0,
            });
          }
        }

        if (data.type === 'SpeechStarted') {
          this.emit('speechstart');
        }

        if (data.type === 'UtteranceEnd') {
          this.emit('utteranceend');
        }
      } catch (error) {
        console.error('[Deepgram] Failed to parse message:', error);
      }
    };

    this.socket.onerror = (error) => {
      console.error('[Deepgram] WebSocket error:', error);
      this._status = 'error';
      this.emit('statuschange', this._status);
      this.emit('error', error);
    };

    this.socket.onclose = (event) => {
      console.log('[Deepgram] Disconnected:', event.code, event.reason);
      this.cleanup();
      this._status = 'disconnected';
      this.emit('statuschange', this._status);
      this.emit('close');
    };
  }

  sendAudio(audioData: ArrayBuffer | Blob): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(audioData);
    }
  }

  disconnect(): void {
    if (this.socket) {
      // Send close message to Deepgram
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'CloseStream' }));
      }
      this.socket.close();
      this.cleanup();
    }
    this._status = 'disconnected';
    this.emit('statuschange', this._status);
  }

  private cleanup(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    this.socket = null;
  }
}

export interface TranscriptResult {
  text: string;
  isFinal: boolean;
  speechFinal: boolean;
  confidence: number;
}
