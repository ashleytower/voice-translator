import { NextRequest, NextResponse } from 'next/server';
import type { NearbyPlace } from '@/types';

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.currentOpeningHours',
  'places.nationalPhoneNumber',
  'places.photos',
  'places.primaryType',
  'places.priceLevel',
].join(',');

interface GooglePlace {
  id: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  currentOpeningHours?: { openNow?: boolean };
  nationalPhoneNumber?: string;
  photos?: Array<{ name: string }>;
  primaryType?: string;
  priceLevel?: string;
}

function buildPhotoUrl(photoName: string): string {
  return `/api/places/photo?ref=${encodeURIComponent(photoName)}&maxWidth=400`;
}

function mapPlace(place: GooglePlace): NearbyPlace {
  const firstPhoto = place.photos?.[0]?.name ?? null;

  return {
    id: place.id,
    name: place.displayName?.text ?? '',
    address: place.formattedAddress ?? '',
    lat: place.location?.latitude ?? 0,
    lng: place.location?.longitude ?? 0,
    rating: place.rating ?? null,
    ratingCount: place.userRatingCount ?? 0,
    isOpen: place.currentOpeningHours?.openNow ?? null,
    phone: place.nationalPhoneNumber ?? null,
    photoUrl: firstPhoto ? buildPhotoUrl(firstPhoto) : null,
    type: place.primaryType ?? '',
    priceLevel: place.priceLevel ?? null,
  };
}

export async function GET(request: NextRequest): Promise<Response> {
  const serverKey = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!serverKey) {
    return NextResponse.json(
      { error: 'Google Maps API is not configured' },
      { status: 500 }
    );
  }

  const { searchParams } = request.nextUrl;
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const type = searchParams.get('type');
  const radiusParam = searchParams.get('radius');

  if (!lat || !lng || !type) {
    return NextResponse.json(
      { error: 'Missing required query parameters: lat, lng, type' },
      { status: 400 }
    );
  }

  const radius = radiusParam ? Number(radiusParam) : 1000;

  let response: Response;
  try {
    response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
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
  } catch (err) {
    console.error('[Places] Network error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch nearby places' },
      { status: 500 }
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Places] API error:', response.status, errorText);
    return NextResponse.json(
      { error: 'Failed to fetch nearby places' },
      { status: 500 }
    );
  }

  const data = await response.json();
  const places: GooglePlace[] = data.places ?? [];
  const cleaned: NearbyPlace[] = places.map((p) => mapPlace(p));

  return NextResponse.json(cleaned);
}
