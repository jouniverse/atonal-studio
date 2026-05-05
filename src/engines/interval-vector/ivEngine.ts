import { type PitchClass, mod12, transpose, complement } from '../../kernel/pcMath';
import { intervalClassVector, type IntervalVector } from '../../kernel/icv';
import { type DistanceMetric } from '../../kernel/similarity';
import { getAllSets, findByIcvConstraint, type PcSetEntry } from '../../kernel/pcSetDb';
import type { Composition, Note } from '../common/types';
import { createRng } from '../common/seedRandom';
import { snapBeat, snapDuration } from '../common/gridQuantize';

export type TextureMode = 'arpeggio' | 'block' | 'mixed';

export interface IvEngineParams {
  seed: number;
  bars: number;
  tempo: number;
  timeSigNumerator: number;
  timeSigDenominator: number;
  targetSets: PcSetEntry[];
  commonTones: number;
  registerLow: number;
  registerHigh: number;
  useComplement: boolean;
  voices: number;
  density: number;
  metric: DistanceMetric;
  texture?: TextureMode;
}

export const DEFAULT_IV_PARAMS: IvEngineParams = {
  seed: Date.now(),
  bars: 8,
  tempo: 100,
  timeSigNumerator: 4,
  timeSigDenominator: 4,
  targetSets: [],
  commonTones: 2,
  registerLow: 3,
  registerHigh: 5,
  useComplement: true,
  voices: 1,
  density: 2,
  metric: 'manhattan',
  texture: 'arpeggio',
};

/**
 * Common Tone Theorem: if ICV entry at position j is k,
 * transposing by j (or 12-j for j<6) preserves k common tones.
 */
function findTranspositionForCommonTones(set: PitchClass[], targetCommonTones: number, rng: ReturnType<typeof createRng>): number {
  const icv = intervalClassVector(set);
  const qualifying: number[] = [];
  for (let j = 0; j < 6; j++) {
    if (icv[j] >= targetCommonTones) {
      qualifying.push(j + 1); // transpose by interval class j+1
    }
  }
  if (qualifying.length === 0) return 1;
  return qualifying[rng.nextInt(0, qualifying.length)];
}

/**
 * Minimal voice leading between two pc sets using greedy assignment.
 */
function minimalVoiceLeading(from: PitchClass[], to: PitchClass[]): { from: PitchClass; to: PitchClass }[] {
  const pairs: { from: PitchClass; to: PitchClass; cost: number }[] = [];
  
  for (const f of from) {
    for (const t of to) {
      const diff = Math.abs(f - t);
      const cost = Math.min(diff, 12 - diff);
      pairs.push({ from: f, to: t, cost });
    }
  }
  
  pairs.sort((a, b) => a.cost - b.cost);
  
  const usedFrom = new Set<PitchClass>();
  const usedTo = new Set<PitchClass>();
  const result: { from: PitchClass; to: PitchClass }[] = [];
  
  for (const pair of pairs) {
    if (usedFrom.has(pair.from) || usedTo.has(pair.to)) continue;
    result.push({ from: pair.from, to: pair.to });
    usedFrom.add(pair.from);
    usedTo.add(pair.to);
    if (result.length >= Math.min(from.length, to.length)) break;
  }
  
  return result;
}

export function generateIv(params: IvEngineParams): Composition {
  const rng = createRng(params.seed);
  const beatsPerBar = params.timeSigNumerator * (4 / params.timeSigDenominator);
  const totalBeats = params.bars * beatsPerBar;
  const notes: Note[] = [];
  
  let sets = params.targetSets.length > 0
    ? params.targetSets
    : getAllSets().filter(s => s.cardinality >= 3 && s.cardinality <= 7).slice(0, 5);
  
  if (sets.length === 0) {
    sets = getAllSets().filter(s => s.cardinality === 4).slice(0, 4);
  }
  
  let currentBeat = 0;
  let currentSetIdx = 0;
  let lastPcs: PitchClass[] = sets[0].primeForm;
  
  while (currentBeat < totalBeats) {
    const currentSet = sets[currentSetIdx % sets.length];
    const transposition = rng.nextInt(0, 12);
    let pcs = transpose(currentSet.primeForm, transposition);
    
    // Apply Common Tone Theorem for smooth transitions
    if (notes.length > 0) {
      const transpForCT = findTranspositionForCommonTones(lastPcs, params.commonTones, rng);
      pcs = transpose(currentSet.primeForm, transpForCT);
    }
    
    // Voice leading from previous set: reorder pcs so the note closest to each
    // voice in lastPcs comes first, minimising total semitone movement.
    if (lastPcs.length > 0 && pcs.length > 0) {
      const vl = minimalVoiceLeading(lastPcs, pcs);
      const matched = vl.map((pair) => pair.to);
      const unmatched = pcs.filter((p) => !matched.includes(p));
      pcs = [...matched, ...unmatched];
    }
    
    // Realize as notes (rhythm snapped to sixteenth-note grid)
    const beatsForSet = snapDuration(Math.max(1, beatsPerBar / params.density));
    const slice = snapDuration(beatsForSet / Math.max(1, pcs.length));
    const effectiveTexture = params.texture ?? 'arpeggio';
    const isBlock = effectiveTexture === 'block' || (effectiveTexture === 'mixed' && currentSetIdx % 2 === 0);
    for (let i = 0; i < pcs.length && currentBeat < totalBeats; i++) {
      const octave = rng.nextInt(params.registerLow, params.registerHigh + 1);
      const start = isBlock ? snapBeat(currentBeat) : snapBeat(currentBeat + i * slice);
      if (start >= totalBeats) break;
      const duration = isBlock
        ? snapDuration(Math.min(beatsForSet, totalBeats - start))
        : snapDuration(Math.min(slice, totalBeats - start));

      notes.push({
        pc: pcs[i],
        octave,
        startBeat: start,
        durationBeats: Math.max(0.25, duration),
        velocity: 0.5 + rng.next() * 0.4,
        voice: 0,
      });
    }
    
    // Complement voice (accompaniment)
    if (params.useComplement && params.voices > 1) {
      const comp = complement(pcs).slice(0, Math.min(4, 12 - pcs.length));
      for (let i = 0; i < comp.length && currentBeat < totalBeats; i++) {
        const octave = Math.max(params.registerLow, rng.nextInt(params.registerLow, params.registerLow + 2));
        notes.push({
          pc: comp[i],
          octave,
          startBeat: snapBeat(currentBeat + i * 0.25),
          durationBeats: snapDuration(beatsForSet * 0.75),
          velocity: 0.3 + rng.next() * 0.2,
          voice: 1,
        });
      }
    }
    
    lastPcs = pcs;
    currentBeat = snapBeat(currentBeat + beatsForSet);
    currentSetIdx++;
  }
  
  return {
    notes,
    tempoChanges: [{ beat: 0, bpm: params.tempo }],
    timeSigChanges: [{ beat: 0, numerator: params.timeSigNumerator, denominator: params.timeSigDenominator }],
    voices: params.voices,
    mode: 'interval-vector',
    totalBeats,
    meta: { seed: params.seed, modeParams: params },
  };
}
