'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera, Save, Volume2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { translateCameraImage } from '@/lib/gemini-camera-translate';
import { analyzeDish } from '@/lib/gemini-dish-analyze';
import type { Language, CameraTranslationResult, CameraMode, DishAnalysis } from '@/types';
import { DishCard } from '@/components/chat/DishCard';

interface CameraTranslateViewProps {
  toLang: Language;
  onClose: () => void;
  onSaveTranslation: (result: CameraTranslationResult) => void;
  onSaveDish?: (dish: DishAnalysis) => void;
}

type CameraState = 'starting' | 'ready' | 'capturing' | 'translating' | 'result' | 'error';

export function CameraTranslateView({
  toLang,
  onClose,
  onSaveTranslation,
  onSaveDish,
}: CameraTranslateViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>('starting');
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<CameraTranslationResult | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('translate');
  const [dishResult, setDishResult] = useState<DishAnalysis | null>(null);

  // Start camera on mount
  useEffect(() => {
    let active = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', '');
          videoRef.current.muted = true;
          await videoRef.current.play();
        }

        setCameraState('ready');
      } catch {
        if (active) {
          setErrorMessage('Camera access denied. Please allow camera access in your browser settings.');
          setCameraState('error');
        }
      }
    }

    startCamera();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleCapture = useCallback(async () => {
    if (cameraState !== 'ready' || !videoRef.current || !canvasRef.current) return;

    setCameraState('capturing');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    const base64 = dataUrl.split(',')[1];

    setCameraState('translating');

    try {
      if (cameraMode === 'dish') {
        const dishRes = await analyzeDish(base64, toLang.name);
        setDishResult(dishRes);
      } else {
        const translationResult = await translateCameraImage(base64, toLang.name);
        setResult(translationResult);
      }
      setCameraState('result');
    } catch {
      setErrorMessage('Translation failed. Tap the shutter to try again.');
      setCameraState('error');
    }
  }, [cameraState, cameraMode, toLang.name]);

  const handleRetry = useCallback(() => {
    setResult(null);
    setDishResult(null);
    setCameraState('ready');
  }, []);

  const handleSpeak = useCallback(() => {
    if (!result) return;
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(result.translatedText);
      utterance.lang = toLang.code;
      speechSynthesis.speak(utterance);
    }
  }, [result, toLang.code]);

  const handleSave = useCallback(() => {
    if (cameraMode === 'dish' && dishResult) {
      onSaveDish?.(dishResult);
    } else if (result) {
      onSaveTranslation(result);
    }
  }, [cameraMode, dishResult, result, onSaveDish, onSaveTranslation]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Video viewfinder */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />
        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Dim overlay while translating */}
        {(cameraState === 'capturing' || cameraState === 'translating') && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <p className="text-white text-sm font-medium">Translating...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {cameraState === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <p className="text-white text-center text-sm">{errorMessage}</p>
          </div>
        )}

        {/* Corner guides */}
        {cameraState === 'ready' && (
          <>
            <div className="absolute top-1/3 left-8 right-8 bottom-1/3 border-2 border-white/20 rounded-lg pointer-events-none" />
            <p className="absolute bottom-36 inset-x-0 text-center text-white/60 text-xs">
              Point at a menu, sign, or notice
            </p>
          </>
        )}

        {/* Close button */}
        <button
          aria-label="close"
          onClick={onClose}
          className="absolute top-4 left-4 h-10 w-10 rounded-full bg-black/40 flex items-center justify-center text-white backdrop-blur-sm"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Language badge */}
        <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm">
          <span className="text-white text-xs font-medium">→ {toLang.flag} {toLang.name}</span>
        </div>
      </div>

      {/* Bottom dock */}
      <div className="bg-background/95 backdrop-blur-xl">
        {/* Translation result sheet */}
        {cameraState === 'result' && result && (
          <div className="px-5 pt-4 pb-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                {result.detectedLanguage}
              </span>
              <div className="flex gap-2">
                <button
                  aria-label="speak"
                  onClick={handleSpeak}
                  className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
                <button
                  aria-label="retry"
                  onClick={handleRetry}
                  className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  aria-label="save"
                  onClick={handleSave}
                  className="h-8 px-3 flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <Save className="h-3 w-3" />
                  Save
                </button>
              </div>
            </div>
            <p className="text-base font-medium leading-relaxed">{result.translatedText}</p>
            {result.extractedText && result.extractedText !== result.translatedText && (
              <p className="text-xs text-muted-foreground leading-relaxed">{result.extractedText}</p>
            )}
          </div>
        )}

        {/* Dish result */}
        {cameraState === 'result' && dishResult && cameraMode === 'dish' && (
          <div className="px-4 pt-3 pb-2">
            <DishCard dish={dishResult} onChatAboutThis={(dish) => { onSaveDish?.(dish); }} />
            <div className="flex justify-end mt-2">
              <button
                aria-label="save"
                onClick={handleSave}
                className="h-8 px-3 flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                <Save className="h-3 w-3" />
                Save
              </button>
            </div>
          </div>
        )}

        {/* Mode toggle */}
        <div className="flex items-center justify-center gap-1 mb-4">
          {(['translate', 'dish'] as CameraMode[]).map((m) => (
            <button
              key={m}
              aria-label={m}
              onClick={() => { setCameraMode(m); setResult(null); setDishResult(null); setCameraState('ready'); }}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
                cameraMode === m
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {m === 'translate' ? 'Translate' : 'Dish'}
            </button>
          ))}
        </div>

        {/* Shutter button */}
        <div className="flex items-center justify-center py-6">
          <button
            aria-label="capture"
            onClick={handleCapture}
            disabled={cameraState !== 'ready'}
            className={cn(
              'h-16 w-16 rounded-full border-4 transition-all duration-150 active:scale-90',
              cameraState === 'ready'
                ? 'border-white bg-white/20 hover:bg-white/30'
                : 'border-white/30 bg-white/5 cursor-not-allowed'
            )}
          >
            <Camera className="h-6 w-6 text-white mx-auto" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default CameraTranslateView;
