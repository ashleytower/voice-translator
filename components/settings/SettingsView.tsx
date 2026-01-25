'use client';

import React from 'react';
import { AppSettings } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Volume2, Vibrate, History, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  icon: React.ReactNode;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ title, description, isEnabled, onToggle, icon }) => (
  <button
    onClick={onToggle}
    className="w-full rounded-lg border border-border p-4 text-left hover:bg-secondary/50 transition-colors"
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div
        className={cn(
          'w-11 h-6 rounded-full relative transition-colors',
          isEnabled ? 'bg-primary' : 'bg-secondary'
        )}
      >
        <div
          className={cn(
            'w-5 h-5 bg-background rounded-full absolute top-0.5 transition-all shadow-sm',
            isEnabled ? 'right-0.5' : 'left-0.5'
          )}
        />
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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Settings</h1>
          <p className="text-xs text-muted-foreground">Preferences</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Audio Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
            Audio & Feedback
          </h3>
          <div className="space-y-2">
            <ToggleRow
              title="Auto-play Audio"
              description="Automatically play translations"
              isEnabled={settings.autoPlay}
              onToggle={() => onToggle('autoPlay')}
              icon={<Volume2 className="h-5 w-5" />}
            />
            <ToggleRow
              title="Haptic Feedback"
              description="Vibrate on actions"
              isEnabled={settings.hapticFeedback}
              onToggle={() => onToggle('hapticFeedback')}
              icon={<Vibrate className="h-5 w-5" />}
            />
          </div>
        </div>

        {/* Data Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
            Data & Privacy
          </h3>
          <div className="space-y-2">
            <ToggleRow
              title="Save History"
              description="Keep translation history"
              isEnabled={settings.saveHistory}
              onToggle={() => onToggle('saveHistory')}
              icon={<History className="h-5 w-5" />}
            />
          </div>
        </div>

        {/* About Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
            About
          </h3>
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-primary-foreground text-xl">
                  translate
                </span>
              </div>
              <div>
                <h3 className="font-semibold">Fluent</h3>
                <p className="text-sm text-muted-foreground">Version 1.0.0</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Your AI-powered travel companion with real-time translation and currency conversion.
            </p>
          </div>
        </div>

        {/* Reset */}
        <div className="space-y-3 pt-4">
          <h3 className="text-xs font-medium text-destructive uppercase tracking-wide px-1">
            Danger Zone
          </h3>
          <button
            onClick={onReset}
            className="w-full rounded-lg border border-destructive/30 p-4 text-left hover:bg-destructive/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-medium text-destructive">Reset All Settings</h3>
                <p className="text-sm text-muted-foreground">Restore to default values</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
