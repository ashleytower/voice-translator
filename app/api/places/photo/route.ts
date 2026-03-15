import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxies Google Places photo requests server-side.
 * Keeps the API key off the client and avoids CORS / referrer issues.
 *
 * Usage: GET /api/places/photo?ref=places/{placeId}/photos/{photoRef}&maxWidth=400
 */
export async function GET(request: NextRequest): Promise<Response> {
  const serverKey = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!serverKey) {
    return NextResponse.json(
      { error: 'Google Maps API is not configured' },
      { status: 500 }
    );
  }

  const ref = request.nextUrl.searchParams.get('ref');
  if (!ref) {
    return NextResponse.json(
      { error: 'Missing required query parameter: ref' },
      { status: 400 }
    );
  }

  // Validate the ref looks like a Places photo reference
  if (!ref.startsWith('places/') || !ref.includes('/photos/')) {
    return NextResponse.json(
      { error: 'Invalid photo reference format' },
      { status: 400 }
    );
  }

  const maxWidth = request.nextUrl.searchParams.get('maxWidth') ?? '400';

  const url = `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=${maxWidth}&skipHttpRedirect=true&key=${serverKey}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch photo' },
      { status: 502 }
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: 'Photo not available' },
      { status: response.status }
    );
  }

  // skipHttpRedirect=true returns JSON with { photoUri: "https://lh3.googleusercontent.com/..." }
  const data = await response.json();
  const photoUri: string | undefined = data.photoUri;

  if (!photoUri) {
    return NextResponse.json(
      { error: 'No photo URI in response' },
      { status: 404 }
    );
  }

  // Fetch the actual image from Google CDN
  let imageResponse: Response;
  try {
    imageResponse = await fetch(photoUri);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch image from CDN' },
      { status: 502 }
    );
  }

  if (!imageResponse.ok || !imageResponse.body) {
    return NextResponse.json(
      { error: 'Image not available' },
      { status: 502 }
    );
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
}
