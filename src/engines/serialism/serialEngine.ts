import { type PitchClass, mod12 } from '../../kernel/pcMath';
import type { Composition, Note } from '../common/types';
import { createRng } from '../common/seedRandom';
import { snapBeat, snapDuration, STANDARD_DURATIONS_BEATS } from '../common/gridQuantize';

export interface TwelveToneMatrix {
  matrix: PitchClass[][];
  prime: PitchClass[];
  rowLabels: string[];
  colLabels: string[];
}

export function buildMatrix(prime: PitchClass[]): TwelveToneMatrix {
  const p0 = prime[0];
  const I0 = prime.map(p => mod12(2 * p0 - p));
  
  const matrix: PitchClass[][] = [];
  for (let i = 0; i < 12; i++) {
    const row: PitchClass[] = [];
    for (let j = 0; j < 12; j++) {
      row.push(mod12(I0[i] + prime[j] - p0));
    }
    matrix.push(row);
  }
  
  // Identify row labels (which Pi each row is)
  const rowLabels: string[] = [];
  for (let i = 0; i < 12; i++) {
    const firstNote = matrix[i][0];
    rowLabels.push(`P${firstNote}`);
  }
  
  // Identify column labels (which Ij each column is)
  const colLabels: string[] = [];
  for (let j = 0; j < 12; j++) {
    const firstNote = matrix[0][j];
    colLabels.push(`I${firstNote}`);
  }
  
  return { matrix, prime, rowLabels, colLabels };
}

export function getRow(matrix: TwelveToneMatrix, index: number): PitchClass[] {
  return matrix.matrix[index];
}

export function getColumn(matrix: TwelveToneMatrix, index: number): PitchClass[] {
  return matrix.matrix.map(row => row[index]);
}

export function getRetrograde(row: PitchClass[]): PitchClass[] {
  return [...row].reverse();
}

export type RowForm = 'P' | 'I' | 'R' | 'RI';

export function getRowForm(matrix: TwelveToneMatrix, form: RowForm, transposition: number): PitchClass[] {
  // Find the row/column that starts with the given transposition
  switch (form) {
    case 'P': {
      const idx = matrix.matrix.findIndex(row => row[0] === transposition);
      return idx >= 0 ? matrix.matrix[idx] : matrix.matrix[0];
    }
    case 'I': {
      const idx = matrix.matrix[0].findIndex(val => val === transposition);
      return idx >= 0 ? getColumn(matrix, idx) : getColumn(matrix, 0);
    }
    case 'R': {
      const idx = matrix.matrix.findIndex(row => row[0] === transposition);
      return idx >= 0 ? getRetrograde(matrix.matrix[idx]) : getRetrograde(matrix.matrix[0]);
    }
    case 'RI': {
      const idx = matrix.matrix[0].findIndex(val => val === transposition);
      const col = idx >= 0 ? getColumn(matrix, idx) : getColumn(matrix, 0);
      return getRetrograde(col);
    }
  }
}

export function randomToneRow(seed: number): PitchClass[] {
  const rng = createRng(seed);
  return rng.shuffle([0,1,2,3,4,5,6,7,8,9,10,11] as PitchClass[]);
}

export interface SerialismParams {
  seed: number;
  prime: PitchClass[];
  bars: number;
  tempo: number;
  registerLow: number;
  registerHigh: number;
  rowForms: RowForm[];
  density: number; // notes per beat
  rhythmVariation: number; // 0-1
  /** Random row transforms vs. in-order row play */
  rowWalk: 'random' | 'sequential';
  /** How many row passes (sequential) or caps random phrase length */
  statements: number;
  /** Note length in beats (quarter = 1), snapped to grid */
  noteLengthBeats: number;
  walkForm: RowForm;
  walkTransposition: PitchClass;
  timeSigNumerator: number;
  timeSigDenominator: number;
}

