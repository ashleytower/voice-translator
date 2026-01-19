'use client';

import { useState, useRef, useEffect } from 'react';
import { useGeminiLive, canScreenRecord, isIOS, isMobile } from 'gemini-live-react';
import {
  Camera,
  Languages,
  Volume2,
  VolumeX
} from 'lucide-react';
import Onboarding from './components/Onboarding';
import {
  validateProxyUrl,
  setupCameraWithErrorHandling,
  stopMediaStream,
  handleConnectionError,
} from '@/lib/connection-utils';
import { VoiceOrb, VoiceOrbState } from '@/components/translator/VoiceOrb';
import { ChatPanel } from '@/components/translator/ChatPanel';
import { ChatMessage } from '@/components/translator/ChatMessage';
import { HistoryDrawer } from '@/components/translator/HistoryDrawer';

const EXCHANGE_API = 'https://api.exchangerate-api.com/v4/latest/JPY';

export default function TranslatorPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [userError, setUserError] = useState<string | null>(null);

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
      setUserError(null);
      return;
    }

    // Clear previous errors
    setUserError(null);

    // Validate proxy URL before connecting
    const proxyUrl = process.env.NEXT_PUBLIC_PROXY_URL || '';
    const validation = validateProxyUrl(proxyUrl);

    if (!validation.isValid) {
      setUserError(validation.error?.userMessage || 'Configuration error');
      return;
    }

    try {
      // Always start camera for visual recognition
      await startCamera();

      // Connect to Gemini Live
      await connect(videoRef.current!);
    } catch (err) {
      const connectionError = handleConnectionError(err);
      setUserError(connectionError.userMessage);
      console.error('Connection error:', connectionError);

      // Clean up camera if connection fails
      stopCamera();
    }
  };

  const startCamera = async () => {
    const result = await setupCameraWithErrorHandling({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });

    if (!result.success) {
      setUserError(result.error?.userMessage || 'Failed to access camera');
      console.error('Camera error:', result.error);
      throw new Error(result.error?.userMessage);
    }

    if (videoRef.current && result.stream) {
      videoRef.current.srcObject = result.stream;
      await videoRef.current.play();
      setCameraActive(true);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stopMediaStream(stream);
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  // Compute VoiceOrb state based on connection status
  const getOrbState = (): VoiceOrbState => {
    if (isConnecting) return 'connecting';
    if (isConnected && isUserSpeaking) return 'listening';
    if (isConnected && isSpeaking) return 'speaking';
    if (isConnected) return 'listening';
    return 'idle';
  };

  return (
    <main className="relative min-h-dvh flex flex-col">
      <Onboarding />

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 glass-card border-b border-white/5">
        <div className="px-4 py-3 flex items-center justify-between safe-area-top">
          <div className="w-10" /> {/* Spacer for centering */}
          <div className="flex items-center gap-2">
            <Languages className="w-6 h-6" />
            <h1 className="font-medium text-lg">Voice Translator</h1>
          </div>
          <HistoryDrawer />
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
        <ChatPanel className="max-w-lg mx-auto min-h-[200px] max-h-[60vh]">
          <div className="space-y-2">
            {transcripts.map((t) => (
              <ChatMessage
                key={t.id}
                role={t.role === 'user' ? 'user' : 'assistant'}
                content={t.text}
              />
            ))}

            {/* Streaming text */}
            {streamingText && (
              <ChatMessage
                role="assistant"
                content={streamingText}
                className="opacity-70"
              />
            )}

            {/* Speaking indicator */}
            {isSpeaking && !streamingText && (
              <div className="flex justify-start">
                <div className="bg-green-500/20 border border-green-500/30 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="audio-wave">
                    <span /><span /><span /><span /><span />
                  </div>
                </div>
              </div>
            )}

            {/* Empty state */}
            {transcripts.length === 0 && !streamingText && !isSpeaking && (
              <div className="text-center text-ink-400 py-8">
                <p>Start speaking or point your camera</p>
                <p className="text-sm mt-1">Translations will appear here</p>
              </div>
            )}
          </div>
        </ChatPanel>
      </div>

      {/* Bottom Controls */}
      <div className="fixed bottom-0 inset-x-0 glass-card border-t border-white/5 safe-area-bottom">
        <div className="px-4 py-6">
          {/* Error display */}
          {(error || userError) && (
            <div className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
              <p className="text-red-400 text-sm">{userError || error}</p>
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

            {/* Main action button - VoiceOrb */}
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent rounded-full"
            >
              <VoiceOrb state={getOrbState()} className="w-20 h-20 cursor-pointer hover:scale-105 transition-transform" />
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
