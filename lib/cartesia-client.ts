/**
 * Cartesia Text-to-Speech Client
 * Real-time streaming TTS using WebSocket
 */

export type CartesiaStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface CartesiaConfig {
  apiKey: string;
  voiceId?: string;
  modelId?: string;
  language?: string;
  outputFormat?: {
    container: string;
    encoding: string;
    sampleRate: number;
  };
}

// Cartesia voice presets for different languages
export const CARTESIA_VOICES: Record<string, { id: string; name: string }> = {
  en: { id: '79a125e8-cd45-4c13-8a67-188112f4dd22', name: 'British Lady' },
  ja: { id: 'e6b3c3c1-79e3-4f56-9c1b-7e5c4d9a2e8f', name: 'Japanese Female' },
  es: { id: 'a7c43c8a-4f63-4c22-b07c-789c46a8f29b', name: 'Spanish Female' },
  fr: { id: 'b8c76d9e-5a42-4e13-a18d-892a56b7d38c', name: 'French Female' },
  ko: { id: 'c9d87e0f-6b53-4f24-b29e-903b67c8e49d', name: 'Korean Female' },
  zh: { id: 'd0e98f1a-7c64-5a35-c30f-a14c78d9f50e', name: 'Chinese Female' },
};

export class CartesiaClient {
  private socket: WebSocket | null = null;
  private _status: CartesiaStatus = 'disconnected';
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private config: CartesiaConfig;
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying: boolean = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private contextId: string = '';

  constructor(config: CartesiaConfig) {
    this.config = config;
  }

  get status(): CartesiaStatus {
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

  async connect(): Promise<void> {
    if (this._status === 'connected' || this._status === 'connecting') {
      return;
    }

    this._status = 'connecting';
    this.emit('statuschange', this._status);

    // Initialize AudioContext
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
    }

    const wsUrl = `wss://api.cartesia.ai/tts/websocket?api_key=${this.config.apiKey}&cartesia_version=2024-06-10`;

    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('[Cartesia] Connected');
      this._status = 'connected';
      this.emit('statuschange', this._status);
      this.emit('open');
    };

    this.socket.onmessage = async (event) => {
      try {
        if (event.data instanceof Blob) {
          // Binary audio data
          const arrayBuffer = await event.data.arrayBuffer();
          await this.handleAudioData(arrayBuffer);
        } else {
          // JSON message
          const data = JSON.parse(event.data);

          if (data.type === 'chunk') {
            // Audio chunk - decode base64 audio
            if (data.data) {
              const audioBytes = this.base64ToArrayBuffer(data.data);
              await this.handleAudioData(audioBytes);
            }
          } else if (data.type === 'done') {
            this.emit('synthesiscomplete');
          } else if (data.error) {
            console.error('[Cartesia] Error:', data.error);
            this.emit('error', new Error(data.error));
          }
        }
      } catch (error) {
        console.error('[Cartesia] Failed to handle message:', error);
      }
    };

    this.socket.onerror = (error) => {
      console.error('[Cartesia] WebSocket error:', error);
      this._status = 'error';
      this.emit('statuschange', this._status);
      this.emit('error', error);
    };

    this.socket.onclose = () => {
      console.log('[Cartesia] Disconnected');
      this._status = 'disconnected';
      this.emit('statuschange', this._status);
      this.emit('close');
      this.socket = null;
    };
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private async handleAudioData(arrayBuffer: ArrayBuffer): Promise<void> {
    if (!this.audioContext) return;

    try {
      // Cartesia outputs raw PCM, we need to convert to AudioBuffer
      const pcmData = new Int16Array(arrayBuffer);
      const floatData = new Float32Array(pcmData.length);

      for (let i = 0; i < pcmData.length; i++) {
        floatData[i] = pcmData[i] / 32768.0;
      }

      const audioBuffer = this.audioContext.createBuffer(1, floatData.length, 24000);
      audioBuffer.getChannelData(0).set(floatData);

      this.audioQueue.push(audioBuffer);
      this.emit('audio', audioBuffer);

      if (!this.isPlaying) {
        this.playNextInQueue();
      }
    } catch (error) {
      console.error('[Cartesia] Failed to decode audio:', error);
    }
  }

  private playNextInQueue(): void {
    if (this.audioQueue.length === 0 || !this.audioContext) {
      this.isPlaying = false;
      this.emit('playingchange', false);
      return;
    }

    this.isPlaying = true;
    this.emit('playingchange', true);

    const audioBuffer = this.audioQueue.shift()!;
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    source.onended = () => {
      this.currentSource = null;
      this.playNextInQueue();
    };

    this.currentSource = source;
    source.start();
  }

  speak(text: string, language: string = 'en'): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      console.error('[Cartesia] Not connected');
      return;
    }

    // Get voice for language or use default
    const voice = CARTESIA_VOICES[language] || CARTESIA_VOICES['en'];

    // Generate unique context ID for this utterance
    this.contextId = `ctx_${Date.now()}`;

    const message = {
      model_id: this.config.modelId || 'sonic-english',
      transcript: text,
      voice: {
        mode: 'id',
        id: this.config.voiceId || voice.id,
      },
      output_format: this.config.outputFormat || {
        container: 'raw',
        encoding: 'pcm_s16le',
        sample_rate: 24000,
      },
      context_id: this.contextId,
      language: language,
    };

    this.socket.send(JSON.stringify(message));
    this.emit('synthesisstart');
  }

  stop(): void {
    // Stop current playback
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }

    // Clear queue
    this.audioQueue = [];
    this.isPlaying = false;
    this.emit('playingchange', false);

    // Send cancel message if connected
    if (this.socket?.readyState === WebSocket.OPEN && this.contextId) {
      this.socket.send(
        JSON.stringify({
          context_id: this.contextId,
          cancel: true,
        })
      );
    }
  }

  disconnect(): void {
    this.stop();

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this._status = 'disconnected';
    this.emit('statuschange', this._status);
  }
}
