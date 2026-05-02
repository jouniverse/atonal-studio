import { create } from 'zustand';

interface TransportState {
  isPlaying: boolean;
  playheadBeat: number;
  bpm: number;
  timeSigNumerator: number;
  timeSigDenominator: number;
  loop: boolean;
  setPlaying: (playing: boolean) => void;
  setPlayheadBeat: (beat: number) => void;
  setBpm: (bpm: number) => void;
  setTimeSig: (num: number, den: number) => void;
  setLoop: (loop: boolean) => void;
}

export const useTransportStore = create<TransportState>((set) => ({
  isPlaying: false,
  playheadBeat: 0,
  bpm: 120,
  timeSigNumerator: 4,
  timeSigDenominator: 4,
  loop: false,
  setPlaying: (playing) => set({ isPlaying: playing }),
  setPlayheadBeat: (beat) => set({ playheadBeat: beat }),
  setBpm: (bpm) => set({ bpm }),
  setTimeSig: (num, den) => set({ timeSigNumerator: num, timeSigDenominator: den }),
  setLoop: (loop) => set({ loop }),
}));
