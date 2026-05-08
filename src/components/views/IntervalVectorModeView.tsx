'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { PianoRoll } from '@/components/composer/PianoRoll';
import { TransportBar } from '@/components/composer/TransportBar';
import { ParamDial } from '@/components/composer/ParamDial';
import { useCompositionStore } from '@/state/useCompositionStore';
import { useTransportStore } from '@/state/useTransportStore';
import { getAllSets, findByCardinality, findSimilar, findByForte, findZRelated, makeSyntheticSetEntry, type PcSetEntry } from '@/kernel/pcSetDb';
import { intervalClassVector, type IntervalVector } from '@/kernel/icv';
import { primeForm } from '@/kernel/forms';
import { distance, METRIC_LABELS, forteRn, type DistanceMetric } from '@/kernel/similarity';
import { generateIv, DEFAULT_IV_PARAMS, type IvEngineParams, type TextureMode } from '@/engines/interval-vector/ivEngine';
import { pcToNoteName, mod12, type PitchClass } from '@/kernel/pcMath';
import { PointSphere } from '@/components/visualizations/PointSphere';
import { IcvScatter2D } from '@/components/visualizations/IcvScatter2D';

/* ------------------------------------------------------------------ */
/*  IC Labels                                                          */
/* ------------------------------------------------------------------ */

const IC_LABELS = [
  { key: 'ic1', label: 'm2/M7' },
  { key: 'ic2', label: 'M2/m7' },
  { key: 'ic3', label: 'm3/M6' },
  { key: 'ic4', label: 'M3/m6' },
  { key: 'ic5', label: 'P4/P5' },
  { key: 'ic6', label: 'TT' },
] as const;

/* ------------------------------------------------------------------ */
/*  PcClock — inline SVG pitch-class clock                             */
/* ------------------------------------------------------------------ */

