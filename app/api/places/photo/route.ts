import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, standardError } from '@/lib/api-utils';

/**
 * Proxies Google Places photo requests server-side.
 * Keeps the API key off the client and avoids CORS / referrer issues.
 *
 * Usage: GET /api/places/photo?ref=places/{placeId}/photos/{photoRef}&maxWidth=400
 */
export async function GET(request: NextRequest): Promise<Response> {
  const user = await verifyAuth();
  if (!user) {
    return standardError('Unauthorized', 401);
  }

  const serverKey = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!serverKey) {
    return standardError('Google Maps API is not configured', 500);
  }

  const ref = request.nextUrl.searchParams.get('ref');
  if (!ref) {
    return standardError('Missing required query parameter: ref', 400);
  }

  // Validate the ref looks like a Places photo reference
  if (!ref.startsWith('places/') || !ref.includes('/photos/')) {
    return standardError('Invalid photo reference format', 400);
  }

  const maxWidth = request.nextUrl.searchParams.get('maxWidth') ?? '400';

  const url = `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=${maxWidth}&skipHttpRedirect=true&key=${serverKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return standardError('Photo not available', response.status);
    }

    // skipHttpRedirect=true returns JSON with { photoUri: "https://lh3.googleusercontent.com/..." }
    const data = await response.json();
    const photoUri: string | undefined = data.photoUri;

    if (!photoUri) {
      return standardError('No photo URI in response', 404);
    }

    // Fetch the actual image from Google CDN
    const imageResponse = await fetch(photoUri);

    if (!imageResponse.ok || !imageResponse.body) {
      return standardError('Image not available', 502);
    }

    // Stream the image back with appropriate headers
    const contentType = imageResponse.headers.get('Content-Type') ?? 'image/jpeg';

    return new Response(imageResponse.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error('[Places Photo] error:', error);
    return standardError('Failed to fetch photo', 502);
  }
}
