import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, standardError } from '@/lib/api-utils';
import { FIELD_MASK, mapPlace, GooglePlace } from '@/lib/places-utils';
import type { NearbyPlace } from '@/types';

export async function GET(request: NextRequest): Promise<Response> {
  const user = await verifyAuth();
  if (!user) {
    return standardError('Unauthorized', 401);
  }

  const serverKey = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!serverKey) {
    return standardError('Google Maps API is not configured', 500);
  }

  const { searchParams } = request.nextUrl;
  const query = searchParams.get('query');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!query) {
    return standardError('Missing required query parameter: query', 400);
  }

  const body: Record<string, unknown> = {
    textQuery: query,
    maxResultCount: 20,
  };

  if (lat && lng) {
    body.locationBias = {
      circle: {
        center: { latitude: Number(lat), longitude: Number(lng) },
        radius: 2000,
      },
    };
  }

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': serverKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Places Search] API error:', response.status, errorText);
      return standardError('Failed to search places', 500);
    }

    const data = await response.json();
    const places: GooglePlace[] = data.places ?? [];
    const cleaned: NearbyPlace[] = places.map((p) => mapPlace(p));

    return NextResponse.json(cleaned);
  } catch (err) {
    console.error('[Places Search] Network error:', err);
    return standardError('Failed to search places', 500);
  }
}
