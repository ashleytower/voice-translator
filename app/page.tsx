'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Message, Language, ViewMode, CallRequest } from '@/types';
import { LANGUAGES, INITIAL_MESSAGES } from '@/lib/constants';
import { translateAndChat, quickTranslate } from '@/lib/gemini-service';
import { assembleContext } from '@/lib/context';
import { useVoiceTranslator } from '@/hooks/useVoiceTranslator';
import { CartesiaClient } from '@/lib/cartesia-client';


import { useSession } from '@/hooks/useSession';
import ProfileOnboarding from '@/app/components/ProfileOnboarding';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { InputArea } from '@/components/chat/InputArea';
import { LanguageSelector } from '@/components/chat/LanguageSelector';
import type { OrbState } from '@/components/voice/Orb';
import { Ear, Mic } from 'lucide-react';
import { CurrencyConverterView } from '@/components/currency/CurrencyConverterView';
import { SettingsView } from '@/components/settings/SettingsView';
import { PhrasesView } from '@/components/phrases/PhrasesView';
import { CameraTranslateView } from '@/components/CameraTranslate/CameraTranslateView';
import type { CameraTranslationResult, DishAnalysis } from '@/types';
import { LANG_TO_CURRENCY } from '@/lib/currency-constants';
import { useAppSettings } from '@/hooks/useAppSettings';
import { saveMemory } from '@/lib/memory';
import { useVapiCall } from '@/hooks/useVapiCall';
import { CallSheet } from '@/components/call/CallSheet';
import { FabSpeedDial } from '@/components/explore/FabSpeedDial';
import { ExploreView } from '@/components/explore/ExploreView';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNearbyPlaces } from '@/hooks/useNearbyPlaces';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { useSubscription } from '@/hooks/useSubscription';
import { useRecommendations } from '@/hooks/useRecommendations';
import type { PlaceCategory } from '@/types';

const STORAGE_KEY = 'fluent-messages';
const LANG_STORAGE_KEY = 'fluent-languages';

// Detect call intent: message contains a phone number + call-related keyword
const PHONE_REGEX = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const CALL_KEYWORDS = /\b(call|phone|ring|dial)\b/i;

// Strip meta-instruction prefixes
const CALL_PREFIX_REGEX = /^(?:can\s+you\s+)?(?:call|phone|ring|dial)\s+(?:this\s+\w+\s+)?(?:and|to)\s+/i;

function extractCallIntent(text: string): { task: string; phone: string } | null {
  const phoneMatch = text.match(PHONE_REGEX);
  if (!phoneMatch || !CALL_KEYWORDS.test(text)) return null;

  const rawPhone = phoneMatch[0];
  const digits = rawPhone.replace(/\D/g, '');
  const phone = digits.length === 10 ? `+1${digits}` : digits.startsWith('1') ? `+${digits}` : `+${digits}`;

  const withoutPhone = text.replace(rawPhone, '').replace(/\s{2,}/g, ' ').trim();
  const task = withoutPhone.replace(CALL_PREFIX_REGEX, '').trim();

  return { task, phone };
}

