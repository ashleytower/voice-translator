import { Language, Message } from '@/types';

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
];

export const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'user',
    text: "Yo, where's the closest subway station? I'm kinda lost lol",
    timestamp: '12:04'
  },
  {
    id: '2',
    role: 'assistant',
    text: "Just around the corner, 2 min walk! You got this!",
    originalText: "Just around the corner, 2 min walk! You got this!",
    translation: "一番近い地下鉄の駅はどこですか？",
    pronunciation: "Ichiban chikai chikatetsu no eki wa doko desu ka?",
    timestamp: '12:05'
  }
];
