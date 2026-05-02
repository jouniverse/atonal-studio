import { type PitchClass, NOTE_NAMES } from '../kernel/pcMath';

export function formatPc(pc: PitchClass, style: 'number' | 'name' | 'te' = 'number'): string {
  switch (style) {
    case 'name': return NOTE_NAMES[pc];
    case 'te': return pc === 10 ? 't' : pc === 11 ? 'e' : String(pc);
    default: return String(pc);
  }
}

export function formatIcv(icv: number[]): string {
  return `<${icv.join(',')}>`;
}

export function formatForte(forte: string): string {
  return forte;
}

export function formatBeat(beat: number): string {
  const bar = Math.floor(beat / 4) + 1;
  const beatInBar = (beat % 4) + 1;
  return `${bar}.${beatInBar.toFixed(1)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}
