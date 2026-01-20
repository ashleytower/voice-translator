export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  translation?: string;
  pronunciation?: string;
  originalText?: string;
  timestamp: string;
  isAudioPlaying?: boolean;
  isFavorite?: boolean;
  attachment?: string; // Base64 string of the image
}

export interface Language {
  code: string;
  name: string;
  flag: string;
}

export interface TranslationResponse {
  translation: string;
  pronunciation: string;
  response: string;
}

export interface DetectedObject {
  id: string;
  label: string;
  nativeLabel: string;
  confidence: number;
  box: { x: number; y: number; w: number; h: number }; // Percentages 0-100
  details?: {
    description: string;
    fact: string;
  };
}

export interface ARScan {
  id: string;
  timestamp: string;
  location: string;
  type?: 'currency' | 'translation' | 'object';
  isFavorite?: boolean;

  // Currency specific
  originalAmount?: string;
  originalCurrency?: string;
  convertedAmount?: string;
  convertedCurrency?: string;

  // Translation & Object specific
  originalText?: string;
  translatedText?: string;

  // Object specific
  confidence?: string;
  detectedObjects?: DetectedObject[];
}

export interface AppSettings {
  autoPlay: boolean;
  hapticFeedback: boolean;
  saveHistory: boolean;
  defaultFromLang: string;
  defaultToLang: string;
}

export type ViewMode = 'chat' | 'currency' | 'ar' | 'settings' | 'favs';
