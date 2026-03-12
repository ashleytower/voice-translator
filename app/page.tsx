'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Message, Language, ViewMode } from '@/types';
import { LANGUAGES, INITIAL_MESSAGES } from '@/lib/constants';
import { translateAndChat, quickTranslate } from '@/lib/gemini-service';
import { useVoiceTranslator } from '@/hooks/useVoiceTranslator';
import { CartesiaClient } from '@/lib/cartesia-client';

import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { InputArea } from '@/components/chat/InputArea';
import { LanguageSelector } from '@/components/chat/LanguageSelector';
import { Visualizer } from '@/components/voice/Visualizer';
import { CurrencyConverterView } from '@/components/currency/CurrencyConverterView';
import { SettingsView } from '@/components/settings/SettingsView';
import { FavoritesView } from '@/components/favorites/FavoritesView';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useVapiCall } from '@/hooks/useVapiCall';
import { CallSheet } from '@/components/call/CallSheet';

const STORAGE_KEY = 'fluent-messages';
const LANG_STORAGE_KEY = 'fluent-languages';

// Detect call intent: message contains a phone number + call-related keyword
const PHONE_REGEX = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const CALL_KEYWORDS = /\b(call|phone|ring|dial)\b/i;

function extractCallIntent(text: string): { task: string; phone: string } | null {
  const phoneMatch = text.match(PHONE_REGEX);
  if (!phoneMatch || !CALL_KEYWORDS.test(text)) return null;

  const rawPhone = phoneMatch[0];
  const digits = rawPhone.replace(/\D/g, '');
  const phone = digits.length === 10 ? `+1${digits}` : digits.startsWith('1') ? `+${digits}` : `+${digits}`;

  // Task is the message without the phone number
  const task = text.replace(rawPhone, '').replace(/\s{2,}/g, ' ').trim();

  return { task, phone };
}

