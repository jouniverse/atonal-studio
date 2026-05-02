'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { PianoRoll } from '@/components/composer/PianoRoll';
import { TransportBar } from '@/components/composer/TransportBar';
import { ParamDial } from '@/components/composer/ParamDial';
import { useCompositionStore } from '@/state/useCompositionStore';
import { useTransportStore } from '@/state/useTransportStore';
import {
  buildMatrix,
  getRowForm,
  randomToneRow,
  generateSerial,
  DEFAULT_SERIALISM_PARAMS,
  type SerialismParams,
  type RowForm,
  type TwelveToneMatrix,
} from '@/engines/serialism/serialEngine';
import { type PitchClass, pcToNoteName } from '@/kernel/pcMath';

const ROW_FORMS: { value: RowForm; label: string; full: string }[] = [
  { value: 'P', label: 'P', full: 'Prime' },
  { value: 'I', label: 'I', full: 'Inversion' },
  { value: 'R', label: 'R', full: 'Retrograde' },
  { value: 'RI', label: 'RI', full: 'Retro-Inv' },
];

function pcCellName(pc: number): string {
  return pcToNoteName(pc as PitchClass);
}

function exportMatrixCsv(matrix: TwelveToneMatrix) {
  const head = ['', ...matrix.colLabels, 'R-side'];
  const lines: string[] = [head.join(',')];
  matrix.matrix.forEach((row, i) => {
    const lastVal = row[row.length - 1];
    lines.push([matrix.rowLabels[i], ...row.map(String), `R${lastVal}`].join(','));
  });
  const riLabels = matrix.matrix[0].map((_, j) => {
    const lastVal = matrix.matrix[matrix.matrix.length - 1][j];
    return `RI${lastVal}`;
  });
  lines.push(['', ...riLabels, ''].join(','));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'twelve-tone-matrix.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function exportMatrixPdf(matrix: TwelveToneMatrix) {
  import('jspdf').then(({ jsPDF }) => {
    import('jspdf-autotable').then((autoTableModule) => {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const autoTable = autoTableModule.default;
      const margin = { left: 10, right: 10 };

      doc.setFontSize(14);
      doc.text('Twelve-Tone Matrix', margin.left, 12);
      doc.setFontSize(8);
      doc.text(`Prime Row (P0): [${matrix.prime.join(', ')}]`, margin.left, 17);
      doc.text(`Pitch names: [${matrix.prime.map((p) => pcCellName(p)).join(', ')}]`, margin.left, 21);

      const head = [['', ...matrix.colLabels, '']];
      const body = matrix.matrix.map((row, i) => {
        const lastVal = row[row.length - 1];
        return [matrix.rowLabels[i], ...row.map(String), `R${lastVal}`];
      });
      const riLabels = matrix.matrix[0].map((_, j) => {
        const lastVal = matrix.matrix[matrix.matrix.length - 1][j];
        return `RI${lastVal}`;
      });
      body.push(['', ...riLabels, '']);

      const bodyNames = matrix.matrix.map((row, i) => {
        const lastVal = row[row.length - 1];
        return [
          matrix.rowLabels[i],
          ...row.map((pc) => pcCellName(pc)),
          `R${lastVal}`,
        ];
      });
      bodyNames.push(['', ...riLabels, '']);

      const tableOpts = {
        margin,
        theme: 'grid' as const,
        tableWidth: 190 as number,
        styles: {
          fontSize: 10,
          cellPadding: 2,
          halign: 'center' as const,
        },
        headStyles: { fillColor: [40, 40, 40] as [number, number, number], textColor: [255, 255, 255] as [number, number, number] },
      };

      autoTable(doc, {
        startY: 24,
        head,
        body,
        ...tableOpts,
      });

      const after = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
      doc.setFontSize(9);
      doc.text('Pitch-class letters', margin.left, after + 6);
      autoTable(doc, {
        startY: after + 8,
        head,
        body: bodyNames,
        ...tableOpts,
        headStyles: { fillColor: [52, 52, 52] as [number, number, number], textColor: [255, 255, 255] as [number, number, number] },
      });

      doc.save('twelve-tone-matrix.pdf');
    });
  });
}

