'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Message, Language, ViewMode } from '@/types';
import { LANGUAGES, INITIAL_MESSAGES } from '@/lib/constants';
import { translateAndChat } from '@/lib/gemini-service';
import { useVoiceTranslator } from '@/hooks/useVoiceTranslator';

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

const STORAGE_KEY = 'fluent-messages';
const LANG_STORAGE_KEY = 'fluent-languages';

export default function FluentPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [fromLang, setFromLang] = useState<Language>(LANGUAGES[0]);
  const [toLang, setToLang] = useState<Language>(LANGUAGES[1]);
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // API Keys from environment
  const deepgramApiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY || '';
  const cartesiaApiKey = process.env.NEXT_PUBLIC_CARTESIA_API_KEY || '';

  // Handle translation results from voice
  const handleVoiceTranslation = useCallback(
    (original: string, translation: string, pronunciation?: string) => {
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        text: original,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      // Add assistant message with translation
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: original,
        translation,
        pronunciation,
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

  const { settings, toggleSetting, resetSettings } = useAppSettings();

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

  // Navigate to settings
  const handleSettingsClick = () => {
    setViewMode('settings');
  };

  // Play audio using browser TTS
  const handlePlayAudio = (text: string, langCode: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      speechSynthesis.speak(utterance);
    }
  };

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
      onBack={() => setViewMode('chat')}
    />
  );

  const renderSettingsView = () => (
    <SettingsView
      settings={settings}
      onToggle={toggleSetting}
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
