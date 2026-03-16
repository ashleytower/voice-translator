import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, standardError } from '@/lib/api-utils';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const user = await verifyAuth();
  if (!user) {
    return standardError('Unauthorized', 401);
  }

  const apiKey = process.env.CARTESIA_API_KEY;
  if (!apiKey) {
    return standardError('Cartesia API key not configured', 500);
  }

  return NextResponse.json({ key: apiKey });
}
