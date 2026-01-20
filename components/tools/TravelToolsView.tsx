'use client';

import React, { useState, useEffect } from 'react';
import { Language } from '@/types';

interface TravelToolsViewProps {
  currentLanguage: Language;
  onLaunchAR: () => void;
  onBack: () => void;
}

// Mock Data for Emergency and Culture
const TOOLS_DATA: Record<
  string,
  {
    emergency: {
      number: string;
      police: string;
      ambulance: string;
      phrases: { label: string; text: string; sub: string }[];
    };
    culture: { title: string; tip: string; icon: string }[];
    currency: { code: string; symbol: string; rateToUSD: number };
  }
> = {
  ja: {
    emergency: {
      number: '110 (Police) / 119 (Fire/Amb)',
      police: '110',
      ambulance: '119',
      phrases: [
        { label: 'Help!', text: '助けて！', sub: 'Tasukete!' },
        { label: 'Police!', text: '警察を呼んで！', sub: 'Keisatsu o yonde!' },
        { label: 'Doctor!', text: '医者が必要です！', sub: 'Isha ga hitsuyou desu!' },
      ],
    },
    culture: [
      {
        title: 'No Tipping',
        tip: 'Tipping is not practiced and can be considered rude. Excellent service is standard.',
        icon: 'money_off',
      },
      {
        title: 'Quiet Trains',
        tip: 'Avoid talking on the phone or speaking loudly on public transit.',
        icon: 'volume_off',
      },
    ],
    currency: { code: 'JPY', symbol: '¥', rateToUSD: 0.0067 },
  },
  es: {
    emergency: {
      number: '112 (General EU)',
      police: '091',
      ambulance: '061',
      phrases: [
        { label: 'Help!', text: '¡Ayuda!', sub: 'Ayuda!' },
        { label: 'Police!', text: '¡Llama a la policía!', sub: 'Llama a la policia!' },
        { label: 'Hospital!', text: '¡Necesito un médico!', sub: 'Necesito un medico!' },
      ],
    },
    culture: [
      { title: 'Late Dining', tip: 'Lunch is 2-4pm, Dinner often starts after 9pm.', icon: 'schedule' },
      {
        title: 'Greetings',
        tip: 'Two kisses on the cheek are common greetings between friends.',
        icon: 'sentiment_satisfied',
      },
    ],
    currency: { code: 'EUR', symbol: '€', rateToUSD: 1.09 },
  },
  fr: {
    emergency: {
      number: '112 (General EU)',
      police: '17',
      ambulance: '15',
      phrases: [
        { label: 'Help!', text: 'Aidez-moi !', sub: 'Aidez-moi!' },
        { label: 'Police!', text: 'Appelez la police !', sub: 'Appelez la police!' },
        { label: 'Doctor!', text: "J'ai besoin d'un docteur !", sub: "J'ai besoin d'un docteur!" },
      ],
    },
    culture: [
      {
        title: 'Bonjour First',
        tip: 'Always say "Bonjour" when entering a shop before asking for help.',
        icon: 'store',
      },
      {
        title: 'Volume',
        tip: 'Keep your voice down in public spaces and restaurants.',
        icon: 'volume_down',
      },
    ],
    currency: { code: 'EUR', symbol: '€', rateToUSD: 1.09 },
  },
  ko: {
    emergency: {
      number: '112 (Police) / 119 (Amb)',
      police: '112',
      ambulance: '119',
      phrases: [
        { label: 'Help!', text: '도와주세요!', sub: 'Dowajuseyo!' },
        { label: 'Police!', text: '경찰 불러주세요!', sub: 'Gyeongchal bulleojuseyo!' },
        { label: 'Hospital!', text: '병원에 가야 해요!', sub: 'Byeongwone gaya haeyo!' },
      ],
    },
    culture: [
      {
        title: 'Elders First',
        tip: 'Wait for the oldest person to start eating before you begin.',
        icon: 'restaurant',
      },
      {
        title: 'Two Hands',
        tip: 'Use both hands when giving or receiving something.',
        icon: 'pan_tool',
      },
    ],
    currency: { code: 'KRW', symbol: '₩', rateToUSD: 0.00075 },
  },
  zh: {
    emergency: {
      number: '110 (Police) / 120 (Amb)',
      police: '110',
      ambulance: '120',
      phrases: [
        { label: 'Help!', text: '救命!', sub: 'Jiùmìng!' },
        { label: 'Police!', text: '报警!', sub: 'Bàojǐng!' },
        { label: 'Doctor!', text: '我需要医生!', sub: 'Wǒ xūyào yīshēng!' },
      ],
    },
    culture: [
      {
        title: 'Hot Water',
        tip: 'Drinking hot water is considered healthy; ice water is rare in restaurants.',
        icon: 'local_cafe',
      },
      {
        title: 'Gifts',
        tip: 'Refuse a gift a few times before accepting it to show modesty.',
        icon: 'card_giftcard',
      },
    ],
    currency: { code: 'CNY', symbol: '¥', rateToUSD: 0.14 },
  },
  en: {
    emergency: {
      number: '911',
      police: '911',
      ambulance: '911',
      phrases: [
        { label: 'Help!', text: 'Help me!', sub: '' },
        { label: 'Police!', text: 'Call the police!', sub: '' },
        { label: 'Doctor!', text: 'I need a doctor!', sub: '' },
      ],
    },
    culture: [
      { title: 'Tipping', tip: 'Tipping 15-20% is expected in restaurants.', icon: 'attach_money' },
      {
        title: 'Personal Space',
        tip: 'Americans value a fair amount of personal space during conversation.',
        icon: 'accessibility',
      },
    ],
    currency: { code: 'USD', symbol: '$', rateToUSD: 1 },
  },
};

