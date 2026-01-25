/**
 * useVoiceTranslator Hook
 * Orchestrates Deepgram STT + Gemini Translation + Cartesia TTS
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { DeepgramClient, TranscriptResult } from '@/lib/deepgram-client';
import { CartesiaClient } from '@/lib/cartesia-client';
import { AudioCapture } from '@/lib/audio-capture';
import { translateAndChat } from '@/lib/gemini-service';

export type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error';

export interface VoiceTranslatorConfig {
  deepgramApiKey: string;
  cartesiaApiKey: string;
  fromLanguage: string;
  toLanguage: string;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onTranslation?: (original: string, translation: string, pronunciation?: string) => void;
  onError?: (error: Error) => void;
}

export interface UseVoiceTranslatorReturn {
  status: VoiceStatus;
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  micVolume: number;
  currentTranscript: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  stopSpeaking: () => void;
}

export function useVoiceTranslator(config: VoiceTranslatorConfig): UseVoiceTranslatorReturn {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [micVolume, setMicVolume] = useState(0);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const deepgramRef = useRef<DeepgramClient | null>(null);
  const cartesiaRef = useRef<CartesiaClient | null>(null);
  const audioCaptureRef = useRef<AudioCapture | null>(null);
  const configRef = useRef(config);
  const transcriptBufferRef = useRef('');
  const processingRef = useRef(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep config ref updated
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Process transcript and get translation
  const processTranscript = useCallback(async (text: string) => {
    if (processingRef.current || !text.trim()) return;

    processingRef.current = true;
    setStatus('processing');

    try {
      const response = await translateAndChat(
        text,
        configRef.current.fromLanguage,
        configRef.current.toLanguage
      );

      // Notify about translation
      if (configRef.current.onTranslation) {
        configRef.current.onTranslation(
          text,
          response.translation,
          response.pronunciation
        );
      }

      // Speak the translation using Cartesia
      if (cartesiaRef.current && response.translation) {
        setStatus('speaking');
        setIsSpeaking(true);

        // Map language code to Cartesia language
        const langCode = configRef.current.toLanguage.toLowerCase().slice(0, 2);
        cartesiaRef.current.speak(response.translation, langCode);
      }
    } catch (error) {
      console.error('[VoiceTranslator] Translation error:', error);
      if (configRef.current.onError) {
        configRef.current.onError(error as Error);
      }
      setStatus('listening');
    } finally {
      processingRef.current = false;
    }
  }, []);

  // Handle transcript results from Deepgram
  const handleTranscript = useCallback((result: TranscriptResult) => {
    const { text, isFinal, speechFinal } = result;

    if (!text) return;

    // Update current transcript display
    if (isFinal) {
      transcriptBufferRef.current += ' ' + text;
      setCurrentTranscript(transcriptBufferRef.current.trim());
    } else {
      setCurrentTranscript((transcriptBufferRef.current + ' ' + text).trim());
    }

    // Notify about transcript
    if (configRef.current.onTranscript) {
      configRef.current.onTranscript(text, isFinal);
    }

    // Clear any existing silence timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }

    // If speech is final (end of utterance), process the transcript
    if (speechFinal && transcriptBufferRef.current.trim()) {
      const fullTranscript = transcriptBufferRef.current.trim();
      transcriptBufferRef.current = '';
      setCurrentTranscript('');
      processTranscript(fullTranscript);
    } else if (isFinal) {
      // Set a silence timeout to process after pause
      silenceTimeoutRef.current = setTimeout(() => {
        if (transcriptBufferRef.current.trim()) {
          const fullTranscript = transcriptBufferRef.current.trim();
          transcriptBufferRef.current = '';
          setCurrentTranscript('');
          processTranscript(fullTranscript);
        }
      }, 1500);
    }
  }, [processTranscript]);

  const connect = useCallback(async () => {
    if (status === 'listening' || status === 'connecting') return;

    setStatus('connecting');

    try {
      // Initialize Deepgram
      deepgramRef.current = new DeepgramClient({
        apiKey: config.deepgramApiKey,
        language: config.fromLanguage.slice(0, 2),
        interimResults: true,
      });

      // Initialize Cartesia
      cartesiaRef.current = new CartesiaClient({
        apiKey: config.cartesiaApiKey,
      });

      // Set up Deepgram event handlers
      deepgramRef.current.on('transcript', handleTranscript as (...args: unknown[]) => void);

      deepgramRef.current.on('error', (error) => {
        console.error('[VoiceTranslator] Deepgram error:', error);
        if (configRef.current.onError) {
          configRef.current.onError(error as Error);
        }
      });

      // Set up Cartesia event handlers
      cartesiaRef.current.on('playingchange', (playing) => {
        setIsSpeaking(playing as boolean);
        if (!playing && status === 'speaking') {
          setStatus('listening');
        }
      });

      cartesiaRef.current.on('synthesiscomplete', () => {
        // TTS synthesis complete
      });

      // Connect to services
      const fromLangCode = config.fromLanguage.toLowerCase().slice(0, 2);
      deepgramRef.current.connect(fromLangCode);
      await cartesiaRef.current.connect();

      // Initialize audio capture
      audioCaptureRef.current = new AudioCapture({
        sampleRate: 16000,
        onAudioData: (data) => {
          if (deepgramRef.current) {
            deepgramRef.current.sendAudio(data);
          }
        },
        onVolumeChange: setMicVolume,
        onError: (error) => {
          console.error('[VoiceTranslator] Audio capture error:', error);
          if (configRef.current.onError) {
            configRef.current.onError(error);
          }
        },
      });

      // Start audio capture
      await audioCaptureRef.current.start();

      setStatus('listening');
    } catch (error) {
      console.error('[VoiceTranslator] Connection error:', error);
      setStatus('error');
      if (config.onError) {
        config.onError(error as Error);
      }
      disconnect();
    }
  }, [config.deepgramApiKey, config.cartesiaApiKey, config.fromLanguage, handleTranscript, status]);

  const disconnect = useCallback(() => {
    // Clear any pending timeouts
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // Stop audio capture
    if (audioCaptureRef.current) {
      audioCaptureRef.current.stop();
      audioCaptureRef.current = null;
    }

    // Disconnect Deepgram
    if (deepgramRef.current) {
      deepgramRef.current.disconnect();
      deepgramRef.current = null;
    }

    // Disconnect Cartesia
    if (cartesiaRef.current) {
      cartesiaRef.current.disconnect();
      cartesiaRef.current = null;
    }

    // Reset state
    setStatus('idle');
    setMicVolume(0);
    setCurrentTranscript('');
    setIsSpeaking(false);
    transcriptBufferRef.current = '';
    processingRef.current = false;
  }, []);

  const stopSpeaking = useCallback(() => {
    if (cartesiaRef.current) {
      cartesiaRef.current.stop();
    }
    setIsSpeaking(false);
    if (status === 'speaking') {
      setStatus('listening');
    }
  }, [status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Reconnect when language changes
  useEffect(() => {
    if (status === 'listening' || status === 'speaking') {
      disconnect();
      setTimeout(() => {
        connect();
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.fromLanguage, config.toLanguage]);

  return {
    status,
    isConnected: status !== 'idle' && status !== 'error',
    isListening: status === 'listening',
    isSpeaking,
    micVolume,
    currentTranscript,
    connect,
    disconnect,
    stopSpeaking,
  };
}
