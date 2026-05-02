/**
 * Beat = quarter note. Grid step 0.25 = sixteenth note within the beat axis.
 */
export const BEAT_GRID_STEP = 0.25;

/** Snap a beat position to the rhythmic grid (default: sixteenth notes). */
export function snapBeat(beats: number, step: number = BEAT_GRID_STEP): number {
  if (!Number.isFinite(beats)) return 0;
  const n = Math.round(beats / step);
  return n * step;
}

/** Clamp duration to grid and ensure at least one step. */
export function snapDuration(beats: number, step: number = BEAT_GRID_STEP): number {
  if (!Number.isFinite(beats) || beats <= 0) return step;
  const n = Math.max(1, Math.round(beats / step));
  return n * step;
}

/** Pick the nearest allowed duration from a list (each should already be grid-aligned). */
export function nearestDuration(beats: number, allowed: number[], step: number = BEAT_GRID_STEP): number {
  const q = snapDuration(beats, step);
  let best = allowed[0] ?? step;
  let bestDist = Math.abs(q - best);
  for (const d of allowed) {
    const dist = Math.abs(q - d);
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return best;
}

/** Common note lengths in beats (quarter = 1): 16th, 8th, dotted 8thin 4th, quarter, dotted quarter, half, whole. */
export const STANDARD_DURATIONS_BEATS = [
  0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4,
] as const;
