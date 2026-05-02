'use client';

import { useRef, useCallback, useState } from 'react';
import { clamp, mapRange } from '@/lib/formatters';

interface LinearFaderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  orientation?: 'horizontal' | 'vertical';
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

export function LinearFader({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  orientation = 'horizontal',
  onChange,
  formatValue,
}: LinearFaderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const normalized = (value - min) / (max - min);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateFromEvent(e);
  }, []);

  const updateFromEvent = useCallback((e: React.PointerEvent) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    let ratio: number;
    if (orientation === 'horizontal') {
      ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    } else {
      ratio = clamp(1 - (e.clientY - rect.top) / rect.height, 0, 1);
    }
    const raw = min + ratio * (max - min);
    const stepped = Math.round(raw / step) * step;
    onChange(clamp(stepped, min, max));
  }, [min, max, step, orientation, onChange]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    updateFromEvent(e);
  }, [isDragging, updateFromEvent]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  const displayValue = formatValue ? formatValue(value) : `${value.toFixed(step < 1 ? 1 : 0)}${unit}`;

  if (orientation === 'vertical') {
    return (
      <div className="flex flex-col items-center gap-2">
        <div
          ref={trackRef}
          className="relative w-4 h-20 bg-[var(--surface-dim)] rounded-sm border border-[var(--outline-variant)]/30 shadow-inner touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div
            className="absolute bottom-0 w-full bg-[var(--outline-variant)]/50 rounded-b-sm"
            style={{ height: `${normalized * 100}%` }}
          />
          <div
            className="absolute w-8 h-4 -left-2 bg-[var(--surface)] border border-[var(--outline-variant)]/50 rounded-sm emboss-control flex items-center justify-center"
            style={{ bottom: `calc(${normalized * 100}% - 8px)` }}
          >
            <div className="w-4 h-px bg-[var(--outline)]" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-[family-name:var(--font-inter)] text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">{label}</span>
          <span className="font-[family-name:var(--font-space-grotesk)] text-[11px] text-[var(--on-surface)]">{displayValue}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="font-[family-name:var(--font-inter)] text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">{label}</span>
        <span className="font-[family-name:var(--font-space-grotesk)] text-[11px] text-[var(--on-surface)]">{displayValue}</span>
      </div>
      <div
        ref={trackRef}
        className="h-2 w-full bg-[var(--surface-dim)] rounded-full shadow-inner relative border border-[var(--outline-variant)]/30 touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="absolute h-full bg-[var(--tertiary)] rounded-l-full"
          style={{ width: `${normalized * 100}%` }}
        />
        <div
          className="absolute w-4 h-6 -top-2 bg-[var(--surface-container-lowest)] border border-[var(--outline)] rounded-[2px] shadow-sm flex items-center justify-center"
          style={{ left: `calc(${normalized * 100}% - 8px)` }}
        >
          <div className="w-px h-3 bg-[var(--outline-variant)] rounded-full" />
        </div>
      </div>
    </div>
  );
}
