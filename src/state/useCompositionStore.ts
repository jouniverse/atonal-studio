import { create } from 'zustand';
import type { Composition } from '../engines/common/types';

interface CompositionState {
  composition: Composition | null;
  chain: boolean;
  setComposition: (comp: Composition) => void;
  setChain: (v: boolean) => void;
  appendComposition: (newComp: Composition) => void;
  clear: () => void;
}

export const useCompositionStore = create<CompositionState>((set, get) => ({
  composition: null,
  chain: false,
  setComposition: (comp) => set({ composition: comp }),
  setChain: (v) => set({ chain: v }),
  appendComposition: (newComp) => {
    const existing = get().composition;
    if (!existing) {
      set({ composition: newComp });
      return;
    }
    const offset = existing.totalBeats;
    const shiftedNotes = newComp.notes.map((n) => ({ ...n, startBeat: n.startBeat + offset }));
    set({
      composition: {
        ...existing,
        notes: [...existing.notes, ...shiftedNotes],
        totalBeats: existing.totalBeats + newComp.totalBeats,
      },
    });
  },
  clear: () => set({ composition: null }),
}));
