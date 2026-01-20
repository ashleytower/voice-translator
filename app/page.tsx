'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Message, Language, ViewMode, ARScan } from '@/types';
import { LANGUAGES, INITIAL_MESSAGES } from '@/lib/constants';
import { translateAndChat } from '@/lib/gemini-service';
import { useGeminiLive } from '@/hooks/useGeminiLive';

import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { InputArea } from '@/components/chat/InputArea';
import { LanguageSelector } from '@/components/chat/LanguageSelector';
import { Visualizer } from '@/components/voice/Visualizer';
import { ARView } from '@/components/ar/ARView';
import { TravelToolsView } from '@/components/tools/TravelToolsView';
import { SettingsView } from '@/components/settings/SettingsView';
import { FavoritesView } from '@/components/favorites/FavoritesView';
import { useAppSettings } from '@/hooks/useAppSettings';

const STORAGE_KEY = 'fluent-messages';
const LANG_STORAGE_KEY = 'fluent-languages';
const AR_HISTORY_KEY = 'fluent-ar-history';

const SYSTEM_INSTRUCTION = `You are Fluent, a helpful, friendly, and concise travel companion translator.
When translating:
1. Translate naturally between languages
2. Provide pronunciation (romanization) when the target language uses non-Latin script
3. Give short, conversational responses
Keep responses brief and helpful.`;

export default function FluentPage() {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [fromLang, setFromLang] = useState<Language>(LANGUAGES[0]); // English
  const [toLang, setToLang] = useState<Language>(LANGUAGES[1]); // Japanese
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [arHistory, setArHistory] = useState<ARScan[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';

  // Gemini Live hook
  const {
    status,
    isConnected,
    isConnecting,
    micVolume,
    inputTranscript,
    outputTranscript,
    connect,
    disconnect,
  } = useGeminiLive({
    apiKey,
    model: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
    systemInstruction: SYSTEM_INSTRUCTION,
    voiceName: 'Kore',
  });

  // App settings hook
  const { settings, toggleSetting, resetSettings } = useAppSettings();

  // Load messages and languages from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setMessages(JSON.parse(stored));
      } else {
        // Use initial demo messages
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

      const storedArHistory = localStorage.getItem(AR_HISTORY_KEY);
      if (storedArHistory) {
        setArHistory(JSON.parse(storedArHistory));
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

  // Save AR history to localStorage
  useEffect(() => {
    if (arHistory.length > 0) {
      localStorage.setItem(AR_HISTORY_KEY, JSON.stringify(arHistory));
    }
  }, [arHistory]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle live mode transcripts
  useEffect(() => {
    if (inputTranscript && isLive) {
      // Add user message from transcript
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        text: inputTranscript,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, userMessage]);
    }
  }, [inputTranscript, isLive]);

  useEffect(() => {
    if (outputTranscript && isLive) {
      // Add assistant message from transcript
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: outputTranscript,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }
  }, [outputTranscript, isLive]);

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
    if (isLive || isConnected) {
      disconnect();
      setIsLive(false);
    } else {
      setIsLive(true);
      await connect();
    }
  }, [isLive, isConnected, connect, disconnect]);

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

  // Play audio (placeholder - could use Web Speech API)
  const handlePlayAudio = (text: string, langCode: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      speechSynthesis.speak(utterance);
    }
  };

  // AR History handlers
  const handleAddArScan = (scan: ARScan) => {
    setArHistory((prev) => [scan, ...prev]);
  };

  const handleClearArHistory = () => {
    setArHistory([]);
    localStorage.removeItem(AR_HISTORY_KEY);
  };

  const handleDeleteArItem = (id: string) => {
    setArHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const handleToggleArFavorite = (id: string) => {
    setArHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isFavorite: !item.isFavorite } : item))
    );
  };

  // Launch AR view
  const handleLaunchAR = () => {
    setViewMode('ar');
  };

  // Exit AR view
  const handleExitAR = () => {
    setViewMode('tools');
  };

  // Render chat view
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

      {/* Visualizer - shown when live */}
      {(isLive || isConnecting) && (
        <Visualizer isActive={true} isLive={isLive} volume={micVolume} />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 no-scrollbar">
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            message={message}
            onToggleFavorite={handleToggleFavorite}
            onPlayAudio={handlePlayAudio}
            targetLangCode={toLang.code}
          />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="glass-morphic rounded-2xl p-4">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-fluent-primary rounded-full animate-bounce"></span>
                <span
                  className="w-2 h-2 bg-fluent-primary rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                ></span>
                <span
                  className="w-2 h-2 bg-fluent-primary rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                ></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <InputArea
        onSend={handleSend}
        isLoading={isLoading}
        isLive={isLive || isConnected}
        onToggleLive={handleToggleLive}
      />
    </div>
  );

  // Render favorites view
  const renderFavoritesView = () => (
    <FavoritesView
      messages={messages}
      arScans={arHistory}
      onToggleMessageFavorite={handleToggleFavorite}
      onToggleScanFavorite={handleToggleArFavorite}
      onPlayAudio={handlePlayAudio}
      onBack={() => setViewMode('chat')}
      targetLangCode={toLang.code}
    />
  );

  // Render tools view
  const renderToolsView = () => (
    <TravelToolsView
      currentLanguage={toLang}
      onLaunchAR={handleLaunchAR}
      onBack={() => setViewMode('chat')}
    />
  );

  // Render AR view
  const renderARView = () => (
    <ARView
      currentLanguage={toLang}
      onBack={handleExitAR}
      onSaveScan={handleAddArScan}
      history={arHistory}
      onClearHistory={handleClearArHistory}
      onDeleteHistoryItem={handleDeleteArItem}
      onToggleFavoriteScan={handleToggleArFavorite}
    />
  );

  // Render settings view
  const renderSettingsView = () => (
    <SettingsView
      settings={settings}
      onToggle={toggleSetting}
      onReset={resetSettings}
      onBack={() => setViewMode('chat')}
    />
  );

  // Render current view
  const renderCurrentView = () => {
    switch (viewMode) {
      case 'chat':
        return renderChatView();
      case 'favs':
        return renderFavoritesView();
      case 'tools':
        return renderToolsView();
      case 'ar':
        return renderARView();
      case 'settings':
        return renderSettingsView();
      default:
        return renderChatView();
    }
  };

  return (
    <main className="min-h-dvh flex flex-col bg-background-dark text-white font-display fluent-theme">
      {renderCurrentView()}
      {viewMode !== 'ar' && <BottomNav activeTab={viewMode} onTabChange={setViewMode} />}
    </main>
  );
}
