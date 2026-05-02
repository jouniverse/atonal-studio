import { type PitchClass } from '../../kernel/pcMath';

export interface Note {
  pc: PitchClass;
  octave: number;
  startBeat: number;
  durationBeats: number;
  velocity: number;
  voice: number;
}

export interface TempoChange {
  beat: number;
  bpm: number;
}

export interface TimeSigChange {
  beat: number;
  numerator: number;
  denominator: number;
}

export type CompositionMode = 'random' | 'interval-vector' | 'serialism';

export interface Composition {
  notes: Note[];
  tempoChanges: TempoChange[];
  timeSigChanges: TimeSigChange[];
  voices: number;
  mode: CompositionMode;
  totalBeats: number;
  meta: {
    seed: number;
    modeParams: unknown;
  };
}

export function midiNote(pc: PitchClass, octave: number): number {
  return (octave + 1) * 12 + pc;
}

export function noteFrequency(pc: PitchClass, octave: number): number {
  const midi = midiNote(pc, octave);
  return 440 * Math.pow(2, (midi - 69) / 12);
}
