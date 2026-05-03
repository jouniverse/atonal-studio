import { Midi } from '@tonejs/midi';
import type { Composition } from './types';
import { midiNote } from './types';

const PPQ = 480;

export function compositionToMidiToneJs(composition: Composition): Uint8Array {
  const midi = new Midi();

  // Time signatures — clear the library default before setting ours
  const timeSigs = composition.timeSigChanges?.length
    ? composition.timeSigChanges
    : [{ beat: 0, numerator: 4, denominator: 4 }];

  midi.header.timeSignatures = [];
  for (const ts of timeSigs) {
    const ticks = Math.round(ts.beat * PPQ);
    midi.header.timeSignatures.push({
      ticks,
      timeSignature: [ts.numerator, ts.denominator],
    });
  }

  // Tempos
  const tempos = composition.tempoChanges?.length
    ? composition.tempoChanges
    : [{ beat: 0, bpm: 120 }];

  midi.header.tempos = [];
  for (const tc of tempos) {
    const ticks = Math.round(tc.beat * PPQ);
    midi.header.tempos.push({ ticks, bpm: tc.bpm });
  }

  // Notes — grouped by voice into separate tracks, using ticks directly
  const trackMap = new Map<number, ReturnType<typeof midi.addTrack>>();

  for (const note of composition.notes) {
    const ch = (note.voice ?? 0) & 0x0F;
    if (!trackMap.has(ch)) {
      trackMap.set(ch, midi.addTrack());
    }
    const track = trackMap.get(ch)!;
    const midiNum = midiNote(note.pc, note.octave);
    const vel = Math.min(1, Math.max(0.01, note.velocity));
    track.addNote({
      midi: midiNum,
      ticks: Math.round(note.startBeat * PPQ),
      durationTicks: Math.round(note.durationBeats * PPQ),
      velocity: vel,
    });
  }

  return new Uint8Array(midi.toArray());
}

export function downloadMidiToneJs(composition: Composition, filename?: string): void {
  const data = compositionToMidiToneJs(composition);
  const blob = new Blob([data.buffer.slice(0) as ArrayBuffer], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `atonal-${composition.mode}-${composition.meta.seed}.mid`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