export const DEFAULT_SERIALISM_PARAMS: SerialismParams = {
  seed: Date.now(),
  prime: [0, 11, 7, 8, 3, 1, 2, 10, 6, 5, 4, 9],
  bars: 8,
  tempo: 120,
  registerLow: 3,
  registerHigh: 5,
  rowForms: ['P', 'I', 'R', 'RI'],
  density: 2,
  rhythmVariation: 0.5,
  rowWalk: 'random',
  statements: 4,
  noteLengthBeats: 0.5,
  walkForm: 'P',
  walkTransposition: 0,
  timeSigNumerator: 4,
  timeSigDenominator: 4,
};

export function generateSerial(params: SerialismParams): Composition {
  const rng = createRng(params.seed);

  // Randomly expand register range for timbral variety (no UI needed).
  // Weighted: [3,5] = 50%, [2,6] = 30%, [1,7] = 20%.
  const REGISTER_RANGES = [
    [3, 5], [3, 5], [3, 5], [3, 5], [3, 5],
    [2, 6], [2, 6], [2, 6],
    [1, 7], [1, 7],
  ] as const;
  const regRange = REGISTER_RANGES[rng.nextInt(0, REGISTER_RANGES.length)];
  const registerLow = regRange[0];
  const registerHigh = regRange[1];

  const matrix = buildMatrix(params.prime);
  const beatsPerBar = params.timeSigNumerator * (4 / params.timeSigDenominator);
  const notes: Note[] = [];

  let currentBeat = 0;

  if (params.rowWalk === 'sequential') {
    const row = getRowForm(matrix, params.walkForm, params.walkTransposition);
    const unit = snapDuration(params.noteLengthBeats);
    // Total length is exactly statements × row-length × note-unit — no external cap.
    for (let s = 0; s < params.statements; s++) {
      for (let i = 0; i < row.length; i++) {
        const pc = row[i];
        const octave = rng.nextInt(registerLow, registerHigh + 1);
        notes.push({
          pc,
          octave,
          startBeat: snapBeat(currentBeat),
          durationBeats: unit,
          velocity: 0.5 + rng.next() * 0.35,
          voice: 0,
        });
        currentBeat = snapBeat(currentBeat + unit);
      }
    }
  } else {
    // Random Walk: fixed length = bars × beatsPerBar. Walk through random rows,
    // adding notes one at a time. Stop as soon as the target is reached, even
    // mid-row — this is the true random-walk behaviour.
    const targetBeats = params.bars * beatsPerBar;
    while (currentBeat < targetBeats) {
      const form = rng.pick(params.rowForms);
      const transposition = rng.nextInt(0, 12) as PitchClass;
      const row = getRowForm(matrix, form, transposition);

      for (let i = 0; i < row.length; i++) {
        if (currentBeat >= targetBeats) break;

        const durIdx = Math.floor(
          rng.next() * (1 + params.rhythmVariation * (STANDARD_DURATIONS_BEATS.length - 1)),
        );
        const pick =
          STANDARD_DURATIONS_BEATS[Math.min(durIdx, STANDARD_DURATIONS_BEATS.length - 1)] ?? 0.5;
        const duration = snapDuration(pick);
        const octave = rng.nextInt(registerLow, registerHigh + 1);

        notes.push({
          pc: row[i],
          octave,
          startBeat: snapBeat(currentBeat),
          durationBeats: duration,
          velocity: 0.5 + rng.next() * 0.4,
          voice: 0,
        });

        currentBeat = snapBeat(currentBeat + duration);
      }
    }
  }

  // Actual length: Sequential = statements × row × unit; Random Walk = targetBeats.
  const totalBeats = currentBeat;

  return {
    notes,
    tempoChanges: [{ beat: 0, bpm: params.tempo }],
    timeSigChanges: [{ beat: 0, numerator: params.timeSigNumerator, denominator: params.timeSigDenominator }],
    voices: 1,
    mode: 'serialism',
    totalBeats,
    meta: { seed: params.seed, modeParams: params },
  };
}
