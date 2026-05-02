'use client';

import { useState, useCallback, useMemo } from 'react';
import { PianoRoll } from '@/components/composer/PianoRoll';
import { TransportBar } from '@/components/composer/TransportBar';
import { ParamDial } from '@/components/composer/ParamDial';
import { useCompositionStore } from '@/state/useCompositionStore';
import { useTransportStore } from '@/state/useTransportStore';
import { generateRandom, DEFAULT_RANDOM_PARAMS, type RandomEngineParams, type StochasticModel } from '@/engines/random/randomEngine';

const STOCHASTIC_MODELS: { value: StochasticModel; label: string }[] = [
  { value: 'uniform', label: 'Uniform' },
  { value: 'gaussian', label: 'Gaussian' },
  { value: 'markov', label: 'Markov' },
  { value: 'brownian', label: 'Brownian' },
];

interface DialRowConfig {
  key: keyof RandomEngineParams;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  formatValue?: (v: number) => string;
  showWhen?: (params: RandomEngineParams) => boolean;
}

const DIAL_ROWS: DialRowConfig[] = [
  {
    key: 'entropy',
    label: 'ENTROPY',
    description: 'Determines algorithmic randomness variance',
    min: 0, max: 1, step: 0.05,
    formatValue: (v) => `${(v * 100).toFixed(1)}%`,
  },
  {
    key: 'density',
    label: 'DENSITY',
    description: 'Notes per beat — higher values produce thicker textures',
    min: 0.5, max: 8, step: 0.5,
  },
  {
    key: 'tempo',
    label: 'TEMPO',
    description: 'Beats per minute for playback and export',
    min: 40, max: 240, step: 1,
    unit: ' bpm',
  },
  {
    key: 'pcCount',
    label: 'PC COUNT',
    description: 'Number of active pitch classes (1–12)',
    min: 1, max: 12, step: 1,
  },
  {
    key: 'registerLow',
    label: 'REGISTER LO',
    description: 'Lowest octave boundary for generated pitches',
    min: 1, max: 6, step: 1,
    formatValue: (v) => `Oct ${v}`,
  },
  {
    key: 'registerHigh',
    label: 'REGISTER HI',
    description: 'Highest octave boundary for generated pitches',
    min: 2, max: 7, step: 1,
    formatValue: (v) => `Oct ${v}`,
  },
  {
    key: 'repetitionBias',
    label: 'REPETITION',
    description: 'Bias toward repeating the previous pitch class',
    min: 0, max: 1, step: 0.05,
    formatValue: (v) => `${(v * 100).toFixed(0)}%`,
  },
  {
    key: 'drift',
    label: 'DRIFT',
    description: 'Brownian step variance — higher = wider jumps',
    min: 0, max: 1, step: 0.05,
    formatValue: (v) => `${(v * 100).toFixed(0)}%`,
    showWhen: (p) => p.model === 'brownian',
  },
];