export const TravelToolsView: React.FC<TravelToolsViewProps> = ({
  currentLanguage,
  onLaunchAR,
  onBack,
}) => {
  const data = TOOLS_DATA[currentLanguage.code] || TOOLS_DATA['en'];

  // Converter State
  const [amount, setAmount] = useState<string>('');
  const [converted, setConverted] = useState<string>('0.00');

  // Emergency Modal State
  const [activeEmergency, setActiveEmergency] = useState<{
    label: string;
    text: string;
    sub: string;
  } | null>(null);

  useEffect(() => {
    const val = parseFloat(amount);
    if (!isNaN(val)) {
      const res = val * data.currency.rateToUSD;
      setConverted(res.toFixed(2));
    } else {
      setConverted('0.00');
    }
  }, [amount, data]);

  const handlePlayEmergency = (text: string, langCode: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    let locale = 'en-US';
    if (langCode === 'ja') locale = 'ja-JP';
    else if (langCode === 'es') locale = 'es-ES';
    else if (langCode === 'fr') locale = 'fr-FR';
    else if (langCode === 'ko') locale = 'ko-KR';
    else if (langCode === 'zh') locale = 'zh-CN';

    utterance.lang = locale;
    utterance.rate = 0.8;
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 bg-background-dark">
      {/* Header */}
      <div className="pt-10 pb-4 px-6 flex items-center gap-4 bg-background-dark/40 backdrop-blur-md sticky top-0 z-20 border-b border-white/5">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full glass-morphic flex items-center justify-center hover:bg-white/10 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Travel Toolkit</h1>
          <p className="text-[10px] text-white/50 uppercase tracking-widest">
            {currentLanguage.name} Region
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 no-scrollbar pb-24">
        {/* AR Lens Card (Hero) */}
        <div className="relative group cursor-pointer" onClick={onLaunchAR}>
          <div className="absolute inset-0 bg-gradient-to-r from-fluent-primary/20 to-fluent-secondary/20 rounded-3xl blur-md group-hover:blur-lg transition-all duration-500"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center justify-between overflow-hidden">
            <div className="z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-fluent-primary">view_in_ar</span>
                <span className="text-xs font-bold text-fluent-primary uppercase tracking-widest">
                  AR Lens
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Visual Translator</h2>
              <p className="text-xs text-gray-400 max-w-[150px]">
                Point at menus, signs, or cash to understand instantly.
              </p>
            </div>
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl text-white">photo_camera</span>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-fluent-primary/10 rounded-full blur-2xl"></div>
          </div>
        </div>

        {/* Currency Converter */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white tracking-widest uppercase">Quick Convert</h3>
            <span className="text-[10px] text-gray-500">Approximate Rate</span>
          </div>
          <div className="glass-panel-light p-4 rounded-2xl flex items-center gap-4">
            <div className="flex-1 bg-black/20 rounded-xl p-2 border border-white/5 flex items-center gap-2 focus-within:border-fluent-primary/50 transition-colors">
              <span className="text-sm font-bold text-gray-400 pl-2">{data.currency.code}</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-transparent border-none focus:ring-0 text-right font-mono text-lg font-bold text-white placeholder:text-white/20"
              />
            </div>
            <span className="material-symbols-outlined text-white/30">arrow_forward</span>
            <div className="flex-1 bg-black/20 rounded-xl p-2 border border-white/5 flex items-center gap-2">
              <span className="text-sm font-bold text-gray-400 pl-2">USD</span>
              <div className="w-full text-right font-mono text-lg font-bold text-fluent-primary pr-2">
                {converted}
              </div>
            </div>
          </div>
        </div>

        {/* Cultural Tips */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-white tracking-widest uppercase">Local Etiquette</h3>
          <div className="grid grid-cols-1 gap-3">
            {data.culture.map((tip, idx) => (
              <div key={idx} className="glass-panel-light p-4 rounded-2xl flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-fluent-secondary/10 flex items-center justify-center shrink-0 text-fluent-secondary border border-fluent-secondary/20">
                  <span className="material-symbols-outlined text-xl">{tip.icon}</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">{tip.title}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">{tip.tip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency SOS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-red-400 tracking-widest uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Emergency SOS
            </h3>
            <span className="text-[10px] text-red-400/70 border border-red-500/20 px-2 py-0.5 rounded-full bg-red-500/10">
              Local: {data.emergency.number}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {data.emergency.phrases.map((phrase, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveEmergency(phrase);
                  handlePlayEmergency(phrase.text, currentLanguage.code);
                }}
                className="aspect-square rounded-2xl bg-red-500/10 border border-red-500/30 flex flex-col items-center justify-center gap-2 hover:bg-red-500/20 active:scale-95 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">
                    {idx === 0 ? 'sos' : idx === 1 ? 'local_police' : 'medical_services'}
                  </span>
                </div>
                <span className="text-xs font-bold text-red-200">{phrase.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Emergency Modal Overlay */}
      {activeEmergency && (
        <div className="absolute inset-0 z-50 bg-red-900/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-in fade-in duration-200">
          <div className="w-full max-w-sm flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-white/10 border-4 border-white/20 flex items-center justify-center mb-8 animate-bounce-slow">
              <span className="material-symbols-outlined text-5xl text-white">campaign</span>
            </div>

            <h2 className="text-4xl font-black text-white mb-2 leading-tight tracking-tight drop-shadow-lg">
              {activeEmergency.text}
            </h2>
            <p className="text-xl text-white/70 mb-12 font-medium tracking-wide">
              {activeEmergency.sub}
            </p>

            <button
              onClick={() => handlePlayEmergency(activeEmergency.text, currentLanguage.code)}
              className="w-full py-4 bg-white text-red-900 rounded-2xl font-bold text-lg mb-4 shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">volume_up</span>
              Play Audio Again
            </button>

            <button
              onClick={() => setActiveEmergency(null)}
              className="text-white/60 text-sm hover:text-white mt-4 underline decoration-white/30 underline-offset-4"
            >
              Close Emergency Card
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelToolsView;
