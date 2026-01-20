/**
 * React hook for Gemini Live API
 * Based on google-gemini/live-api-web-console
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GeminiLiveClient, ConnectionStatus, LiveClientConfig } from '@/lib/gemini-live-client';
import { AudioRecorder } from '@/lib/audio-recorder';
import { AudioPlayer } from '@/lib/audio-player';
import { Modality } from '@google/genai';

export interface Transcript {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface UseGeminiLiveOptions {
  apiKey: string;
  model?: string;
  systemInstruction?: string;
  voiceName?: string;
}

export interface UseGeminiLiveReturn {
  // Connection state
  status: ConnectionStatus;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;

  // Audio state
  isSpeaking: boolean;
  isListening: boolean;
  micVolume: number;

  // Transcripts
  transcripts: Transcript[];
  streamingText: string;
  inputTranscript: string;
  outputTranscript: string;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  sendText: (text: string) => void;
  sendImage: (base64Image: string, mimeType?: string) => void;
  clearTranscripts: () => void;
}

export function useGeminiLive(options: UseGeminiLiveOptions): UseGeminiLiveReturn {
  const {
    apiKey,
    model = 'models/gemini-2.0-flash-exp',
    systemInstruction = 'You are a helpful voice translator assistant. Translate spoken text between languages naturally and conversationally.',
    voiceName = 'Aoede',
  } = options;

  // State
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [inputTranscript, setInputTranscript] = useState('');
  const [outputTranscript, setOutputTranscript] = useState('');

  // Refs
  const clientRef = useRef<GeminiLiveClient | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);

  // Initialize client
  useEffect(() => {
    if (!apiKey) {
      setError('API key is required');
      return;
    }

    clientRef.current = new GeminiLiveClient(apiKey);
    playerRef.current = new AudioPlayer();
    recorderRef.current = new AudioRecorder();

    // Set up recorder callbacks
    recorderRef.current.onData((base64Audio) => {
      clientRef.current?.sendAudio(base64Audio);
    });

    recorderRef.current.onVolume((volume) => {
      setMicVolume(volume);
      setIsListening(volume > 0.01);
    });

    // Set up player callbacks
    playerRef.current.onPlayingChange((playing) => {
      setIsSpeaking(playing);
    });

    // Set up client event listeners
    const client = clientRef.current;

    client.on('statuschange', (newStatus) => {
      setStatus(newStatus as ConnectionStatus);
    });

    client.on('error', (err) => {
      setError((err as Error).message);
    });

    client.on('audio', (base64Audio) => {
      playerRef.current?.addAudio(base64Audio as string);
    });

    client.on('text', (text) => {
      setStreamingText((prev) => prev + (text as string));
    });

    client.on('turncomplete', () => {
      // Save the streaming text as a transcript
      setStreamingText((text) => {
        if (text) {
          const transcript: Transcript = {
            id: Date.now().toString(),
            role: 'model',
            text,
            timestamp: Date.now(),
          };
          setTranscripts((prev) => [...prev, transcript]);
        }
        return '';
      });
    });

    client.on('interrupted', () => {
      playerRef.current?.clear();
    });

    client.on('inputTranscription', (text) => {
      setInputTranscript(text as string);
    });

    client.on('outputTranscription', (text) => {
      setOutputTranscript(text as string);
    });

    return () => {
      recorderRef.current?.stop();
      playerRef.current?.close();
      clientRef.current?.disconnect();
    };
  }, [apiKey]);

  // Connect
  const connect = useCallback(async () => {
    console.log('[DEBUG useGeminiLive] connect() called');
    if (!clientRef.current) {
      console.log('[DEBUG useGeminiLive] No client ref, returning');
      return;
    }

    setError(null);

    const config: LiveClientConfig = {
      systemInstruction,
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName,
          },
        },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    };

    try {
      console.log('[DEBUG useGeminiLive] Calling client.connect with model:', model);
      const success = await clientRef.current.connect(model, config);
      console.log('[DEBUG useGeminiLive] client.connect returned:', success);

      if (success) {
        // Start recording
        console.log('[DEBUG useGeminiLive] Starting recorder...');
        await recorderRef.current?.start();
        console.log('[DEBUG useGeminiLive] Recorder started, initializing player...');
        await playerRef.current?.init();
        console.log('[DEBUG useGeminiLive] Player initialized');
      }
    } catch (err) {
      console.error('[DEBUG useGeminiLive] Error:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  }, [model, systemInstruction, voiceName]);

  // Disconnect
  const disconnect = useCallback(() => {
    recorderRef.current?.stop();
    playerRef.current?.stop();
    clientRef.current?.disconnect();
    setMicVolume(0);
    setIsListening(false);
    setIsSpeaking(false);
    setStreamingText('');
  }, []);

  // Send text
  const sendText = useCallback((text: string) => {
    if (!clientRef.current) return;

    // Add user transcript
    const transcript: Transcript = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: Date.now(),
    };
    setTranscripts((prev) => [...prev, transcript]);

    clientRef.current.sendText(text);
  }, []);

  // Send image
  const sendImage = useCallback((base64Image: string, mimeType = 'image/jpeg') => {
    clientRef.current?.sendImage(base64Image, mimeType);
  }, []);

  // Clear transcripts
  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
    setStreamingText('');
  }, []);

  return {
    status,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    error,
    isSpeaking,
    isListening,
    micVolume,
    transcripts,
    streamingText,
    inputTranscript,
    outputTranscript,
    connect,
    disconnect,
    sendText,
    sendImage,
    clearTranscripts,
  };
}
