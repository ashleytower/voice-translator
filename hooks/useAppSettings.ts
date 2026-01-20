'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppSettings } from '@/types';

const SETTINGS_KEY = 'fluent-app-settings';

const DEFAULT_SETTINGS: AppSettings = {
  autoPlay: true,
  hapticFeedback: true,
  saveHistory: true,
  defaultFromLang: 'en',
  defaultToLang: 'ja',
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
      setIsLoaded(true);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setIsLoaded(true);
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  }, [settings, isLoaded]);

  const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleSetting = useCallback((key: keyof AppSettings) => {
    setSettings((prev) => {
      const currentValue = prev[key];
      if (typeof currentValue === 'boolean') {
        return { ...prev, [key]: !currentValue };
      }
      return prev;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(SETTINGS_KEY);
  }, []);

  return {
    settings,
    isLoaded,
    updateSetting,
    toggleSetting,
    resetSettings,
  };
}
