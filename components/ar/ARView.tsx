'use client';

import React, { useState } from 'react';
import { ARScan, Language, DetectedObject } from '@/types';
import { HistoryOverlay } from './HistoryOverlay';

interface ARViewProps {
  onBack: () => void;
  onSaveScan: (scan: ARScan) => void;
  history: ARScan[];
  onClearHistory: () => void;
  onDeleteHistoryItem: (id: string) => void;
  onToggleFavoriteScan?: (id: string) => void;
  onDetectLanguage?: (langCode: string) => void;
  isLive?: boolean;
  onToggleLive?: () => void;
  currentLanguage?: Language;
}

// Extended Config with details for the new overlay feature
const LOCATION_CONFIG: Record<
  string,
  {
    city: string;
    image: string;
    currencyCode: string;
    currencySymbol: string;
    translations: { original: string; translated: string }[];
    objects: { name: string; nativeName: string; description: string; fact: string }[];
  }
> = {
  ja: {
    city: 'Shibuya, Tokyo',
    image:
      'https://images.unsplash.com/photo-1590252973641-1352774858bd?q=80&w=2070&auto=format&fit=crop',
    currencyCode: 'JPY',
    currencySymbol: '¥',
    translations: [
      { original: '止まれ (Tomare)', translated: 'Stop' },
      { original: '出口 (Deguchi)', translated: 'Exit' },
      { original: '入口 (Iriguchi)', translated: 'Entrance' },
      { original: '居酒屋 (Izakaya)', translated: 'Pub' },
    ],
    objects: [
      {
        name: 'Vending Machine',
        nativeName: '自動販売機',
        description: 'Ubiquitous machines selling everything from hot coffee to soup.',
        fact: 'There is approximately 1 vending machine for every 23 people in Japan.',
      },
      {
        name: 'Taxi',
        nativeName: 'タクシー',
        description: 'Japanese taxis often have automatic doors operated by the driver.',
        fact: 'Never try to open the door yourself; the driver controls it remotely.',
      },
      {
        name: 'Konbini',
        nativeName: 'コンビニ',
        description: '24/7 convenience stores that offer food, ATM services, and ticket booking.',
        fact: 'There are over 50,000 convenience stores across Japan.',
      },
      {
        name: 'Traffic Signal',
        nativeName: '信号機',
        description:
          'Standard traffic lights. Note that "green" lights are often called "blue" (ao) in Japanese.',
        fact: 'Historically, the word "ao" covered both blue and green colors.',
      },
      {
        name: 'Crowd',
        nativeName: '群衆',
        description: 'Heavy pedestrian traffic is common in major hubs like Shibuya.',
        fact: 'The Shibuya Scramble Crossing is rumored to be the busiest intersection in the world.',
      },
    ],
  },
  fr: {
    city: 'Paris, France',
    image:
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=2073&auto=format&fit=crop',
    currencyCode: 'EUR',
    currencySymbol: '€',
    translations: [
      { original: 'Sortie', translated: 'Exit' },
      { original: 'Entrée', translated: 'Entrance' },
      { original: 'Boulangerie', translated: 'Bakery' },
      { original: 'Arrêt', translated: 'Stop' },
    ],
    objects: [
      {
        name: 'Eiffel Tower',
        nativeName: 'Tour Eiffel',
        description: 'Iron lattice tower on the Champ de Mars.',
        fact: 'It was originally intended to be a temporary structure for the 1889 World Fair.',
      },
      {
        name: 'Croissant',
        nativeName: 'Croissant',
        description: 'A buttery, flaky, viennoiserie pastry named for its crescent shape.',
        fact: 'The kipferl, the ancestor of the croissant, actually originated in Austria.',
      },
      {
        name: 'Bicycle',
        nativeName: 'Vélo',
        description: "A popular mode of transport. Look for Vélib' stations.",
        fact: 'Paris has over 1,000 km of cycle paths.',
      },
      {
        name: 'Metro Sign',
        nativeName: 'Métro',
        description: 'Art Nouveau style entrances designed by Hector Guimard.',
        fact: 'There are 302 stations on the Paris Métro.',
      },
    ],
  },
  es: {
    city: 'Madrid, Spain',
    image:
      'https://images.unsplash.com/photo-1543783207-ec64e4d95325?q=80&w=2070&auto=format&fit=crop',
    currencyCode: 'EUR',
    currencySymbol: '€',
    translations: [
      { original: 'Salida', translated: 'Exit' },
      { original: 'Entrada', translated: 'Entrance' },
      { original: 'Biblioteca', translated: 'Library' },
      { original: 'Calle', translated: 'Street' },
    ],
    objects: [
      {
        name: 'Fountain',
        nativeName: 'Fuente',
        description: 'Public fountain often found in plazas.',
        fact: 'Madrid has many historic fountains dating back to the 17th century.',
      },
      {
        name: 'Tapas',
        nativeName: 'Tapas',
        description: 'Small savory dishes, snacks, or appetizers of Spanish cuisine.',
        fact: 'The word "tapas" is derived from the Spanish verb tapar, "to cover".',
      },
      {
        name: 'Cathedral',
        nativeName: 'Catedral',
        description: 'A major place of worship.',
        fact: 'The Almudena Cathedral took over 100 years to complete.',
      },
      {
        name: 'Bus',
        nativeName: 'Autobús',
        description: 'Public transport bus.',
        fact: 'EMT Madrid operates a fleet of over 2,000 buses.',
      },
    ],
  },
  ko: {
    city: 'Seoul, Korea',
    image:
      'https://images.unsplash.com/photo-1538485399081-7191377e8241?q=80&w=2074&auto=format&fit=crop',
    currencyCode: 'KRW',
    currencySymbol: '₩',
    translations: [
      { original: '비상구 (Bisang-gu)', translated: 'Exit' },
      { original: '입구 (Ip-gu)', translated: 'Entrance' },
      { original: '지하철 (Jihacheol)', translated: 'Subway' },
    ],
    objects: [
      {
        name: 'Food Stall',
        nativeName: '포장마차',
        description: 'Street food tent selling snacks and drinks.',
        fact: 'Pojangmacha are iconic spots for late-night dining.',
      },
      {
        name: 'Subway',
        nativeName: '지하철',
        description: 'Seoul Metropolitan Subway.',
        fact: 'It is one of the longest subway systems in the world.',
      },
      {
        name: 'Palace',
        nativeName: '궁궐',
        description: 'Historic royal residence.',
        fact: 'Gyeongbokgung Palace was the main royal palace of the Joseon dynasty.',
      },
    ],
  },
  zh: {
    city: 'Shanghai, China',
    image:
      'https://images.unsplash.com/photo-1548232979-6c557ee14752?q=80&w=2071&auto=format&fit=crop',
    currencyCode: 'CNY',
    currencySymbol: '¥',
    translations: [
      { original: '出口 (Chūkǒu)', translated: 'Exit' },
      { original: '入口 (Rùkǒu)', translated: 'Entrance' },
      { original: '餐厅 (Cāntīng)', translated: 'Restaurant' },
    ],
    objects: [
      {
        name: 'Dumplings',
        nativeName: '饺子',
        description: 'Traditional dough-wrapped filling.',
        fact: 'Dumplings are a traditional dish eaten on Chinese New Year.',
      },
      {
        name: 'Lantern',
        nativeName: '灯笼',
        description: 'Decorative hanging light.',
        fact: 'Red lanterns symbolize booming life and prosperous business.',
      },
    ],
  },
  en: {
    city: 'New York, USA',
    image:
      'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=2070&auto=format&fit=crop',
    currencyCode: 'USD',
    currencySymbol: '$',
    translations: [
      { original: 'Subway', translated: 'Metro' },
      { original: 'Lift', translated: 'Elevator' },
      { original: 'Chips', translated: 'Fries' },
    ],
    objects: [
      {
        name: 'Yellow Taxi',
        nativeName: 'Taxi',
        description: 'The iconic yellow cabs of NYC are a primary mode of transit.',
        fact: 'They are painted yellow to be visible from a distance.',
      },
      {
        name: 'Hot Dog Stand',
        nativeName: 'Vendor',
        description: 'Street food carts selling hot dogs, pretzels, and halal food.',
        fact: 'Street vending in NYC dates back to the late 17th century.',
      },
      {
        name: 'Skyscraper',
        nativeName: 'Building',
        description: 'Tall buildings define the Manhattan skyline.',
        fact: 'NYC has over 270 skyscrapers taller than 150 meters.',
      },
      {
        name: 'Traffic Light',
        nativeName: 'Signal',
        description:
          'Standard US traffic signals. Right turn on red is generally illegal in NYC.',
        fact: 'The first electric traffic light was installed in Cleveland in 1914.',
      },
    ],
  },
};

