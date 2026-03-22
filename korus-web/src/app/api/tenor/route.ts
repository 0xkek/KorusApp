import { NextRequest, NextResponse } from 'next/server';

const TENOR_API_KEY = process.env.TENOR_API_KEY;
const CLIENT_KEY = 'korus_app';

export async function GET(request: NextRequest) {
  if (!TENOR_API_KEY) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const type = searchParams.get('type') || 'search';
  const limit = searchParams.get('limit') || '20';

  // Whitelist valid type values
  if (type !== 'search' && type !== 'featured') {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  // Validate limit
  const limitNum = parseInt(limit, 10);
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
    return NextResponse.json({ error: 'Invalid limit' }, { status: 400 });
  }

  try {
    let url: string;

    if (type === 'featured') {
      // Trending/featured GIFs — no query needed
      url = `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&client_key=${CLIENT_KEY}&limit=${limitNum}`;
    } else {
      // Search GIFs — query required
      if (!query || query.length > 100) {
        return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
      }
      url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&client_key=${CLIENT_KEY}&limit=${limitNum}`;
    }

    const response = await fetch(url);
    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Tenor request failed' }, { status: 502 });
  }
}
