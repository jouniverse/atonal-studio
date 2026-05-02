import { create } from 'zustand';

export interface Adsr {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

interface AudioState {
  masterDb: number;
  reverbWet: number;
  /** Grand piano (salamander samples) vs. built-in subtractive synth */
  soundEngine: 'piano' | 'synth';
  /** 'stage' = brighter layered, 'warm' = triangle + soft reverb (synth only) */
  preset: 'stage' | 'warm';
  adsr: Adsr;
  setMasterDb: (db: number) => void;
  setReverbWet: (wet: number) => void;
  setSoundEngine: (e: 'piano' | 'synth') => void;
  setPreset: (p: 'stage' | 'warm') => void;
  setAdsr: (partial: Partial<Adsr>) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  masterDb: -6,
  reverbWet: 0.18,
  soundEngine: 'piano',
  preset: 'warm',
  adsr: {
    attack: 0.012,
    decay: 0.18,
    sustain: 0.42,
    release: 0.55,
  },
  setMasterDb: (masterDb) => set({ masterDb }),
  setReverbWet: (reverbWet) => set({ reverbWet }),
  setSoundEngine: (soundEngine) => set({ soundEngine }),
  setPreset: (preset) => set({ preset }),
  setAdsr: (partial) => set((s) => ({ adsr: { ...s.adsr, ...partial } })),
}));
