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

export interface CameraTranslationSegment {
  region: string;
  original: string;
  translated: string;
}

export interface CameraTranslationResult {
  extractedText: string;
  translatedText: string;
  detectedLanguage: string;
  confidence: number;
  segments: CameraTranslationSegment[];
}

export interface AppSettings {
  autoPlay: boolean;
  hapticFeedback: boolean;
  saveHistory: boolean;
  defaultFromLang: string;
  defaultToLang: string;
  homeCurrency: string;
}

export type ViewMode = 'chat' | 'camera' | 'currency' | 'settings' | 'favs';

export interface CallRequest {
  phoneNumber: string;
  taskDescription: string;
  targetLanguage: string;
  userName?: string;
  partySize?: number;
  date?: string;
  time?: string;
  specialRequests?: string;
}

export interface CallTranscript {
  role: 'assistant' | 'user';
  text: string;
  timestamp: string;
}

export type CallStatus = 'idle' | 'starting' | 'ringing' | 'in-progress' | 'ended' | 'error';

export interface CallResult {
  status: 'success' | 'failed';
  duration: number;
  summary: string;
  transcript: CallTranscript[];
}