export default function TranslatorPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [fromLang, setFromLang] = useState<Language>(LANGUAGES[0]);
  const [toLang, setToLang] = useState<Language>(LANGUAGES[1]);
  const [viewMode, setViewMode] = useState<ViewMode>('translate');
  const [isLoading, setIsLoading] = useState(false);
  const [showCallSheet, setShowCallSheet] = useState(false);
  const [callPreFill, setCallPreFill] = useState<{ task: string; phone: string } | null>(null);
  const [exploreCategory, setExploreCategory] = useState<PlaceCategory | null>(null);
  const [showExplore, setShowExplore] = useState(false);
  const [listenMode, setListenMode] = useState(false);

  const { user, profile, loading: authLoading, isOnboarded, refreshProfile } = useSession();

  const travelerContextRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastRelayedLenRef = useRef(0);

  // Fetch traveler context when user changes
  useEffect(() => {
    if (user) {
      assembleContext(user.id).then(ctx => { travelerContextRef.current = ctx })
    } else {
      travelerContextRef.current = null
    }
  }, [user])

  const deepgramApiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY || '';
  const cartesiaApiKey = process.env.NEXT_PUBLIC_CARTESIA_API_KEY || '';

  // Handle translation results from voice
  const handleVoiceTranslation = useCallback(
    (original: string, translation: string, pronunciation?: string, response?: string) => {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (listenMode) {
        // In listen mode, the other person spoke in the foreign language.
        // Show their speech as an assistant message with translation.
        const theirMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          text: original,
          translation,
          pronunciation,
          timestamp: now,
        };
        setMessages((prev) => [...prev, theirMessage]);
      } else {
        // Normal mode: user spoke in their language
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          text: original,
          timestamp: now,
        };

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: response || original,
          translation,
          pronunciation,
          originalText: response || undefined,
          timestamp: now,
        };

        setMessages((prev) => [...prev, userMessage, assistantMessage]);
      }
    },
    [listenMode]
  );

  // Swap languages for voice pipeline when in listen mode
  const voiceFromLang = listenMode ? toLang : fromLang;
  const voiceToLang = listenMode ? fromLang : toLang;

  const {
    status: voiceStatus,
    isConnected,
    isListening,
    isSpeaking,
    micVolume,
    currentTranscript,
    connect: connectVoice,
    disconnect: disconnectVoice,
    stopSpeaking,
  } = useVoiceTranslator({
    deepgramApiKey,
    cartesiaApiKey,
    fromLanguage: voiceFromLang.name,
    toLanguage: voiceToLang.name,
    travelerContext: travelerContextRef.current ?? undefined,
    onTranslation: handleVoiceTranslation,
    onError: (error) => {
      console.error('Voice error:', error);
    },
  });

  const { settings, updateSetting, toggleSetting, resetSettings } = useAppSettings();

  const { latitude, longitude, error: geoError, loading: geoLoading } = useGeolocation();
  const { places: nearbyPlaces, loading: placesLoading } = useNearbyPlaces(latitude, longitude, exploreCategory);
  const { savedPlaces, toggleSave, isSaved } = useSavedPlaces(user?.id);
  const { isPaid } = useSubscription();
  const { recommendations, chainMatches, loading: recommendationsLoading } = useRecommendations(latitude, longitude, isPaid);

  const {
    status: callStatus,
    transcript: callTranscript,
    duration: callDuration,
    result: callResult,
    error: callError,
    pendingDecision: callPendingDecision,
    startCall,
    endCall,
    sendMessage: sendCallMessage,
    sendDecision,
    resetCall,
  } = useVapiCall();

  // Load messages and languages from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setMessages(JSON.parse(stored));
      } else {
        setMessages(INITIAL_MESSAGES as Message[]);
      }

      const storedLangs = localStorage.getItem(LANG_STORAGE_KEY);
      if (storedLangs) {
        const { from, to } = JSON.parse(storedLangs);
        const foundFrom = LANGUAGES.find((l) => l.code === from);
        const foundTo = LANGUAGES.find((l) => l.code === to);
        if (foundFrom) setFromLang(foundFrom);
        if (foundTo) setToLang(foundTo);
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Save languages to localStorage
  useEffect(() => {
    localStorage.setItem(
      LANG_STORAGE_KEY,
      JSON.stringify({ from: fromLang.code, to: toLang.code })
    );
  }, [fromLang, toLang]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Stream call transcript into chat
  const isCallActive = callStatus === 'starting' || callStatus === 'ringing' || callStatus === 'in-progress';

  useEffect(() => {
    if (callStatus !== 'in-progress' || callTranscript.length === 0) return;

    const newEntries = callTranscript.slice(lastRelayedLenRef.current);
    if (newEntries.length === 0) return;

    const baseIndex = lastRelayedLenRef.current;
    lastRelayedLenRef.current = callTranscript.length;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    for (let i = 0; i < newEntries.length; i++) {
      const entry = newEntries[i];
      const isAgent = entry.role === 'assistant';
      const label = isAgent ? 'Your agent' : 'Them';
      const msgId = `call-${Date.now()}-${baseIndex + i}`;

      const msg: Message = {
        id: msgId,
        role: 'assistant' as const,
        text: `${label}: ${entry.text}`,
        timestamp: now,
      };

      setMessages((prev) => [...prev, msg]);

      quickTranslate(entry.text, toLang.name, fromLang.name).then((translated) => {
        const same = translated.toLowerCase().trim() === entry.text.toLowerCase().trim();
        if (!same) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId
                ? { ...m, text: `${label}: ${translated}\n(${entry.text})` }
                : m
            )
          );
        }
      });
    }
  }, [callTranscript, callStatus, toLang.name, fromLang.name]);

  // Reset relay tracker when call ends
  useEffect(() => {
    if (callStatus === 'idle') {
      lastRelayedLenRef.current = 0;
    }
  }, [callStatus]);

  // Handle text message send
  const handleSend = async (text: string, attachment?: string) => {
    if (!text.trim() && !attachment) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text.trim() || 'What is this?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachment,
    };

    setMessages((prev) => [...prev, userMessage]);

    if (isCallActive && !attachment) {
      sendCallMessage(text.trim());
      sendDecision(text.trim());
      const ackMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: 'Got it, relaying that now.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, ackMessage]);
      return;
    }

    const callIntent = extractCallIntent(text);
    if (callIntent && !attachment) {
      const ackMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: `Setting up call to ${callIntent.phone}...`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, ackMessage]);
      setCallPreFill(callIntent);
      setShowCallSheet(true);
      return;
    }

    setIsLoading(true);

    try {
      const response = await translateAndChat(
        userMessage.text,
        fromLang.name,
        toLang.name,
        attachment,
        travelerContextRef.current ?? undefined
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: response.response,
        translation: response.translation,
        pronunciation: response.pronunciation,
        originalText: response.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Translation error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: 'Sorry, I had trouble with that. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle live voice mode via orb
  const handleOrbClick = useCallback(async () => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (isConnected) {
      disconnectVoice();
      setListenMode(false);
    } else {
      await connectVoice();
    }
  }, [isConnected, isSpeaking, connectVoice, disconnectVoice, stopSpeaking]);

  // Swap languages
  const handleSwapLanguages = () => {
    setFromLang(toLang);
    setToLang(fromLang);
  };

  // Toggle favorite
  const handleToggleFavorite = (id: string) => {
    const target = messages.find((m) => m.id === id);
    const becomingFavorite = target && !target.isFavorite;

    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, isFavorite: !msg.isFavorite } : msg))
    );

    if (becomingFavorite && target) {
      saveMemory('phrase', target.translation || target.text, {
        source: 'favorite',
        originalText: target.text,
      });
    }
  };

  // Clear history
  const handleClearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Save camera translation result to chat
  const handleSaveCamera = useCallback((result: CameraTranslationResult) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msg: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      text: result.translatedText,
      translation: result.extractedText,
      timestamp: now,
    };
    setMessages((prev) => [...prev, msg]);
    setViewMode('translate');

    saveMemory('phrase', `${result.extractedText} → ${result.translatedText}`, {
      source: 'camera',
    });
  }, []);

  const handleSaveDish = useCallback((dish: DishAnalysis) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const contextMsg: Message = {
      id: `dish-${Date.now()}`,
      role: 'assistant',
      text: `I identified this dish: ${dish.dishName}${dish.localName ? ` (${dish.localName})` : ''} — ${dish.description}. Cuisine: ${dish.cuisineType}. Ingredients: ${dish.ingredients.join(', ')}. If you want to order it or ask about it, I can help you say that in ${toLang.name}.`,
      timestamp: now,
    };

    setMessages((prev) => [...prev, contextMsg]);
    setViewMode('translate');

    saveMemory('dish', `${dish.dishName}${dish.localName ? ` (${dish.localName})` : ''} - ${dish.description}`, {
      cuisine: dish.cuisineType,
      ingredients: dish.ingredients,
    });
  }, [toLang.name]);

  const handleExploreBack = useCallback(() => {
    setExploreCategory(null);
    setShowExplore(false);
  }, []);

  const handleCategorySelect = useCallback((category: PlaceCategory) => {
    setExploreCategory(category);
    setShowExplore(true);
  }, []);

  const handleSearchSelect = useCallback(() => {
    setExploreCategory(null);
    setShowExplore(true);
  }, []);

  // Build chat context for call
  const chatContext = callPreFill?.task
    ?? messages.filter((m) => m.role === 'user').slice(-3).map((m) => m.text).join(' | ');

  const handleCallSheetOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setCallPreFill(null);
      if (callResult !== null) {
        const summaryMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          text: `Call completed: ${callResult.summary}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, summaryMessage]);

        saveMemory('event', `Called: ${callResult.summary}`, {
          source: 'phone_call',
        });

        resetCall();
      }
    }
    setShowCallSheet(nextOpen);
  }, [callResult, resetCall]);

  const handleSettingsClick = () => {
    setViewMode('settings');
  };

  // Persistent Cartesia client for on-demand TTS playback
  const ttsClientRef = useRef<CartesiaClient | null>(null);

  const handlePlayAudio = useCallback(async (text: string, langCode: string) => {
    if (!cartesiaApiKey) {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langCode;
        speechSynthesis.speak(utterance);
      }
      return;
    }

    if (!ttsClientRef.current || ttsClientRef.current.status !== 'connected') {
      ttsClientRef.current = new CartesiaClient({ apiKey: cartesiaApiKey });
      await ttsClientRef.current.connect();
    }

    ttsClientRef.current.speak(text, langCode);
  }, [cartesiaApiKey]);

  // Derive orb state from voice/call status
  const orbState: OrbState = isCallActive
    ? 'call'
    : isSpeaking
      ? 'speaking'
      : voiceStatus === 'processing' || isLoading
        ? 'processing'
        : isListening
          ? 'listening'
          : 'idle';

  const hasMessages = messages.length > 0;

  const renderTranslateView = () => (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header onSettingsClick={handleSettingsClick} />

      <LanguageSelector
        fromLang={fromLang}
        toLang={toLang}
        onSwap={handleSwapLanguages}
        onFromChange={setFromLang}
        onToChange={setToLang}
      />

      {/* Scrollable chat messages */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {hasMessages ? (
          <div className="px-4 pt-2 pb-4 space-y-1">
            {messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                onToggleFavorite={handleToggleFavorite}
                onPlayAudio={handlePlayAudio}
                targetLangCode={toLang.code}
              />
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-secondary/60 rounded-2xl px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        ) : (
          /* Empty state hint */
          <div className="flex flex-col items-center justify-center h-full gap-2 px-8 pb-8 text-center">
            <p className="text-sm text-muted-foreground/50">Tap the orb to speak, or type below</p>
          </div>
        )}
      </div>

      {/* Live transcript preview */}
      {currentTranscript && (
        <div className="px-6 py-1.5">
          <p className="text-[15px] text-center text-[rgba(235,235,245,0.8)] truncate">
            {currentTranscript}
          </p>
        </div>
      )}

      {/* Listen mode toggle - visible when voice is connected */}
      {isConnected && (
        <div className="flex justify-center px-4 pt-1.5 pb-0.5">
          <button
            onClick={() => setListenMode((prev) => !prev)}
            className={cn(
              'flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
              listenMode
                ? 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/40'
                : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
            )}
          >
            {listenMode ? (
              <>
                <Ear className="h-3.5 w-3.5" />
                <span>Listening to them ({toLang.flag} {toLang.name})</span>
              </>
            ) : (
              <>
                <Mic className="h-3.5 w-3.5" />
                <span>I speak ({fromLang.flag} {fromLang.name})</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Bottom dock: input */}
      <div className="flex flex-col items-center gap-2 px-4 pb-3 pt-2 bg-background/80 backdrop-blur-xl border-t border-border/30">
        <div className="w-full">
          <InputArea
            onSend={handleSend}
            isLoading={isLoading}
            isLive={isConnected}
            onToggleLive={handleOrbClick}
            onStartCall={() => setShowCallSheet(true)}
            homeCurrency={settings.homeCurrency}
            foreignCurrency={LANG_TO_CURRENCY[toLang.code]?.code ?? 'USD'}
          />
        </div>
      </div>

      <CallSheet
        open={showCallSheet}
        onOpenChange={handleCallSheetOpenChange}
        targetLanguage={toLang.name}
        chatContext={chatContext}
        defaultPhoneNumber={callPreFill?.phone}
        status={callStatus}
        transcript={callTranscript}
        duration={callDuration}
        result={callResult}
        error={callError}
        pendingDecision={callPendingDecision}
        onStartCall={(request: CallRequest) => startCall({
          ...request,
          userPhone: profile?.phone_number ?? undefined,
          userCity: profile?.home_city ?? undefined,
        })}
        onEndCall={endCall}
        onSendMessage={sendCallMessage}
        onSendDecision={sendDecision}
      />
    </div>
  );

  const renderPhrasesView = () => (
    <div className="flex flex-col flex-1 overflow-hidden bg-background">
      <Header onSettingsClick={handleSettingsClick} />
      <PhrasesView
        messages={messages}
        onToggleFavorite={handleToggleFavorite}
        onPlayAudio={handlePlayAudio}
        targetLangCode={toLang.code}
      />
    </div>
  );

  const renderConvertView = () => (
    <CurrencyConverterView
      currentLanguage={toLang}
      homeCurrency={settings.homeCurrency}
      onChangeHomeCurrency={(code) => updateSetting('homeCurrency', code)}
      onBack={() => setViewMode('translate')}
    />
  );

  const renderSettingsView = () => (
    <SettingsView
      settings={settings}
      onToggle={toggleSetting}
      onUpdateSetting={updateSetting}
      onReset={resetSettings}
      onBack={() => setViewMode('translate')}
    />
  );

  const renderCurrentView = () => {
    switch (viewMode) {
      case 'translate':
        return renderTranslateView();
      case 'phrases':
        return renderPhrasesView();
      case 'convert':
        return renderConvertView();
      case 'settings':
        return renderSettingsView();
      case 'camera':
        return (
          <CameraTranslateView
            toLang={toLang}
            fromLang={fromLang}
            homeCurrency={settings.homeCurrency}
            onClose={() => setViewMode('translate')}
            onSaveTranslation={handleSaveCamera}
            onSaveDish={handleSaveDish}
          />
        );
      default:
        return renderTranslateView();
    }
  };

  return (
    <main className="h-dvh flex flex-col overflow-hidden bg-background text-foreground dark">
      {user && !authLoading && !isOnboarded && (
        <ProfileOnboarding userId={user.id} userEmail={user.email ?? ''} onComplete={refreshProfile} />
      )}
      {renderCurrentView()}
      <ExploreView
        visible={showExplore}
        category={exploreCategory}
        lat={latitude}
        lng={longitude}
        places={nearbyPlaces}
        loading={placesLoading}
        geoLoading={geoLoading}
        geoError={geoError}
        savedPlaces={savedPlaces}
        isSaved={isSaved}
        onToggleSave={toggleSave}
        onBack={handleExploreBack}
        recommendations={recommendations}
        chainMatches={chainMatches}
        recommendationsLoading={recommendationsLoading}
        isPaid={isPaid}
      />
      <BottomNav
        activeTab={viewMode}
        onTabChange={setViewMode}
        orbState={orbState}
        micVolume={micVolume}
        onOrbClick={handleOrbClick}
      />
      <FabSpeedDial
        onCategorySelect={handleCategorySelect}
        onSearchSelect={handleSearchSelect}
        visible={viewMode !== 'camera' && !showExplore}
      />
    </main>
  );
}
