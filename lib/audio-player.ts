/**
 * Audio Player for streaming audio playback
 * Based on google-gemini/live-api-web-console
 */

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private queue: AudioBuffer[] = [];
  private playing = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private sampleRate = 24000; // Gemini outputs 24kHz audio
  private onPlayingChangeCallback: ((playing: boolean) => void) | null = null;

  constructor(sampleRate = 24000) {
    this.sampleRate = sampleRate;
  }

  onPlayingChange(callback: (playing: boolean) => void): void {
    this.onPlayingChangeCallback = callback;
  }

  async init(): Promise<void> {
    if (this.audioContext) return;

    this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
  }

  async addAudio(base64Audio: string): Promise<void> {
    if (!this.audioContext) {
      await this.init();
    }

    try {
      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert from 16-bit PCM to Float32
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768;
      }

      // Create audio buffer
      const audioBuffer = this.audioContext!.createBuffer(1, float32.length, this.sampleRate);
      audioBuffer.getChannelData(0).set(float32);

      this.queue.push(audioBuffer);

      if (!this.playing) {
        this.playNext();
      }
    } catch (error) {
      console.error('Failed to decode audio:', error);
    }
  }

  private playNext(): void {
    if (this.queue.length === 0) {
      this.playing = false;
      this.onPlayingChangeCallback?.(false);
      return;
    }

    const buffer = this.queue.shift()!;
    this.playing = true;
    this.onPlayingChangeCallback?.(true);

    const source = this.audioContext!.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gainNode!);

    source.onended = () => {
      this.currentSource = null;
      this.playNext();
    };

    this.currentSource = source;
    source.start();
  }

  stop(): void {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
    this.queue = [];
    this.playing = false;
    this.onPlayingChangeCallback?.(false);
  }

  clear(): void {
    this.queue = [];
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
    this.playing = false;
    this.onPlayingChangeCallback?.(false);
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  isPlaying(): boolean {
    return this.playing;
  }

  async close(): Promise<void> {
    this.stop();
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
      this.gainNode = null;
    }
  }
}
