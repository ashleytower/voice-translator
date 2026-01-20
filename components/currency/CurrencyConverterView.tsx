'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Language } from '@/types';

interface CurrencyConverterViewProps {
  currentLanguage: Language;
  onBack: () => void;
}

type InputMode = 'select' | 'scan' | 'camera' | 'manual';

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
  const [inputMode, setInputMode] = useState<InputMode>('select');
  const [amount, setAmount] = useState<string>('');
  const [converted, setConverted] = useState<string>('0.00');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
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

  // Cleanup camera stream on unmount or mode change
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
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
        const imageData = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageData);
        // Stop camera after capture
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          setCameraStream(null);
        }
        // Process the captured image
        processImage(imageData);
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setCapturedImage(imageData);
        processImage(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (imageData: string) => {
    setIsProcessing(true);
    // Simulated OCR processing - in production, this would call an OCR API
    // For now, we'll show a placeholder result
    setTimeout(() => {
      // Placeholder: In production, integrate with Google Cloud Vision or similar
      setIsProcessing(false);
      // After processing, user can manually adjust the detected amount
    }, 1500);
  };

  const handleModeSelect = async (mode: InputMode) => {
    setInputMode(mode);
    setCapturedImage(null);
    setAmount('');

    if (mode === 'camera') {
      await startCamera();
    } else if (mode === 'scan') {
      // Trigger file input for gallery selection
      fileInputRef.current?.click();
    }
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleBack = () => {
    if (inputMode !== 'select') {
      // Stop camera if active
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      setInputMode('select');
      setCapturedImage(null);
    } else {
      onBack();
    }
  };

  // Mode selection view
  const renderModeSelection = () => (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 no-scrollbar pb-24">
      <p className="text-center text-white/50 text-sm">
        Choose how to enter the amount
      </p>

      <div className="space-y-4">
        {/* Scan Option */}
        <button
          onClick={() => handleModeSelect('scan')}
          className="w-full glass-panel-light p-6 rounded-3xl flex items-center gap-4 hover:bg-white/10 transition-all active:scale-[0.98]"
        >
          <div className="w-14 h-14 rounded-2xl bg-fluent-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-fluent-primary text-2xl">document_scanner</span>
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-white">Scan</h3>
            <p className="text-xs text-white/50">Choose a photo from your gallery</p>
          </div>
          <span className="material-symbols-outlined text-white/30 ml-auto">chevron_right</span>
        </button>

        {/* Camera Option */}
        <button
          onClick={() => handleModeSelect('camera')}
          className="w-full glass-panel-light p-6 rounded-3xl flex items-center gap-4 hover:bg-white/10 transition-all active:scale-[0.98]"
        >
          <div className="w-14 h-14 rounded-2xl bg-fluent-secondary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-fluent-secondary text-2xl">photo_camera</span>
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-white">Take Photo</h3>
            <p className="text-xs text-white/50">Capture a price tag or receipt</p>
          </div>
          <span className="material-symbols-outlined text-white/30 ml-auto">chevron_right</span>
        </button>

        {/* Manual Option */}
        <button
          onClick={() => handleModeSelect('manual')}
          className="w-full glass-panel-light p-6 rounded-3xl flex items-center gap-4 hover:bg-white/10 transition-all active:scale-[0.98]"
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-emerald-400 text-2xl">edit</span>
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-white">Enter Amount</h3>
            <p className="text-xs text-white/50">Type the amount manually</p>
          </div>
          <span className="material-symbols-outlined text-white/30 ml-auto">chevron_right</span>
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
  );

  // Camera view
  const renderCameraView = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 relative bg-black">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Camera overlay with guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[80%] h-[40%] border-2 border-fluent-primary/50 rounded-2xl">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-background-dark/80 px-4 py-1 rounded-full">
                  <span className="text-xs text-fluent-primary">Point at price tag</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center p-4">
            <img
              src={capturedImage}
              alt="Captured"
              className="max-w-full max-h-full object-contain rounded-2xl"
            />
          </div>
        )}
      </div>

      {/* Camera controls */}
      <div className="p-6 bg-background-dark">
        {!capturedImage ? (
          <button
            onClick={capturePhoto}
            className="w-full py-4 rounded-2xl bg-fluent-primary text-background-dark font-bold text-lg active:scale-95 transition-transform"
          >
            Capture
          </button>
        ) : (
          <div className="space-y-3">
            {isProcessing ? (
              <div className="text-center py-4">
                <span className="material-symbols-outlined text-fluent-primary animate-spin">progress_activity</span>
                <p className="text-white/50 text-sm mt-2">Processing image...</p>
              </div>
            ) : (
              <>
                <p className="text-center text-white/50 text-sm">
                  Enter the amount you see
                </p>
                {renderConverterUI()}
              </>
            )}
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );

  // Converter UI (shared between manual and camera modes)
  const renderConverterUI = () => (
    <div className="space-y-4">
      {/* From Currency */}
      <div className="glass-panel-light p-6 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white/50 uppercase tracking-widest">From</span>
          <span className="text-xs text-fluent-primary">{currency.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold text-white/50">{currency.symbol}</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="flex-1 bg-transparent border-none focus:ring-0 text-4xl font-bold text-white placeholder:text-white/20 text-right"
            autoFocus
          />
        </div>
        <div className="text-xs text-white/30 text-right">{currency.code}</div>
      </div>

      {/* Arrow */}
      <div className="flex justify-center">
        <div className="w-12 h-12 rounded-full bg-fluent-primary/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-fluent-primary">arrow_downward</span>
        </div>
      </div>

      {/* To USD */}
      <div className="glass-panel-light p-6 rounded-3xl space-y-3 border-2 border-fluent-primary/30">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white/50 uppercase tracking-widest">To</span>
          <span className="text-xs text-fluent-primary">US Dollar</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold text-fluent-primary">$</span>
          <div className="flex-1 text-4xl font-bold text-fluent-primary text-right">
            {converted}
          </div>
        </div>
        <div className="text-xs text-white/30 text-right">USD</div>
      </div>

      {/* Quick Amounts */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Quick Convert</h3>
        <div className="flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((value) => (
            <button
              key={value}
              onClick={() => handleQuickAmount(value)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
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

      {/* Exchange Rate Info */}
      <div className="glass-panel-light p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-fluent-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-fluent-primary">info</span>
          </div>
          <div>
            <p className="text-sm text-white">Exchange Rate</p>
            <p className="text-xs text-white/50">
              1 {currency.code} = ${currency.rateToUSD.toFixed(4)} USD
            </p>
          </div>
        </div>
        <p className="text-[10px] text-white/30 mt-3">
          Rates are approximate and for reference only. Actual rates may vary.
        </p>
      </div>
    </div>
  );

  // Manual entry view
  const renderManualView = () => (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 no-scrollbar pb-24">
      {renderConverterUI()}
    </div>
  );

  // Scan result view (after selecting image)
  const renderScanView = () => (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 no-scrollbar pb-24">
      {capturedImage ? (
        <>
          <div className="glass-panel-light p-4 rounded-2xl">
            <img
              src={capturedImage}
              alt="Scanned"
              className="w-full h-40 object-cover rounded-xl"
            />
          </div>
          {isProcessing ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-fluent-primary animate-spin text-4xl">progress_activity</span>
              <p className="text-white/50 text-sm mt-4">Analyzing image...</p>
            </div>
          ) : (
            <>
              <p className="text-center text-white/50 text-sm">
                Enter the amount from the image
              </p>
              {renderConverterUI()}
            </>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-white/30 text-4xl">image</span>
          <p className="text-white/50 text-sm mt-4">Select an image to scan</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 px-6 py-3 rounded-xl bg-fluent-primary text-background-dark font-bold"
          >
            Choose Image
          </button>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 bg-background-dark">
      {/* Header */}
      <div className="pt-10 pb-4 px-6 flex items-center gap-4 bg-background-dark/40 backdrop-blur-md sticky top-0 z-20 border-b border-white/5">
        <button
          onClick={handleBack}
          className="w-10 h-10 rounded-full glass-morphic flex items-center justify-center hover:bg-white/10 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Currency Converter</h1>
          <p className="text-[10px] text-white/50 uppercase tracking-widest">
            {inputMode === 'select' ? 'Select input method' : `${currency.code} to USD`}
          </p>
        </div>
      </div>

      {/* Render based on mode */}
      {inputMode === 'select' && renderModeSelection()}
      {inputMode === 'camera' && renderCameraView()}
      {inputMode === 'manual' && renderManualView()}
      {inputMode === 'scan' && renderScanView()}
    </div>
  );
};

export default CurrencyConverterView;