export function SerialismModeView() {
  const [params, setParams] = useState<SerialismParams>({ ...DEFAULT_SERIALISM_PARAMS });
  const [activeForm, setActiveForm] = useState<RowForm>('P');
  const [transposition, setTransposition] = useState<number>(0);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [rowText, setRowText] = useState(() => DEFAULT_SERIALISM_PARAMS.prime.join(' '));
  const setComposition = useCompositionStore((s) => s.setComposition);
  const appendComposition = useCompositionStore((s) => s.appendComposition);
  const composition = useCompositionStore((s) => s.composition);
  const chain = useCompositionStore((s) => s.chain);
  const setBpm = useTransportStore((s) => s.setBpm);
  const isPlaying = useTransportStore((s) => s.isPlaying);

  const matrix = useMemo(() => buildMatrix(params.prime), [params.prime]);
  const activeRow = useMemo(
    () => getRowForm(matrix, activeForm, transposition as PitchClass),
    [matrix, activeForm, transposition],
  );

  const retrogradeLabels = useMemo(() => {
    return matrix.matrix.map((row) => `R${row[row.length - 1]}`);
  }, [matrix]);

  const riLabels = useMemo(() => {
    const lastRow = matrix.matrix[matrix.matrix.length - 1];
    return lastRow.map((val) => `RI${val}`);
  }, [matrix]);

  // Compute which row index is active (for P/R: match rowLabel; for I/RI: match colLabel)
  const activeMatrixRow = useMemo(() => {
    if (activeForm === 'P' || activeForm === 'R') {
      return matrix.rowLabels.findIndex((l) => l === `P${transposition}`);
    }
    return -1;
  }, [matrix, activeForm, transposition]);

  const activeMatrixCol = useMemo(() => {
    if (activeForm === 'I' || activeForm === 'RI') {
      return matrix.colLabels.findIndex((l) => l === `I${transposition}`);
    }
    return -1;
  }, [matrix, activeForm, transposition]);

  useEffect(() => {
    setRowText(params.prime.join(' '));
  }, [params.prime]);

  const applyParsedRow = useCallback((raw: string) => {
    const parts = raw
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((x) => Number(x));
    if (parts.length !== 12 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 11)) {
      return false;
    }
    if (new Set(parts).size !== 12) return false;
    setParams((p) => ({ ...p, prime: parts as PitchClass[] }));
    return true;
  }, []);

  const handleRandomRow = useCallback(() => {
    const newRow = randomToneRow(Date.now());
    setParams((prev) => ({ ...prev, prime: newRow }));
  }, []);

  const handleCompose = useCallback(() => {
    const { timeSigNumerator, timeSigDenominator } = useTransportStore.getState();
    const comp = generateSerial({
      ...params,
      timeSigNumerator,
      timeSigDenominator,
      walkForm: activeForm,
      walkTransposition: transposition as PitchClass,
    });
    if (chain && composition) {
      appendComposition(comp);
    } else {
      setComposition(comp);
    }
    setBpm(params.tempo);
  }, [params, activeForm, transposition, chain, composition, appendComposition, setComposition, setBpm]);

  const decrementTransposition = useCallback(() => {
    setTransposition((prev) => (prev - 1 + 12) % 12);
  }, []);

  const incrementTransposition = useCallback(() => {
    setTransposition((prev) => (prev + 1) % 12);
  }, []);

  const p0first = params.prime[0];

  return (
    <div className="h-full flex flex-col w-full bg-[var(--surface)]">
      <div className="flex-1 min-h-0 overflow-y-auto pb-[env(safe-area-inset-bottom)] touch:pb-28">
      {/* ─── HEADER ─── */}
      <div className="shrink-0 px-[32px] touch:px-4 pt-[24px] touch:pt-4 pb-[16px] touch:pb-3 flex items-center justify-between border-b border-[var(--outline-variant)] bg-[var(--surface-container)]">
        <div>
          <h1 className="mouse:block touch:hidden font-[family-name:var(--font-space-grotesk)] text-[24px] font-semibold tracking-tight text-[var(--on-surface)]">
            Matrix Generator
          </h1>
          <h1 className="hidden touch:block font-[family-name:var(--font-space-grotesk)] text-[18px] font-semibold tracking-tight text-[var(--on-surface)]">
            Matrix
          </h1>
          <p className="touch:hidden font-[family-name:var(--font-inter)] text-[11px] tracking-[0.1em] uppercase text-[var(--on-surface-variant)] mt-[2px]">
            SYS_MOD: MATRIX_MECHANICS_V2.2 - Algorithm: Dodecaphonic Row Analysis
          </p>
        </div>
        <div className="flex items-center gap-[10px] flex-wrap justify-end">
          <div className="flex items-center gap-2 mr-2">
            <span className={`w-2 h-2 rounded-full ${
              isPlaying
                ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)] animate-pulse'
                : 'bg-[var(--outline)]'
            }`} />
            <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
              {isPlaying ? 'RUNNING' : 'IDLE'}
            </span>
          </div>
          <button
            onClick={handleRandomRow}
            type="button"
            className="h-[36px] px-[14px] font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] border border-[var(--outline)] rounded-[4px] text-[var(--on-surface)] bg-transparent hover:bg-[var(--surface-variant)] transition-colors"
          >
            Generate New
          </button>
          <button
            onClick={() => exportMatrixCsv(matrix)}
            type="button"
            className="hidden sm:flex h-[36px] px-[14px] font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] border border-[var(--outline-variant)] rounded-[4px] text-[var(--on-surface)] hover:bg-[var(--surface-variant)] transition-colors items-center"
          >
            CSV
          </button>
          <button
            onClick={() => exportMatrixPdf(matrix)}
            type="button"
            className="flex h-[36px] px-[16px] font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] rounded-[4px] bg-[var(--on-surface)] text-[var(--surface)] hover:opacity-90 transition-opacity items-center"
          >
            PDF
          </button>
        </div>
      </div>

      {/* ─── PRIME ROW BUILDER ─── */}
      <div className="shrink-0 px-[32px] touch:px-4 py-[20px] touch:py-4 border-b border-[var(--outline-variant)] bg-[var(--surface-container)] blueprint-grid">
        <div className="relative border border-[var(--outline-variant)] rounded-[4px] p-[16px] pt-[20px] flex flex-col gap-3">
          <span className="absolute -top-[9px] left-[12px] px-[6px] bg-[var(--surface-container)] font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
            Prime Row Input (P0)
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-[family-name:var(--font-inter)] text-[10px] uppercase text-[var(--outline)] shrink-0">
              Typed row
            </span>
            <input
              value={rowText}
              onChange={(e) => setRowText(e.target.value)}
              onBlur={() => applyParsedRow(rowText)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyParsedRow(rowText);
              }}
              placeholder="0 1 2 3 4 5 6 7 8 9 10 11"
              className="flex-1 min-w-[200px] px-2 py-1.5 bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded font-[family-name:var(--font-space-grotesk)] text-[12px] text-[var(--on-surface)]"
            />
            <button
              type="button"
              onClick={() => applyParsedRow(rowText)}
              className="h-[32px] px-3 text-[10px] font-bold uppercase border border-[var(--outline-variant)] rounded text-[var(--on-surface)] hover:bg-[var(--surface-variant)]"
            >
              Apply
            </button>
          </div>
          <div className="flex items-center gap-[12px]">
            <div className="flex flex-col gap-[3px] opacity-30 shrink-0">
              <div className="flex gap-[3px]">
                <span className="w-[3px] h-[3px] rounded-full bg-[var(--on-surface-variant)]" />
                <span className="w-[3px] h-[3px] rounded-full bg-[var(--on-surface-variant)]" />
              </div>
              <div className="flex gap-[3px]">
                <span className="w-[3px] h-[3px] rounded-full bg-[var(--on-surface-variant)]" />
                <span className="w-[3px] h-[3px] rounded-full bg-[var(--on-surface-variant)]" />
              </div>
            </div>

            <div className="deboss-panel flex gap-[6px] p-[8px] rounded-[4px] flex-1 overflow-x-auto">
              {params.prime.map((pc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedSlot(idx)}
                  className={`w-12 h-12 shrink-0 flex items-center justify-center border rounded-[2px] shadow-sm font-[family-name:var(--font-space-grotesk)] text-[13px] tracking-[0.05em] select-none transition-colors ${
                    selectedSlot === idx
                      ? 'bg-[var(--on-surface)] text-[var(--surface)] border-[var(--on-surface)]'
                      : 'bg-[var(--surface-container-lowest)] border-[var(--outline-variant)] text-[var(--on-surface)] hover:border-[var(--on-surface)]'
                  }`}
                >
                  {pc}
                </button>
              ))}
            </div>

            <button
              onClick={handleRandomRow}
              type="button"
              className="h-[36px] px-[14px] shrink-0 font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] border border-[var(--outline-variant)] rounded-[4px] text-[var(--on-surface-variant)] hover:bg-[var(--surface-variant)] transition-colors emboss-control"
            >
              Random
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-[family-name:var(--font-inter)] text-[10px] font-bold uppercase tracking-wider text-[var(--on-surface-variant)]">
              Set slot {selectedSlot + 1}:
            </span>
            <div className="flex flex-wrap gap-1 flex-1">
              {([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const).map((pc) => (
                <button
                  key={pc}
                  type="button"
                  onClick={() => {
                    setParams((p) => {
                      const next = [...p.prime];
                      next[selectedSlot] = pc;
                      return { ...p, prime: next };
                    });
                  }}
                  className="w-8 h-8 text-[11px] font-[family-name:var(--font-space-grotesk)] border border-[var(--outline-variant)] rounded bg-[var(--surface-container-lowest)] text-[var(--on-surface)] hover:bg-[var(--surface-variant)]"
                >
                  {pc}
                </button>
              ))}
            </div>
            <button
              type="button"
              title="Clear slot to 0"
              onClick={() => {
                setParams((p) => {
                  const next = [...p.prime];
                  next[selectedSlot] = 0;
                  return { ...p, prime: next };
                });
              }}
              className="w-9 h-9 flex items-center justify-center border border-[var(--outline-variant)] rounded text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── TWO-COLUMN: MATRIX + CONTROL PANEL ─── */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-[1fr_300px] border-b border-[var(--outline-variant)]">
        {/* LEFT: THE MATRIX */}
        <div className="p-[32px] max-sm:pr-0 overflow-x-auto bg-[var(--surface-container-low)] border-r border-[var(--outline-variant)]">
          <div
            className="grid gap-0 max-sm:pr-[32px]"
            style={{
              gridTemplateColumns: '36px repeat(12, minmax(36px, 1fr)) 36px',
            }}
          >
            {/* ── Top header row: corner + I-labels + corner ── */}
            <div className="h-10 flex items-center justify-center" />
            {matrix.colLabels.map((label, j) => (
              <div
                key={`col-${j}`}
                className={`h-10 flex items-center justify-center font-[family-name:var(--font-space-grotesk)] text-[11px] font-bold tracking-[0.05em] ${activeMatrixCol === j ? 'text-[var(--on-surface)]' : 'text-[var(--on-surface-variant)]'}`}
              >
                {label}
              </div>
            ))}
            <div className="h-10 flex items-center justify-center" />

            {/* ── 12 data rows ── */}
            {matrix.matrix.map((row, i) => {
              const isFirstRow = i === 0;
              return row.map((pc, j) => {
                const isDiagonal = pc === p0first;
                const highlighted = isFirstRow || isDiagonal;
                const isActiveRow = activeMatrixRow === i;
                const isActiveCol = activeMatrixCol === j;
                const isActive = isActiveRow || isActiveCol;

                const cellClass = (base: string) => `${base} ${
                  isActive
                    ? 'font-bold text-[var(--surface)] bg-[var(--on-surface)]'
                    : highlighted
                    ? 'font-bold text-[var(--on-surface)] bg-[var(--surface-container-high)]'
                    : 'text-[var(--on-surface-variant)] bg-[var(--surface-container-lowest)]'
                }`;

                if (j === 0) {
                  return [
                    <div
                      key={`rl-${i}`}
                      className={`h-10 flex items-center justify-center font-[family-name:var(--font-space-grotesk)] text-[11px] font-bold tracking-[0.05em] ${isActiveRow ? 'text-[var(--on-surface)]' : 'text-[var(--on-surface-variant)]'}`}
                    >
                      {matrix.rowLabels[i]}
                    </div>,
                    <div
                      key={`cell-${i}-${j}`}
                      className={cellClass('h-10 flex items-center justify-center border-b border-r border-[var(--outline-variant)] font-[family-name:var(--font-space-grotesk)] text-[13px] tracking-[0.05em]')}
                    >
                      {pc}
                    </div>,
                  ];
                }

                if (j === 11) {
                  return [
                    <div
                      key={`cell-${i}-${j}`}
                      className={cellClass('h-10 flex items-center justify-center border-b border-r border-[var(--outline-variant)] font-[family-name:var(--font-space-grotesk)] text-[13px] tracking-[0.05em]')}
                    >
                      {pc}
                    </div>,
                    <div
                      key={`rr-${i}`}
                      className={`h-10 flex items-center justify-center font-[family-name:var(--font-space-grotesk)] text-[11px] font-bold tracking-[0.05em] ${isActiveRow ? 'text-[var(--on-surface)]' : 'text-[var(--on-surface-variant)]'}`}
                    >
                      {retrogradeLabels[i]}
                    </div>,
                  ];
                }

                return (
                  <div
                    key={`cell-${i}-${j}`}
                    className={cellClass('h-10 flex items-center justify-center border-b border-r border-[var(--outline-variant)] font-[family-name:var(--font-space-grotesk)] text-[13px] tracking-[0.05em]')}
                  >
                    {pc}
                  </div>
                );
              });
            })}

            {/* ── Bottom header row: corner + RI-labels + corner ── */}
            <div className="h-10 flex items-center justify-center" />
            {riLabels.map((label, j) => (
              <div
                key={`ri-${j}`}
                className={`h-10 flex items-center justify-center font-[family-name:var(--font-space-grotesk)] text-[11px] font-bold tracking-[0.05em] ${activeMatrixCol === j ? 'text-[var(--on-surface)]' : 'text-[var(--on-surface-variant)]'}`}
              >
                {label}
              </div>
            ))}
            <div className="h-10 flex items-center justify-center" />
          </div>
        </div>

        {/* RIGHT: CONTROL PANEL */}
        <div className="flex flex-col bg-[var(--surface-container)] p-[24px] gap-[24px]">
          {/* Active Form Select */}
          <div className="flex flex-col gap-[16px]">
            <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
              Active Form Select
            </span>
            <div className="grid grid-cols-2 gap-[8px]">
              {ROW_FORMS.map((form) => {
                const isActive = activeForm === form.value;
                return (
                  <button
                    key={form.value}
                    onClick={() => setActiveForm(form.value)}
                    className={`h-[40px] flex items-center justify-center font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] rounded-[4px] border transition-colors ${
                      isActive
                        ? 'bg-[var(--on-surface)] text-[var(--surface)] border-transparent shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]'
                        : 'bg-transparent text-[var(--on-surface-variant)] border-[var(--outline-variant)] hover:border-[var(--on-surface)]'
                    }`}
                  >
                    {form.full} ({form.label})
                  </button>
                );
              })}
            </div>

            {/* Separator */}
            <div className="h-px bg-[var(--outline-variant)]" />

            {/* Transposition Index */}
            <div className="flex flex-col gap-[8px]">
              <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
                Transposition Index
              </span>
              <div className="flex items-center gap-[12px]">
                <button
                  onClick={decrementTransposition}
                  className="w-[36px] h-[36px] flex items-center justify-center border border-[var(--outline-variant)] rounded-[4px] text-[var(--on-surface)] hover:bg-[var(--surface-variant)] transition-colors font-[family-name:var(--font-space-grotesk)] text-[18px] emboss-control"
                >
                  −
                </button>
                <div className="flex-1 h-[48px] flex items-center justify-center bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-[4px]">
                  <span className="font-[family-name:var(--font-space-grotesk)] text-[28px] font-semibold tracking-tight text-[var(--on-surface)]">
                    {transposition}
                  </span>
                </div>
                <button
                  onClick={incrementTransposition}
                  className="w-[36px] h-[36px] flex items-center justify-center border border-[var(--outline-variant)] rounded-[4px] text-[var(--on-surface)] hover:bg-[var(--surface-variant)] transition-colors font-[family-name:var(--font-space-grotesk)] text-[18px] emboss-control"
                >
                  +
                </button>
              </div>
              <span className="text-center font-[family-name:var(--font-space-grotesk)] text-[13px] tracking-[0.05em] text-[var(--on-surface-variant)]">
                {activeForm}{transposition}
              </span>
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-[var(--outline-variant)]" />

          {/* Current Sequence */}
          <div className="flex flex-col gap-[12px]">
            <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
              Current Sequence
            </span>
            <div className="deboss-panel rounded-[4px] p-[12px]">
              <div className="font-[family-name:var(--font-space-grotesk)] text-[13px] tracking-[0.05em] text-[var(--on-surface)] leading-relaxed">
                [{activeRow.join(' ')}]
              </div>
            </div>
            <div className="flex items-center gap-[8px]">
              <span className="w-[6px] h-[6px] rounded-full bg-[var(--primary)]" />
              <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
                Status
              </span>
              <span className="font-[family-name:var(--font-space-grotesk)] text-[11px] tracking-[0.05em] text-[var(--on-surface-variant)] ml-auto">
                {activeForm}{transposition} — {activeRow.length} pitch classes
              </span>
            </div>
          </div>

          <div className="h-px bg-[var(--outline-variant)]" />

          <div className="flex flex-col gap-3">
            <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">
              Composition
            </span>
            <div className="flex gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setParams((p) => ({ ...p, rowWalk: 'random' }))}
                className={`flex-1 min-w-[100px] h-9 text-[10px] font-bold uppercase tracking-wider rounded border ${
                  params.rowWalk === 'random'
                    ? 'bg-[var(--on-surface)] text-[var(--surface)] border-transparent'
                    : 'border-[var(--outline-variant)] text-[var(--on-surface-variant)] hover:border-[var(--on-surface)]'
                }`}
              >
                Random walk
              </button>
              <button
                type="button"
                onClick={() => setParams((p) => ({ ...p, rowWalk: 'sequential' }))}
                className={`flex-1 min-w-[100px] h-9 text-[10px] font-bold uppercase tracking-wider rounded border ${
                  params.rowWalk === 'sequential'
                    ? 'bg-[var(--on-surface)] text-[var(--surface)] border-transparent'
                    : 'border-[var(--outline-variant)] text-[var(--on-surface-variant)] hover:border-[var(--on-surface)]'
                }`}
              >
                Sequential
              </button>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className={params.rowWalk === 'random' ? 'opacity-30 pointer-events-none' : ''} title={params.rowWalk === 'random' ? 'Statements applies in Sequential mode only' : undefined}>
                <ParamDial
                  label="Statements"
                  value={params.statements}
                  min={1}
                  max={16}
                  step={1}
                  onChange={(v) => setParams((p) => ({ ...p, statements: v }))}
                  formatValue={(v) => `${v}× row`}
                />
              </div>
              <ParamDial
                label="BPM"
                value={params.tempo}
                min={40}
                max={200}
                step={1}
                onChange={(v) => setParams((p) => ({ ...p, tempo: v }))}
              />
              <ParamDial
                label="Note"
                value={params.noteLengthBeats}
                min={0.25}
                max={4}
                step={0.25}
                onChange={(v) => setParams((p) => ({ ...p, noteLengthBeats: v }))}
                formatValue={(v) => `${v} beats`}
              />
            </div>
            <button
              type="button"
              onClick={handleCompose}
              className="w-full h-10 text-[10px] font-bold uppercase tracking-wider border border-[var(--outline)] rounded bg-[var(--surface-container-lowest)] text-[var(--on-surface)] hover:bg-[var(--surface-variant)]"
            >
              Regenerate composition
            </button>
          </div>
        </div>
      </div>

      {/* ─── PIANO ROLL ─── */}
      <div className="flex flex-col mt-10  bg-[var(--surface)] border border-[var(--outline-variant)] rounded-[2px] overflow-hidden shrink-0 mx-[32px] touch:mx-4 mb-[32px] touch:mb-4">
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

      {/* ─── TRANSPORT ─── */}
      <TransportBar>
        <button
          type="button"
          onClick={handleCompose}
          className="px-6 py-2 bg-[var(--on-surface)] text-[var(--surface)] font-[family-name:var(--font-inter)] text-[10px] font-bold uppercase tracking-[0.12em] rounded border border-[var(--on-surface)] hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm active:translate-y-[1px]"
        >
          <span className="material-symbols-outlined text-[16px]">bolt</span>
          Compose
        </button>
      </TransportBar>
    </div>
  );
}
