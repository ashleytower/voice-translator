import { TranslationResponse } from '@/types';

export const translateAndChat = async (
  text: string,
  fromLang: string,
  toLang: string,
  imageBase64?: string,
  travelerContext?: string
): Promise<TranslationResponse> => {
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        fromLang,
        toLang,
        imageBase64,
        travelerContext,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Translation error:', error);
    return {
      translation: 'Translation Unavailable',
      pronunciation: 'Error accessing service',
      response: 'I had trouble processing that request. Please try again.',
    };
  }
};

/**
 * Lightweight translate-only: returns just the English translation of text.
 * Used for live call transcript relay so the user can read in their language.
 */
export const quickTranslate = async (
  text: string,
  fromLang: string,
  toLang: string
): Promise<string> => {
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `Translate this from ${fromLang} to ${toLang}. Return ONLY the translation, nothing else.\n\n"${text}"`,
        fromLang,
        toLang,
      }),
    });

    if (!response.ok) return text;

    const data = await response.json();
    return data.translation?.trim().replace(/^"|"$/g, '') || text;
  } catch {
    return text;
  }
};