export const ARView: React.FC<ARViewProps> = ({
  onBack,
  onSaveScan,
  history,
  onClearHistory,
  onDeleteHistoryItem,
  onToggleFavoriteScan,
  onDetectLanguage,
  isLive,
  onToggleLive,
  currentLanguage,
}) => {
  const [mode, setMode] = useState<'currency' | 'translate' | 'object'>('object');
  const [showHistory, setShowHistory] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  // Get config based on prop, default to English if missing or not in config
  const langCode =
    currentLanguage?.code && LOCATION_CONFIG[currentLanguage.code]
      ? currentLanguage.code
      : 'en';
  const config = LOCATION_CONFIG[langCode] || LOCATION_CONFIG['en'];

  // Simulated current scan state
  const [currentResult, setCurrentResult] = useState<Partial<ARScan>>({});

  const handleCapture = () => {
    setIsScanning(true);
    setCurrentResult({});
    setSelectedObjectId(null);

    // Simulate AI processing time
    setTimeout(() => {
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      let newScan: ARScan;

      if (mode === 'currency') {
        const baseAmount = Math.floor(Math.random() * 500) + 10;
        const rate = 1.1;
        const converted = (baseAmount * rate).toFixed(2);

        newScan = {
          id: Date.now().toString(),
          type: 'currency',
          timestamp,
          originalAmount: `${config.currencySymbol} ${baseAmount.toLocaleString()}`,
          originalCurrency: config.currencyCode,
          convertedAmount: `$${converted}`,
          convertedCurrency: 'USD',
          location: config.city,
        };
      } else if (mode === 'translate') {
        const possibleTranslations = config.translations;
        const mock = possibleTranslations[Math.floor(Math.random() * possibleTranslations.length)];

        if (onDetectLanguage) {
          onDetectLanguage(langCode);
        }

        newScan = {
          id: Date.now().toString(),
          type: 'translation',
          timestamp,
          originalText: mock.original,
          translatedText: mock.translated,
          location: config.city,
        };
      } else {
        const possibleObjects = config.objects;
        const count = Math.floor(Math.random() * 2) + 2;
        const detected: DetectedObject[] = [];

        for (let i = 0; i < count; i++) {
          const obj = possibleObjects[Math.floor(Math.random() * possibleObjects.length)];
          const box = {
            x: 15 + Math.random() * 50,
            y: 25 + Math.random() * 40,
            w: 20 + Math.random() * 15,
            h: 20 + Math.random() * 15,
          };

          detected.push({
            id: `obj-${i}-${Date.now()}`,
            label: obj.name,
            nativeLabel: obj.nativeName,
            confidence: 0.85 + Math.random() * 0.14,
            box,
            details: {
              description: obj.description,
              fact: obj.fact,
            },
          });
        }

        newScan = {
          id: Date.now().toString(),
          type: 'object',
          timestamp,
          location: config.city,
          detectedObjects: detected,
          translatedText: `${detected.length} Objects Detected`,
        };
      }

      setCurrentResult(newScan);
      onSaveScan(newScan);
      setIsScanning(false);
    }, 1500);
  };

  const getPillPosition = () => {
    switch (mode) {
      case 'currency':
        return 'left-1.5';
      case 'translate':
        return 'left-1/2 -translate-x-1/2';
      case 'object':
        return 'right-1.5';
      default:
        return 'left-1.5';
    }
  };

  const selectedObject = currentResult?.detectedObjects?.find((o) => o.id === selectedObjectId);

  return (
    <div className="fixed inset-0 z-50 bg-black font-display text-white overflow-hidden h-full w-full select-none animate-in fade-in duration-500">
      <HistoryOverlay
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        history={history}
        onClear={onClearHistory}
        onDeleteItem={onDeleteHistoryItem}
        onToggleFavorite={onToggleFavoriteScan}
      />

      {/* Background Camera Feed (Simulated) */}
      <div className="absolute inset-0 z-0 bg-black">
        <img
          className="w-full h-full object-cover transition-all duration-500 scale-105"
          style={{
            opacity: showHistory ? 0.3 : 1,
            filter: showHistory ? 'blur(10px)' : 'none',
          }}
          src={
            mode === 'currency'
              ? 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=2070&auto=format&fit=crop'
              : config.image
          }
          alt="AR View"
        />

        {/* Render Bounding Boxes for Objects */}
        {!isScanning &&
          currentResult?.type === 'object' &&
          currentResult.detectedObjects?.map((obj) => {
            const isSelected = obj.id === selectedObjectId;
            return (
              <button
                key={obj.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedObjectId(isSelected ? null : obj.id);
                }}
                className={`absolute rounded-lg animate-in zoom-in duration-300 backdrop-blur-[1px] transition-all cursor-pointer group text-left
                  ${
                    isSelected
                      ? 'border-4 border-white bg-white/10 z-30 shadow-[0_0_20px_rgba(255,255,255,0.4)]'
                      : 'border-2 border-fluent-primary/80 bg-fluent-primary/10 z-10 hover:border-white hover:bg-white/5'
                  }
                `}
                style={{
                  left: `${obj.box.x}%`,
                  top: `${obj.box.y}%`,
                  width: `${obj.box.w}%`,
                  height: `${obj.box.h}%`,
                }}
              >
                {/* Label Tag Group */}
                <div
                  className={`absolute -top-7 left-0 flex gap-1 items-stretch transition-transform duration-200 ${
                    isSelected ? 'scale-110 -translate-y-1' : ''
                  }`}
                >
                  <div
                    className={`${
                      isSelected ? 'bg-white text-black' : 'bg-fluent-primary text-black'
                    } text-[10px] font-bold px-2 py-0.5 rounded-sm shadow-lg flex items-center`}
                  >
                    {obj.label}
                  </div>
                  <div className="bg-black/80 text-fluent-primary border border-fluent-primary/40 text-[9px] font-mono px-1.5 py-0.5 rounded-sm backdrop-blur-md flex items-center shadow-lg">
                    {Math.round(obj.confidence * 100)}%
                  </div>
                </div>

                {/* Native Label Tag */}
                <div className="absolute -bottom-6 right-0 bg-black/60 text-white border border-fluent-primary/30 text-[10px] font-medium px-2 py-0.5 rounded-b-md rounded-tl-md backdrop-blur-md">
                  {obj.nativeLabel}
                </div>

                {/* Corner Accents */}
                <div
                  className={`absolute -top-[1px] -left-[1px] w-2 h-2 border-t-2 border-l-2 ${
                    isSelected ? 'border-fluent-primary' : 'border-white'
                  }`}
                ></div>
                <div
                  className={`absolute -bottom-[1px] -right-[1px] w-2 h-2 border-b-2 border-r-2 ${
                    isSelected ? 'border-fluent-primary' : 'border-white'
                  }`}
                ></div>

                {/* Tap hint */}
                {!isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/40 rounded-full p-1 backdrop-blur-sm">
                      <span className="material-symbols-outlined text-white text-lg">
                        touch_app
                      </span>
                    </div>
                  </div>
                )}
              </button>
            );
          })}

        {/* Subtle Vignette */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/10 to-black/60 pointer-events-none"></div>
      </div>

      {/* Main Content Overlay */}
      <div
        className={`relative z-10 flex flex-col h-full justify-between pb-8 pt-safe transition-all duration-300 pointer-events-none ${
          showHistory ? 'opacity-0' : ''
        }`}
      >
        {/* Top Header */}
        <div className="flex flex-col w-full px-4 pt-6 gap-4 pointer-events-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 shadow-lg">
              <span className="material-symbols-outlined text-sm text-fluent-primary animate-pulse">
                my_location
              </span>
              <span className="text-xs font-bold tracking-wide uppercase text-white/90">
                {config.city}
              </span>
            </div>
            <button
              onClick={onBack}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="self-center mt-2">
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-full p-1.5 flex h-12 w-[340px] relative shadow-2xl">
              <div
                className={`absolute top-1.5 bottom-1.5 w-[calc(33.33%-6px)] bg-white rounded-full shadow-lg transition-all duration-300 ${getPillPosition()}`}
              ></div>

              <button
                onClick={() => {
                  setMode('currency');
                  setSelectedObjectId(null);
                }}
                className={`relative z-10 flex-1 rounded-full flex items-center justify-center gap-1 font-bold text-xs transition-colors ${
                  mode === 'currency' ? 'text-black' : 'text-white/70 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">currency_yen</span>
                <span>Currency</span>
              </button>

              <button
                onClick={() => {
                  setMode('translate');
                  setSelectedObjectId(null);
                }}
                className={`relative z-10 flex-1 rounded-full flex items-center justify-center gap-1 font-medium text-xs transition-colors ${
                  mode === 'translate' ? 'text-black font-bold' : 'text-white/70 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">translate</span>
                <span>Translate</span>
              </button>

              <button
                onClick={() => {
                  setMode('object');
                  setSelectedObjectId(null);
                }}
                className={`relative z-10 flex-1 rounded-full flex items-center justify-center gap-1 font-medium text-xs transition-colors ${
                  mode === 'object' ? 'text-black font-bold' : 'text-white/70 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">view_in_ar</span>
                <span>Object</span>
              </button>
            </div>
          </div>
        </div>

        {/* Center Target / Result */}
        <div className="flex-1 relative flex flex-col items-center justify-center">
          <div
            className={`relative w-80 h-56 transition-all duration-300 pointer-events-none ${
              isScanning ? 'scale-95' : 'scale-100'
            }`}
          >
            {/* Reticle - Hide if we have OBJECT results */}
            {!(currentResult?.type === 'object' && !isScanning && currentResult.detectedObjects) && (
              <>
                <div
                  className={`absolute inset-0 border rounded-3xl backdrop-blur-[2px] transition-colors duration-300 ${
                    isLive
                      ? 'border-red-500/50 bg-red-500/5'
                      : 'border-white/30 bg-white/5'
                  }`}
                ></div>

                <div
                  className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-2xl -mt-[2px] -ml-[2px] transition-colors duration-300 ${
                    isLive
                      ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]'
                      : 'border-fluent-primary shadow-[0_0_15px_rgba(0,242,255,0.6)]'
                  }`}
                ></div>
                <div
                  className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-2xl -mt-[2px] -mr-[2px] transition-colors duration-300 ${
                    isLive
                      ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]'
                      : 'border-fluent-primary shadow-[0_0_15px_rgba(0,242,255,0.6)]'
                  }`}
                ></div>
                <div
                  className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-2xl -mb-[2px] -ml-[2px] transition-colors duration-300 ${
                    isLive
                      ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]'
                      : 'border-fluent-primary shadow-[0_0_15px_rgba(0,242,255,0.6)]'
                  }`}
                ></div>
                <div
                  className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-2xl -mb-[2px] -mr-[2px] transition-colors duration-300 ${
                    isLive
                      ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]'
                      : 'border-fluent-primary shadow-[0_0_15px_rgba(0,242,255,0.6)]'
                  }`}
                ></div>

                <div
                  className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full transition-all duration-300 ${
                    isScanning
                      ? 'opacity-0 scale-0'
                      : 'opacity-100 scale-100 shadow-[0_0_10px_white]'
                  }`}
                ></div>
              </>
            )}

            {/* Scanning Laser */}
            {isScanning && (
              <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-fluent-primary to-transparent shadow-[0_0_20px_rgba(0,242,255,1)] animate-[scan_1.5s_ease-in-out_infinite]"></div>
                <div className="absolute inset-0 bg-fluent-primary/5 animate-pulse"></div>
              </div>
            )}

            {/* Result Pop-up (HUD Style) - For Currency & Translate Only */}
            {!isScanning &&
              currentResult &&
              currentResult.type !== 'object' &&
              (currentResult.convertedAmount || currentResult.translatedText) && (
                <div className="absolute -top-[160px] left-1/2 transform -translate-x-1/2 w-[280px] bg-slate-900/90 backdrop-blur-xl border border-fluent-primary/30 p-5 rounded-2xl flex flex-col items-center gap-2 shadow-[0_0_30px_rgba(0,0,0,0.5)] z-20 animate-in slide-in-from-bottom-5 duration-300">
                  <div className="flex items-center justify-between w-full border-b border-white/10 pb-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      <span className="text-[10px] uppercase tracking-widest text-fluent-primary font-bold">
                        Confidence 98%
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-white/40 text-sm">
                      {currentResult.type === 'currency' ? 'qr_code_scanner' : 'translate'}
                    </span>
                  </div>

                  {currentResult.type === 'currency' ? (
                    <div className="flex flex-col items-center gap-0 w-full">
                      <div className="text-white/50 text-sm font-medium line-through font-mono tracking-wider">
                        {currentResult.originalAmount} {currentResult.originalCurrency}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-white text-4xl font-bold tracking-tight drop-shadow-lg tabular-nums">
                          {currentResult.convertedAmount}
                        </span>
                        <span className="text-xl text-fluent-primary font-bold">
                          {currentResult.convertedCurrency}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 w-full text-center">
                      <div className="text-white/50 text-xs font-medium tracking-wider mb-1">
                        {currentResult.originalText}
                      </div>
                      <div className="text-white text-3xl font-bold tracking-tight drop-shadow-lg leading-none">
                        {currentResult.translatedText}
                      </div>
                    </div>
                  )}

                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-slate-900/90 border-r border-b border-fluent-primary/30 rotate-45 transform"></div>
                </div>
              )}

            {/* Object Detection Summary Pop-up */}
            {!isScanning &&
              !selectedObjectId &&
              currentResult &&
              currentResult.type === 'object' &&
              currentResult.detectedObjects && (
                <div className="absolute bottom-[-80px] left-1/2 transform -translate-x-1/2 w-[220px] bg-black/60 backdrop-blur-xl border border-white/10 p-3 rounded-xl flex items-center justify-center gap-3 shadow-xl z-20 animate-in slide-in-from-bottom-2 duration-300 pointer-events-auto cursor-default">
                  <span className="material-symbols-outlined text-fluent-primary">touch_app</span>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">
                      {currentResult.detectedObjects.length} Objects Detected
                    </span>
                    <span className="text-[10px] text-white/50">Tap a box for details</span>
                  </div>
                </div>
              )}
          </div>

          <div className="mt-8 flex flex-col items-center gap-2 pointer-events-auto">
            {isLive ? (
              <div className="flex items-center gap-2 bg-red-500/20 px-6 py-2 rounded-full backdrop-blur-md border border-red-500/30 animate-pulse">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                <p className="text-red-100 font-bold text-sm tracking-wide">
                  Listening for commands...
                </p>
              </div>
            ) : (
              <p
                className={`text-white font-medium text-sm bg-black/50 px-6 py-2 rounded-full backdrop-blur-md border border-white/10 shadow-lg transition-all ${
                  isScanning ? 'opacity-80' : 'opacity-100'
                }`}
              >
                {isScanning
                  ? 'Processing visual data...'
                  : mode === 'currency'
                  ? 'Align price tag within frame'
                  : mode === 'translate'
                  ? 'Align text within frame'
                  : 'Scanning environment...'}
              </p>
            )}
          </div>
        </div>

        {/* Detailed Info Card Overlay */}
        {selectedObject && (
          <div className="absolute bottom-24 left-4 right-4 z-40 animate-in slide-in-from-bottom-10 fade-in duration-300 pointer-events-auto">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-fluent-primary/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

              <button
                onClick={() => setSelectedObjectId(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fluent-primary/20 to-fluent-secondary/20 flex items-center justify-center border border-white/5">
                    <span className="material-symbols-outlined text-2xl text-fluent-primary">
                      info
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white leading-none mb-1">
                      {selectedObject.label}
                    </h3>
                    <p className="text-xs text-fluent-primary font-medium uppercase tracking-wider">
                      {selectedObject.nativeLabel}
                    </p>
                  </div>
                </div>

                <div className="h-px bg-white/10 w-full"></div>

                {selectedObject.details && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {selectedObject.details.description}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-xs text-yellow-400">
                          lightbulb
                        </span>
                        <span className="text-[10px] font-bold uppercase text-white/50 tracking-widest">
                          Did you know?
                        </span>
                      </div>
                      <p className="text-xs text-white/80 italic">
                        &quot;{selectedObject.details.fact}&quot;
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button className="flex-1 py-2 bg-fluent-primary text-background-dark font-bold text-xs rounded-lg hover:bg-white transition-colors">
                    Search Related
                  </button>
                  <button className="flex-1 py-2 bg-white/5 border border-white/10 text-white font-bold text-xs rounded-lg hover:bg-white/10 transition-colors">
                    Translate Name
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Controls */}
        <div
          className={`flex flex-col items-center gap-6 px-6 w-full max-w-md mx-auto pointer-events-auto transition-all duration-300 ${
            selectedObjectId ? 'opacity-0 pointer-events-none translate-y-10' : 'opacity-100'
          }`}
        >
          {/* Quick Info Bar */}
          <div className="w-full bg-black/40 backdrop-blur-xl rounded-2xl p-3 flex items-center justify-between border border-white/10 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                <span className="text-lg">
                  {mode === 'translate' || mode === 'object'
                    ? config.currencyCode === 'JPY'
                      ? '🇯🇵'
                      : config.currencyCode === 'EUR'
                      ? '🇪🇺'
                      : config.currencyCode === 'KRW'
                      ? '🇰🇷'
                      : config.currencyCode === 'CNY'
                      ? '🇨🇳'
                      : '🇺🇸'
                    : '🇯🇵'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-white/50 uppercase tracking-wider font-bold">
                  {mode === 'currency' ? 'Buying in' : 'Detected'}
                </span>
                <span className="text-sm font-bold text-white">
                  {mode === 'currency'
                    ? `${config.currencyCode} (${config.currencySymbol})`
                    : currentLanguage?.name || 'English'}
                </span>
              </div>
            </div>

            <span className="material-symbols-outlined text-white/20">arrow_forward</span>

            <div className="flex items-center gap-3 text-right">
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-fluent-primary/70 uppercase tracking-wider font-bold">
                  {mode === 'currency' ? 'Paying in' : 'Translate to'}
                </span>
                <span className="text-sm font-bold text-white">
                  {mode === 'currency' ? 'USD ($)' : 'English'}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-fluent-primary/10 flex items-center justify-center border border-fluent-primary/20">
                <span className="text-lg">🇺🇸</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full grid grid-cols-5 items-center pb-4">
            <div className="col-span-1 flex justify-start">
              <button
                onClick={() => setShowHistory(true)}
                className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all group"
              >
                <span className="material-symbols-outlined text-[24px] group-hover:text-fluent-primary transition-colors">
                  history
                </span>
              </button>
            </div>

            <div className="col-span-3 flex items-center justify-center gap-4">
              <button
                onClick={onToggleLive}
                className={`w-12 h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-all duration-300 active:scale-95 shadow-lg
                  ${
                    isLive
                      ? 'bg-red-500 text-white border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse'
                      : 'bg-black/40 text-white/80 border-white/10 hover:bg-white/20 hover:text-white'
                  }
                `}
              >
                <span className="material-symbols-outlined text-[22px]">
                  {isLive ? 'graphic_eq' : 'mic'}
                </span>
              </button>

              <div className="relative group">
                <div
                  className={`absolute -inset-3 bg-gradient-to-r from-fluent-primary via-purple-500 to-fluent-primary rounded-full opacity-40 blur-md group-hover:opacity-70 transition duration-500 ${
                    isScanning ? 'animate-spin' : ''
                  }`}
                ></div>
                <button
                  onClick={handleCapture}
                  disabled={isScanning}
                  className="relative w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border-4 border-white/30 p-1.5 flex items-center justify-center active:scale-95 transition-transform duration-100"
                >
                  <div
                    className={`w-full h-full bg-white rounded-full shadow-[0_0_20px_white] ${
                      isScanning ? 'scale-75 opacity-80' : 'scale-100'
                    } transition-all duration-300`}
                  ></div>
                </button>
              </div>
            </div>

            <div className="col-span-1 flex justify-end">
              <button className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all group">
                <span className="material-symbols-outlined text-[24px] group-hover:text-fluent-primary transition-colors">
                  flash_on
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scan {
          0% {
            top: 0%;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            top: 100%;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default ARView;
