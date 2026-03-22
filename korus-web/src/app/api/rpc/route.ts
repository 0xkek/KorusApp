import { NextRequest, NextResponse } from 'next/server';

const HELIUS_RPC_URL = process.env.HELIUS_RPC_URL;

// Allowlist of safe RPC methods (prevent abuse)
const ALLOWED_METHODS = new Set([
  'getBalance', 'getAccountInfo', 'getLatestBlockhash',
  'sendTransaction', 'simulateTransaction', 'getTransaction',
  'getSignatureStatuses', 'getMinimumBalanceForRentExemption',
  'getRecentPrioritizationFees', 'getFeeForMessage',
  'getSlot', 'getBlockHeight', 'getEpochInfo',
  'getTokenAccountsByOwner', 'getTokenAccountBalance',
  'getProgramAccounts',
]);

export async function POST(request: NextRequest) {
  if (!HELIUS_RPC_URL) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  // Basic origin check — only allow same-origin requests
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');
  if (origin && host && !origin.includes(host)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!origin && !referer) {
    // Allow server-side calls (no origin/referer) but block curl-like requests
    // in production by checking for a custom header
    // For now, allow to not break SSR
  }

  try {
    const body = await request.json();

    // Validate JSON-RPC structure
    if (!body.jsonrpc || !body.method || typeof body.method !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (!ALLOWED_METHODS.has(body.method)) {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 403 });
    }

    const response = await fetch(HELIUS_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'RPC request failed' }, { status: 502 });
  }
}
