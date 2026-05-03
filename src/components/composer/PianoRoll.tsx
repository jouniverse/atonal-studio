'use client';

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { Composition, Note } from '@/engines/common/types';
import { midiNote } from '@/engines/common/types';
import { useTransportStore } from '@/state/useTransportStore';
import { previewMidiNote } from '@/engines/common/scheduler';
import { pcToNoteName } from '@/kernel/pcMath';
import type { PitchClass } from '@/kernel/pcMath';

interface PianoRollProps {
  composition: Composition | null;
  mode?: 'pc' | 'midi';
  registerLow?: number;
  registerHigh?: number;
  /** Scroll viewport height; rows scroll inside (min ~1 octave visible at typical row height). */
  maxHeight?: string;
}

const ROW_HEIGHT = 20;
const BEAT_WIDTH = 40;
const TIMELINE_HEIGHT = 32;

const NOTE_INNER_HEIGHT = ROW_HEIGHT - 2;

const NOTE_BOX_BASE: CSSProperties = {
  boxSizing: 'border-box',
  height: NOTE_INNER_HEIGHT,
};

const HIGHLIGHTED_PCS = new Set([0, 4, 8]);

export function PianoRoll({
  composition,
  mode = 'midi',
  registerLow = 2,
  registerHigh = 6,
  maxHeight = 'min(340px, 38vh)',
}: PianoRollProps) {
  const playheadBeat = useTransportStore((s) => s.playheadBeat);

  const isPcMode = mode === 'pc';
  const totalRows = isPcMode ? 12 : (registerHigh - registerLow + 1) * 12;
  const lowestMidi = isPcMode ? 0 : (registerLow + 1) * 12;
  const highestMidi = isPcMode ? 11 : lowestMidi + totalRows - 1;

  const totalBeats = composition?.totalBeats ?? 32;
  const totalWidth = totalBeats * BEAT_WIDTH;

  const rows = useMemo(() => {
    const result: { index: number; label: string; y: number; highlighted: boolean }[] = [];
    if (isPcMode) {
      for (let pc = 11; pc >= 0; pc--) {
        result.push({
          index: pc,
          label: String(pc).padStart(2, '0'),
          y: (11 - pc) * ROW_HEIGHT,
          highlighted: HIGHLIGHTED_PCS.has(pc),
        });
      }
    } else {
      for (let midi = highestMidi; midi >= lowestMidi; midi--) {
        const pc = midi % 12;
        const octave = Math.floor(midi / 12) - 1;
        result.push({
          index: midi,
          label: `${pcToNoteName(pc as PitchClass)}${octave}`,
          y: (highestMidi - midi) * ROW_HEIGHT,
          highlighted: pc === 0,
        });
      }
    }
    return result;
  }, [isPcMode, highestMidi, lowestMidi]);

  const beatMarkers = useMemo(() => {
    const timeSigs = composition?.timeSigChanges?.length
      ? [...composition.timeSigChanges].sort((a, b) => a.beat - b.beat)
      : [{ beat: 0, numerator: 4, denominator: 4 }];

    return Array.from({ length: Math.ceil(totalBeats) }, (_, i) => {
      // Find the active time signature at beat i
      let activeSig = timeSigs[0];
      for (const sig of timeSigs) {
        if (sig.beat <= i) activeSig = sig;
      }
      // beatsPerBar in quarter-note units: e.g. 5/4 → 5, 6/8 → 3, 4/4 → 4
      const beatsPerBar = activeSig.numerator * (4 / activeSig.denominator);
      const isBarLine = i > 0 && Math.abs(i % beatsPerBar) < 0.01;
      return { beat: i + 1, x: i * BEAT_WIDTH, isBarLine };
    });
  }, [totalBeats, composition?.timeSigChanges]);

  const gridBodyHeight = rows.length * ROW_HEIGHT;
  const contentMinHeight = TIMELINE_HEIGHT + gridBodyHeight;

  const playheadX = playheadBeat * BEAT_WIDTH;

  if (!composition) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded text-[var(--on-surface-variant)] font-[family-name:var(--font-space-grotesk)] text-[11px] uppercase tracking-wider"
        style={{ maxHeight }}
      >
        No composition generated
      </div>
    );
  }

  const handleNoteClick = (note: Note) => {
    const m = midiNote(note.pc, note.octave);
    void previewMidiNote(m, 0.75 + note.velocity * 0.2);
  };

  return (
    <div
      className="flex flex-col rounded border border-[var(--outline-variant)] bg-[var(--surface-bright)] overflow-hidden shrink-0 min-h-0"
      style={{ maxHeight }}
    >
      <div className="flex-1 min-h-[160px] flex overflow-auto relative"
      >
      {/* Y-Axis Labels */}
      <div className="w-12 border-r border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] sticky left-0 z-10 flex flex-col shrink-0"
        style={{ paddingTop: TIMELINE_HEIGHT }}
      >
        {rows.map((row) => (
          <div
            key={row.index}
            className={`border-b border-[var(--outline-variant)] flex items-center justify-center font-[family-name:var(--font-space-grotesk)] text-[9px] tracking-wider text-[var(--on-surface-variant)] shrink-0 ${
              row.highlighted ? 'bg-[var(--surface-variant)]/30' : ''
            }`}
            style={{ height: ROW_HEIGHT }}
          >
            {row.label}
          </div>
        ))}
      </div>

      {/* Grid + Notes Canvas */}
      <div className="flex-1 relative" style={{ minWidth: totalWidth, minHeight: contentMinHeight }}>
        {/* Timeline Header */}
        <div className="h-8 border-b border-[var(--outline-variant)] sticky top-0 bg-[var(--surface-container-lowest)]/90 backdrop-blur-sm z-10 flex font-[family-name:var(--font-space-grotesk)] text-[10px] text-[var(--on-surface-variant)]">
          {beatMarkers.map((marker) => (
            <div
              key={marker.beat}
              className={`flex items-end p-1 border-r ${
                marker.isBarLine
                  ? 'border-[var(--outline-variant)] font-bold text-[var(--on-surface)]'
                  : 'border-[var(--outline-variant)]/30'
              }`}
              style={{ width: BEAT_WIDTH }}
            >
              {marker.beat}
            </div>
          ))}
        </div>

        {/* Grid Lines */}
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{ top: TIMELINE_HEIGHT, height: gridBodyHeight }}
        >
          {/* Horizontal row lines */}
          {rows.map((row) => (
            <div
              key={`hline-${row.index}`}
              className={`absolute left-0 right-0 border-b border-[var(--outline-variant)]/30 ${
                row.highlighted ? 'bg-[var(--surface-variant)]/30' : ''
              }`}
              style={{ top: row.y, height: ROW_HEIGHT }}
            />
          ))}

          {/* Vertical beat lines */}
          {beatMarkers.map((marker) => (
            <div
              key={`vline-${marker.beat}`}
              className={`absolute top-0 border-l ${
                marker.isBarLine
                  ? 'border-[var(--outline-variant)]/60'
                  : 'border-[var(--outline-variant)]/20'
              }`}
              style={{ left: marker.x > 0 ? marker.x - 1 : 0, height: gridBodyHeight }}
            />
          ))}
        </div>

        {/* Notes */}
        <div className="absolute inset-0" style={{ top: TIMELINE_HEIGHT }}>
          {composition.notes.map((note, idx) => {
            let y: number;
            if (isPcMode) {
              y = (11 - note.pc) * ROW_HEIGHT;
            } else {
              const midi = midiNote(note.pc, note.octave);
              if (midi < lowestMidi || midi > highestMidi) return null;
              y = (highestMidi - midi) * ROW_HEIGHT;
            }

            const x = note.startBeat * BEAT_WIDTH;
            const width = Math.max(4, note.durationBeats * BEAT_WIDTH - 1);

            return (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                onClick={() => handleNoteClick(note)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleNoteClick(note);
                  }
                }}
                className="absolute bg-[var(--on-surface)] border border-[var(--surface-bright)] flex items-center px-2 cursor-pointer hover:bg-[var(--on-surface-variant)] transition-colors group"
                style={{
                  ...NOTE_BOX_BASE,
                  top: y + 1,
                  left: x,
                  width,
                  opacity: 0.6 + note.velocity * 0.4,
                }}
              >
                <span className="font-[family-name:var(--font-space-grotesk)] text-[9px] font-bold bg-white text-black px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  {pcToNoteName(note.pc as PitchClass)}{note.octave}
                </span>
              </div>
            );
          })}

          {/* Playhead */}
          {playheadBeat > 0 && (
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-[var(--error)] z-20 pointer-events-none"
              style={{
                left: playheadX,
                boxShadow: '0 0 8px 2px rgba(255,180,171,0.3)',
              }}
            >
              <div className="absolute -top-1 -left-[4px] w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-transparent border-t-[var(--error)]" />
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
