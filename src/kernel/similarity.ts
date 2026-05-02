import { type IntervalVector } from "./icv";

export type DistanceMetric =
  | "manhattan"
  | "euclidean"
  | "icvsim"
  | "cosine"
  | "minkowski"
  | "morris_asim"
  | "atmeb";

/** Manhattan distance — preferred in atonal music theory for ICV comparison.
 *  Direct sum of absolute differences across all 6 interval classes. */
export function manhattan(a: IntervalVector, b: IntervalVector): number {
  let sum = 0;
  for (let i = 0; i < 6; i++) sum += Math.abs(a[i] - b[i]);
  return sum;
}

/** Euclidean distance in 6-dimensional ICV space */
export function euclidean(a: IntervalVector, b: IntervalVector): number {
  let sum = 0;
  for (let i = 0; i < 6; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

/** Minkowski distance (generalization of Manhattan p=1 and Euclidean p=2) */
export function minkowski(
  a: IntervalVector,
  b: IntervalVector,
  p: number = 3,
): number {
  let sum = 0;
  for (let i = 0; i < 6; i++) sum += Math.abs(a[i] - b[i]) ** p;
  return sum ** (1 / p);
}

/** Cosine distance (1 − cosine similarity) */
export function cosine(a: IntervalVector, b: IntervalVector): number {
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < 6; i++) {
    dotProduct += a[i] * b[i];
    magA += a[i] ** 2;
    magB += b[i] ** 2;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 1;
  return 1 - dotProduct / denom;
}

/** Isaacson's IcVSIM — standard deviation of the difference vector.
 *  Lower values = more similar (0 = identical distribution of differences).
 *  Specifically designed for comparing interval vectors in atonal theory. */
export function icvsim(a: IntervalVector, b: IntervalVector): number {
  const diffV: number[] = [];
  for (let i = 0; i < 6; i++) diffV.push(Math.abs(a[i] - b[i]));
  const avg = diffV.reduce((s, v) => s + v, 0) / 6;
  const variance = diffV.reduce((s, v) => s + (v - avg) ** 2, 0) / 6;
  return Math.sqrt(variance);
}

/** Morris's SIM — same as Manhattan distance (sum of absolute differences).
 *  Kept as an alias; see manhattan(). */
export function morrisSim(a: IntervalVector, b: IntervalVector): number {
  return manhattan(a, b);
}

/** Morris's ASIM — normalized SIM: SIM(X,Y) / (sum(X) + sum(Y)).
 *  Accounts for differences in total interval content between sets of different cardinality. */
export function morrisAsim(a: IntervalVector, b: IntervalVector): number {
  const sim = manhattan(a, b);
  const totalA = a.reduce((s, v) => s + v, 0);
  const totalB = b.reduce((s, v) => s + v, 0);
  const denom = totalA + totalB;
  if (denom === 0) return 0;
  return sim / denom;
}

/** Rahn's ATMEB (ATonal MEmbeddability) — context-sensitive similarity.
 *  ATMEB(X,Y) = Σᵢ min(Xᵢ,Yᵢ) / Σᵢ Xᵢ
 *  Measures how much of X's interval content is contained in Y.
 *  Ranges 0–1 (1 = X fully embedded in Y). Asymmetric: ATMEB(X,Y) ≠ ATMEB(Y,X).
 *  Returned as a *distance* (1 − ATMEB) so lower = more similar. */
export function atmeb(a: IntervalVector, b: IntervalVector): number {
  const shared = a.reduce((s, v, i) => s + Math.min(v, b[i]), 0);
  const totalA = a.reduce((s, v) => s + v, 0);
  if (totalA === 0) return 0; // treat zero-vector as fully embedded
  return 1 - shared / totalA;
}

/** Forte's Rn — strict ordinal similarity classification (not a continuous metric).
 *
 *  Returns null whenever Forte's system does not define a relation:
 *    - Different cardinalities (cross-cardinality comparison is meaningless)
 *    - 1, 2, or 3 matching positions (Forte only covers the extremes)
 *    - 6 matching positions (identical vectors — trivial case, not a similarity relation)
 *    - 5 matching positions (mathematically impossible for same-cardinality sets)
 *
 *  Defined cases:
 *    R0: 0 matches — minimal similarity (no ICV positions coincide)
 *    R1: exactly 4 matches AND the 2 non-matching positions are an interchange
 *        (i.e. A[i]=x, A[j]=y, B[i]=y, B[j]=x — values are swapped)
 *    R2: exactly 4 matches AND the 2 non-matching positions are NOT an interchange
 */
export function forteRn(
  a: IntervalVector,
  b: IntervalVector,
  aCard: number,
  bCard: number,
): { label: "R0" | "R1" | "R2" } | null {
  // Only applicable for sets of the same cardinality
  if (aCard !== bCard) return null;

  const mismatchIndices: number[] = [];
  for (let i = 0; i < 6; i++) {
    if (a[i] !== b[i]) mismatchIndices.push(i);
  }
  const matches = 6 - mismatchIndices.length;

  // Only R0 (0 matches) and maximal similarity (4 matches) are defined
  if (matches === 0) return { label: "R0" };
  if (matches !== 4) return null; // 1–3 matches: undefined; 5: impossible; 6: identical

  // 4 matches: determine R1 vs R2 by checking for interchange
  const [i, j] = mismatchIndices;
  const isSwap = a[i] === b[j] && a[j] === b[i];
  return { label: isSwap ? "R1" : "R2" };
}

/** Universal distance function with metric selection */
export function distance(
  a: IntervalVector,
  b: IntervalVector,
  metric: DistanceMetric = "manhattan",
): number {
  switch (metric) {
    case "manhattan":
      return manhattan(a, b);
    case "euclidean":
      return euclidean(a, b);
    case "icvsim":
      return icvsim(a, b);
    case "cosine":
      return cosine(a, b);
    case "minkowski":
      return minkowski(a, b);
    case "morris_asim":
      return morrisAsim(a, b);
    case "atmeb":
      return atmeb(a, b);
    default:
      return manhattan(a, b);
  }
}

export const METRIC_LABELS: Record<DistanceMetric, string> = {
  manhattan: "Manhattan",
  euclidean: "Euclidean",
  icvsim: "ICVSIM",
  cosine: "Cosine",
  minkowski: "Minkowski (p=3)",
  morris_asim: "ASIM",
  atmeb: "ATMEB",
};
