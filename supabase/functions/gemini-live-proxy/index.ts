/**
 * Supabase Edge Function: Gemini Live API Proxy
 * 
 * Proxies WebSocket connections to Gemini Live API while keeping the API key secure.
 * 
 * Deploy:
 * 1. supabase secrets set GOOGLE_AI_API_KEY=your-key
 * 2. supabase functions deploy gemini-live-proxy
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GEMINI_WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  // Check for WebSocket upgrade
  const upgrade = req.headers.get('upgrade') || '';
  if (upgrade.toLowerCase() !== 'websocket') {
    return new Response('Expected WebSocket', { status: 400 });
  }

  // Get API key from environment
  const apiKey = Deno.env.get('GOOGLE_AI_API_KEY');
  if (!apiKey) {
    return new Response('API key not configured', { status: 500 });
  }

  // Get optional parameters from query string
  const url = new URL(req.url);
  const model = url.searchParams.get('model') || 'gemini-2.5-flash-native-audio-preview-12-2025';
  const voice = url.searchParams.get('voice') || 'Kore'; // Soft, gentle voice

  // Upgrade to WebSocket
  const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);

  let geminiSocket: WebSocket | null = null;
  let setupSent = false;

  clientSocket.onopen = () => {
    console.log('Client connected');
    
    // Connect to Gemini
    const geminiUrl = `${GEMINI_WS_URL}?key=${apiKey}`;
    geminiSocket = new WebSocket(geminiUrl);

    geminiSocket.onopen = () => {
      console.log('Connected to Gemini');
      
      // Send setup message
      const setup = {
        setup: {
          model: `models/${model}`,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voice,
                },
              },
            },
          },
        },
      };
      
      geminiSocket!.send(JSON.stringify(setup));
      setupSent = true;
    };

    geminiSocket.onmessage = (event) => {
      // Forward Gemini responses to client
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(event.data);
      }
    };

    geminiSocket.onerror = (error) => {
      console.error('Gemini error:', error);
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(JSON.stringify({ error: 'Gemini connection error' }));
      }
    };

    geminiSocket.onclose = (event) => {
      console.log('Gemini closed:', event.code, event.reason);
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.close(event.code, event.reason);
      }
    };
  };

  clientSocket.onmessage = (event) => {
    // Forward client messages to Gemini
    if (geminiSocket && geminiSocket.readyState === WebSocket.OPEN) {
      geminiSocket.send(event.data);
    }
  };

  clientSocket.onerror = (error) => {
    console.error('Client error:', error);
  };

  clientSocket.onclose = () => {
    console.log('Client disconnected');
    if (geminiSocket) {
      geminiSocket.close();
    }
  };

  return response;
});
