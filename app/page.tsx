'use client';

import { useState, useRef, useEffect } from 'react';
import { useGeminiLive, canScreenRecord, isIOS, isMobile } from 'gemini-live-react';
import { 
  Mic, 
  MicOff, 
  Camera, 
  Languages, 
  Coins, 
  Volume2, 
  VolumeX,
  RefreshCw,
  ChevronDown
} from 'lucide-react';

type Mode = 'translate' | 'currency';
type Direction = 'en-to-jp' | 'jp-to-en';

const EXCHANGE_API = 'https://api.exchangerate-api.com/v4/latest/JPY';

export default function TranslatorPage() {
  const [mode, setMode] = useState<Mode>('translate');
  const [direction, setDirection] = useState<Direction>('en-to-jp');
  const [showDirectionPicker, setShowDirectionPicker] = useState(false);
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

  const getSystemPrompt = () => {
    if (mode === 'translate') {
      return direction === 'en-to-jp'
        ? `You are a real-time English to Japanese translator. 
           Listen to English speech and respond with the Japanese translation spoken naturally.
           Speak only the translation - no explanations or extras.
           Use natural, conversational Japanese appropriate for the context.
           If the input is unclear, ask for clarification in English.`
        : `You are a real-time Japanese to English translator.
           Listen to Japanese speech and respond with the English translation spoken naturally.
           Speak only the translation - no explanations or extras.
           Use natural, conversational English appropriate for the context.
           If the input is unclear, ask for clarification in Japanese.`;
    } else {
      return `You are a helpful assistant that converts prices from Japanese Yen to Canadian Dollars.
              When you see a price tag, menu, or any price in the camera feed:
              1. Call the convert_currency tool with the amount
              2. Speak the result naturally, like "That's about $22 Canadian"
              If you can't see a price clearly, ask the user to show it more clearly.
              Current exchange rate: 1 JPY = ${exchangeRate?.toFixed(6) || '0.009'} CAD`;
    }
  };

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
    welcomeMessage: mode === 'translate' 
      ? 'Ready to translate. Start speaking.'
      : 'Ready. Show me a price tag or menu.',
    debug: process.env.NODE_ENV === 'development',
    vad: true,
    vadOptions: {
      threshold: 0.5,
      minSpeechDuration: 250,
      silenceDuration: 500,
    },
    tools: mode === 'currency' ? [
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
    ] : [],
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

    // For currency mode, start camera
    if (mode === 'currency') {
      await startCamera();
      await connect(videoRef.current!);
    } else {
      await connect();
    }
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

  const handleModeChange = (newMode: Mode) => {
    if (isConnected) {
      disconnect();
      stopCamera();
    }
    setMode(newMode);
  };

  const toggleDirection = () => {
    setDirection(d => d === 'en-to-jp' ? 'jp-to-en' : 'en-to-jp');
    setShowDirectionPicker(false);
  };

  return (
    <main className="relative min-h-dvh flex flex-col">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 glass-card border-b border-white/5">
        <div className="px-4 py-3 flex items-center justify-between safe-area-top">
          <div className="flex items-center gap-2">
            <Languages className="w-6 h-6" />
            <h1 className="font-medium text-lg">Voice Translator</h1>
          </div>

          {/* Mode Toggle */}
          <div className="mode-toggle">
            <div className={`mode-toggle-slider ${mode === 'currency' ? 'currency' : ''}`} />
            <button
              onClick={() => handleModeChange('translate')}
              className={`relative z-10 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                mode === 'translate' ? 'text-white' : 'text-ink-400'
              }`}
            >
              <Languages className="w-4 h-4 inline mr-1" />
              Translate
            </button>
            <button
              onClick={() => handleModeChange('currency')}
              className={`relative z-10 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                mode === 'currency' ? 'text-white' : 'text-ink-400'
              }`}
            >
              <Coins className="w-4 h-4 inline mr-1" />
              Currency
            </button>
          </div>
        </div>

        {/* Direction Picker (Translate mode only) */}
        {mode === 'translate' && (
          <div className="px-4 pb-3">
            <button
              onClick={() => setShowDirectionPicker(!showDirectionPicker)}
              className="w-full flex items-center justify-center gap-3 py-2 rounded-xl bg-ink-900/50 border border-ink-800"
            >
              <span className={direction === 'en-to-jp' ? 'text-white' : 'text-ink-400'}>
                English
              </span>
              <RefreshCw 
                className={`w-4 h-4 text-sakura-500 transition-transform ${
                  direction === 'jp-to-en' ? 'rotate-180' : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDirection();
                }}
              />
              <span className={direction === 'jp-to-en' ? 'text-white' : 'text-ink-400'}>
                日本語
              </span>
            </button>
          </div>
        )}
      </header>

      {/* Camera View (Currency mode) */}
      {mode === 'currency' && (
        <div className="fixed inset-0 pt-[120px] pb-[200px] z-0">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
          />
          {!cameraActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink-950">
              <div className="text-center text-ink-400">
                <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Tap the button to start</p>
                <p className="text-sm mt-1">Point camera at prices</p>
              </div>
            </div>
          )}
          
          {/* Currency overlay */}
          {cameraActive && exchangeRate && (
            <div className="absolute top-4 left-4 glass-card px-3 py-2 rounded-lg">
              <p className="text-xs text-ink-400">Current Rate</p>
              <p className="text-sm font-medium">¥100 = ${(100 * exchangeRate).toFixed(2)} CAD</p>
            </div>
          )}
        </div>
      )}

      {/* Transcript Area */}
      <div className={`flex-1 overflow-y-auto px-4 pb-40 ${
        mode === 'translate' ? 'pt-[140px]' : 'pt-[120px]'
      }`}>
        <div className="max-w-lg mx-auto space-y-3">
          {transcripts.map((t) => (
            <div
              key={t.id}
              className={`transcript-bubble ${t.role === 'user' ? 'user' : 'ai'}`}
            >
              <p className={t.role === 'assistant' && mode === 'translate' ? 'font-japanese' : ''}>
                {t.text}
              </p>
            </div>
          ))}
          
          {/* Streaming text */}
          {streamingText && (
            <div className="transcript-bubble ai opacity-70">
              <p className={mode === 'translate' ? 'font-japanese' : ''}>{streamingText}</p>
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
              ) : mode === 'currency' ? (
                <Camera className="w-8 h-8" />
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
            {isConnected && isSpeaking && 'Translating...'}
            {isConnected && !isUserSpeaking && !isSpeaking && (
              mode === 'translate' ? 'Speak now' : 'Point at a price'
            )}
            {!isConnected && !isConnecting && (
              mode === 'translate' 
                ? 'Tap to start translating' 
                : 'Tap to scan prices'
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
