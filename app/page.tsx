'use client';

import { useState, useRef, useEffect } from 'react';
import { useGeminiLive } from '@/hooks/useGeminiLive';
import {
  Camera,
  Languages,
  Volume2,
  VolumeX
} from 'lucide-react';
import Onboarding from './components/Onboarding';
import { VoiceOrb, VoiceOrbState } from '@/components/translator/VoiceOrb';
import { ChatPanel } from '@/components/translator/ChatPanel';
import { ChatMessage } from '@/components/translator/ChatMessage';
import { HistoryDrawer } from '@/components/translator/HistoryDrawer';

const SYSTEM_INSTRUCTION = `You are a real-time voice translator assistant. Your job is to:
1. Listen to speech in any language
2. Identify the language being spoken
3. Translate it naturally to the user's preferred language (default: English)
4. Respond conversationally

When you see images (like menus, signs, or products), describe and translate any visible text.

For currency: If you see Japanese Yen prices, also provide the approximate CAD equivalent.

Keep responses concise and natural - this is a real-time conversation.`;

export default function TranslatorPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [muted, setMuted] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';

  const {
    status,
    isConnected,
    isConnecting,
    isSpeaking,
    isListening,
    error,
    transcripts,
    streamingText,
    connect,
    disconnect,
    sendImage,
  } = useGeminiLive({
    apiKey,
    model: 'models/gemini-2.0-flash-exp',
    systemInstruction: SYSTEM_INSTRUCTION,
    voiceName: 'Aoede',
  });

  // Send camera frames periodically when connected
  useEffect(() => {
    if (!isConnected || !cameraActive || !videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sendFrame = () => {
      if (!videoRef.current || !isConnected) return;

      // Scale down for efficiency
      const maxWidth = 512;
      const scale = Math.min(1, maxWidth / videoRef.current.videoWidth);
      canvas.width = videoRef.current.videoWidth * scale;
      canvas.height = videoRef.current.videoHeight * scale;

      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
      sendImage(base64, 'image/jpeg');
    };

    // Send frame every 2 seconds
    const interval = setInterval(sendFrame, 2000);

    return () => clearInterval(interval);
  }, [isConnected, cameraActive, sendImage]);

  const handleConnect = async () => {
    console.log('[DEBUG] handleConnect called, isConnected:', isConnected);

    if (isConnected) {
      console.log('[DEBUG] Already connected, disconnecting...');
      stopCamera();
      disconnect();
      return;
    }

    console.log('[DEBUG] apiKey present:', !!apiKey, 'length:', apiKey?.length);
    if (!apiKey) {
      console.error('NEXT_PUBLIC_GOOGLE_API_KEY is not set');
      return;
    }

    try {
      console.log('[DEBUG] Starting camera...');
      await startCamera();
      console.log('[DEBUG] Camera started, connecting to Gemini...');
      await connect();
      console.log('[DEBUG] Gemini connection complete');
    } catch (err) {
      console.error('[DEBUG] Connection failed:', err);
      stopCamera();
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      throw err;
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  // Compute VoiceOrb state based on connection status
  const getOrbState = (): VoiceOrbState => {
    if (isConnecting) return 'connecting';
    if (isConnected && isListening) return 'listening';
    if (isConnected && isSpeaking) return 'speaking';
    if (isConnected) return 'listening';
    return 'idle';
  };

  return (
    <main className="relative min-h-dvh flex flex-col">
      <Onboarding />

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

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
          {error && (
            <div className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* API key warning */}
          {!apiKey && (
            <div className="mb-4 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-center">
              <p className="text-yellow-400 text-sm">Set NEXT_PUBLIC_GOOGLE_API_KEY in your environment</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-6">
            {/* Mute button */}
            <button
              onClick={() => setMuted(!muted)}
              disabled={!isConnected}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isConnected
                  ? 'bg-ink-800 text-white hover:bg-ink-700'
                  : 'bg-ink-900 text-ink-600'
              }`}
            >
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
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
            {isConnected && isListening && 'Listening...'}
            {isConnected && isSpeaking && 'Speaking...'}
            {isConnected && !isListening && !isSpeaking && 'Ready - speak or point camera'}
            {!isConnected && !isConnecting && 'Tap to start'}
          </p>
        </div>
      </div>
    </main>
  );
}
