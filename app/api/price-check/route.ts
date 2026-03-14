export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

// ── Types ──

interface PriceCheckRequest {
  productName: string;
  storeName: string;
  foreignPrice: number;
  foreignCurrency: string;
  convertedPrice: number;
  homeCurrency: string;
}

interface PriceCheckResponse {
  verdict: 'great_deal' | 'good_deal' | 'fair' | 'skip';
  homePrice: string;
  savings: string;
  explanation: string;
}

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilySearchResult[];
}

// ── Currency-to-country mapping for better search queries ──

const CURRENCY_COUNTRY_MAP: Record<string, string> = {
  CAD: 'Canada',
  USD: 'United States',
  EUR: 'Europe',
  GBP: 'United Kingdom',
  AUD: 'Australia',
  JPY: 'Japan',
  KRW: 'South Korea',
  CNY: 'China',
  THB: 'Thailand',
  SGD: 'Singapore',
  NZD: 'New Zealand',
  CHF: 'Switzerland',
  SEK: 'Sweden',
  NOK: 'Norway',
  DKK: 'Denmark',
  MXN: 'Mexico',
  BRL: 'Brazil',
  INR: 'India',
  HKD: 'Hong Kong',
  TWD: 'Taiwan',
};

// ── Fallback response when everything fails ──

const FALLBACK_RESPONSE: PriceCheckResponse = {
  verdict: 'fair',
  homePrice: 'Unknown',
  savings: 'N/A',
  explanation: 'Could not determine home pricing. Consider checking online retailers in your home country for comparison.',
};

// ── Tavily search ──

async function searchTavily(
  productName: string,
  storeName: string,
  homeCurrency: string
): Promise<TavilySearchResult[]> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) {
    throw new Error('TAVILY_API_KEY is not configured');
  }

  const country = CURRENCY_COUNTRY_MAP[homeCurrency] ?? homeCurrency;
  const query = `${productName} ${storeName} price ${country}`;

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: tavilyKey,
      query,
      search_depth: 'basic',
      max_results: 5,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tavily search failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as TavilyResponse;
  return data.results ?? [];
}

// ── Gemini analysis ──

async function analyzeWithGemini(
  productName: string,
  convertedPrice: number,
  homeCurrency: string,
  searchContext: string
): Promise<PriceCheckResponse> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? '';
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Based on these search results about "${productName}" pricing, determine:
1) The typical retail price range in ${homeCurrency}.
2) Whether ${convertedPrice} ${homeCurrency} is a good deal compared to home pricing.

Search context:
${searchContext}

Verdict rules:
- "great_deal" = 20%+ savings compared to typical home price
- "good_deal" = 5-20% savings
- "fair" = within 5% of home price (either direction)
- "skip" = more expensive than typical home price

For homePrice, give a range like "$50-$70 ${homeCurrency}" or a single value.
For savings, give a percentage like "~25% cheaper" or "~10% more expensive".
For explanation, write 1-2 sentences a traveler would find helpful.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          verdict: {
            type: Type.STRING,
            description: 'One of: great_deal, good_deal, fair, skip',
          },
          homePrice: {
            type: Type.STRING,
            description: 'Typical home price or range in home currency',
          },
          savings: {
            type: Type.STRING,
            description: 'Percentage savings or premium compared to home',
          },
          explanation: {
            type: Type.STRING,
            description: 'Brief explanation helpful for a traveler',
          },
        },
        required: ['verdict', 'homePrice', 'savings', 'explanation'],
      },
    },
  });

  if (!response.text) {
    throw new Error('No response text from Gemini');
  }

  const parsed = JSON.parse(response.text) as PriceCheckResponse;

  // Validate verdict is one of the expected values
  const validVerdicts = ['great_deal', 'good_deal', 'fair', 'skip'] as const;
  if (!validVerdicts.includes(parsed.verdict)) {
    parsed.verdict = 'fair';
  }

  return parsed;
}

// ── POST handler ──

export async function POST(request: NextRequest): Promise<Response> {
  let body: PriceCheckRequest;
  try {
    body = (await request.json()) as PriceCheckRequest;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { productName, storeName, foreignPrice, foreignCurrency, convertedPrice, homeCurrency } = body;

  if (!productName || convertedPrice == null || !homeCurrency) {
    return NextResponse.json(
      { error: 'Missing required fields: productName, convertedPrice, homeCurrency' },
      { status: 400 }
    );
  }

  // Step 1: Try Tavily search for real pricing data
  let searchContext = '';
  let tavilySucceeded = false;

  try {
    const results = await searchTavily(productName, storeName, homeCurrency);
    if (results.length > 0) {
      searchContext = results
        .map((r) => `[${r.title}]: ${r.content}`)
        .join('\n\n');
      tavilySucceeded = true;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Tavily error';

    // If the key is missing entirely, return 500 immediately
    if (message.includes('TAVILY_API_KEY is not configured')) {
      console.error('TAVILY_API_KEY not set');
      // Fall through to Gemini-only fallback instead of hard failing
    } else {
      console.error('Tavily search error:', message);
    }
  }

  // Step 2: Build context for Gemini (with or without Tavily results)
  if (!tavilySucceeded) {
    searchContext = `No search results available. Use your general knowledge about retail pricing for "${productName}" by "${storeName}" in ${CURRENCY_COUNTRY_MAP[homeCurrency] ?? homeCurrency}. The product was found abroad at ${foreignPrice} ${foreignCurrency} (approximately ${convertedPrice} ${homeCurrency}).`;
  }

  // Step 3: Analyze with Gemini
  try {
    const result = await analyzeWithGemini(
      productName,
      convertedPrice,
      homeCurrency,
      searchContext
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error(
      'Gemini analysis error:',
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(FALLBACK_RESPONSE);
  }
}
