/**
 * Audio Recorder for capturing microphone input
 * Based on google-gemini/live-api-web-console
 */

type AudioRecorderCallback = (base64Audio: string) => void;
type VolumeCallback = (volume: number) => void;

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private onDataCallback: AudioRecorderCallback | null = null;
  private onVolumeCallback: VolumeCallback | null = null;
  private recording = false;
  private sampleRate = 16000;

  constructor(sampleRate = 16000) {
    this.sampleRate = sampleRate;
  }

  onData(callback: AudioRecorderCallback): void {
    this.onDataCallback = callback;
  }

  onVolume(callback: VolumeCallback): void {
    this.onVolumeCallback = callback;
  }

  async start(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
      this.source = this.audioContext.createMediaStreamSource(this.stream);

      // Use ScriptProcessorNode for audio processing
      // Note: This is deprecated but widely supported. For production,
      // consider using AudioWorklet
      const bufferSize = 4096;
      this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.processor.onaudioprocess = (event) => {
        if (!this.recording) return;

        const inputData = event.inputBuffer.getChannelData(0);

        // Calculate volume
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const volume = Math.min(1, rms * 10);
        this.onVolumeCallback?.(volume);

        // Convert to 16-bit PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Convert to base64
        const base64 = this.arrayBufferToBase64(pcmData.buffer);
        this.onDataCallback?.(base64);
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.recording = true;
    } catch (error) {
      console.error('Failed to start audio recording:', error);
      throw error;
    }
  }

  stop(): void {
    this.recording = false;

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  isRecording(): boolean {
    return this.recording;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
