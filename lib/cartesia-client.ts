/**
 * Cartesia Text-to-Speech Client
 * Real-time streaming TTS using WebSocket with server-provided key
 */

export type CartesiaStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface CartesiaConfig {
  apiKey?: string;
  voiceId?: string;
  modelId?: string;
  language?: string;
  outputFormat?: {
    container: string;
    encoding: string;
    sampleRate: number;
  };
}

export const CARTESIA_VOICES: Record<string, { id: string; name: string }> = {
  en: { id: 'cec7cae1-ac8b-4a59-9eac-ec48366f37ae', name: 'Haley - Engaging Friend' },
  ja: { id: '498e7f37-7fa3-4e2c-b8e2-8b6e9276f956', name: 'Aiko - Calming Voice' },
  es: { id: '399002e9-7f7d-42d4-a6a8-9b91bd809b9d', name: 'Diego - Hype Guy' },
  fr: { id: '2d693a9c-fc75-4313-aefb-c9cfaa17dd83', name: 'Gerard - Monsieur Noir' },
  ko: { id: '15628352-2ede-4f1b-89e6-ceda0c983fbc', name: 'Jiwoo - Service Specialist' },
  zh: { id: '0b904166-a29f-4d2e-bb20-41ca302f98e9', name: 'Fei - Broadcast Narrator' },
  pt: { id: 'f39bf583-3b3d-402f-9ffb-6179d9ec3e35', name: 'Isabel - Confident Woman' },
  de: { id: 'd42fc8d7-efdd-44df-bb2e-a6e093601917', name: 'Oskar - Steady Advisor' },
  it: { id: '029c3c7a-b6d9-44f0-814b-200d849830ff', name: 'Giancarlo - Support Leader' },
  hi: { id: '20e68f5c-08e5-42d0-8e9b-6e716fd1ae66', name: 'Vivek - Composed Voice' },
  ar: { id: '664aec8a-64a4-4437-8a0b-a61aa4f51fe6', name: 'Hassan - Authoritative Narrator' },
  th: { id: '5de076e9-7b28-4442-b279-e7d80d573505', name: 'Somchai - Star' },
  vi: { id: '0e58d60a-2f1a-4252-81bd-3db6af45fb41', name: 'Minh - Conversational Partner' },
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
    if (this._status === 'connected') {
      return;
    }

    if (this._status === 'connecting') {
      return new Promise((resolve, reject) => {
        const onStatus = (status: unknown) => {
          if (status === 'connected') {
            this.off('statuschange', onStatus);
            resolve();
          } else if (status === 'error' || status === 'disconnected') {
            this.off('statuschange', onStatus);
            reject(new Error('Connection failed'));
          }
        };
        this.on('statuschange', onStatus);
      });
    }

    this._status = 'connecting';
    this.emit('statuschange', this._status);

    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
    }

    try {
      const keyRes = await fetch('/api/tts/key');
      if (!keyRes.ok) throw new Error('Failed to fetch TTS key');
      const { key } = await keyRes.json();

      return new Promise((resolve, reject) => {
        const wsUrl = `wss://api.cartesia.ai/tts/websocket?api_key=${key}&cartesia_version=2024-06-10`;

        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          console.log('[Cartesia] Connected');
          this._status = 'connected';
          this.emit('statuschange', this._status);
          this.emit('open');
          resolve();
        };

        this.socket.onmessage = async (event) => {
          try {
            if (event.data instanceof Blob) {
              const arrayBuffer = await event.data.arrayBuffer();
              await this.handleAudioData(arrayBuffer);
            } else {
              const data = JSON.parse(event.data);
              if (data.type === 'chunk') {
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
          reject(error);
        };

        this.socket.onclose = () => {
          console.log('[Cartesia] Disconnected');
          this._status = 'disconnected';
          this.emit('statuschange', this._status);
          this.emit('close');
          this.socket = null;
        };
      });
    } catch (error) {
      this._status = 'error';
      this.emit('statuschange', this._status);
      throw error;
    }
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

    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }

    if (this.isPlaying || this.audioQueue.length > 0) {
      if (this.currentSource) {
        this.currentSource.stop();
        this.currentSource = null;
      }
      this.audioQueue = [];
      this.isPlaying = false;
    }

    const voice = CARTESIA_VOICES[language] || CARTESIA_VOICES['en'];
    this.contextId = `ctx_${Date.now()}`;

    const message = {
      model_id: this.config.modelId || 'sonic-2',
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
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
    this.audioQueue = [];
    this.isPlaying = false;
    this.emit('playingchange', false);
    if (this.socket?.readyState === WebSocket.OPEN && this.contextId) {
      this.socket.send(JSON.stringify({ context_id: this.contextId, cancel: true }));
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
