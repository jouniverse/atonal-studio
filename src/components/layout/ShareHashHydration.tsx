'use client';

import { useEffect } from 'react';

import { decodeCompositionFromHashParam } from '@/lib/shareComposition';
import { useCompositionStore } from '@/state/useCompositionStore';
import { useTransportStore } from '@/state/useTransportStore';

export function ShareHashHydration() {
  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (!hash.startsWith('#s=')) return;
    const token = hash.slice(3);
    const c = decodeCompositionFromHashParam(token);
    if (!c) return;
    useCompositionStore.getState().setComposition(c);
    useTransportStore.getState().setBpm(c.tempoChanges[0]?.bpm ?? 120);
  }, []);
  return null;
}
