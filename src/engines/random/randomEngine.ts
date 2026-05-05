import { type PitchClass, mod12 } from '../../kernel/pcMath';
import type { Composition, Note } from '../common/types';
import { createRng } from '../common/seedRandom';
import { snapBeat, snapDuration, STANDARD_DURATIONS_BEATS } from '../common/gridQuantize';

export type StochasticModel = 'uniform' | 'gaussian' | 'markov' | 'brownian';

export interface RandomEngineParams {
  seed: number;
  bars: number;
  tempo: number;
  timeSigNumerator: number;
  timeSigDenominator: number;
  pcCount: number;
  registerLow: number; // octave
  registerHigh: number; // octave
  entropy: number; // 0-1, higher = more random
  density: number; // notes per beat
  repetitionBias: number; // 0-1, higher = more repetition
  clusterChance: number; // 0-1
  model: StochasticModel;
  drift: number; // for brownian: 0-1
  shiftingTimeSig: boolean;
}

export const DEFAULT_RANDOM_PARAMS: RandomEngineParams = {
  seed: Date.now(),
  bars: 8,
  tempo: 120,
  timeSigNumerator: 4,
  timeSigDenominator: 4,
  pcCount: 12,
  registerLow: 3,
  registerHigh: 5,
  entropy: 0.7,
  density: 3,
  repetitionBias: 0.2,
  clusterChance: 0.1,
  model: 'uniform',
  drift: 0.3,
  shiftingTimeSig: false,
};

export function generateRandom(params: RandomEngineParams): Composition {
  const rng = createRng(params.seed);
  const beatsPerBar = params.timeSigNumerator * (4 / params.timeSigDenominator);
  const totalBeats = params.bars * beatsPerBar;
  
  // Select pitch classes to use
  const allPcs: PitchClass[] = [0,1,2,3,4,5,6,7,8,9,10,11];
  const activePcs = rng.shuffle(allPcs).slice(0, params.pcCount);
  
  const notes: Note[] = [];
  let lastPc: PitchClass = rng.pick(activePcs);
  let lastOctave = rng.nextInt(params.registerLow, params.registerHigh + 1);
  let currentBeat = 0;

  // Markov transition matrix (uniform initially, biased by repetition)
  const markovWeights = activePcs.map(() => activePcs.map(() => 1));

  const pickPcOctave = (): { pc: PitchClass; octave: number } => {
    let pc: PitchClass;
    let octave: number;
    switch (params.model) {
      case 'brownian': {
        const step = Math.round(rng.gaussian() * (1 + params.drift * 6));
        pc = mod12(lastPc + step);
        if (!activePcs.includes(pc)) pc = rng.pick(activePcs);
        const octDrift = rng.gaussian() * params.drift;
        octave = Math.round(lastOctave + octDrift);
        octave = Math.max(params.registerLow, Math.min(params.registerHigh, octave));
        break;
      }
      case 'gaussian': {
        const center = activePcs[Math.floor(activePcs.length / 2)];
        const offset = Math.round(rng.gaussian() * (1 - params.entropy) * 3);
        pc = mod12(center + offset);
        if (!activePcs.includes(pc)) pc = rng.pick(activePcs);
        octave = Math.round((params.registerLow + params.registerHigh) / 2 + rng.gaussian() * 0.5);
        octave = Math.max(params.registerLow, Math.min(params.registerHigh, octave));
        break;
      }
      case 'markov': {
        const lastIdx = activePcs.indexOf(lastPc);
        const weights = lastIdx >= 0 ? [...markovWeights[lastIdx]] : activePcs.map(() => 1);
        if (lastIdx >= 0) weights[lastIdx] += params.repetitionBias * 10;
        const totalWeight = weights.reduce((s, w) => s + w, 0);
        let r = rng.next() * totalWeight;
        let chosen = 0;
        for (let i = 0; i < weights.length; i++) {
          r -= weights[i];
          if (r <= 0) {
            chosen = i;
            break;
          }
        }
        pc = activePcs[chosen];
        octave = rng.nextInt(params.registerLow, params.registerHigh + 1);
        break;
      }
      default: {
        if (rng.chance(params.repetitionBias)) {
          pc = lastPc;
        } else {
          pc = rng.pick(activePcs);
        }
        octave = rng.nextInt(params.registerLow, params.registerHigh + 1);
      }
    }
    return { pc, octave };
  };

  while (currentBeat < totalBeats - 1e-9) {
    currentBeat = snapBeat(currentBeat);
    if (currentBeat >= totalBeats) break;

    const allowedLen = Math.min(STANDARD_DURATIONS_BEATS.length, 3 + Math.floor(params.entropy * 5));
    const durPick =
      STANDARD_DURATIONS_BEATS[
        Math.min(allowedLen - 1, Math.floor(rng.next() * allowedLen))
      ] ?? 1;
    let duration = snapDuration(Math.min(durPick, totalBeats - currentBeat));
    if (duration <= 0) break;

    const { pc, octave } = pickPcOctave();
    const maxDur = snapDuration(totalBeats - currentBeat);
    const noteDur = Math.min(duration, maxDur);

    const simultaneous = params.density >= 2.5 && rng.chance(0.35);
    if (simultaneous) {
      const nExtra = Math.min(3, Math.max(0, Math.round(params.density - 2)));
      for (let k = 0; k <= nExtra; k++) {
        const poke = k === 0 ? { pc, octave } : pickPcOctave();
        notes.push({
          pc: poke.pc,
          octave: poke.octave,
          startBeat: currentBeat,
          durationBeats: noteDur,
          velocity: 0.45 + rng.next() * 0.35,
          voice: 0,
        });
        lastPc = poke.pc;
        lastOctave = poke.octave;
      }
    } else {
      notes.push({
        pc,
        octave,
        startBeat: currentBeat,
        durationBeats: noteDur,
        velocity: 0.5 + rng.next() * 0.4,
        voice: 0,
      });
      lastPc = pc;
      lastOctave = octave;
      if (rng.chance(params.clusterChance) && activePcs.length > 1) {
        const clusterPc = rng.pick(activePcs.filter((p) => p !== pc));
        notes.push({
          pc: clusterPc,
          octave: rng.nextInt(params.registerLow, params.registerHigh + 1),
          startBeat: currentBeat,
          durationBeats: noteDur,
          velocity: 0.4 + rng.next() * 0.3,
          voice: 0,
        });
      }
    }

    currentBeat += duration;
  }
  
  // Time signature changes if enabled
  const timeSigChanges = [{ beat: 0, numerator: params.timeSigNumerator, denominator: params.timeSigDenominator }];
  if (params.shiftingTimeSig) {
    const possibleNums = [3, 4, 5, 6, 7];
    for (let bar = 2; bar < params.bars; bar += rng.nextInt(2, 5)) {
      if (rng.chance(0.4)) {
        timeSigChanges.push({
          beat: bar * beatsPerBar,
          numerator: rng.pick(possibleNums),
          denominator: params.timeSigDenominator,
        });
      }
    }
  }
  
  return {
    notes,
    tempoChanges: [{ beat: 0, bpm: params.tempo }],
    timeSigChanges,
    voices: 1,
    mode: 'random',
    totalBeats,
    meta: { seed: params.seed, modeParams: params },
  };
}
