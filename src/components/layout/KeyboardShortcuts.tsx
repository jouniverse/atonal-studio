'use client';

import { useEffect } from 'react';

import { play, setOnTick, stop } from '@/engines/common/scheduler';
import { useCompositionStore } from '@/state/useCompositionStore';
import { useTransportStore } from '@/state/useTransportStore';

export function KeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        const comp = useCompositionStore.getState().composition;
        if (!comp) return;
        const { isPlaying, setPlaying, setPlayheadBeat } = useTransportStore.getState();
        if (isPlaying) {
          void stop();
          setPlaying(false);
          setPlayheadBeat(0);
        } else {
          setOnTick((beat) => useTransportStore.getState().setPlayheadBeat(beat));
          void play(comp).then(() => setPlaying(true));
        }
        return;
      }

      if (e.key === 'Escape') {
        const { isPlaying, setPlaying, setPlayheadBeat } = useTransportStore.getState();
        if (isPlaying) {
          void stop();
          setPlaying(false);
          setPlayheadBeat(0);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return null;
}