function seedToHex(seed: number): string {
  return `0x${(seed >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

export function RandomModeView() {
  const [params, setParams] = useState<RandomEngineParams>({ ...DEFAULT_RANDOM_PARAMS, seed: 42 });
  const setComposition = useCompositionStore((s) => s.setComposition);
  const appendComposition = useCompositionStore((s) => s.appendComposition);
  const composition = useCompositionStore((s) => s.composition);
  const chain = useCompositionStore((s) => s.chain);
  const isPlaying = useTransportStore((s) => s.isPlaying);
  const setBpm = useTransportStore((s) => s.setBpm);

  const updateParam = useCallback(<K extends keyof RandomEngineParams>(key: K, value: RandomEngineParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleGenerate = useCallback(() => {
    const comp = generateRandom(params);
    if (chain && composition) {
      appendComposition(comp);
    } else {
      setComposition(comp);
    }
    setBpm(params.tempo);
  }, [params, chain, composition, appendComposition, setComposition, setBpm]);

  const handleNewSeed = useCallback(() => {
    const newSeed = Date.now();
    setParams((prev) => ({ ...prev, seed: newSeed }));
    const comp = generateRandom({ ...params, seed: newSeed });
    if (chain && composition) {
      appendComposition(comp);
    } else {
      setComposition(comp);
    }
    setBpm(params.tempo);
  }, [params, chain, composition, appendComposition, setComposition, setBpm]);

  const visibleDials = useMemo(
    () => DIAL_ROWS.filter((d) => !d.showWhen || d.showWhen(params)),
    [params],
  );

  return (
    <div className="h-full flex flex-col bg-[var(--background)] overflow-hidden">
      {/* ─── HEADER ─── */}
      <header className="shrink-0 px-8 touch:px-4 pt-6 touch:pt-4 pb-4 touch:pb-3 border-b border-[var(--outline-variant)]">
        <div className="flex justify-between items-end">
          {/* Title block */}
          <div>
            <h1 className="mouse:block touch:hidden font-[family-name:var(--font-inter)] text-[24px] font-semibold leading-[1.2] tracking-[-0.02em] text-[var(--on-background)]">
              Generative Engine
            </h1>
            <h1 className="hidden touch:block font-[family-name:var(--font-inter)] text-[18px] font-semibold leading-[1.2] tracking-[-0.02em] text-[var(--on-background)]">
              Random
            </h1>
            <p className="touch:hidden font-[family-name:var(--font-space-grotesk)] text-[13px] leading-[1.4] tracking-[0.05em] font-medium text-[var(--on-surface-variant)] mt-1">
              SYS_MOD: STOCHASTIC_CONTROL_V1.3 - Stochastic parameter control &amp; real-time pitch class monitoring
            </p>
          </div>

          {/* Status & seed */}
          <div className="flex items-center gap-6">
            {/* Engine status */}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                isPlaying
                  ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)] animate-pulse'
                  : 'bg-[var(--outline)]'
              }`} />
              <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
                {isPlaying ? 'RUNNING' : 'IDLE'}
              </span>
            </div>

            {/* Seed chip */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-[2px]">
              <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--outline)]">
                SEED
              </span>
              <span className="font-[family-name:var(--font-space-grotesk)] text-[13px] tracking-[0.05em] font-medium text-[var(--on-surface)]">
                {seedToHex(params.seed)}
              </span>
              <button
                onClick={handleNewSeed}
                className="ml-1 w-5 h-5 flex items-center justify-center rounded-[2px] text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-variant)] transition-colors"
                title="Regenerate seed"
              >
                <span className="material-symbols-outlined text-[14px]">refresh</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── MAIN WORKSPACE ─── */}
      <div className="flex-1 min-h-0 px-8 touch:px-3 py-6 touch:py-4 overflow-y-auto">
        <div className="flex flex-col gap-4 max-w-6xl mx-auto min-h-[min(520px,100%)]">
          {/* PARAMETER CONTROL (full width) + model selector */}
          <div className="flex-1 min-h-0 bg-[var(--surface-container-low)] border border-[var(--outline-variant)] rounded-[2px] flex flex-col overflow-hidden relative min-h-[280px]">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--outline-variant)]" />

            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--outline-variant)]">
              <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
                Parameter Control
              </span>
              <span className="material-symbols-outlined text-[16px] text-[var(--outline)]">tune</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2">
                {visibleDials.map((dial, idx) => {
                  const isRightCol = idx % 2 === 1;
                  return (
                    <div
                      key={dial.key}
                      className={`flex items-center justify-between px-4 py-3 border-b border-[var(--outline-variant)]/40${isRightCol ? '' : ' border-r border-[var(--outline-variant)]/40'}`}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1 mr-3">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-[family-name:var(--font-inter)] text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface)]">
                            {dial.label}
                          </span>
                          <span className="font-[family-name:var(--font-space-grotesk)] text-[12px] tracking-[0.05em] font-medium text-[var(--on-surface)]">
                            {dial.formatValue
                              ? dial.formatValue(params[dial.key] as number)
                              : `${(params[dial.key] as number).toFixed(dial.step < 1 ? 1 : 0)}${dial.unit ?? ''}`}
                          </span>
                        </div>
                        <span className="font-[family-name:var(--font-space-grotesk)] text-[10px] tracking-[0.03em] text-[var(--outline)] leading-tight">
                          {dial.description}
                        </span>
                      </div>

                      <div className="shrink-0">
                        <ParamDial
                          label=""
                          value={params[dial.key] as number}
                          min={dial.min}
                          max={dial.max}
                          step={dial.step}
                          unit={dial.unit}
                          onChange={(v) => updateParam(dial.key, v as never)}
                          formatValue={dial.formatValue}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="shrink-0 border-t border-[var(--outline-variant)] px-5 py-4 bg-[var(--surface-container-lowest)]/40">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
                  Model
                </span>
                <div className="flex flex-wrap gap-2">
                  {STOCHASTIC_MODELS.map((model) => (
                    <button
                      key={model.value}
                      type="button"
                      onClick={() => updateParam('model', model.value)}
                      className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] font-[family-name:var(--font-inter)] border rounded-[2px] transition-all duration-75 ${
                        params.model === model.value
                          ? 'bg-[var(--on-surface)] text-[var(--surface)] border-transparent shadow-sm'
                          : 'bg-transparent text-[var(--on-surface-variant)] border-[var(--outline-variant)] hover:border-[var(--on-surface-variant)] hover:text-[var(--on-surface)]'
                      }`}
                    >
                      {model.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* PIANO ROLL (full width, below) */}
          <div className="flex min-h-[360px] flex-col bg-[var(--surface)] border border-[var(--outline-variant)] rounded-[2px] overflow-hidden shrink-0">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--surface-variant)] border-b border-[var(--outline-variant)] shrink-0">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[16px] text-[var(--on-surface)]">grid_view</span>
                <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface)]">
                  Pitch Class Matrix (Real-Time Preview)
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-[family-name:var(--font-space-grotesk)] text-[11px] tracking-[0.05em] text-[var(--outline)]">
                  X: TIME (BEATS)
                </span>
                <span className="font-[family-name:var(--font-space-grotesk)] text-[11px] tracking-[0.05em] text-[var(--outline)]">
                  Y: PITCH (12-TET)
                </span>
              </div>
            </div>

            <div className="flex-1 min-h-[300px]">
              <PianoRoll
                composition={composition}
                registerLow={params.registerLow}
                registerHigh={params.registerHigh}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── TRANSPORT BAR ─── */}
      <TransportBar>
        <button
          type="button"
          onClick={handleNewSeed}
          className="touch:hidden px-3 py-1.5 border border-[var(--outline-variant)] text-[var(--on-surface)] font-[family-name:var(--font-inter)] text-[10px] font-bold uppercase tracking-[0.1em] rounded-[2px] hover:bg-[var(--surface-variant)] transition-colors emboss-control"
        >
          New Seed
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          className="px-5 py-1.5 bg-[var(--on-surface)] text-[var(--surface)] font-[family-name:var(--font-inter)] text-[10px] font-bold uppercase tracking-[0.1em] rounded-[2px] hover:opacity-90 transition-opacity emboss-control flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">bolt</span>
          Compose
        </button>
      </TransportBar>
    </div>
  );
}
