import { type PitchClass } from "./pcMath";
import { type IntervalVector } from "./icv";
import pcSetsData from "../data/pc-sets.json";

export interface PcSetEntry {
  forte: string;
  primeForm: PitchClass[];
  icv: IntervalVector;
  complement: string;
  carter?: number;
  name?: string;
  cardinality: number;
}

let _db: PcSetEntry[] | null = null;
let _byForte: Map<string, PcSetEntry> | null = null;

function ensureLoaded(): PcSetEntry[] {
  if (_db) return _db;
  const rawSets = (pcSetsData as any).sets ?? pcSetsData;
  _db = (rawSets as any[]).map(entry => ({
    forte: entry.forte,
    primeForm: entry.primeForm as PitchClass[],
    icv: entry.icv as IntervalVector,
    complement: entry.complement || "",
    carter: entry.carter,
    name: entry.name,
    cardinality: (entry.primeForm as number[]).length,
  }));
  _byForte = new Map(_db.map(e => [e.forte, e]));
  return _db;
}

export function getAllSets(): PcSetEntry[] {
  return ensureLoaded();
}

export function findByForte(name: string): PcSetEntry | undefined {
  ensureLoaded();
  return _byForte!.get(name);
}

export function findByCardinality(n: number): PcSetEntry[] {
  return ensureLoaded().filter(e => e.cardinality === n);
}

export function findByIcvConstraint(
  predicate: (icv: IntervalVector) => boolean,
): PcSetEntry[] {
  return ensureLoaded().filter(e => predicate(e.icv));
}

export function findZRelated(forte: string): PcSetEntry[] {
  const entry = findByForte(forte);
  if (!entry) return [];
  const icvStr = JSON.stringify(entry.icv);
  return ensureLoaded().filter(
    e => e.forte !== forte && JSON.stringify(e.icv) === icvStr,
  );
}

export function findSimilar(
  target: IntervalVector,
  metric: (a: IntervalVector, b: IntervalVector) => number,
  topK: number = 10,
): { entry: PcSetEntry; distance: number }[] {
  const results = ensureLoaded().map(entry => ({
    entry,
    distance: metric(target, entry.icv),
  }));
  results.sort((a, b) => a.distance - b.distance);
  return results.slice(0, topK);
}

/** Minimal set-class entry for packs not in the catalog (e.g. free typing in Vector mode). */
export function makeSyntheticSetEntry(
  primeForm: PitchClass[],
  icv: IntervalVector,
  forteLabel: string,
): PcSetEntry {
  return {
    forte: forteLabel,
    primeForm,
    icv,
    complement: "",
    cardinality: primeForm.length,
  };
}
