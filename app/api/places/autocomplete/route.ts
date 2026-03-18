import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const serverKey = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!serverKey) {
    return NextResponse.json({ error: 'Google Maps not configured' }, { status: 500 });
  }

  const input = request.nextUrl.searchParams.get('input');
  if (!input || input.length < 3) {
    return NextResponse.json({ error: 'Input must be at least 3 characters' }, { status: 400 });
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', input);
  url.searchParams.set('types', '(cities)');
  url.searchParams.set('key', serverKey);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    return NextResponse.json({ error: 'Places API error', status: data.status }, { status: 502 });
  }

  return NextResponse.json({
    predictions: (data.predictions ?? []).map((p: Record<string, unknown>) => ({
      place_id: p.place_id,
      description: p.description,
      structured_formatting: p.structured_formatting,
    })),
  });
}
