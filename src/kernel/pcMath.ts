export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export function mod12(n: number): PitchClass {
  return (((n % 12) + 12) % 12) as PitchClass;
}

export function transpose(set: PitchClass[], interval: number): PitchClass[] {
  return set.map(pc => mod12(pc + interval));
}

export function invert(set: PitchClass[], axis: number = 0): PitchClass[] {
  return set.map(pc => mod12(axis - pc));
}

export function complement(set: PitchClass[]): PitchClass[] {
  const all: PitchClass[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  return all.filter(pc => !set.includes(pc));
}

export function multiply(set: PitchClass[], factor: number): PitchClass[] {
  return set.map(pc => mod12(pc * factor));
}

export function retrograde<T>(seq: T[]): T[] {
  return [...seq].reverse();
}

export const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export function pcToNoteName(pc: PitchClass): string {
  return NOTE_NAMES[pc];
}

export function noteNameToPc(name: string): PitchClass {
  const map: Record<string, number> = {
    C: 0,
    "C#": 1,
    Db: 1,
    D: 2,
    "D#": 3,
    Eb: 3,
    E: 4,
    F: 5,
    "F#": 6,
    Gb: 6,
    G: 7,
    "G#": 8,
    Ab: 8,
    A: 9,
    "A#": 10,
    Bb: 10,
    B: 11,
  };
  const val = map[name];
  if (val === undefined) throw new Error(`Unknown note: ${name}`);
  return val as PitchClass;
}
