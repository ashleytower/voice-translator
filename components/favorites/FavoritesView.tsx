'use client';

import React, { useState } from 'react';
import { Message, ARScan } from '@/types';

interface FavoritesViewProps {
  messages: Message[];
  arScans: ARScan[];
  onToggleMessageFavorite: (id: string) => void;
  onToggleScanFavorite: (id: string) => void;
  onPlayAudio: (text: string, langCode: string) => void;
  onBack: () => void;
  targetLangCode: string;
}

type TabType = 'phrases' | 'scans';

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  messages,
  arScans,
  onToggleMessageFavorite,
  onToggleScanFavorite,
  onPlayAudio,
  onBack,
  targetLangCode,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('phrases');

  const favoriteMessages = messages.filter((m) => m.isFavorite);
  const favoriteScans = arScans.filter((s) => s.isFavorite);

  const renderEmptyState = (type: string) => (
    <div className="flex flex-col items-center justify-center py-16 text-white/30">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-3xl">
          {type === 'phrases' ? 'bookmark' : 'photo_library'}
        </span>
      </div>
      <p className="text-sm font-medium">No saved {type} yet</p>
      <p className="text-xs text-white/20 mt-1">
        {type === 'phrases' ? 'Star messages to save them here' : 'Favorite AR scans to keep them'}
      </p>
    </div>
  );

  const renderPhrases = () => {
    if (favoriteMessages.length === 0) {
      return renderEmptyState('phrases');
    }

    return (
      <div className="space-y-3">
        {favoriteMessages.map((message) => (
          <div key={message.id} className="glass-panel-light rounded-2xl p-4">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                {message.translation && (
                  <p className="text-lg font-bold text-white mb-1 truncate">{message.translation}</p>
                )}
                {message.pronunciation && (
                  <p className="text-sm text-fluent-primary/70 mb-2 italic">
                    {message.pronunciation}
                  </p>
                )}
                <p className="text-sm text-gray-400 truncate">{message.text}</p>
                <p className="text-[10px] text-white/30 mt-2">{message.timestamp}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                {message.translation && (
                  <button
                    onClick={() => onPlayAudio(message.translation!, targetLangCode)}
                    className="w-9 h-9 rounded-full bg-fluent-primary/10 flex items-center justify-center text-fluent-primary hover:bg-fluent-primary/20 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">volume_up</span>
                  </button>
                )}
                <button
                  onClick={() => onToggleMessageFavorite(message.id)}
                  className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-fluent-primary hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg font-variation-fill">star</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderScans = () => {
    if (favoriteScans.length === 0) {
      return renderEmptyState('scans');
    }

    return (
      <div className="space-y-3">
        {favoriteScans.map((scan) => (
          <div key={scan.id} className="glass-panel-light rounded-2xl p-4">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      scan.type === 'currency'
                        ? 'bg-green-500/20 text-green-400'
                        : scan.type === 'translation'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">
                      {scan.type === 'currency'
                        ? 'attach_money'
                        : scan.type === 'translation'
                          ? 'translate'
                          : 'view_in_ar'}
                    </span>
                  </span>
                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                    {scan.type}
                  </span>
                </div>

                {scan.type === 'currency' ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-white/50 text-sm line-through">
                      {scan.originalCurrency} {scan.originalAmount}
                    </span>
                    <span className="text-lg font-bold text-white">
                      {scan.convertedCurrency} {scan.convertedAmount}
                    </span>
                  </div>
                ) : scan.type === 'translation' ? (
                  <>
                    <p className="text-sm text-white/50 truncate">{scan.originalText}</p>
                    <p className="text-lg font-bold text-white truncate">{scan.translatedText}</p>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {scan.detectedObjects?.map((obj, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30 text-[10px] text-blue-200"
                      >
                        {obj.label}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1 mt-2">
                  <span className="material-symbols-outlined text-[10px] text-white/40">
                    location_on
                  </span>
                  <span className="text-[10px] text-white/40">{scan.location}</span>
                  <span className="text-[10px] text-white/30 ml-2">{scan.timestamp}</span>
                </div>
              </div>

              <button
                onClick={() => onToggleScanFavorite(scan.id)}
                className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-fluent-primary hover:bg-white/10 transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-lg font-variation-fill">star</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    );
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
          <h1 className="text-xl font-bold tracking-tight">Saved</h1>
          <p className="text-[10px] text-white/50 uppercase tracking-widest">
            {favoriteMessages.length + favoriteScans.length} items
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 py-3 flex gap-2">
        <button
          onClick={() => setActiveTab('phrases')}
          className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'phrases'
              ? 'bg-fluent-primary text-white'
              : 'bg-white/5 text-white/50 hover:bg-white/10'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-lg">translate</span>
            Phrases ({favoriteMessages.length})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('scans')}
          className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'scans'
              ? 'bg-fluent-primary text-white'
              : 'bg-white/5 text-white/50 hover:bg-white/10'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-lg">photo_camera</span>
            Scans ({favoriteScans.length})
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 no-scrollbar pb-24">
        {activeTab === 'phrases' ? renderPhrases() : renderScans()}
      </div>
    </div>
  );
};

export default FavoritesView;
