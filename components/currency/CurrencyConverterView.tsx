'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Language } from '@/types';

interface CurrencyConverterViewProps {
  currentLanguage: Language;
  onBack: () => void;
}

// Currency data by language code
const CURRENCY_DATA: Record<string, { code: string; symbol: string; name: string; rateToUSD: number }> = {
  ja: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rateToUSD: 0.0067 },
  es: { code: 'EUR', symbol: '€', name: 'Euro', rateToUSD: 1.09 },
  fr: { code: 'EUR', symbol: '€', name: 'Euro', rateToUSD: 1.09 },
  ko: { code: 'KRW', symbol: '₩', name: 'Korean Won', rateToUSD: 0.00075 },
  zh: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', rateToUSD: 0.14 },
  en: { code: 'USD', symbol: '$', name: 'US Dollar', rateToUSD: 1 },
};

// Common amounts for quick conversion
const QUICK_AMOUNTS = [100, 500, 1000, 5000, 10000];

export const CurrencyConverterView: React.FC<CurrencyConverterViewProps> = ({
  currentLanguage,
  onBack,
}) => {
  const currency = CURRENCY_DATA[currentLanguage.code] || CURRENCY_DATA['en'];
  const [amount, setAmount] = useState<string>('');
  const [converted, setConverted] = useState<string>('0.00');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const val = parseFloat(amount);
    if (!isNaN(val)) {
      const res = val * currency.rateToUSD;
      setConverted(res.toFixed(2));
    } else {
      setConverted('0.00');
    }
  }, [amount, currency.rateToUSD]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleScanClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraClick = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setCameraStream(stream);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      console.error('Failed to access camera:', error);
      alert('Could not access camera. Please check permissions.');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        setCapturedImage(canvas.toDataURL('image/jpeg'));
      }
    }
    // Stop camera
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const clearImage = () => {
    setCapturedImage(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-dark">
      {/* Hero with city background */}
      <div className="relative h-48 overflow-hidden">
        {/* City skyline gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(to bottom,
                rgba(15, 23, 42, 0.3) 0%,
                rgba(15, 23, 42, 0.6) 50%,
                rgba(15, 23, 42, 1) 100%
              ),
              linear-gradient(135deg,
                #1e3a5f 0%,
                #0f172a 50%,
                #1e1b4b 100%
              )
            `
          }}
        >
          {/* City silhouette effect */}
          <div className="absolute bottom-0 left-0 right-0 h-24 opacity-30"
            style={{
              background: `
                linear-gradient(90deg,
                  transparent 0%,
                  #3b82f6 2%, #3b82f6 3%,
                  transparent 4%,
                  transparent 8%,
                  #3b82f6 9%, #3b82f6 12%,
                  transparent 13%,
                  transparent 18%,
                  #3b82f6 19%, #3b82f6 21%,
                  transparent 22%,
                  transparent 30%,
                  #3b82f6 31%, #3b82f6 35%,
                  transparent 36%,
                  transparent 45%,
                  #3b82f6 46%, #3b82f6 48%,
                  transparent 49%,
                  transparent 55%,
                  #3b82f6 56%, #3b82f6 60%,
                  transparent 61%,
                  transparent 70%,
                  #3b82f6 71%, #3b82f6 73%,
                  transparent 74%,
                  transparent 82%,
                  #3b82f6 83%, #3b82f6 87%,
                  transparent 88%,
                  transparent 95%,
                  #3b82f6 96%, #3b82f6 98%,
                  transparent 100%
                )
              `,
              maskImage: 'linear-gradient(to top, black 0%, transparent 100%)'
            }}
          />
          {/* Glowing dots for windows */}
          <div className="absolute bottom-8 left-[10%] w-1 h-1 bg-yellow-300 rounded-full animate-pulse" />
          <div className="absolute bottom-12 left-[15%] w-1 h-1 bg-yellow-200 rounded-full animate-pulse" style={{animationDelay: '0.5s'}} />
          <div className="absolute bottom-6 left-[35%] w-1 h-1 bg-yellow-300 rounded-full animate-pulse" style={{animationDelay: '0.3s'}} />
          <div className="absolute bottom-14 left-[50%] w-1 h-1 bg-yellow-200 rounded-full animate-pulse" style={{animationDelay: '0.7s'}} />
          <div className="absolute bottom-10 left-[70%] w-1 h-1 bg-yellow-300 rounded-full animate-pulse" style={{animationDelay: '0.2s'}} />
          <div className="absolute bottom-8 left-[85%] w-1 h-1 bg-yellow-200 rounded-full animate-pulse" style={{animationDelay: '0.6s'}} />
        </div>

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-10 left-6 w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center hover:bg-black/50 transition-all active:scale-95 z-10"
        >
          <span className="material-symbols-outlined text-lg text-white">arrow_back</span>
        </button>

        {/* Title */}
        <div className="absolute top-10 left-20 right-6 z-10">
          <h1 className="text-2xl font-bold text-white">Currency Converter</h1>
          <p className="text-xs text-white/60">{currency.name} to USD</p>
        </div>

        {/* Scan/Camera buttons */}
        <div className="absolute bottom-4 left-6 right-6 flex gap-3 z-10">
          <button
            onClick={handleScanClick}
            className="flex-1 py-3 px-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center gap-2 hover:bg-white/20 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-fluent-primary">document_scanner</span>
            <span className="text-sm font-semibold text-white">Scan</span>
          </button>
          <button
            onClick={handleCameraClick}
            className="flex-1 py-3 px-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center gap-2 hover:bg-white/20 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-fluent-secondary">photo_camera</span>
            <span className="text-sm font-semibold text-white">Camera</span>
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Captured image preview */}
      {capturedImage && (
        <div className="px-6 py-3">
          <div className="relative rounded-2xl overflow-hidden">
            <img src={capturedImage} alt="Captured" className="w-full h-32 object-cover" />
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-white text-sm">close</span>
            </button>
            <div className="absolute bottom-2 left-2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm">
              <span className="text-xs text-white/80">Enter amount from image below</span>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 no-scrollbar pb-24">
        {/* Converter */}
        <div className="space-y-3">
          {/* From Currency */}
          <div className="glass-panel-light p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">From</span>
              <span className="text-[10px] text-fluent-primary">{currency.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white/40">{currency.symbol}</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="flex-1 bg-transparent border-none focus:ring-0 text-3xl font-bold text-white placeholder:text-white/20 text-right"
              />
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-fluent-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-fluent-primary text-sm">arrow_downward</span>
            </div>
          </div>

          {/* To USD */}
          <div className="glass-panel-light p-5 rounded-2xl space-y-2 border border-fluent-primary/30">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">To</span>
              <span className="text-[10px] text-fluent-primary">US Dollar</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-fluent-primary">$</span>
              <div className="flex-1 text-3xl font-bold text-fluent-primary text-right">
                {converted}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Amounts */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Quick Convert</h3>
          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value}
                onClick={() => handleQuickAmount(value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                  amount === value.toString()
                    ? 'bg-fluent-primary text-white'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {currency.symbol}{value.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Exchange Rate */}
        <div className="glass-panel-light p-3 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-fluent-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-fluent-primary text-sm">info</span>
          </div>
          <div>
            <p className="text-xs text-white">1 {currency.code} = ${currency.rateToUSD.toFixed(4)} USD</p>
            <p className="text-[10px] text-white/30">Rates are approximate</p>
          </div>
        </div>
      </div>

      {/* Camera overlay */}
      {showCamera && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col">
          <div className="flex-1 relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[80%] h-[40%] border-2 border-fluent-primary/50 rounded-2xl">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 px-4 py-1 rounded-full">
                  <span className="text-xs text-fluent-primary">Point at price</span>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6 bg-background-dark flex gap-4">
            <button
              onClick={closeCamera}
              className="flex-1 py-4 rounded-2xl bg-white/10 text-white font-bold"
            >
              Cancel
            </button>
            <button
              onClick={capturePhoto}
              className="flex-1 py-4 rounded-2xl bg-fluent-primary text-background-dark font-bold"
            >
              Capture
            </button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
};

export default CurrencyConverterView;
