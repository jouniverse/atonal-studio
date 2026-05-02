import { type PitchClass } from "./pcMath";

export type IntervalVector = [number, number, number, number, number, number];

export function intervalClassVector(set: PitchClass[]): IntervalVector {
  const icv: IntervalVector = [0, 0, 0, 0, 0, 0];
  const unique = [...new Set(set)];

  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      const diff = Math.abs(unique[i] - unique[j]);
      const ic = Math.min(diff, 12 - diff);
      if (ic >= 1 && ic <= 6) {
        icv[ic - 1]++;
      }
    }
  }

  return icv;
}

export function icvTotal(icv: IntervalVector): number {
  return icv.reduce((sum, v) => sum + v, 0);
}
