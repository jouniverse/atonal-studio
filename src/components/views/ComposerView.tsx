'use client';

import Link from 'next/link';
import Image from 'next/image';
import { TransportBar } from '@/components/composer/TransportBar';
import { useCompositionStore } from '@/state/useCompositionStore';

const EQUIPMENT_IMAGES = [
  { src: '/imgs/vinyl-player-1.jpeg', span: 'col-span-2 row-span-2' },
  { src: '/imgs/radio-1.jpeg', span: 'col-span-1 row-span-1' },
  { src: '/imgs/tape-recorder-1.jpeg', span: 'col-span-1 row-span-1' },
  { src: '/imgs/vinyl-player-3.jpeg', span: 'col-span-1 row-span-2' },
  { src: '/imgs/radio-3.jpeg', span: 'col-span-1 row-span-1' },
  { src: '/imgs/tape-recorder-3.jpeg', span: 'col-span-1 row-span-1' },
  { src: '/imgs/vinyl-player-5.jpeg', span: 'col-span-2 row-span-1' },
  { src: '/imgs/radio-2.jpeg', span: 'col-span-1 row-span-1' },
  { src: '/imgs/tape-recorder-2.jpeg', span: 'col-span-1 row-span-1' },
  { src: '/imgs/radio-4.jpeg', span: 'col-span-1 row-span-1' },
  { src: '/imgs/vinyl-player-7.jpeg', span: 'col-span-1 row-span-1' },
];

const MODE_CARDS = [
  {
    href: '/random',
    title: 'Random',
    description: 'Stochastic pitch-class generation with entropy, density, and register.',
    icon: 'shuffle',
  },
  {
    href: '/interval-vector',
    title: 'Interval Vector',
    description: 'Filter sets by ICV, browse Forte classes, and run the full IV engine.',
    icon: 'bar_chart',
  },
  {
    href: '/serialism',
    title: 'Serialism',
    description: 'Twelve-tone rows, matrix, transformations, and row-based composition.',
    icon: 'grid_on',
  },
] as const;

export function ComposerView() {
  const composition = useCompositionStore((s) => s.composition);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[var(--surface)]">
      <header className="h-12 border-b border-[var(--outline-variant)] bg-[var(--surface-container-low)] flex justify-between items-center px-4 md:px-6 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-[family-name:var(--font-inter)] text-lg md:text-[24px] font-semibold tracking-tight text-[var(--on-surface)] truncate">
            Atonal Studio
          </span>
          <span className="hidden sm:inline font-[family-name:var(--font-space-grotesk)] text-[10px] uppercase tracking-wider text-[var(--on-surface-variant)]">
            {composition ? `${composition.mode}` : 'no session'}
          </span>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        <div className="p-4 md:p-6 flex flex-col gap-4">
          <p className="font-[family-name:var(--font-space-grotesk)] text-[12px] text-[var(--on-surface-variant)] max-w-3xl">
            A workshop for algorithmic atonal composition.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {MODE_CARDS.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="group border border-[var(--outline-variant)] rounded bg-[var(--surface-container-low)] p-4 flex flex-col gap-2 hover:border-[var(--on-surface)] transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--on-surface)]">
                    {m.title}
                  </span>
                  <span className="material-symbols-outlined text-[20px] text-[var(--on-surface-variant)] group-hover:text-[var(--on-surface)] transition-colors">
                    {m.icon}
                  </span>
                </div>
                <p className="font-[family-name:var(--font-space-grotesk)] text-[11px] leading-snug text-[var(--on-surface-variant)]">
                  {m.description}
                </p>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-auto px-4 md:px-6 pb-4 overflow-y-auto touch:hidden">
          <div className="w-full max-w-[1400px] mx-auto">
            <div className="grid grid-cols-4 gap-3 auto-rows-[120px]">
              {EQUIPMENT_IMAGES.map((img, idx) => (
                <div
                  key={idx}
                  className={`${img.span} relative overflow-hidden rounded border border-[var(--outline-variant)] rounded-xl grayscale contrast-125 opacity-70 hover:opacity-100 hover:contrast-100 transition-all duration-300`}
                >
                  <Image
                    src={img.src}
                    alt="Studio equipment"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 28vw"
                  />
                  {/* dark shader overlay */}
                  <div className="absolute inset-0 bg-black/10 hover:bg-black/5 transition-colors duration-300 pointer-events-none" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <TransportBar />
    </div>
  );
}
