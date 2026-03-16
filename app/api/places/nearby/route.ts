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
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const type = searchParams.get('type');
  const radiusParam = searchParams.get('radius');

  if (!lat || !lng || !type) {
    return standardError('Missing required query parameters: lat, lng, type', 400);
  }

  const radius = radiusParam ? Number(radiusParam) : 1000;

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': serverKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        includedTypes: [type],
        locationRestriction: {
          circle: {
            center: {
              latitude: Number(lat),
              longitude: Number(lng),
            },
            radius,
          },
        },
        maxResultCount: 20,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Places] API error:', response.status, errorText);
      return standardError('Failed to fetch nearby places', 500);
    }

    const data = await response.json();
    const places: GooglePlace[] = data.places ?? [];
    const cleaned: NearbyPlace[] = places.map((p) => mapPlace(p));

    return NextResponse.json(cleaned);
  } catch (err) {
    console.error('[Places] Network error:', err);
    return standardError('Failed to fetch nearby places', 500);
  }
}
