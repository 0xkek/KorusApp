'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function GameDetailRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    // Redirect to Games Hub — the hub auto-expands active games
    router.replace(`/games`);
  }, [router, params.id]);

  return null;
}
