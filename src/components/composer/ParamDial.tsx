'use client';

import { useRef, useCallback, useState } from 'react';
import { clamp, mapRange } from '@/lib/formatters';

interface ParamDialProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

/** ~270° arc at r=44 in 100×100 viewBox (−135°…+135°). */
const ARC_LEN = 207;
const ARC_GAP = 69;

export function ParamDial({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  formatValue,
}: ParamDialProps) {
  const dragStartY = useRef<number>(0);
  const dragStartValue = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);

  const normalizedValue = (value - min) / (max - min);
  const rotation = mapRange(normalizedValue, 0, 1, -135, 135);
  const filled = Math.max(0, Math.min(1, normalizedValue)) * ARC_LEN;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragStartY.current = e.clientY;
      dragStartValue.current = value;
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [value],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const deltaY = dragStartY.current - e.clientY;
      const sensitivity = (max - min) / 200;
      const newValue = clamp(dragStartValue.current + deltaY * sensitivity, min, max);
      const stepped = Math.round(newValue / step) * step;
      onChange(clamp(stepped, min, max));
    },
    [isDragging, min, max, step, onChange],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  const displayValue = formatValue ? formatValue(value) : `${value.toFixed(step < 1 ? 1 : 0)}${unit}`;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* True circle: aspect-square + rounded-full (tailwind full = 9999px); overflow clips SVG to disc */}
      <div
        className={`relative aspect-square w-16 min-h-16 min-w-16 shrink-0 overflow-hidden rounded-full select-none touch-none transition-[box-shadow] duration-150
          bg-[var(--surface-container-high)]
          shadow-[inset_0_3px_8px_rgba(0,0,0,0.14),inset_0_-2px_3px_rgba(255,255,255,0.85),inset_0_1px_0_rgba(255,255,255,0.65)]
          dark:bg-[#181818]
          dark:shadow-[inset_0_4px_8px_rgba(0,0,0,0.75),inset_0_-2px_3px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.04)]
          ${isDragging ? 'ring-1 ring-[var(--outline)]/40 dark:ring-white/15' : ''}
        `}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <svg
          className="pointer-events-none absolute inset-[3px] aspect-square h-[calc(100%-6px)] w-[calc(100%-6px)] max-h-none max-w-none -rotate-90"
          viewBox="0 0 100 100"
          aria-hidden
        >
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="var(--outline-variant)"
            strokeWidth="2"
            className="[stroke-opacity:0.88] dark:[stroke-opacity:0.55]"
            strokeDasharray={`${ARC_LEN} ${ARC_GAP}`}
            strokeLinecap="round"
          />
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="var(--on-surface)"
            strokeWidth="2"
            className="[stroke-opacity:0.32] dark:[stroke-opacity:0.22]"
            strokeDasharray={`${filled} ${ARC_LEN + ARC_GAP - filled}`}
            strokeLinecap="round"
          />
        </svg>

        <div
          className="absolute left-1/2 top-1/2 z-[1] aspect-square h-11 w-11 min-h-11 min-w-11 overflow-hidden rounded-full border border-[var(--outline-variant)] shadow-[0_3px_5px_rgba(0,0,0,0.12),0_1px_0_rgba(255,255,255,0.85),inset_0_1px_0_rgba(255,255,255,0.65),inset_0_-2px_4px_rgba(0,0,0,0.06)]
            dark:border-black/40 dark:shadow-[0_3px_6px_rgba(0,0,0,0.55),0_1px_0_rgba(255,255,255,0.1),inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-2px_4px_rgba(0,0,0,0.35)]"
          style={{
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
          }}
        >
          <div
            className="absolute inset-0 dark:hidden"
            style={{
              background:
                'radial-gradient(circle at 32% 28%, #fafaf8 0%, var(--surface-container-low) 35%, var(--surface-container-high) 70%, #dcdad6 100%)',
            }}
          />
          <div
            className="absolute inset-0 hidden dark:block"
            style={{
              background:
                'radial-gradient(circle at 32% 28%, #383838 0%, #2e2e2e 22%, #2a2a2a 45%, #222222 72%, #1c1c1c 100%)',
            }}
          />

          <span
            className="pointer-events-none absolute left-1/2 top-1/2 block h-[7px] w-[15px] rounded-full bg-[var(--on-surface)] shadow-[0_1px_2px_rgba(0,0,0,0.2)] dark:bg-white dark:shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
            style={{ transform: 'translate(-50%, -50%) translateY(-15px)' }}
            aria-hidden
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-0.5">
        <span className="font-[family-name:var(--font-inter)] text-[10px] font-bold uppercase tracking-wider text-[var(--on-surface-variant)]">
          {label}
        </span>
        <div className="min-w-[44px] rounded-[1px] border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] px-2 py-[1px] text-center font-[family-name:var(--font-space-grotesk)] text-[11px] tabular-nums text-[var(--on-surface)]">
          {displayValue}
        </div>
      </div>
    </div>
  );
}
