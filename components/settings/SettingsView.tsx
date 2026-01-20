'use client';

import React from 'react';
import { AppSettings } from '@/types';

interface SettingsViewProps {
  settings: AppSettings;
  onToggle: (key: keyof AppSettings) => void;
  onReset: () => void;
  onBack: () => void;
}

interface ToggleRowProps {
  title: string;
  description: string;
  isEnabled: boolean;
  onToggle: () => void;
  icon: string;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ title, description, isEnabled, onToggle, icon }) => (
  <button
    onClick={onToggle}
    className="w-full glass-morphic rounded-2xl p-4 text-left active:scale-[0.98] transition-all"
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-fluent-primary/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-fluent-primary">{icon}</span>
        </div>
        <div>
          <h3 className="font-medium text-white">{title}</h3>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
      </div>
      <div
        className={`w-12 h-7 rounded-full relative transition-colors ${
          isEnabled ? 'bg-fluent-primary' : 'bg-white/10'
        }`}
      >
        <div
          className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-md ${
            isEnabled ? 'right-1' : 'left-1'
          }`}
        ></div>
      </div>
    </div>
  </button>
);

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onToggle,
  onReset,
  onBack,
}) => {
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
          <h1 className="text-xl font-bold tracking-tight">Settings</h1>
          <p className="text-[10px] text-white/50 uppercase tracking-widest">Preferences</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 no-scrollbar pb-24">
        {/* Audio Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-white/50 tracking-widest uppercase px-1">
            Audio & Feedback
          </h3>
          <div className="space-y-3">
            <ToggleRow
              title="Auto-play Audio"
              description="Automatically play translations"
              isEnabled={settings.autoPlay}
              onToggle={() => onToggle('autoPlay')}
              icon="volume_up"
            />
            <ToggleRow
              title="Haptic Feedback"
              description="Vibrate on actions"
              isEnabled={settings.hapticFeedback}
              onToggle={() => onToggle('hapticFeedback')}
              icon="vibration"
            />
          </div>
        </div>

        {/* Data Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-white/50 tracking-widest uppercase px-1">
            Data & Privacy
          </h3>
          <div className="space-y-3">
            <ToggleRow
              title="Save History"
              description="Keep translation and scan history"
              isEnabled={settings.saveHistory}
              onToggle={() => onToggle('saveHistory')}
              icon="history"
            />
          </div>
        </div>

        {/* About Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-white/50 tracking-widest uppercase px-1">About</h3>
          <div className="glass-morphic rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fluent-primary to-fluent-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-2xl">translate</span>
              </div>
              <div>
                <h3 className="font-bold text-white">Fluent</h3>
                <p className="text-sm text-gray-400">Version 1.0.0</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4 leading-relaxed">
              Your AI-powered travel companion. Real-time translation, AR scanning, and cultural
              insights for seamless travel experiences.
            </p>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="space-y-3 pt-4">
          <h3 className="text-xs font-bold text-red-400/70 tracking-widest uppercase px-1">
            Danger Zone
          </h3>
          <button
            onClick={onReset}
            className="w-full glass-morphic rounded-2xl p-4 text-left border border-red-500/20 hover:bg-red-500/10 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-400">restart_alt</span>
              </div>
              <div>
                <h3 className="font-medium text-red-400">Reset All Settings</h3>
                <p className="text-sm text-gray-500">Restore to default values</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
