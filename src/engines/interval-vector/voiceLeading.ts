import { type PitchClass, mod12 } from '../../kernel/pcMath';

/**
 * Calculate the voice-leading distance (semitones) between two pitch classes.
 */
function vlDistance(a: PitchClass, b: PitchClass): number {
  const d = Math.abs(a - b);
  return Math.min(d, 12 - d);
}

/**
 * Calculate total voice-leading cost between two ordered sets.
 * Uses sum of minimal movements.
 */
export function voiceLeadingCost(from: PitchClass[], to: PitchClass[]): number {
  const n = Math.min(from.length, to.length);
  let totalCost = 0;
  
  const costs: number[][] = [];
  for (let i = 0; i < from.length; i++) {
    costs[i] = [];
    for (let j = 0; j < to.length; j++) {
      costs[i][j] = vlDistance(from[i], to[j]);
    }
  }
  
  const usedTo = new Set<number>();
  const assignment: { from: number; to: number; cost: number }[] = [];
  
  const allPairs: { i: number; j: number; cost: number }[] = [];
  for (let i = 0; i < from.length; i++) {
    for (let j = 0; j < to.length; j++) {
      allPairs.push({ i, j, cost: costs[i][j] });
    }
  }
  allPairs.sort((a, b) => a.cost - b.cost);
  
  const usedFrom = new Set<number>();
  for (const pair of allPairs) {
    if (usedFrom.has(pair.i) || usedTo.has(pair.j)) continue;
    assignment.push({ from: pair.i, to: pair.j, cost: pair.cost });
    usedFrom.add(pair.i);
    usedTo.add(pair.j);
    totalCost += pair.cost;
    if (assignment.length >= n) break;
  }
  
  return totalCost;
}

/**
 * Find the optimal voice leading between two pc-sets.
 * Returns pairs mapping each source PC to a target PC with minimal total movement.
 */
export function optimalVoiceLeading(
  from: PitchClass[],
  to: PitchClass[]
): { from: PitchClass; to: PitchClass; movement: number }[] {
  const n = Math.min(from.length, to.length);
  
  if (n <= 8) {
    return exactVoiceLeading(from.slice(0, n), to.slice(0, n));
  }
  
  return greedyVoiceLeading(from, to);
}

function greedyVoiceLeading(
  from: PitchClass[],
  to: PitchClass[]
): { from: PitchClass; to: PitchClass; movement: number }[] {
  const pairs: { from: PitchClass; to: PitchClass; cost: number }[] = [];
  for (const f of from) {
    for (const t of to) {
      pairs.push({ from: f, to: t, cost: vlDistance(f, t) });
    }
  }
  pairs.sort((a, b) => a.cost - b.cost);
  
  const usedFrom = new Set<PitchClass>();
  const usedTo = new Set<PitchClass>();
  const result: { from: PitchClass; to: PitchClass; movement: number }[] = [];
  
  for (const pair of pairs) {
    if (usedFrom.has(pair.from) || usedTo.has(pair.to)) continue;
    result.push({ from: pair.from, to: pair.to, movement: pair.cost });
    usedFrom.add(pair.from);
    usedTo.add(pair.to);
    if (result.length >= Math.min(from.length, to.length)) break;
  }
  
  return result;
}

function exactVoiceLeading(
  from: PitchClass[],
  to: PitchClass[]
): { from: PitchClass; to: PitchClass; movement: number }[] {
  const n = from.length;
  let bestCost = Infinity;
  let bestPerm: number[] = [];
  
  function permute(arr: number[], start: number) {
    if (start === n) {
      let cost = 0;
      for (let i = 0; i < n; i++) {
        cost += vlDistance(from[i], to[arr[i]]);
      }
      if (cost < bestCost) {
        bestCost = cost;
        bestPerm = [...arr];
      }
      return;
    }
    for (let i = start; i < n; i++) {
      [arr[start], arr[i]] = [arr[i], arr[start]];
      permute(arr, start + 1);
      [arr[start], arr[i]] = [arr[i], arr[start]];
    }
  }
  
  const indices = Array.from({ length: n }, (_, i) => i);
  permute(indices, 0);
  
  return bestPerm.map((j, i) => ({
    from: from[i],
    to: to[j],
    movement: vlDistance(from[i], to[j]),
  }));
}

/**
 * Check if a voice leading is "strongly crossing-free".
 * Two voice-leading pairs (a→b, c→d) cross if a<c but b>d or vice versa.
 */
export function isCrossingFree(
  pairs: { from: PitchClass; to: PitchClass }[]
): boolean {
  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      const { from: a, to: b } = pairs[i];
      const { from: c, to: d } = pairs[j];
      if ((a < c && b > d) || (a > c && b < d)) {
        return false;
      }
    }
  }
  return true;
}
