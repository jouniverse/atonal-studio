'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/state/useUIStore';

// ─── Data ─────────────────────────────────────────────────────────────────────

const DISTANCE_MEASURES = [
  {
    id: 'manhattan',
    name: 'Manhattan',
    aka: 'L¹ / Taxicab / Morris SIM (1979–80)',
    formula: 'd(X, Y) = Σᵢ |Xᵢ − Yᵢ|',
    description:
      'Sums the absolute differences of corresponding interval-class entries. Intuitive and scale-invariant across dimensions. A distance of 0 means identical vectors. Also known as Morris\'s SIM measure (1979–80), which was proposed independently in the context of atonal music analysis — the formula is identical.',
  },
  {
    id: 'euclidean',
    name: 'Euclidean',
    aka: 'L²',
    formula: 'd(v, w) = √( Σᵢ (vᵢ − wᵢ)² )',
    description:
      'Standard geometric distance in 6-dimensional interval-class space. Penalises large single-dimension deviations more than Manhattan does. Used as the basis for PCA in the 3D visualisation.',
  },
  {
    id: 'icvsim',
    name: 'ICVSIM',
    aka: 'Isaacson 1990',
    formula: 'ICVSIM(X, Y) = √( Σᵢ (dᵢ − d̄)² / 6 )  where dᵢ = |Xᵢ − Yᵢ|, d̄ = Σdᵢ / 6',
    description:
      'Eric Isaacson\'s IcVSIM measure (1990). Computes the standard deviation of the element-wise absolute-difference vector between two ICVs. Measures how evenly the difference in interval content is distributed across the six interval classes. Cardinality-neutral: applicable to sets of different sizes. Lower values mean more similar; 0 = identical vectors.',
  },
  {
    id: 'cosine',
    name: 'Cosine',
    aka: 'Angular distance',
    formula: 'd(v, w) = 1 − (v · w) / (|v| · |w|)',
    description:
      'Treats each interval vector as a direction in 6D space and measures the angle between them, ignoring magnitude. Useful when relative proportions of interval classes matter more than absolute counts.',
  },
  {
    id: 'minkowski',
    name: 'Minkowski (p=3)',
    aka: 'L³',
    formula: 'd(v, w) = ( Σᵢ |vᵢ − wᵢ|³ )^(1/3)',
    description:
      'A generalisation of L¹ and L² with p=3. Penalises large single-dimension differences more strongly than Euclidean, but less than Chebyshev (L∞). Emphasises the worst-matching interval classes.',
  },
  {
    id: 'asim',
    name: 'ASIM',
    aka: 'Morris 1979–80',
    formula: 'ASIM(X, Y) = SIM(X, Y) / (card(X) + card(Y))  where card(X) = Σᵢ Xᵢ',
    description:
      'Morris\'s anti-similarity measure. Normalises SIM (= Manhattan) by the sum of the two vectors\' cardinalities (total interval counts), yielding a value between 0 and 1. Allows comparison across sets of different cardinalities; 0 means identical, 1 means maximally dissimilar.',
  },
  {
    id: 'atmeb',
    name: 'ATMEB',
    aka: 'Rahn / Isaacson',
    formula: 'ATMEB(X, Y) = Σᵢ min(Xᵢ, Yᵢ) / Σᵢ Xᵢ',
    description:
      'John Rahn\'s asymmetric measure of tonal-harmonic embeddability (described by Isaacson). The numerator sums the shared interval content per position; the denominator is the total interval content of the subject set X. Range: 0 (no overlap) to 1 (all of X\'s interval content is contained in Y). Asymmetric: ATMEB(X,Y) ≠ ATMEB(Y,X). Designed as a \'theory of harmony\' — measures how well one set\'s harmonic character fits within another. Displayed as a distance: 1 − ATMEB, so lower = more similar.',
  },
];

