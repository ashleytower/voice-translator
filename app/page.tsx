'use client';

import { useState, useRef, useEffect } from 'react';
import { useGeminiLive, canScreenRecord, isIOS, isMobile } from 'gemini-live-react';
import {
  Mic,
  MicOff,
  Camera,
  Languages,
  RefreshCw,
  Volume2,
  VolumeX
} from 'lucide-react';
import Onboarding from './components/Onboarding';

const EXCHANGE_API = 'https://api.exchangerate-api.com/v4/latest/JPY';

export default function TranslatorPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  // Fetch exchange rate on mount
  useEffect(() => {
    fetch(EXCHANGE_API)
      .then(res => res.json())
      .then(data => setExchangeRate(data.rates?.CAD))
      .catch(console.error);
  }, []);

  const {
    connect,
    disconnect,
    transcripts,
    isConnected,
    isConnecting,
    isSpeaking,
    isMuted,
    setMuted,
    isUserSpeaking,
    error,
    streamingText,
  } = useGeminiLive({
    proxyUrl: process.env.NEXT_PUBLIC_PROXY_URL || 'wss://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/gemini-live-proxy',
    welcomeMessage: 'Speak or point at something to translate.',
    debug: process.env.NODE_ENV === 'development',
    vad: true,
    vadOptions: {
      threshold: 0.5,
      minSpeechDuration: 250,
      silenceDuration: 500,
    },
    tools: [
      {
        name: 'convert_currency',
        description: 'Convert a price from Japanese Yen (JPY) to Canadian Dollars (CAD)',
        parameters: {
          type: 'object',
          properties: {
            amount: { 
              type: 'number', 
              description: 'The amount in Japanese Yen to convert' 
            },
          },
          required: ['amount'],
        },
      },
    ],
    onToolCall: async (toolName, args) => {
      if (toolName === 'convert_currency' && exchangeRate) {
        const jpy = args.amount as number;
        const cad = jpy * exchangeRate;
        return { 
          jpy, 
          cad: Math.round(cad * 100) / 100,
          rate: exchangeRate,
          formatted: `¥${jpy.toLocaleString()} = $${cad.toFixed(2)} CAD`
        };
      }
      return { error: 'Exchange rate not available' };
    },
  });

  const handleConnect = async () => {
    if (isConnected) {
      stopCamera();
      disconnect();
      return;
    }

    // Always start camera for visual recognition
    await startCamera();
    await connect(videoRef.current!);
  };

  const startCamera = async () => {
    try {
      const constraints = {
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  return (
    <main className="relative min-h-dvh flex flex-col">
      <Onboarding />

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 glass-card border-b border-white/5">
        <div className="px-4 py-3 flex items-center justify-center safe-area-top">
          <div className="flex items-center gap-2">
            <Languages className="w-6 h-6" />
            <h1 className="font-medium text-lg">Voice Translator</h1>
          </div>
        </div>
      </header>

      {/* Camera View - Full screen background */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
        />
        {/* Dark overlay for text readability */}
        {cameraActive && (
          <div className="absolute inset-0 bg-black/40" />
        )}
        {!cameraActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-950">
            <div className="text-center text-ink-400">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Tap the button to start</p>
              <p className="text-sm mt-1">Speak or point at something</p>
            </div>
          </div>
        )}
      </div>

      {/* Transcript Area */}
      <div className="flex-1 overflow-y-auto px-4 pb-40 pt-[80px] relative z-10">
        <div className="max-w-lg mx-auto space-y-3">
          {transcripts.map((t) => (
            <div
              key={t.id}
              className={`transcript-bubble ${t.role === 'user' ? 'user' : 'ai'}`}
            >
              <p>{t.text}</p>
            </div>
          ))}

          {/* Streaming text */}
          {streamingText && (
            <div className="transcript-bubble ai opacity-70">
              <p>{streamingText}</p>
            </div>
          )}

          {/* Speaking indicator */}
          {isSpeaking && !streamingText && (
            <div className="transcript-bubble ai">
              <div className="audio-wave">
                <span /><span /><span /><span /><span />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="fixed bottom-0 inset-x-0 glass-card border-t border-white/5 safe-area-bottom">
        <div className="px-4 py-6">
          {/* Error display */}
          {error && (
            <div className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-6">
            {/* Mute button */}
            <button
              onClick={() => setMuted(!isMuted)}
              disabled={!isConnected}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isConnected 
                  ? 'bg-ink-800 text-white hover:bg-ink-700' 
                  : 'bg-ink-900 text-ink-600'
              }`}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Main action button */}
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className={`fab ${isConnected && isUserSpeaking ? 'listening' : ''} ${
                isConnected 
                  ? 'bg-sakura-500 text-white' 
                  : 'bg-sakura-500 text-white'
              } ${isConnecting ? 'opacity-50' : ''}`}
            >
              {isConnecting ? (
                <RefreshCw className="w-8 h-8 animate-spin" />
              ) : isConnected ? (
                <MicOff className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>

            {/* Placeholder for symmetry */}
            <div className="w-12 h-12" />
          </div>

          {/* Status text */}
          <p className="text-center text-sm text-ink-400 mt-4">
            {isConnecting && 'Connecting...'}
            {isConnected && isUserSpeaking && 'Listening...'}
            {isConnected && isSpeaking && 'Processing...'}
            {isConnected && !isUserSpeaking && !isSpeaking && 'Speak or point at something'}
            {!isConnected && !isConnecting && 'Tap to start'}
          </p>
        </div>
      </div>
    </main>
  );
}