export default function FluentPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [fromLang, setFromLang] = useState<Language>(LANGUAGES[0]);
  const [toLang, setToLang] = useState<Language>(LANGUAGES[1]);
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [isLoading, setIsLoading] = useState(false);
  const [showCallSheet, setShowCallSheet] = useState(false);
  const [callPreFill, setCallPreFill] = useState<{ task: string; phone: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastRelayedLenRef = useRef(0);

  // API Keys from environment
  const deepgramApiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY || '';
  const cartesiaApiKey = process.env.NEXT_PUBLIC_CARTESIA_API_KEY || '';

  // Handle translation results from voice
  const handleVoiceTranslation = useCallback(
    (original: string, translation: string, pronunciation?: string, response?: string) => {
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        text: original,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      // Add assistant message with translation + contextual explanation
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: response || original,
        translation,
        pronunciation,
        originalText: response || undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
    },
    []
  );

  // Voice translator hook with Deepgram + Cartesia
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
    fromLanguage: fromLang.name,
    toLanguage: toLang.name,
    onTranslation: handleVoiceTranslation,
    onError: (error) => {
      console.error('Voice error:', error);
    },
  });

  const { settings, updateSetting, toggleSetting, resetSettings } = useAppSettings();

  const {
    status: callStatus,
    transcript: callTranscript,
    duration: callDuration,
    result: callResult,
    error: callError,
    startCall,
    endCall,
    sendMessage: sendCallMessage,
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

  // Stream call transcript into chat — show immediately, translate in background
  const isCallActive = callStatus === 'starting' || callStatus === 'ringing' || callStatus === 'in-progress';

  useEffect(() => {
    if (callStatus !== 'in-progress' || callTranscript.length === 0) return;

    const newEntries = callTranscript.slice(lastRelayedLenRef.current);
    if (newEntries.length === 0) return;

    const baseIndex = lastRelayedLenRef.current;
    lastRelayedLenRef.current = callTranscript.length;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Show each entry in chat immediately (original language)
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

      // Translate in background and update the message
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

  // Auto-minimize call sheet when call connects so user sees chat
  useEffect(() => {
    if (callStatus === 'in-progress' && showCallSheet) {
      setShowCallSheet(false);
    }
  }, [callStatus, showCallSheet]);

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

    // During an active call, route chat responses to the call
    if (isCallActive && !attachment) {
      sendCallMessage(text.trim());
      const ackMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: 'Got it, relaying that now.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, ackMessage]);
      return;
    }

    // Detect call intent — phone number + "call" keyword
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
        attachment
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

  // Toggle live voice mode
  const handleToggleLive = useCallback(async () => {
    if (isConnected) {
      disconnectVoice();
    } else {
      await connectVoice();
    }
  }, [isConnected, connectVoice, disconnectVoice]);

  // Swap languages
  const handleSwapLanguages = () => {
    setFromLang(toLang);
    setToLang(fromLang);
  };

  // Toggle favorite
  const handleToggleFavorite = (id: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, isFavorite: !msg.isFavorite } : msg))
    );
  };

  // Clear history
  const handleClearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Build chat context: use extracted task from call intent, or fall back to recent messages
  const chatContext = callPreFill?.task
    ?? messages.filter((m) => m.role === 'user').slice(-3).map((m) => m.text).join(' | ');

  // Handle call sheet open/close — add summary message when sheet closes after a completed call
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
        resetCall();
      }
    }
    setShowCallSheet(nextOpen);
  }, [callResult, resetCall]);

  // Navigate to settings
  const handleSettingsClick = () => {
    setViewMode('settings');
  };

  // Persistent Cartesia client for on-demand TTS playback
  const ttsClientRef = useRef<CartesiaClient | null>(null);

  const handlePlayAudio = useCallback(async (text: string, langCode: string) => {
    if (!cartesiaApiKey) {
      // Fallback to browser TTS if no Cartesia key
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langCode;
        speechSynthesis.speak(utterance);
      }
      return;
    }

    // Create or reuse Cartesia client
    if (!ttsClientRef.current || ttsClientRef.current.status !== 'connected') {
      ttsClientRef.current = new CartesiaClient({ apiKey: cartesiaApiKey });
      await ttsClientRef.current.connect();
    }

    ttsClientRef.current.speak(text, langCode);
  }, [cartesiaApiKey]);

  // Determine if we should show the visualizer
  const showVisualizer = isConnected || voiceStatus === 'connecting';
  const isLive = isListening || isSpeaking;

  const renderChatView = () => (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header onClearHistory={handleClearHistory} onSettingsClick={handleSettingsClick} />

      <LanguageSelector
        fromLang={fromLang}
        toLang={toLang}
        onSwap={handleSwapLanguages}
        onFromChange={setFromLang}
        onToChange={setToLang}
      />

      {/* Voice status indicator */}
      {showVisualizer && (
        <div className="px-4 py-2 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                voiceStatus === 'listening' ? 'bg-green-500 animate-pulse' :
                voiceStatus === 'processing' ? 'bg-yellow-500 animate-pulse' :
                voiceStatus === 'speaking' ? 'bg-blue-500 animate-pulse' :
                voiceStatus === 'connecting' ? 'bg-orange-500 animate-pulse' :
                'bg-gray-500'
              }`} />
              <span className="text-xs text-muted-foreground capitalize">{voiceStatus}</span>
            </div>
            {currentTranscript && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                {currentTranscript}
              </span>
            )}
          </div>
        </div>
      )}

      {showVisualizer && (
        <Visualizer isActive={true} isLive={isLive} volume={micVolume} />
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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
            <div className="bg-secondary rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <InputArea
        onSend={handleSend}
        isLoading={isLoading}
        isLive={isConnected}
        onToggleLive={handleToggleLive}
        onStartCall={() => setShowCallSheet(true)}
      />

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
        onStartCall={startCall}
        onEndCall={endCall}
        onSendMessage={sendCallMessage}
      />
    </div>
  );

  const renderFavoritesView = () => (
    <FavoritesView
      messages={messages}
      onToggleMessageFavorite={handleToggleFavorite}
      onPlayAudio={handlePlayAudio}
      onBack={() => setViewMode('chat')}
      targetLangCode={toLang.code}
    />
  );

  const renderCurrencyView = () => (
    <CurrencyConverterView
      currentLanguage={toLang}
      homeCurrency={settings.homeCurrency}
      onChangeHomeCurrency={(code) => updateSetting('homeCurrency', code)}
      onBack={() => setViewMode('chat')}
    />
  );

  const renderSettingsView = () => (
    <SettingsView
      settings={settings}
      onToggle={toggleSetting}
      onUpdateSetting={updateSetting}
      onReset={resetSettings}
      onBack={() => setViewMode('chat')}
    />
  );

  const renderCurrentView = () => {
    switch (viewMode) {
      case 'chat':
        return renderChatView();
      case 'favs':
        return renderFavoritesView();
      case 'currency':
        return renderCurrencyView();
      case 'settings':
        return renderSettingsView();
      default:
        return renderChatView();
    }
  };

  return (
    <main className="min-h-dvh flex flex-col bg-background text-foreground dark">
      {renderCurrentView()}
      <BottomNav activeTab={viewMode} onTabChange={setViewMode} />
    </main>
  );
}