const BOOKS = [
  {
    author: 'Allen Forte',
    title: 'The Structure of Atonal Music',
    pub: 'Yale University Press, 1973',
    url: 'https://archive.org/details/structureofatona0000fort',
  },
  {
    author: 'John Rahn',
    title: 'Basic Atonal Theory',
    pub: 'Schirmer Books, 1980',
    url: 'https://archive.org/details/basicatonaltheor0000rahn',
  },
  {
    author: 'Michiel Schuijer',
    title: 'Analyzing Atonal Music: Pitch-Class Set Theory and Its Contexts',
    pub: 'University of Rochester Press, 2008',
    url: 'https://www.conservatoriumvanamsterdam.nl/media/cva/docs/onderzoek/Schuijer_2008__Analyzing_Atonal_Music_.pdf',
  },
  {
    author: 'Joseph N. Straus',
    title: 'Introduction to Post-tonal Theory',
    pub: 'Prentice Hall, 1990',
    url: 'https://archive.org/details/introductiontopo0000stra/mode/2up',
  },
  {
    author: 'George Perle',
    title: 'Serial Composition and Atonality',
    pub: 'University of California Press, 6th ed., 1991',
    url: 'https://archive.org/details/serialcompositio0006edperl/mode/2up',
  },
  {
    author: 'Robert D. Morris',
    title: 'Composition with Pitch Classes: A Theory of Compositional Design',
    pub: 'Yale University Press, 1987',
    url: 'https://www.amazon.co.uk/Composition-Pitch-Classes-Theory-Compositional/dp/0300036841',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function DocsOverlay() {
  const docsOpen = useUIStore((s) => s.docsOpen);
  const setDocsOpen = useUIStore((s) => s.setDocsOpen);

  // Close on Escape
  useEffect(() => {
    if (!docsOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDocsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [docsOpen, setDocsOpen]);

  if (!docsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-stretch justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Documentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setDocsOpen(false)}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-2xl h-full bg-[var(--surface-container-high)] border-l border-[var(--outline-variant)] flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--outline-variant)] shrink-0">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px] text-[var(--on-surface-variant)]">menu_book</span>
            <h1 className="font-[family-name:var(--font-inter)] text-[13px] font-bold uppercase tracking-[0.12em] text-[var(--on-surface)]">
              Documentation
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setDocsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded border border-[var(--outline-variant)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-variant)] hover:text-[var(--on-surface)] transition-colors"
            aria-label="Close documentation"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-10">

          {/* ── Section 1: Introduction ── */}
          <section>
            <SectionHeading>Introduction to Atonal Music &amp; Set Theory</SectionHeading>
            <Prose>
              Atonal music abandons a tonal centre, treating all twelve pitch classes as equally available. 
              <strong> Pitch-class set theory</strong>, developed primarily by Allen Forte in the 1970s, 
              provides a rigorous mathematical language for analysing and composing such music.
            </Prose>

            <SubHeading>Core Concepts</SubHeading>
            <dl className="grid gap-3 mt-3">
              <DefItem term="Pitch class (PC)">
                An integer 0–11 representing a note regardless of octave. C=0, C♯/D♭=1, … B=11.
              </DefItem>
              <DefItem term="Pitch-class set">
                An unordered collection of pitch classes, e.g. {'{'}0, 4, 7{'}'} (major triad).
              </DefItem>
              <DefItem term="Normal form">
                The most compact left-packed ordering of a PC set, used for canonical comparison.
              </DefItem>
              <DefItem term="Prime form">
                The most compact normal form among all transpositions and inversions of a set. Forte labels (e.g. 3-11) index all prime forms.
              </DefItem>
              <DefItem term="Interval-class vector (ICV)">
                A six-entry tally {'<'}ic1, ic2, ic3, ic4, ic5, ic6{'>'} counting how many pairs in the set 
                produce each interval class (1 = semitone, 6 = tritone). Two different sets may share an ICV 
                (Z-relation).
              </DefItem>
              <DefItem term="Z-relation">
                Two sets with identical ICVs but different prime forms are Z-related (e.g. 4-Z15 and 4-Z29). 
                They sound similar yet are structurally distinct.
              </DefItem>
              <DefItem term="Transformations">
                <span className="font-mono text-[10px]">Tₙ</span> (transposition by n semitones), 
                <span className="font-mono text-[10px]"> Iₙ</span> (inversion), 
                <span className="font-mono text-[10px]"> R</span> (retrograde), 
                <span className="font-mono text-[10px]"> RIₙ</span> (retrograde-inversion). 
                Transposition and inversion preserve the ICV.
              </DefItem>
            </dl>
          </section>

          {/* ── Section 2: Distance Measures ── */}
          <section>
            <SectionHeading>Distance Measures</SectionHeading>
            <Prose>
              The app computes seven different distance (or dissimilarity) measures between interval-class vectors. 
              Lower values mean more similar sets; the exact scale differs per measure.
            </Prose>

            <div className="mt-4 flex flex-col gap-4">
              {DISTANCE_MEASURES.map((m) => (
                <div
                  key={m.id}
                  className="border border-[var(--outline-variant)] rounded bg-[var(--surface-container)] p-4 flex flex-col gap-2"
                >
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface)]">
                      {m.name}
                    </span>
                    <span className="font-[family-name:var(--font-space-grotesk)] text-[9px] uppercase tracking-wider text-[var(--outline)] border border-[var(--outline-variant)] px-1.5 py-0.5 rounded-[2px]">
                      {m.aka}
                    </span>
                  </div>
                  <code className="font-mono text-[10px] text-[var(--on-surface-variant)] bg-[var(--surface-container-lowest)] px-2 py-1.5 rounded block break-all">
                    {m.formula}
                  </code>
                  <p className="font-[family-name:var(--font-space-grotesk)] text-[11px] leading-relaxed text-[var(--on-surface-variant)]">
                    {m.description}
                  </p>
                </div>
              ))}
            </div>

            <SubHeading>Forte&apos;s Similarity Relations (Rn)</SubHeading>
            <Prose>
              Allen Forte defined ordinal <em>similarity relations</em> (R0, R1, R2) that classify pairs of pitch-class sets by comparing the six entries of their interval-class vectors position by position. Unlike the continuous distance measures above, Rn is a <strong>classification criterion</strong>, not a numeric score. It is strictly applicable only to sets of <strong>the same cardinality</strong> — cross-cardinality comparisons are not meaningful in Forte&apos;s system and are not shown. Forte&apos;s system intentionally covers only the two extremes (maximal and minimal similarity); pairs with 1–3 matching positions fall in between and receive no Rn label.
            </Prose>
            <dl className="grid gap-3 mt-3">
              <DefItem term="R1 — First-order maximal similarity">
                Exactly four of the six ICV positions are identical, <em>and</em> the two non-matching positions form an interchange: if set A has value x at IC<sub>j</sub> and y at IC<sub>k</sub>, set B has y at IC<sub>j</sub> and x at IC<sub>k</sub> (the values are swapped). Example: A = ⟨1,2,1,2,1,2⟩ vs. B = ⟨2,2,1,2,1,1⟩ — positions 1 and 6 are swapped.
              </DefItem>
              <DefItem term="R2 — Second-order maximal similarity">
                Exactly four of the six ICV positions are identical, but the two non-matching positions are <em>not</em> an interchange. Example: A = ⟨1,2,1,2,1,2⟩ vs. B = ⟨0,2,1,2,1,3⟩ — positions 1 and 6 differ but are not a simple swap.
              </DefItem>
              <DefItem term="R0 — Minimal similarity">
                No ICV positions are identical — the two sets share no interval-class value in any position.
              </DefItem>
              <DefItem term="No label shown">
                Rn is omitted when sets have different cardinalities, or when the number of matching positions is 1, 2, or 3 (not covered by Forte&apos;s system), or when vectors are identical (trivial case).
              </DefItem>
            </dl>
          </section>

          {/* ── Section 3: Composition Techniques ── */}
          <section>
            <SectionHeading>Composition Techniques</SectionHeading>

            <div className="flex flex-col gap-4 mt-3">
              <TechCard icon="shuffle" title="Random Generation">
                Generates pitch-class sequences stochastically. Parameters control density, 
                register (octave range), rhythm entropy, and polyphony. The engine selects pitch classes 
                uniformly or weighted by a distance measure from a target ICV, then assigns octaves, 
                durations, and velocities according to the selected parameters. Good for exploring 
                unexpectedly varied textures.
              </TechCard>

              <TechCard icon="bar_chart" title="Interval Vector Engine">
                Selects a Forte set class (or filters by ICV similarity), then composes music 
                whose pitch-class content is dominated by that set's interval content. The pipeline 
                controls bars, common-tone retention between adjacent chords, and tempo. The 2D/3D 
                visualisations show the selected set's position in the space of all 352 prime forms 
                under the chosen distance metric.
              </TechCard>

              <TechCard icon="grid_on" title="Twelve-Tone Serialism">
                Constructs a tone row (an ordered sequence of all 12 pitch classes) and derives a 
                12×12 matrix of all 48 classical transformations: Prime (P), Inversion (I), 
                Retrograde (R), and Retrograde-Inversion (RI) forms, each transposed to all 12 levels. 
                Compositions are built by chaining row forms according to selected parameters.
              </TechCard>
            </div>
          </section>

          {/* ── Section 4: Literature ── */}
          <section>
            <SectionHeading>Literature &amp; Resources</SectionHeading>
            <Prose>
              A compact reading list for further study of atonal music, pitch-class set theory, and serial composition.
            </Prose>

            <div className="flex flex-col gap-2 mt-4">
              {BOOKS.map((book, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 border border-[var(--outline-variant)] rounded bg-[var(--surface-container)] px-4 py-3"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <a
                      href={book.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-[family-name:var(--font-inter)] text-[11px] font-semibold text-[var(--on-surface)] hover:underline underline-offset-2 leading-snug"
                    >
                      {book.title}
                    </a>
                    <span className="font-[family-name:var(--font-space-grotesk)] text-[10px] text-[var(--on-surface-variant)]">
                      {book.author} · {book.pub}
                    </span>
                  </div>
                  <a
                    href={book.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${book.title}`}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded border border-[var(--outline-variant)] text-[var(--outline)] hover:border-[var(--on-surface)] hover:text-[var(--on-surface)] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </a>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-[var(--outline-variant)] px-6 py-3 flex items-center justify-between">
          <span className="font-[family-name:var(--font-space-grotesk)] text-[9px] uppercase tracking-wider text-[var(--outline)]">
            Atonal Studio · Theory Reference
          </span>
          <button
            type="button"
            onClick={() => setDocsOpen(false)}
            className="px-3 py-1.5 border border-[var(--outline-variant)] text-[var(--on-surface)] text-[9px] font-bold uppercase tracking-wider rounded hover:bg-[var(--surface-variant)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--on-surface)] mb-3 pb-2 border-b border-[var(--outline-variant)]">
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-[family-name:var(--font-inter)] text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)] mt-4 mb-1">
      {children}
    </h3>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-[family-name:var(--font-space-grotesk)] text-[11px] leading-relaxed text-[var(--on-surface-variant)]">
      {children}
    </p>
  );
}

function DefItem({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <dt className="font-[family-name:var(--font-inter)] text-[10px] font-bold text-[var(--on-surface)] shrink-0 w-40 pt-px">
        {term}
      </dt>
      <dd className="font-[family-name:var(--font-space-grotesk)] text-[11px] leading-relaxed text-[var(--on-surface-variant)]">
        {children}
      </dd>
    </div>
  );
}

function TechCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[var(--outline-variant)] rounded bg-[var(--surface-container)] p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px] text-[var(--on-surface-variant)]">{icon}</span>
        <span className="font-[family-name:var(--font-inter)] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface)]">
          {title}
        </span>
      </div>
      <p className="font-[family-name:var(--font-space-grotesk)] text-[11px] leading-relaxed text-[var(--on-surface-variant)]">
        {children}
      </p>
    </div>
  );
}
