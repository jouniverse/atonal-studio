import ctmData from '../../data/category-transition-matrix.json';
import { type IntervalVector } from '../../kernel/icv';
import { findByIcvConstraint, type PcSetEntry } from '../../kernel/pcSetDb';
import { createRng } from '../common/seedRandom';

const CTM = (ctmData as any).matrix as number[][];

/**
 * Given a current dominant IC category (0-5), pick the next category
 * using the transition matrix probabilities.
 */
export function nextCategory(currentCategory: number, rng: ReturnType<typeof createRng>): number {
  const row = CTM[currentCategory];
  let r = rng.next();
  for (let i = 0; i < 6; i++) {
    r -= row[i];
    if (r <= 0) return i;
  }
  return 5;
}

/**
 * Determine the dominant IC category of an interval vector.
 * Returns the index (0-5) of the largest entry.
 */
export function dominantCategory(icv: IntervalVector): number {
  let maxVal = -1;
  let maxIdx = 0;
  for (let i = 0; i < 6; i++) {
    if (icv[i] > maxVal) {
      maxVal = icv[i];
      maxIdx = i;
    }
  }
  return maxIdx;
}

/**
 * Find sets whose dominant IC matches the target category.
 */
export function setsForCategory(category: number): PcSetEntry[] {
  return findByIcvConstraint((icv) => {
    return dominantCategory(icv) === category;
  });
}

/**
 * Generate a progression of pc-sets using the CTM.
 * Each step: determine dominant category of current set, use CTM to pick next category,
 * then select a random set from that category.
 */
export function generateProgression(
  startSet: PcSetEntry,
  length: number,
  seed: number,
  cardinalityRange: [number, number] = [3, 7]
): PcSetEntry[] {
  const rng = createRng(seed);
  const progression: PcSetEntry[] = [startSet];
  let currentCategory = dominantCategory(startSet.icv);

  for (let i = 1; i < length; i++) {
    const nextCat = nextCategory(currentCategory, rng);
    let candidates = setsForCategory(nextCat).filter(
      s => s.cardinality >= cardinalityRange[0] && s.cardinality <= cardinalityRange[1]
    );
    
    if (candidates.length === 0) {
      candidates = setsForCategory(currentCategory).filter(
        s => s.cardinality >= cardinalityRange[0] && s.cardinality <= cardinalityRange[1]
      );
    }
    
    if (candidates.length === 0) continue;
    
    const chosen = rng.pick(candidates);
    progression.push(chosen);
    currentCategory = nextCat;
  }

  return progression;
}
