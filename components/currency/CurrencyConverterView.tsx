'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Language } from '@/types';

interface CurrencyConverterViewProps {
  currentLanguage: Language;
  onBack: () => void;
}

// All available currencies for selection
const ALL_CURRENCIES = [
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rateToUSD: 0.0067 },
  { code: 'EUR', symbol: '€', name: 'Euro', rateToUSD: 1.09 },
  { code: 'GBP', symbol: '£', name: 'British Pound', rateToUSD: 1.27 },
  { code: 'KRW', symbol: '₩', name: 'Korean Won', rateToUSD: 0.00075 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', rateToUSD: 0.14 },
  { code: 'USD', symbol: '$', name: 'US Dollar', rateToUSD: 1 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', rateToUSD: 0.74 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', rateToUSD: 0.65 },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', rateToUSD: 0.058 },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', rateToUSD: 0.029 },
];

// Currency data by language code (for default selection)
const CURRENCY_BY_LANG: Record<string, string> = {
  ja: 'JPY',
  es: 'EUR',
  fr: 'EUR',
  ko: 'KRW',
  zh: 'CNY',
  en: 'USD',
};

// Common amounts for quick conversion
const QUICK_AMOUNTS = [100, 500, 1000, 5000, 10000];

// Format number with commas for display
const formatNumber = (num: number | string): string => {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

export const CurrencyConverterView: React.FC<CurrencyConverterViewProps> = ({
  currentLanguage,
  onBack,
}) => {
  const defaultCurrencyCode = CURRENCY_BY_LANG[currentLanguage.code] || 'USD';
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>(defaultCurrencyCode);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const currency = ALL_CURRENCIES.find(c => c.code === selectedCurrencyCode) || ALL_CURRENCIES[5];
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

        {/* Scan button and Beautiful Blue Eye Camera button */}
        <div className="absolute bottom-4 left-6 right-6 flex items-center gap-4 z-10">
          {/* Scan button */}
          <button
            onClick={handleScanClick}
            className="py-3 px-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center gap-2 hover:bg-white/20 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-fluent-primary">document_scanner</span>
            <span className="text-sm font-semibold text-white">Scan</span>
          </button>

          {/* Beautiful Blue Eye Camera Button */}
          <button
            onClick={handleCameraClick}
            className="relative flex-1 group"
            aria-label="Capture price tag"
          >
            <div className="flex items-center justify-center">
              {/* Outer pulsing ring */}
              <div className="absolute w-20 h-20 rounded-full border-2 border-cyan-400/30 animate-ping" style={{ animationDuration: '2s' }} />
              {/* Middle rotating ring */}
              <div
                className="absolute w-16 h-16 rounded-full border-2 border-transparent"
                style={{
                  background: 'linear-gradient(135deg, transparent 40%, rgba(0, 242, 255, 0.4) 50%, transparent 60%)',
                  animation: 'spin 3s linear infinite'
                }}
              />
              {/* Inner glow ring */}
              <div className="absolute w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 blur-sm" />
              {/* Main eye button */}
              <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/50 group-hover:shadow-cyan-400/70 transition-all group-hover:scale-105 group-active:scale-95">
                {/* Inner iris ring */}
                <div className="absolute w-10 h-10 rounded-full border-2 border-white/30" />
                {/* Pupil/lens */}
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
                  {/* Highlight/reflection */}
                  <div className="absolute w-2 h-2 bg-white/80 rounded-full -translate-x-1 -translate-y-1" />
                  <span className="material-symbols-outlined text-cyan-400 text-sm">photo_camera</span>
                </div>
              </div>
            </div>
            <p className="text-center text-xs text-cyan-300 mt-2 font-medium">Tap to capture</p>
          </button>

          {/* Manual input hint */}
          <div className="py-3 px-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-white/60">edit</span>
            <span className="text-sm font-semibold text-white/60">or type</span>
          </div>
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
          {/* From Currency - Tappable Selector */}
          <div className="glass-panel-light p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">From</span>
              {/* Currency selector button */}
              <button
                onClick={() => setShowCurrencyPicker(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-fluent-primary/20 hover:bg-fluent-primary/30 transition-all active:scale-95"
              >
                <span className="text-xs font-bold text-fluent-primary">{currency.code}</span>
                <span className="material-symbols-outlined text-fluent-primary text-sm">expand_more</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white/40">{currency.symbol}</span>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="flex-1 bg-transparent border-none focus:ring-0 text-3xl font-bold text-white placeholder:text-white/20 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            {/* Show formatted amount below input */}
            {amount && parseFloat(amount) > 999 && (
              <p className="text-right text-xs text-white/40">{currency.symbol}{formatNumber(amount)}</p>
            )}
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
              <div className="flex-1 text-2xl sm:text-3xl font-bold text-fluent-primary text-right tabular-nums">
                {formatNumber(converted)}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Amounts */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Quick Convert</h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value}
                onClick={() => handleQuickAmount(value)}
                className={`px-2 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 tabular-nums ${
                  amount === value.toString()
                    ? 'bg-fluent-primary text-white'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {currency.symbol}{formatNumber(value)}
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

      {/* Currency Picker Modal */}
      {showCurrencyPicker && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="w-full sm:w-96 max-h-[70vh] bg-surface-dark rounded-t-3xl sm:rounded-3xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Select Currency</h2>
              <button
                onClick={() => setShowCurrencyPicker(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
              >
                <span className="material-symbols-outlined text-white text-sm">close</span>
              </button>
            </div>
            {/* Currency list */}
            <div className="overflow-y-auto max-h-[50vh] p-2">
              {ALL_CURRENCIES.map((curr) => (
                <button
                  key={curr.code}
                  onClick={() => {
                    setSelectedCurrencyCode(curr.code);
                    setShowCurrencyPicker(false);
                  }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                    selectedCurrencyCode === curr.code
                      ? 'bg-fluent-primary/20 border border-fluent-primary/50'
                      : 'hover:bg-white/5'
                  }`}
                >
                  {/* Currency symbol badge */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                    selectedCurrencyCode === curr.code
                      ? 'bg-fluent-primary text-white'
                      : 'bg-white/10 text-white/60'
                  }`}>
                    {curr.symbol}
                  </div>
                  {/* Currency info */}
                  <div className="flex-1 text-left">
                    <p className="font-bold text-white">{curr.code}</p>
                    <p className="text-xs text-white/50">{curr.name}</p>
                  </div>
                  {/* Checkmark for selected */}
                  {selectedCurrencyCode === curr.code && (
                    <span className="material-symbols-outlined text-fluent-primary">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencyConverterView;
