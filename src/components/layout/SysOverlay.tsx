'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/state/useUIStore';

const ENGINES = [
  {
    id: 'random',
    name: 'Random Mode',
    icon: 'shuffle',
    description:
      'Stochastic pitch-class composition engine. Generates notes by randomly selecting pitch classes from a target PC set within a chosen register, then quantises rhythms to a configurable metric grid. Seed-reproducible — same seed always produces the same output.',
    params: ['Seed', 'Bars', 'BPM', 'Register (low / high)', 'Voices', 'Density', 'Metric grid'],
  },
  {
    id: 'interval-vector',
    name: 'Interval Vector Mode',
    icon: 'analytics',
    description:
      'IC-targeting composition engine. Measures distance from a reference interval-class vector (ICV) across the full Forte catalogue (~352 set-classes) and generates music from the closest matching sets. Supports seven distance metrics. Sequence Builder lets you chain multiple set-classes with independent bar counts.',
    params: ['Seed', 'Bars', 'BPM', 'Register', 'Voices', 'Density', 'Metric grid', 'Texture', 'Common tones', 'Use complement', 'Distance metric', 'Sequence Bars'],
  },
  {
    id: 'serialism',
    name: 'Serialism / Matrix Mode',
    icon: 'grid_on',
    description:
      'Twelve-tone composition engine based on a user-defined tone row. Derives the full 12×12 pitch-class matrix and composes from selected row forms (P, I, R, RI) and transpositions. Two walk modes: Random (picks forms stochastically per phrase) and Sequential (repeats a single chosen form N times end-to-end).',
    params: ['Seed', 'Bars', 'BPM', 'Register', 'Density', 'Rhythm variation', 'Row walk', 'Statements (sequential only)', 'Note length', 'Active form + transposition'],
  },
];

export function SysOverlay() {
  const sysOpen = useUIStore((s) => s.sysOpen);
  const setSysOpen = useUIStore((s) => s.setSysOpen);

  useEffect(() => {
    if (!sysOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSysOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sysOpen, setSysOpen]);

  if (!sysOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-stretch justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="System information"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setSysOpen(false)}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-2xl h-full bg-[var(--surface-container-high)] border-l border-[var(--outline-variant)] flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--outline-variant)] shrink-0">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px] text-[var(--on-surface-variant)]">memory</span>
            <h1 className="font-[family-name:var(--font-inter)] text-[13px] font-bold uppercase tracking-[0.12em] text-[var(--on-surface)]">
              System
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setSysOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded border border-[var(--outline-variant)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-variant)] hover:text-[var(--on-surface)] transition-colors"
            aria-label="Close system panel"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-10">

          {/* ── Version block ── */}
          <section className="flex flex-col gap-3">
            <h2 className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--on-surface-variant)] border-b border-[var(--outline-variant)] pb-2">
              Version
            </h2>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline gap-2">
                <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface)]">ATONAL_STUDIO</span>
                <span className="font-[family-name:var(--font-space-grotesk)] text-[20px] font-bold text-[var(--on-surface)]">2.0</span>
              </div>
              <p className="font-[family-name:var(--font-space-grotesk)] text-[11px] text-[var(--outline)] leading-relaxed">
                Last updated: May 2026 · Major version increment reflects full application recovery and architectural rebuild after data loss.
              </p>
            </div>
          </section>

          {/* ── Engines ── */}
          <section className="flex flex-col gap-4">
            <h2 className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--on-surface-variant)] border-b border-[var(--outline-variant)] pb-2">
              Composition Engines
            </h2>
            {ENGINES.map((eng) => (
              <div
                key={eng.id}
                className="border border-[var(--outline-variant)] rounded bg-[var(--surface-container)] p-4 flex flex-col gap-3"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[var(--on-surface-variant)]">{eng.icon}</span>
                  <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface)]">
                    {eng.name}
                  </span>
                </div>
                <p className="font-[family-name:var(--font-space-grotesk)] text-[11px] text-[var(--on-surface-variant)] leading-relaxed">
                  {eng.description}
                </p>
                <div>
                  <span className="font-[family-name:var(--font-inter)] text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--outline)]">
                    Parameters:
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {eng.params.map((p) => (
                      <span
                        key={p}
                        className="px-2 py-0.5 rounded border border-[var(--outline-variant)] font-[family-name:var(--font-space-grotesk)] text-[9px] text-[var(--on-surface-variant)]"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* ── Stack ── */}
          <section className="flex flex-col gap-3">
            <h2 className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--on-surface-variant)] border-b border-[var(--outline-variant)] pb-2">
              Technology Stack
            </h2>
            <dl className="grid gap-2">
              {[
                ['Framework', 'Next.js 14 (App Router)'],
                ['UI', 'React 18 + TypeScript + Tailwind CSS'],
                ['Audio', 'Tone.js (Web Audio scheduler)'],
                ['State', 'Zustand'],
                ['3D viz', 'Three.js via @react-three/fiber + @react-three/drei'],
                ['Theory', 'Forte catalogue, Morris SIM, Isaacson ICVSIM, Rahn ATMEB'],
              ].map(([term, def]) => (
                <div key={term} className="flex gap-3 items-baseline">
                  <span className="font-[family-name:var(--font-inter)] text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--outline)] w-24 shrink-0">
                    {term}
                  </span>
                  <span className="font-[family-name:var(--font-space-grotesk)] text-[11px] text-[var(--on-surface-variant)]">
                    {def}
                  </span>
                </div>
              ))}
            </dl>
          </section>

        </div>
      </div>
    </div>
  );
}
