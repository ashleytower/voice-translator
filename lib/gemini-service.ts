import { GoogleGenAI, Type } from '@google/genai';
import { TranslationResponse } from '@/types';

// Initialize Gemini
const getAI = () => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
  return new GoogleGenAI({ apiKey });
};

export const translateAndChat = async (
  text: string,
  fromLang: string,
  toLang: string,
  imageBase64?: string
): Promise<TranslationResponse> => {
  try {
    const ai = getAI();
    const model = 'gemini-2.5-flash';

    let promptText = `
      You are a helpful AI translator and travel companion.
      The user is speaking in ${fromLang} (or providing an image to analyze).

      Task:
      1. Translate the user's message (or describe/translate the text in the image) into ${toLang} naturally.
      2. Provide the pronunciation (romanization) for the translation if the target language uses a non-Latin script.
      3. Provide a short, helpful response in ${fromLang}.

      User Message: "${text}"
    `;

    if (imageBase64) {
      promptText +=
        '\n [System: An image was attached. Analyze the image contents, text, or food items and help the user.]';
    }

    const contents: {
      role: string;
      parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
    } = {
      role: 'user',
      parts: [{ text: promptText }],
    };

    // If there is an image, strip the header (data:image/jpeg;base64,) and add to parts
    if (imageBase64) {
      const base64Data = imageBase64.split(',')[1];
      const mimeType = imageBase64.substring(
        imageBase64.indexOf(':') + 1,
        imageBase64.indexOf(';')
      );

      contents.parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: [contents],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translation: {
              type: Type.STRING,
              description: 'The translation or image description in the target language',
            },
            pronunciation: {
              type: Type.STRING,
              description: 'The romanized pronunciation',
            },
            response: {
              type: Type.STRING,
              description: 'A helpful reply in the source language',
            },
          },
          required: ['translation', 'pronunciation', 'response'],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as TranslationResponse;
    }

    throw new Error('No response from Gemini');
  } catch (error) {
    console.error('Gemini API Error:', error);
    return {
      translation: 'Translation Unavailable',
      pronunciation: 'Error accessing service',
      response: 'I had trouble processing that request. Please try again.',
    };
  }
};
