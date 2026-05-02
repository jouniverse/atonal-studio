import { type PitchClass, mod12, invert } from "./pcMath";

export function normalForm(set: PitchClass[]): PitchClass[] {
  if (set.length === 0) return [];
  if (set.length === 1) return [...set];

  const sorted = [...new Set(set)].sort((a, b) => a - b) as PitchClass[];
  const n = sorted.length;

  const rotations: PitchClass[][] = [];
  for (let i = 0; i < n; i++) {
    const rotation: PitchClass[] = [];
    for (let j = 0; j < n; j++) {
      rotation.push(sorted[(i + j) % n]);
    }
    rotations.push(rotation);
  }

  let best = rotations[0];
  let bestSpan = mod12(best[n - 1] - best[0]);

  for (let i = 1; i < rotations.length; i++) {
    const span = mod12(rotations[i][n - 1] - rotations[i][0]);
    if (span < bestSpan) {
      best = rotations[i];
      bestSpan = span;
    } else if (span === bestSpan) {
      for (let j = 1; j < n - 1; j++) {
        const intervalBest = mod12(best[j] - best[0]);
        const intervalCurr = mod12(rotations[i][j] - rotations[i][0]);
        if (intervalCurr < intervalBest) {
          best = rotations[i];
          break;
        } else if (intervalCurr > intervalBest) {
          break;
        }
      }
    }
  }

  return best;
}

export function primeForm(set: PitchClass[]): PitchClass[] {
  if (set.length <= 1) return set.length === 0 ? [] : [0 as PitchClass];

  const nf = normalForm(set);
  const invNf = normalForm(invert(set, 0));

  const nfTransposed = nf.map(pc => mod12(pc - nf[0]));
  const invTransposed = invNf.map(pc => mod12(pc - invNf[0]));

  for (let i = nfTransposed.length - 1; i >= 0; i--) {
    if (nfTransposed[i] < invTransposed[i]) return nfTransposed;
    if (nfTransposed[i] > invTransposed[i]) return invTransposed;
  }

  return nfTransposed;
}

export function forteToArray(forteStr: string): PitchClass[] {
  const cleaned = forteStr.replace(/[\[\](){}]/g, "");
  if (cleaned.includes(",")) {
    return cleaned.split(",").map(s => mod12(parseInt(s.trim())));
  }
  const result: PitchClass[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === "t" || ch === "T" || ch === "a" || ch === "A")
      result.push(10 as PitchClass);
    else if (ch === "e" || ch === "E" || ch === "b" || ch === "B")
      result.push(11 as PitchClass);
    else if (/\d/.test(ch)) {
      if (
        ch === "1" &&
        i + 1 < cleaned.length &&
        (cleaned[i + 1] === "0" || cleaned[i + 1] === "1")
      ) {
        result.push(parseInt(ch + cleaned[i + 1]) as PitchClass);
        i++;
      } else {
        result.push(parseInt(ch) as PitchClass);
      }
    }
  }
  return result;
}
