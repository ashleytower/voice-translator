import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { verifyAuth, standardError } from '@/lib/api-utils';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const user = await verifyAuth();
  if (!user) {
    return standardError('Unauthorized', 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return standardError('Invalid JSON body', 400);
  }

  const { text, fromLang, toLang, imageBase64, travelerContext } = body;

  if ((!text && !imageBase64) || !fromLang || !toLang) {
    return standardError('Missing required fields: (text or imageBase64), fromLang, toLang', 400);
  }

  const apiKey = process.env.GOOGLE_API_KEY || '';
  const ai = new GoogleGenAI({ apiKey });
  const modelName = 'gemini-1.5-flash';

  let promptText = `
    You are a helpful AI translator and travel companion.
    The user is speaking in ${fromLang} (or providing an image to analyze).

    Task:
    1. Translate the user's message (or describe/translate the text in the image) into ${toLang} naturally.
    2. Provide the pronunciation (romanization) for the translation if the target language uses a non-Latin script.
    3. Provide a short, helpful response in ${fromLang}.
  `;

  if (travelerContext) {
    promptText += `\n${travelerContext}\n`;
  }

  promptText += `\n      User Message: "${text}"\n    `;

  const contents: any = {
    role: 'user',
    parts: [{ text: promptText }],
  };

  if (imageBase64) {
    const base64Data = imageBase64.split(',')[1] || imageBase64;
    const mimeType = imageBase64.includes(';')
      ? imageBase64.substring(imageBase64.indexOf(':') + 1, imageBase64.indexOf(';'))
      : 'image/jpeg';

    contents.parts.push({
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
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

    if (!response.text) {
        throw new Error('No response text from Gemini');
    }

    return NextResponse.json(JSON.parse(response.text));
  } catch (error) {
    console.error('Gemini API Error:', error);
    return standardError('Failed to process translation', 500);
  }
}
