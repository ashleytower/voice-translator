'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Language } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Camera, Upload, X, ArrowDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CurrencyConverterViewProps {
  currentLanguage: Language;
  onBack: () => void;
}

const CURRENCY_DATA: Record<string, { code: string; symbol: string; name: string; rateToUSD: number }> = {
  ja: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rateToUSD: 0.0067 },
  es: { code: 'EUR', symbol: '€', name: 'Euro', rateToUSD: 1.09 },
  fr: { code: 'EUR', symbol: '€', name: 'Euro', rateToUSD: 1.09 },
  ko: { code: 'KRW', symbol: '₩', name: 'Korean Won', rateToUSD: 0.00075 },
  zh: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', rateToUSD: 0.14 },
  en: { code: 'USD', symbol: '$', name: 'US Dollar', rateToUSD: 1 },
};

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
    closeCamera();
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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Currency Converter</h1>
          <p className="text-xs text-muted-foreground">{currency.name} to USD</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload
          </Button>
          <Button
            size="sm"
            onClick={handleCameraClick}
            className="gap-2"
          >
            <Camera className="h-4 w-4" />
            Scan
          </Button>
        </div>
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
        <div className="p-4 border-b border-border">
          <div className="relative rounded-lg overflow-hidden bg-secondary">
            <img src={capturedImage} alt="Captured" className="w-full h-32 object-cover" />
            <Button
              variant="destructive"
              size="icon"
              onClick={clearImage}
              className="absolute top-2 right-2 h-6 w-6"
            >
              <X className="h-3 w-3" />
            </Button>
            <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-background/80 backdrop-blur-sm">
              <span className="text-xs text-muted-foreground">Enter amount from image below</span>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* From Currency */}
        <div className="rounded-lg border border-border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">From</span>
            <span className="text-xs text-primary">{currency.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold text-muted-foreground">{currency.symbol}</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-3xl font-semibold text-right"
            />
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <ArrowDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* To USD */}
        <div className="rounded-lg border-2 border-primary/50 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">To</span>
            <span className="text-xs text-primary">US Dollar</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold text-primary">$</span>
            <div className="flex-1 text-3xl font-semibold text-primary text-right">
              {converted}
            </div>
          </div>
        </div>

        {/* Quick Amounts */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Quick amounts</span>
          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((value) => (
              <Button
                key={value}
                variant={amount === value.toString() ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickAmount(value)}
              >
                {currency.symbol}{value.toLocaleString()}
              </Button>
            ))}
          </div>
        </div>

        {/* Exchange Rate Info */}
        <div className="rounded-lg border border-border p-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <Info className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm">1 {currency.code} = ${currency.rateToUSD.toFixed(4)} USD</p>
            <p className="text-xs text-muted-foreground">Rates are approximate</p>
          </div>
        </div>
      </div>

      {/* Camera overlay */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex-1 relative bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Scanning frame overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-72 h-36">
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br" />
                {/* Scanning line animation */}
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary/50 animate-pulse" />
              </div>
            </div>
            {/* Instructions */}
            <div className="absolute top-4 inset-x-0 flex justify-center">
              <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-sm font-medium">Point at price tag</span>
              </div>
            </div>
          </div>
          <div className="p-4 bg-background border-t border-border flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={closeCamera}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={capturePhoto}
            >
              Capture
            </Button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
};

export default CurrencyConverterView;