function PcClock({ activePcs }: { activePcs: PitchClass[] }) {
  const cx = 100;
  const cy = 100;
  const r = 80;
  const rLabel = r + 18;
  const activeSet = new Set(activePcs);

  function pcPos(pc: number, radius: number) {
    const angle = ((pc * 30 - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  }

  const activePositions = activePcs.map((pc) => pcPos(pc, r));
  const polygonPoints = activePositions.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox="-5 -5 210 210" className="w-48 h-48" role="img" aria-label="Pitch-class clock diagram">
      {/* base circle */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--outline-variant)" strokeWidth="1" />

      {/* Note names outside ring */}
      {Array.from({ length: 12 }, (_, pc) => {
        const { x, y } = pcPos(pc, rLabel);
        return (
          <text
            key={`lbl-${pc}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            className="font-[family-name:var(--font-space-grotesk)]"
            fill="var(--on-surface-variant)"
            fontSize="7"
            fontWeight="500"
          >
            {pcToNoteName(pc as PitchClass)}
          </text>
        );
      })}

      {/* connecting polygon */}
      {activePcs.length >= 2 && (
        <polygon
          points={polygonPoints}
          fill="rgba(245,245,245,0.08)"
          stroke="var(--on-background)"
          strokeWidth="0.75"
        />
      )}

      {/* 12 nodes */}
      {Array.from({ length: 12 }, (_, pc) => {
        const { x, y } = pcPos(pc, r);
        const isActive = activeSet.has(pc as PitchClass);
        return isActive ? (
          <g key={pc} data-pc={pc}>
            <title>{`Pitch class ${pc} (${pcToNoteName(pc as PitchClass)}) — active in set`}</title>
            <circle cx={x} cy={y} r={8} fill="var(--on-background)" />
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className="font-[family-name:var(--font-space-grotesk)]"
              fill="var(--surface)"
              fontSize="8"
              fontWeight="500"
            >
              {pc}
            </text>
          </g>
        ) : (
          <g key={pc}>
            <title>{`Pitch class ${pc} (${pcToNoteName(pc as PitchClass)}) — inactive`}</title>
            <circle
              cx={x}
              cy={y}
              r={4}
              fill="var(--surface)"
              stroke="var(--outline-variant)"
              strokeWidth="1"
            />
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  IcvBarChart — horizontal bar chart for 6 interval classes          */
/* ------------------------------------------------------------------ */

function IcvBarChart({ icv }: { icv: IntervalVector }) {
  const maxVal = Math.max(...icv, 1);
  const barH = 112;
  return (
    <div className="flex items-end justify-between gap-2 sm:gap-3" style={{ minHeight: barH + 48 }}>
      {icv.map((val, i) => {
        const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
        return (
          <div
            key={IC_LABELS[i].key}
            className="flex-1 flex flex-col items-center gap-1 min-w-0"
            title={`${IC_LABELS[i].key} (${IC_LABELS[i].label}): ${val}`}
          >
            <div
              className="w-full rounded-sm bg-[var(--outline-variant)]/40 overflow-hidden flex flex-col justify-end"
              style={{ height: barH }}
            >
              <div
                className="w-full bg-[var(--on-background)] transition-all duration-300"
                style={{ height: `${pct}%`, minHeight: val > 0 ? 3 : 0 }}
              />
            </div>
            <span className="font-[family-name:var(--font-space-grotesk)] text-[10px] font-semibold text-[var(--on-surface)]">
              {val}
            </span>
            <span className="font-[family-name:var(--font-inter)] text-[8px] uppercase tracking-wider text-[var(--outline)] text-center leading-tight">
              IC{i + 1}
              <br />
              <span className="text-[7px] normal-case text-[var(--on-surface-variant)]">{IC_LABELS[i].label}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main view                                                          */
/* ------------------------------------------------------------------ */

export function IntervalVectorModeView() {
  /* ---- state ---- */
  const [params, setParams] = useState<IvEngineParams>({ ...DEFAULT_IV_PARAMS });
  const [pcInput, setPcInput] = useState('');
  const [selectedCardinality, setSelectedCardinality] = useState<number | 'all'>('all');
  const [vizMode, setVizMode] = useState<'2d' | '3d'>('2d');
  const [selectedSet, setSelectedSet] = useState<PcSetEntry | null>(null);
  const [metric, setMetric] = useState<DistanceMetric>('manhattan');
  const [useMetricGuide, setUseMetricGuide] = useState(false);
  const [transposeVal, setTransposeVal] = useState(0);
  const [inverted, setInverted] = useState(false);
  const [browserSearch, setBrowserSearch] = useState('');
  const [sequenceItems, setSequenceItems] = useState<{ id: string; forte: string; entry: PcSetEntry }[]>([]);
  const [seqTexture, setSeqTexture] = useState<TextureMode>('arpeggio');
  const [seqBars, setSeqBars] = useState(4);
  const [seqRnd, setSeqRnd] = useState(true);
  const [txBars, setTxBars] = useState(1);
  const [txTexture, setTxTexture] = useState<TextureMode>('arpeggio');

  const setComposition = useCompositionStore((s) => s.setComposition);
  const appendComposition = useCompositionStore((s) => s.appendComposition);
  const composition = useCompositionStore((s) => s.composition);
  const chain = useCompositionStore((s) => s.chain);
  const setBpm = useTransportStore((s) => s.setBpm);
  const isPlaying = useTransportStore((s) => s.isPlaying);

  /* ---- derived data ---- */
  const analysisResult = useMemo(() => {
    if (!selectedSet) return null;
    let pcs = selectedSet.primeForm.map(pc => mod12(pc + transposeVal));
    if (inverted) pcs = pcs.map(pc => mod12(-pc));
    const pf = primeForm(pcs as PitchClass[]);
    const icv = intervalClassVector(pcs as PitchClass[]);
    const entry = findByForte(selectedSet.forte);
    const zRelated = findZRelated(selectedSet.forte);
    return { pcs: pcs as PitchClass[], pf, icv, entry, zRelated, forte: selectedSet.forte, cardinality: selectedSet.cardinality };
  }, [selectedSet, transposeVal, inverted]);

  const manualAnalysis = useMemo(() => {
    if (pcInput.trim() === '') return null;
    const rawPcs = pcInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter((n) => !isNaN(n))
      .map((n) => mod12(n));
    if (rawPcs.length === 0) return null;
    const unique = [...new Set(rawPcs)] as PitchClass[];
    let pcs = unique.map((pc) => mod12(pc + transposeVal));
    if (inverted) pcs = pcs.map((pc) => mod12(-pc));
    const pf = primeForm(pcs);
    const icv = intervalClassVector(pcs);
    const all = getAllSets();
    const match = all.find((e) => JSON.stringify(e.primeForm) === JSON.stringify(pf));
    const zRelated = match ? findZRelated(match.forte) : [];
    return {
      pcs: pcs as PitchClass[],
      pf,
      icv,
      forte: match?.forte ?? '—',
      cardinality: pf.length,
      zRelated,
    };
  }, [pcInput, transposeVal, inverted]);

  const activeAnalysis = manualAnalysis ?? analysisResult;
  const activeIcv: IntervalVector = activeAnalysis?.icv ?? [0, 0, 0, 0, 0, 0];
  const activePcs: PitchClass[] = activeAnalysis?.pcs ?? [];

  const setsForCardinality = useMemo(() => {
    if (selectedCardinality === 'all') return getAllSets();
    return findByCardinality(selectedCardinality);
  }, [selectedCardinality]);

  const filteredSets = useMemo(() => {
    if (!browserSearch.trim()) return setsForCardinality;
    const q = browserSearch.toLowerCase();
    return setsForCardinality.filter(
      (e) =>
        e.forte.toLowerCase().includes(q) ||
        e.primeForm.join(',').includes(q) ||
        (e.name?.toLowerCase().includes(q) ?? false),
    );
  }, [setsForCardinality, browserSearch]);

  const similarSets = useMemo(() => {
    if (!activeAnalysis) return [];
    return findSimilar(
      activeAnalysis.icv,
      (a, b) => distance(a, b, metric),
      8,
    );
  }, [activeAnalysis, metric]);

  /* ---- callbacks ---- */
  const handleAnalyze = useCallback(() => {
    if (!manualAnalysis) return;
    const all = getAllSets();
    const match = all.find(e => JSON.stringify(e.primeForm) === JSON.stringify(manualAnalysis.pf));
    if (match) {
      setSelectedSet(match);
      setSelectedCardinality(match.cardinality);
    }
  }, [manualAnalysis]);

  const handleClear = useCallback(() => {
    setPcInput('');
    setSelectedSet(null);
    setTransposeVal(0);
    setInverted(false);
  }, []);

  const handleZSwap = useCallback(() => {
    if (!activeAnalysis?.zRelated?.length) return;
    setSelectedSet(activeAnalysis.zRelated[0]);
  }, [activeAnalysis]);

  const handleGenerate = useCallback(() => {
    let targetSets: PcSetEntry[];
    if (manualAnalysis) {
      const match = getAllSets().find((e) => JSON.stringify(e.primeForm) === JSON.stringify(manualAnalysis.pf));
      targetSets = [
        match ??
          makeSyntheticSetEntry(
            manualAnalysis.pf,
            manualAnalysis.icv,
            manualAnalysis.forte !== '—' ? manualAnalysis.forte : `(${manualAnalysis.pf.join('')})`,
          ),
      ];
    } else if (selectedSet) {
      targetSets = [selectedSet];
    } else {
      targetSets = setsForCardinality.slice(0, 4);
    }
    const { timeSigNumerator, timeSigDenominator } = useTransportStore.getState();
    const comp = generateIv({ ...params, seed: Date.now(), timeSigNumerator, timeSigDenominator, targetSets, metric, useMetric: useMetricGuide });
    if (chain && composition) {
      appendComposition(comp);
    } else {
      setComposition(comp);
    }
    setBpm(params.tempo);
  }, [params, selectedSet, manualAnalysis, setsForCardinality, metric, useMetricGuide, chain, composition, appendComposition, setComposition, setBpm]);

  const handleAddToSequence = useCallback(() => {
    if (!activeAnalysis) return;
    let entry: PcSetEntry;
    if (manualAnalysis) {
      const match = getAllSets().find((e) => JSON.stringify(e.primeForm) === JSON.stringify(manualAnalysis.pf));
      entry = match ?? makeSyntheticSetEntry(
        manualAnalysis.pf,
        manualAnalysis.icv,
        manualAnalysis.forte !== '—' ? manualAnalysis.forte : `(${manualAnalysis.pf.join('')})`,
      );
    } else if (selectedSet) {
      entry = selectedSet;
    } else {
      return;
    }
    setSequenceItems((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, forte: activeAnalysis.forte, entry },
    ]);
  }, [activeAnalysis, manualAnalysis, selectedSet]);

  const handleRemoveFromSequence = useCallback((id: string) => {
    setSequenceItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleClearSequence = useCallback(() => {
    setSequenceItems([]);
  }, []);

  const handleInjectSequence = useCallback(() => {
    if (sequenceItems.length === 0) return;
    const { timeSigNumerator, timeSigDenominator } = useTransportStore.getState();
    const comps = sequenceItems.map((item, idx) =>
      generateIv({ ...params, seed: seqRnd ? Date.now() + idx : params.seed + idx, bars: seqBars, timeSigNumerator, timeSigDenominator, targetSets: [item.entry], texture: seqTexture, metric }),
    );
    let offsetBeats = 0;
    const allNotes = comps.flatMap((comp) => {
      const shifted = comp.notes.map((n) => ({ ...n, startBeat: n.startBeat + offsetBeats }));
      offsetBeats += comp.totalBeats;
      return shifted;
    });
    let timeSigOffset = 0;
    const allTimeSigChanges = comps.flatMap((comp) => {
      const shifted = comp.timeSigChanges.map((ts) => ({ ...ts, beat: ts.beat + timeSigOffset }));
      timeSigOffset += comp.totalBeats;
      return shifted;
    });
    let tempoOffset = 0;
    const allTempoChanges = comps.flatMap((comp) => {
      const shifted = comp.tempoChanges.map((tc) => ({ ...tc, beat: tc.beat + tempoOffset }));
      tempoOffset += comp.totalBeats;
      return shifted;
    });
    const combined = { ...comps[0], notes: allNotes, timeSigChanges: allTimeSigChanges, tempoChanges: allTempoChanges, totalBeats: offsetBeats };
    if (chain && composition) {
      appendComposition(combined);
    } else {
      setComposition(combined);
    }
    setBpm(params.tempo);
  }, [sequenceItems, params, seqBars, seqTexture, seqRnd, metric, chain, composition, appendComposition, setComposition, setBpm]);

  const handleInjectTransformation = useCallback(() => {
    if (!activePcs.length) return;
    const { timeSigNumerator, timeSigDenominator } = useTransportStore.getState();
    const comp = generateIv({
      ...params,
      seed: params.seed,
      bars: txBars,
      timeSigNumerator,
      timeSigDenominator,
      lockedPcs: activePcs,
      texture: txTexture,
      metric,
      useMetric: false,
    });
    if (chain && composition) {
      appendComposition(comp);
    } else {
      setComposition(comp);
    }
    setBpm(params.tempo);
  }, [activePcs, params, txBars, txTexture, metric, chain, composition, appendComposition, setComposition, setBpm]);

  const handleSphereSelect = useCallback((forte: string) => {
    const e = findByForte(forte);
    if (e) {
      setSelectedSet(e);
      setSelectedCardinality(e.cardinality);
      setPcInput('');
    }
  }, []);

  const handleInject = useCallback(() => {
    if (!activeAnalysis) return;
    handleGenerate();
  }, [activeAnalysis, handleGenerate]);

  /* ---- render ---- */
  return (
    <div className="h-full flex flex-col bg-[var(--background)]">

      {/* ============================================================ */}
      {/*  HEADER — full width, outside scroll container               */}
      {/* ============================================================ */}
      <div className="shrink-0 px-8 touch:px-3 pt-6 touch:pt-4 pb-4 touch:pb-5 flex justify-between items-end border-b border-[var(--outline-variant)]">
        <div>
          <h1 className="mouse:block touch:hidden font-[family-name:var(--font-inter)] text-[24px] font-semibold tracking-tight text-[var(--on-background)]">
            Interval Vector Analysis
          </h1>
          <h1 className="hidden touch:block font-[family-name:var(--font-inter)] text-[18px] font-semibold tracking-tight text-[var(--on-background)]">
            Vector
          </h1>
          <p className="touch:hidden font-[family-name:var(--font-space-grotesk)] text-[13px] tracking-[0.05em] text-[var(--on-surface-variant)] mt-2">
            SYS_MOD: VECTOR_ENGINE_V2.1 - Filter and analyse pitch-class sets by their interval-class vector and compose.
          </p>
        </div>
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
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto touch:pb-28">
      <div className="p-8 touch:p-3 max-w-6xl mx-auto w-full flex flex-col gap-6">

        {/* ============================================================ */}
        {/*  BENTO GRID                                                    */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* ---------------------------------------------------------- */}
          {/*  LEFT PANEL (col-span-4)                                     */}
          {/* ---------------------------------------------------------- */}
          <div className="lg:col-span-4 flex flex-col gap-4">

            {/* --- Pitch-Class Input --- */}
            <div className="bg-[var(--surface)] border border-[var(--outline-variant)] rounded p-4 flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-[var(--surface-variant)] pb-2">
                <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
                  Pitch-Class Input
                </span>
                <span className="material-symbols-outlined text-[16px] text-[var(--outline)]">keyboard</span>
              </div>
              <div className="deboss-panel p-4 touch:p-3 rounded flex items-center gap-2 overflow-x-hidden">
                <span className="font-[family-name:var(--font-space-grotesk)] text-[13px] tracking-[0.05em] text-[var(--outline)] shrink-0">[</span>
                <input
                  type="text"
                  value={pcInput}
                  onChange={(e) => setPcInput(e.target.value)}
                  placeholder="e.g. 0,1,4"
                  className="bg-transparent border-none text-center font-[family-name:var(--font-space-grotesk)] text-[24px] touch:text-[20px] tracking-widest text-[var(--on-background)] focus:ring-0 focus:outline-none w-full min-w-0"
                />
                <span className="font-[family-name:var(--font-space-grotesk)] text-[13px] tracking-[0.05em] text-[var(--outline)] shrink-0">]</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAnalyze}
                  className="flex-1 btn-tactile py-2 rounded font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-background)]"
                >
                  Analyze
                </button>
                <button
                  onClick={handleClear}
                  className="btn-tactile px-3 rounded flex items-center justify-center text-[var(--on-background)]"
                  title="Clear"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            </div>

            {/* --- Set Properties --- */}
            <div className="bg-[var(--surface)] border border-[var(--outline-variant)] rounded p-4 flex flex-col gap-4">
              <div className="border-b border-[var(--surface-variant)] pb-2">
                <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
                  Set Properties
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="flex justify-between items-center py-1 border-b border-dashed border-[var(--surface-variant)]">
                  <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--outline)]">Forte Name</span>
                  <span className="font-[family-name:var(--font-space-grotesk)] text-[13px] tracking-[0.05em] text-[var(--on-background)]">
                    {activeAnalysis?.forte ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-dashed border-[var(--surface-variant)]">
                  <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--outline)]">ICV Cardinality</span>
                  <span className="font-[family-name:var(--font-space-grotesk)] text-[13px] tracking-[0.05em] text-[var(--on-background)]">
                    {activeAnalysis ? activeAnalysis.icv.reduce((s, v) => s + v, 0) : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-dashed border-[var(--surface-variant)]">
                  <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--outline)]">Prime Form</span>
                  <span className="font-[family-name:var(--font-space-grotesk)] text-[13px] tracking-[0.05em] text-[var(--on-background)]">
                    {activeAnalysis ? `(${activeAnalysis.pf.join('')})` : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-dashed border-[var(--surface-variant)]">
                  <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--outline)]">Inversion</span>
                  <span className="font-[family-name:var(--font-space-grotesk)] text-[13px] tracking-[0.05em] text-[var(--on-background)]">
                    {activeAnalysis ? `T${transposeVal}${inverted ? 'I' : ''}` : '—'}
                  </span>
                </div>
              </div>
              {/* Z-Relation swap */}
              {activeAnalysis && activeAnalysis.zRelated.length > 0 && (
                <button
                  onClick={handleZSwap}
                  className="btn-tactile py-1.5 rounded font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-background)] flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                  Z-SWAP → {activeAnalysis.zRelated[0].forte}
                </button>
              )}
            </div>

            {/* --- Sequence Builder --- */}
            <div className="bg-[var(--surface-container-low)] border border-[var(--outline-variant)] rounded p-4 flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">queue_music</span>
                  Sequence Builder
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSeqRnd((v) => !v)}
                    className={`font-[family-name:var(--font-inter)] text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded border transition-colors ${
                      seqRnd
                        ? 'bg-[var(--on-surface)] text-[var(--surface)] border-transparent'
                        : 'border-[var(--outline-variant)] text-[var(--on-surface-variant)] hover:border-[var(--on-surface)]'
                    }`}
                    type="button"
                    title={seqRnd ? 'Random seed per inject (click to fix)' : 'Fixed seed per inject (click to randomise)'}
                  >
                    RND
                  </button>
                  <button
                    onClick={handleClearSequence}
                    disabled={sequenceItems.length === 0}
                    className="font-[family-name:var(--font-inter)] text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--outline)] hover:text-[var(--on-surface)] disabled:opacity-30 transition-colors"
                    type="button"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Add current set to queue */}
              <div className="flex items-center gap-2 mb-3">
                <span className="flex-1 font-[family-name:var(--font-space-grotesk)] text-[10px] text-[var(--on-surface)] bg-[var(--surface)] border border-[var(--outline-variant)] rounded px-2 py-1 truncate">
                  {activeAnalysis?.forte ?? '— no set selected —'}
                </span>
                <button
                  onClick={handleAddToSequence}
                  disabled={!activeAnalysis}
                  className="px-3 py-1 bg-[var(--on-surface)] text-[var(--surface)] hover:opacity-90 disabled:opacity-40 transition-opacity rounded font-[family-name:var(--font-inter)] text-[9px] font-bold uppercase tracking-[0.1em] shrink-0 flex items-center gap-1"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[12px]">add</span>
                  Add
                </button>
              </div>

              {/* Queue list */}
              <div className="flex flex-col gap-1 mb-3 max-h-[96px] overflow-y-auto">
                {sequenceItems.length === 0 ? (
                  <div className="font-[family-name:var(--font-space-grotesk)] text-[9px] text-[var(--outline)] text-center py-2 italic">
                    Queue is empty — add sets above
                  </div>
                ) : (
                  sequenceItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 bg-[var(--surface)] border border-[var(--outline-variant)] rounded px-2 py-1"
                    >
                      <span className="font-[family-name:var(--font-space-grotesk)] text-[10px] text-[var(--on-surface)]">
                        {idx + 1}. {item.forte}
                      </span>
                      <button
                        onClick={() => handleRemoveFromSequence(item.id)}
                        className="text-[var(--outline)] hover:text-[var(--on-surface)] transition-colors text-[12px] leading-none"
                        type="button"
                        aria-label={`Remove ${item.forte} from sequence`}
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Texture toggle */}
              <div className="flex gap-1 mb-3">
                {(['arpeggio', 'block', 'mixed'] as TextureMode[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSeqTexture(t)}
                    className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-wider rounded border transition-colors ${
                      seqTexture === t
                        ? 'bg-[var(--on-surface)] text-[var(--surface)] border-transparent'
                        : 'border-[var(--outline-variant)] text-[var(--on-surface-variant)] hover:border-[var(--on-surface)]'
                    }`}
                    type="button"
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Sequence Bars */}
              <div className="flex items-center gap-2 pt-2 pb-2 mb-3">
                <span className="font-[family-name:var(--font-inter)] text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)] whitespace-nowrap">
                  Seq Bars
                </span>
                <input
                  type="range"
                  min={1}
                  max={32}
                  step={1}
                  value={seqBars}
                  onChange={(e) => setSeqBars(Number(e.target.value))}
                  className="flex-1 accent-[var(--on-surface)] h-1"
                  aria-label="Sequence bars"
                />
                <span className="font-[family-name:var(--font-space-grotesk)] text-[11px] text-[var(--on-surface)] min-w-[28px] text-right">
                  {seqBars}
                </span>
              </div>

              {/* Inject button */}
              <button
                onClick={handleInjectSequence}
                disabled={sequenceItems.length === 0}
                className="w-full bg-[var(--on-background)] text-[var(--surface)] hover:opacity-90 disabled:opacity-40 transition-opacity py-3 rounded font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] flex justify-center items-center gap-2"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">add_to_queue</span>
                Inject Sequence
              </button>
            </div>
          </div>

          {/* ---------------------------------------------------------- */}
          {/*  RIGHT PANEL (col-span-8)                                    */}
          {/* ---------------------------------------------------------- */}
          <div className="lg:col-span-8 flex flex-col gap-4">

            {/* --- Interval Vector Display --- */}
            <div className="bg-[var(--surface)] border border-[var(--outline-variant)] rounded p-6 flex flex-col gap-6 relative overflow-hidden">
              {/* ghost watermark */}
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <span className="material-symbols-outlined text-[120px]">analytics</span>
              </div>

              <div className="border-b border-[var(--surface-variant)] pb-2 relative z-10">
                <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
                  Interval Vector
                </span>
              </div>

              {/* HUGE ICV display */}
              <div className="deboss-panel p-8 rounded flex items-center justify-center relative z-10">
                <div className="flex items-center gap-2 font-[family-name:var(--font-space-grotesk)] text-[48px] md:text-[64px] tracking-tight text-[var(--on-background)]">
                  <span className="text-[var(--outline)] font-light">&lt;</span>
                  {activeIcv.map((v, i) => (
                    <span key={i} className="flex items-center">
                      <span>{v}</span>
                      {i < 5 && <span className="text-[var(--outline-variant)]">,</span>}
                    </span>
                  ))}
                  <span className="text-[var(--outline)] font-light">&gt;</span>
                </div>
              </div>

              {/* Bar chart */}
              <div className="relative z-10">
                <IcvBarChart icv={activeIcv} />
              </div>
            </div>

            {/* --- Two-column sub-grid: Clock + Transformations --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* PC Clock */}
              <div className="bg-[var(--surface)] border border-[var(--outline-variant)] rounded p-4 flex flex-col items-center gap-4 blueprint-grid">
                <div className="w-full border-b border-[var(--surface-variant)] pb-2 text-left bg-[var(--surface)]/80 backdrop-blur-sm">
                  <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
                    Pitch-Class Space
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-center my-2">
                  <PcClock activePcs={activePcs} />
                </div>
                {/* Transformation result — shown here so the clock stays centered */}
                <div className="w-full flex items-center justify-between gap-2 border-t border-[var(--surface-variant)] pt-3">
                  <span className="font-[family-name:var(--font-inter)] text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--outline)]">
                    Result T{transposeVal}{inverted ? 'I' : ''}
                  </span>
                  <span className="font-[family-name:var(--font-space-grotesk)] text-[12px] tracking-[0.05em] text-[var(--on-background)] bg-[var(--surface-container-low)] border border-[var(--surface-variant)] px-2 py-0.5 rounded">
                    {activePcs.length > 0 ? `{${activePcs.join(', ')}}` : '—'}
                  </span>
                </div>
              </div>

              {/* Transformations */}
              <div className="bg-[var(--surface)] border border-[var(--outline-variant)] rounded p-4 flex flex-col gap-4">
                <div className="border-b border-[var(--surface-variant)] pb-2">
                  <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
                    Transformations
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-around">

                  {/* Transpose dial */}
                  <div className="flex flex-col items-center gap-3">
                    <ParamDial
                      label=""
                      value={transposeVal}
                      min={0}
                      max={11}
                      step={1}
                      onChange={setTransposeVal}
                    />
                    <div className="flex flex-col items-center">
                      <span className="font-[family-name:var(--font-inter)] text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--outline)]">
                        Transpose (Tn)
                      </span>
                      <span className="font-[family-name:var(--font-space-grotesk)] text-[13px] tracking-[0.05em] text-[var(--on-background)] border border-[var(--surface-variant)] px-2 py-0.5 mt-1 rounded bg-[var(--surface-container-low)]">
                        T{transposeVal}
                      </span>
                    </div>
                  </div>

                  {/* Inversion toggle */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-[80px] flex items-center justify-center">
                      <button
                        onClick={() => setInverted(!inverted)}
                        className={`w-12 h-6 border border-[var(--outline-variant)] rounded-full relative shadow-inner cursor-pointer transition-colors ${
                          inverted ? 'bg-[var(--on-background)]' : 'bg-[var(--surface-container-high)]'
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 rounded-full shadow-sm transition-all ${
                            inverted
                              ? 'left-7 bg-[var(--surface)]'
                              : 'left-1 bg-[var(--on-background)]'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="font-[family-name:var(--font-inter)] text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--outline)]">
                        Inversion (I)
                      </span>
                      <span className={`font-[family-name:var(--font-space-grotesk)] text-[13px] tracking-[0.05em] border border-[var(--surface-variant)] px-2 py-0.5 mt-1 rounded ${
                        inverted
                          ? 'text-[var(--on-background)] bg-[var(--surface-container-low)]'
                          : 'text-[var(--outline)] bg-[var(--surface)]'
                      }`}>
                        {inverted ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Transformation result */}
                <div className="border-t border-[var(--surface-variant)] pt-3 flex flex-col gap-3">

                  {/* Texture selector */}
                  <div className="flex gap-1">
                    {(['arpeggio', 'block', 'mixed'] as TextureMode[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTxTexture(t)}
                        className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-wider rounded border transition-colors ${
                          txTexture === t
                            ? 'bg-[var(--on-surface)] text-[var(--surface)] border-transparent'
                            : 'border-[var(--outline-variant)] text-[var(--on-surface-variant)] hover:border-[var(--on-surface)]'
                        }`}
                        type="button"
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* Bars selector */}
                  <div className="flex items-center gap-2">
                    <span className="font-[family-name:var(--font-inter)] text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)] whitespace-nowrap">
                      Bars
                    </span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((n) => (
                        <button
                          key={n}
                          onClick={() => setTxBars(n)}
                          className={`w-7 py-1 text-[9px] font-bold rounded border transition-colors ${
                            txBars === n
                              ? 'bg-[var(--on-surface)] text-[var(--surface)] border-transparent'
                              : 'border-[var(--outline-variant)] text-[var(--on-surface-variant)] hover:border-[var(--on-surface)]'
                          }`}
                          type="button"
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Inject button */}
                  <button
                    onClick={handleInjectTransformation}
                    disabled={!activePcs.length}
                    className="w-full bg-[var(--on-background)] text-[var(--surface)] hover:opacity-90 disabled:opacity-40 transition-opacity py-2 rounded font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] flex justify-center items-center gap-2"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_to_queue</span>
                    Inject Sequence
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/*  DISTANCE METRIC + ENGINE — two separate containers in a row */}
        {/* ============================================================ */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Container 1: Distance Metric */}
          <div className="bg-[var(--surface)] border border-[var(--outline-variant)] rounded p-4 flex flex-col gap-8 lg:flex-1 items-left">
            <div className="flex items-center justify-between gap-2">
              <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
                Distance Metric
              </span>
              <div className="flex rounded border border-[var(--outline-variant)] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setUseMetricGuide(true)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
                    useMetricGuide
                      ? 'bg-[var(--on-surface)] text-[var(--surface)]'
                      : 'bg-transparent text-[var(--on-surface-variant)] hover:bg-[var(--surface-variant)]'
                  }`}
                >
                  On
                </button>
                <button
                  type="button"
                  onClick={() => setUseMetricGuide(false)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border-l border-[var(--outline-variant)] ${
                    !useMetricGuide
                      ? 'bg-[var(--on-surface)] text-[var(--surface)]'
                      : 'bg-transparent text-[var(--on-surface-variant)] hover:bg-[var(--surface-variant)]'
                  }`}
                >
                  Off
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-9">
              {(Object.keys(METRIC_LABELS) as DistanceMetric[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetric(m)}
                  className={`px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded border ${
                    metric === m
                      ? 'bg-[var(--on-surface)] text-[var(--surface)] border-transparent'
                      : 'border-[var(--outline-variant)] text-[var(--on-surface-variant)] hover:border-[var(--on-surface)]'
                  }`}
                >
                  {METRIC_LABELS[m]}
                </button>
              ))}
            </div>
            <span className="font-[family-name:var(--font-inter)] text-[10px] font-bold lowercase tracking-[0.1em] text-[var(--on-surface-variant)]">
              DIST_COMP_UNIT_V4.5
            </span>
          </div>

          {/* Container 2: Composition params + Generate */}
          <div className="bg-[var(--surface)] border border-[var(--outline-variant)] rounded p-4 flex flex-wrap gap-6 items-end shrink-0">
            <div className="flex flex-col gap-1">
              <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
                Composition
              </span>
              <div className="flex gap-6 items-end">
                <ParamDial
                  label="Tempo"
                  value={params.tempo}
                  min={40}
                  max={200}
                  step={1}
                  unit=" bpm"
                  onChange={(v) => setParams((p) => ({ ...p, tempo: v }))}
                />
                <ParamDial
                  label="Bars"
                  value={params.bars}
                  min={4}
                  max={32}
                  step={4}
                  onChange={(v) => setParams((p) => ({ ...p, bars: v }))}
                />
                <ParamDial
                  label="Common Tones"
                  value={params.commonTones}
                  min={0}
                  max={6}
                  step={1}
                  onChange={(v) => setParams((p) => ({ ...p, commonTones: v }))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/*  SET BROWSER                                                   */}
        {/* ============================================================ */}
        <div className="bg-[var(--surface-container)] border border-[var(--outline-variant)] rounded p-4 blueprint-grid">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-[var(--on-surface-variant)]">database</span>
              <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
                PC-SET BROWSER — {filteredSets.length} sets
              </span>
            </div>
            <input
              type="text"
              value={browserSearch}
              onChange={(e) => setBrowserSearch(e.target.value)}
              placeholder="Search forte, set name, or PCs…"
              className="px-2 py-1 text-[11px] bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded text-[var(--on-surface)] font-[family-name:var(--font-space-grotesk)] focus:outline-none w-40"
            />
          </div>

          {/* Cardinality filter */}
          <div className="flex gap-1 mb-3 flex-wrap items-center">
            <button
              type="button"
              onClick={() => {
                setSelectedCardinality('all');
                setSelectedSet(null);
              }}
              className={`min-w-[32px] px-2 h-7 text-[10px] font-bold border rounded transition-colors ${
                selectedCardinality === 'all'
                  ? 'bg-[var(--on-surface)] text-[var(--surface)] border-transparent'
                  : 'bg-transparent text-[var(--on-surface-variant)] border-[var(--outline-variant)] hover:border-[var(--on-surface)]'
              }`}
            >
              ALL
            </button>
            {[3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setSelectedCardinality(n);
                  setSelectedSet(null);
                }}
                className={`w-7 h-7 text-[11px] font-bold border rounded transition-colors ${
                  selectedCardinality === n
                    ? 'bg-[var(--on-surface)] text-[var(--surface)] border-transparent'
                    : 'bg-transparent text-[var(--on-surface-variant)] border-[var(--outline-variant)] hover:border-[var(--on-surface)]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Set grid */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-1.5 max-h-[220px] overflow-y-auto pr-1">
            {filteredSets.map((entry) => (
              <button
                key={entry.forte}
                type="button"
                onClick={() => {
                  setSelectedSet(entry);
                  setPcInput('');
                }}
                className={`flex flex-col items-stretch px-2 py-1.5 text-left border rounded transition-colors gap-0.5 ${
                  selectedSet?.forte === entry.forte
                    ? 'bg-[var(--on-surface)] text-[var(--surface)] border-transparent'
                    : 'bg-[var(--surface-container-lowest)] text-[var(--on-surface)] border-[var(--outline-variant)] hover:border-[var(--on-surface)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="font-[family-name:var(--font-space-grotesk)] text-[11px] font-bold">{entry.forte}</span>
                  <span className="font-[family-name:var(--font-space-grotesk)] text-[10px] opacity-70 shrink-0">
                    &lt;{entry.icv.join(',')}&gt;
                  </span>
                </div>
                {entry.name ? (
                  <span
                    className={`font-[family-name:var(--font-inter)] text-[9px] leading-snug line-clamp-2 ${
                      selectedSet?.forte === entry.forte ? 'text-[var(--surface)]/85' : 'text-[var(--on-surface-variant)]'
                    }`}
                  >
                    {entry.name}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* ============================================================ */}
        {/*  SIMILAR SETS                                                  */}
        {/* ============================================================ */}
        {activeAnalysis && (
          <div className="bg-[var(--surface)] border border-[var(--outline-variant)] rounded p-4">
            <div className="flex flex-col gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px] text-[var(--on-surface-variant)]">near_me</span>
                <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
                  Similar sets
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {(Object.keys(METRIC_LABELS) as DistanceMetric[]).map((m) => (
                  <button
                    key={`sim-${m}`}
                    type="button"
                    onClick={() => setMetric(m)}
                    className={`px-2 py-1 text-[8px] font-bold uppercase tracking-wider rounded border ${
                      metric === m
                        ? 'bg-[var(--on-surface)] text-[var(--surface)] border-transparent'
                        : 'border-[var(--outline-variant)] text-[var(--on-surface-variant)] hover:border-[var(--on-surface)]'
                    }`}
                  >
                    {METRIC_LABELS[m].split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {similarSets.slice(1, 8).map(({ entry, distance: dist }) => {
                const rn = forteRn(activeAnalysis.icv, entry.icv, activeAnalysis.cardinality, entry.cardinality);
                return (
                <button
                  key={entry.forte}
                  onClick={() => { setSelectedSet(entry); setPcInput(''); }}
                  className="px-3 py-1.5 bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded hover:border-[var(--on-surface)] transition-colors flex items-center gap-2"
                  title={`Distance: ${dist.toFixed(4)}`}
                >
                  <span className="font-[family-name:var(--font-space-grotesk)] text-[11px] font-bold text-[var(--on-surface)]">
                    {entry.forte}
                  </span>
                  <span className="font-[family-name:var(--font-space-grotesk)] text-[10px] text-[var(--outline)]">
                    &lt;{entry.icv.join(',')}&gt;
                  </span>
                  <span className="font-[family-name:var(--font-space-grotesk)] text-[9px] text-[var(--outline)]">
                    d={dist.toFixed(2)}
                  </span>
                  {rn !== null && (
                    <span className="font-[family-name:var(--font-space-grotesk)] text-[8px] font-bold text-[var(--on-surface-variant)] border border-[var(--outline-variant)] rounded px-1">
                      {rn.label}
                    </span>
                  )}
                </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Set-class visualization: metric-aware 2D scatter vs PCA cloud */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
              Set-class universe
            </span>
            <div className="flex rounded border border-[var(--outline-variant)] overflow-hidden">
              <button
                type="button"
                onClick={() => setVizMode('2d')}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
                  vizMode === '2d'
                    ? 'bg-[var(--on-surface)] text-[var(--surface)]'
                    : 'bg-transparent text-[var(--on-surface-variant)] hover:bg-[var(--surface-variant)]'
                }`}
              >
                2D
              </button>
              <button
                type="button"
                onClick={() => setVizMode('3d')}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border-l border-[var(--outline-variant)] ${
                  vizMode === '3d'
                    ? 'bg-[var(--on-surface)] text-[var(--surface)]'
                    : 'bg-transparent text-[var(--on-surface-variant)] hover:bg-[var(--surface-variant)]'
                }`}
              >
                3D PCA
              </button>
            </div>
          </div>
          {vizMode === '2d' ? (
            <IcvScatter2D
              metric={metric}
              referenceIcv={activeIcv}
              selectedForte={selectedSet?.forte ?? null}
              onSelectForte={handleSphereSelect}
            />
          ) : (
            <PointSphere
              metric={metric}
              selectedForte={selectedSet?.forte ?? null}
              referenceIcv={activeIcv}
              onSelectForte={handleSphereSelect}
            />
          )}
        </div>

        {/* ============================================================ */}
        {/*  PIANO ROLL                                                    */}
        {/* ============================================================ */}
        <div className="flex flex-col bg-[var(--surface)] border border-[var(--outline-variant)] rounded-[2px] overflow-hidden shrink-0">
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
              registerLow={
                composition && composition.notes.length > 0
                  ? composition.notes.reduce((m, n) => Math.min(m, n.octave), Infinity)
                  : params.registerLow
              }
              registerHigh={
                composition && composition.notes.length > 0
                  ? composition.notes.reduce((m, n) => Math.max(m, n.octave), -Infinity)
                  : params.registerHigh
              }
            />
          </div>
        </div>
      </div>
      </div>

      {/* ============================================================ */}
      {/*  TRANSPORT BAR                                                 */}
      {/* ============================================================ */}
      <TransportBar>
        <button
          type="button"
          onClick={handleGenerate}
          className="px-6 py-2 bg-[var(--on-surface)] text-[var(--surface)] font-[family-name:var(--font-inter)] text-[10px] font-bold uppercase tracking-[0.12em] rounded border border-[var(--on-surface)] hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm active:translate-y-[1px]"
        >
          <span className="material-symbols-outlined text-[16px]">bolt</span>
          Compose
        </button>
      </TransportBar>
    </div>
  );
}
