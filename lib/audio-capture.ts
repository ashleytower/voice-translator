/**
 * Audio Capture Utility
 * Captures microphone audio and streams it in real-time
 */

export interface AudioCaptureConfig {
  sampleRate?: number;
  onAudioData?: (data: ArrayBuffer) => void;
  onVolumeChange?: (volume: number) => void;
  onError?: (error: Error) => void;
}

export class AudioCapture {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private config: AudioCaptureConfig;
  private isCapturing: boolean = false;
  private volumeInterval: NodeJS.Timeout | null = null;

  constructor(config: AudioCaptureConfig = {}) {
    this.config = {
      sampleRate: config.sampleRate || 16000,
      ...config,
    };
  }

  async start(): Promise<void> {
    if (this.isCapturing) return;

    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: this.config.sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create audio context
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate,
      });

      // Create source from stream
      this.source = this.audioContext.createMediaStreamSource(this.stream);

      // Create analyser for volume metering
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.source.connect(this.analyser);

      // Create processor node for capturing audio data
      // Note: ScriptProcessorNode is deprecated but still widely supported
      // AudioWorklet would be the modern alternative but requires more setup
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (event) => {
        if (!this.isCapturing) return;

        const inputData = event.inputBuffer.getChannelData(0);

        // Convert float32 to int16
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Send audio data
        if (this.config.onAudioData) {
          this.config.onAudioData(int16Data.buffer);
        }
      };

      // Connect nodes
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      // Start volume monitoring
      this.startVolumeMonitoring();

      this.isCapturing = true;
    } catch (error) {
      console.error('[AudioCapture] Failed to start:', error);
      if (this.config.onError) {
        this.config.onError(error as Error);
      }
      throw error;
    }
  }

  private startVolumeMonitoring(): void {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    this.volumeInterval = setInterval(() => {
      if (!this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);

      // Calculate average volume (0-1)
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      const volume = average / 255;

      if (this.config.onVolumeChange) {
        this.config.onVolumeChange(volume);
      }
    }, 50);
  }

  stop(): void {
    this.isCapturing = false;

    if (this.volumeInterval) {
      clearInterval(this.volumeInterval);
      this.volumeInterval = null;
    }

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  get capturing(): boolean {
    return this.isCapturing;
  }
}
