'use client';

import React, { useState } from 'react';
import { ARScan } from '@/types';

interface HistoryOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  history: ARScan[];
  onClear?: () => void;
  onDeleteItem?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
}

export const HistoryOverlay: React.FC<HistoryOverlayProps> = ({
  isOpen,
  onClose,
  history,
  onClear,
  onDeleteItem,
  onToggleFavorite,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 flex flex-col justify-end sm:justify-center">
      <div className="absolute inset-0" onClick={onClose}></div>

      <div className="relative bg-background-dark/90 border-t border-white/10 rounded-t-3xl sm:rounded-3xl sm:mx-6 max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-10 duration-300 w-full sm:w-auto overflow-hidden">
        {/* Confirmation Overlay */}
        {showConfirm && (
          <div className="absolute inset-0 z-20 bg-background-dark/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 text-red-500 border border-red-500/20">
              <span className="material-symbols-outlined text-3xl">warning</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Clear History?</h3>
            <p className="text-sm text-gray-400 mb-8 max-w-[200px] leading-relaxed">
              This will permanently delete all your scanned items. This action cannot be
              undone.
            </p>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={() => {
                  if (onClear) onClear();
                  setShowConfirm(false);
                }}
                className="w-full py-4 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 active:scale-[0.98]"
              >
                Yes, Clear Everything
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="w-full py-4 rounded-xl bg-white/5 border border-white/10 font-bold text-sm text-white hover:bg-white/10 transition-colors active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-fluent-primary/10 flex items-center justify-center text-fluent-primary">
              <span className="material-symbols-outlined">history</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Scan History</h2>
              <p className="text-xs text-white/50">{history.length} records found</p>
            </div>
          </div>
          <div className="flex gap-2">
            {onClear && history.length > 0 && (
              <button
                onClick={() => setShowConfirm(true)}
                title="Clear All"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-colors border border-white/5"
              >
                <span className="material-symbols-outlined text-sm">delete_sweep</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/5"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar bg-gradient-to-b from-background-dark/50 to-background-dark">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/30">
              <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
              <p className="text-sm">No history yet</p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="glass-panel-light p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all border-white/5 hover:border-white/10"
              >
                <div className="flex flex-col gap-1 flex-1 min-w-0 pr-2">
                  {/* Render based on Type */}
                  {item.type === 'translation' ? (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-4 h-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[10px] text-purple-400">
                            translate
                          </span>
                        </span>
                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                          Text Translation
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white/50 text-xs truncate">
                          {item.originalText}
                        </span>
                        <span className="text-lg font-bold text-white truncate">
                          {item.translatedText}
                        </span>
                      </div>
                    </>
                  ) : item.type === 'object' ? (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[10px] text-blue-400">
                            view_in_ar
                          </span>
                        </span>
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                          Object Recognition
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        {item.detectedObjects ? (
                          <div className="flex flex-wrap gap-1">
                            {item.detectedObjects.map((obj, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30 text-[10px] text-blue-200"
                              >
                                {obj.label}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-lg font-bold text-white truncate">
                            {item.translatedText}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-fluent-primary uppercase tracking-wider">
                          {item.originalCurrency || 'JPY'}
                        </span>
                        <span className="material-symbols-outlined text-[10px] text-white/30">
                          arrow_forward
                        </span>
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          {item.convertedCurrency || 'CAD'}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-white/60 text-sm line-through decoration-white/30">
                          {item.originalAmount}
                        </span>
                        <span className="text-xl font-bold text-white">
                          {item.convertedAmount}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-[10px] text-white/40">
                      location_on
                    </span>
                    <span className="text-[10px] text-white/40">{item.location}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className="text-[10px] text-white/30 font-medium font-mono">
                    {item.timestamp}
                  </span>
                  <div className="flex gap-1">
                    {onToggleFavorite && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(item.id);
                        }}
                        className={`w-8 h-8 rounded-full bg-white/5 flex items-center justify-center transition-colors ${
                          item.isFavorite
                            ? 'text-fluent-primary hover:bg-white/10'
                            : 'text-gray-500 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-base ${
                            item.isFavorite ? 'font-variation-fill' : ''
                          }`}
                        >
                          star
                        </span>
                      </button>
                    )}
                    {onDeleteItem && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteItem(item.id);
                        }}
                        className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryOverlay;
