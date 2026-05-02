'use client';

import { useCallback, useMemo, useState } from 'react';
import { buildIcvScatter2d, type IcvScatterPoint } from '@/lib/icvScatter2d';
import type { DistanceMetric } from '@/kernel/similarity';
import { METRIC_LABELS } from '@/kernel/similarity';
import type { IntervalVector } from '@/kernel/icv';

const W = 520;
const H = 320;
const PAD = 28;

/** Monochrome fill keyed by cardinality — fits B/W UI; still distinguishes |A|. */
function cardinalityGray(n: number): string {
  const t = (n - 1) / 11;
  const l = 38 + t * 34;
  return `hsl(0, 0%, ${l}%)`;
}

export type IcvScatter2DProps = {
  metric: DistanceMetric;
  referenceIcv: IntervalVector | null;
  selectedForte: string | null;
  onSelectForte: (forte: string) => void;
};

export function IcvScatter2D({ metric, referenceIcv, selectedForte, onSelectForte }: IcvScatter2DProps) {
  const points = useMemo(() => buildIcvScatter2d(referenceIcv, metric), [referenceIcv, metric]);
  const [tip, setTip] = useState<string | null>(null);

  const toSvg = useCallback((p: IcvScatterPoint) => {
    const px = PAD + p.x * (W - 2 * PAD);
    const py = PAD + (1 - p.y) * (H - 2 * PAD);
    return { px, py };
  }, []);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <p className="font-[family-name:var(--font-space-grotesk)] text-[9px] text-[var(--outline)] px-0.5">
        ~351 set-classes · X = {METRIC_LABELS[metric]} distance to active ICV (scaled) · Y = Σ IC · hover for Forte + exact d
      </p>
      <div className="relative w-full rounded border border-[var(--outline-variant)] bg-black overflow-hidden blueprint-grid min-h-[320px]">
      {tip && (
        <div className="absolute bottom-2 right-2 z-20 max-w-[min(360px,92%)] px-3 py-2 rounded border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)]/95 backdrop-blur-sm shadow-lg pointer-events-none font-[family-name:var(--font-space-grotesk)] text-[10px] tracking-[0.04em] text-[var(--on-surface)] whitespace-pre-wrap">
          {tip}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[min(360px,50vh)] block" role="img" aria-label="2D set-class scatter">
        <line
          x1={PAD}
          y1={H - PAD}
          x2={W - PAD}
          y2={H - PAD}
          stroke="var(--outline-variant)"
          strokeWidth={0.5}
        />
        <line
          x1={PAD}
          y1={PAD}
          x2={PAD}
          y2={H - PAD}
          stroke="var(--outline-variant)"
          strokeWidth={0.5}
        />
        <text x={W / 2} y={H - 6} textAnchor="middle" className="fill-[var(--outline)] text-[8px] font-[family-name:var(--font-inter)]">
          → distance
        </text>
        <text
          x={8}
          y={H / 2}
          textAnchor="middle"
          transform={`rotate(-90,8,${H / 2})`}
          className="fill-[var(--outline)] text-[8px] font-[family-name:var(--font-inter)]"
        >
          ↑ magnitude
        </text>
        {points.map((p) => {
          const { px, py } = toSvg(p);
          const sel = selectedForte === p.forte;
          const r = 3 + (p.cardinality / 9) * 2.5;
          return (
            <circle
              key={p.forte}
              cx={px}
              cy={py}
              r={sel ? r + 1.5 : r}
              fill={sel ? 'var(--error)' : 'rgba(255,255,255,0.85)'}
              stroke={sel ? 'var(--error)' : 'rgba(255,255,255,0.4)'}
              strokeWidth={sel ? 1.5 : 0.4}
              className="cursor-pointer"
              onClick={() => onSelectForte(p.forte)}
              onMouseEnter={() =>
                setTip(`${p.forte}  |${p.icv.join(',')}|  d=${p.distRaw.toFixed(3)}  Σ=${p.mag}`)
              }
              onMouseLeave={() => setTip(null)}
            />
          );
        })}
      </svg>
      </div>
    </div>
  );
}
