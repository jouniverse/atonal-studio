import { create } from 'zustand';
import type { PcSetEntry } from '../kernel/pcSetDb';
import type { PitchClass } from '../kernel/pcMath';
import type { IntervalVector } from '../kernel/icv';

interface PcSetState {
  inputPcs: PitchClass[];
  selectedSet: PcSetEntry | null;
  selectedCardinality: number;
  computedIcv: IntervalVector | null;
  computedForte: string | null;
  
  setInputPcs: (pcs: PitchClass[]) => void;
  setSelectedSet: (set: PcSetEntry | null) => void;
  setSelectedCardinality: (n: number) => void;
  setComputedIcv: (icv: IntervalVector | null) => void;
  setComputedForte: (forte: string | null) => void;
  clear: () => void;
}

export const usePcSetStore = create<PcSetState>((set) => ({
  inputPcs: [],
  selectedSet: null,
  selectedCardinality: 4,
  computedIcv: null,
  computedForte: null,
  
  setInputPcs: (pcs) => set({ inputPcs: pcs }),
  setSelectedSet: (selectedSet) => set({ selectedSet }),
  setSelectedCardinality: (n) => set({ selectedCardinality: n }),
  setComputedIcv: (icv) => set({ computedIcv: icv }),
  setComputedForte: (forte) => set({ computedForte: forte }),
  clear: () => set({ inputPcs: [], selectedSet: null, computedIcv: null, computedForte: null }),
}));
