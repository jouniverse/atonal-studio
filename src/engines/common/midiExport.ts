import type { Composition } from './types';
import { midiNote } from './types';

// MIDI pulses per quarter note
const PPQ = 480;

function writeVarLen(v: number): number[] {
  const bytes: number[] = [];
  bytes.push(v & 0x7F);
  v >>>= 7;
  while (v > 0) {
    bytes.unshift((v & 0x7F) | 0x80);
    v >>>= 7;
  }
  return bytes;
}

function u32be(v: number): number[] {
  return [(v >>> 24) & 0xFF, (v >>> 16) & 0xFF, (v >>> 8) & 0xFF, v & 0xFF];
}

function u16be(v: number): number[] {
  return [(v >>> 8) & 0xFF, v & 0xFF];
}

export function compositionToMidi(composition: Composition): Uint8Array {
  type Ev = { tick: number; isMeta: boolean; data: number[] };
  const events: Ev[] = [];

  // Time signature meta events (FF 58 04 nn dd cc bb)
  const timeSigs = composition.timeSigChanges?.length
    ? composition.timeSigChanges
    : [{ beat: 0, numerator: 4, denominator: 4 }];
  for (const ts of timeSigs) {
    const tick = Math.round(ts.beat * PPQ);
    const nn = ts.numerator;
    const dd = Math.round(Math.log2(ts.denominator)); // 4→2, 8→3, 16→4
    events.push({ tick, isMeta: true, data: [0xFF, 0x58, 0x04, nn, dd, 24, 8] });
  }

  // Tempo meta events (FF 51 03 tt tt tt)
  const tempos = composition.tempoChanges?.length
    ? composition.tempoChanges
    : [{ beat: 0, bpm: 120 }];
  for (const tc of tempos) {
    const tick = Math.round(tc.beat * PPQ);
    const uspqn = Math.round(60_000_000 / tc.bpm);
    events.push({ tick, isMeta: true, data: [0xFF, 0x51, 0x03, (uspqn >>> 16) & 0xFF, (uspqn >>> 8) & 0xFF, uspqn & 0xFF] });
  }

  // Note on / note off events (velocity is 0-1 float → 0-127)
  for (const note of composition.notes) {
    const ch = (note.voice ?? 0) & 0x0F;
    const midiNum = midiNote(note.pc, note.octave);
    const vel = Math.min(127, Math.max(1, Math.round(note.velocity * 127)));
    const onTick  = Math.round(note.startBeat * PPQ);
    const offTick = Math.round((note.startBeat + note.durationBeats) * PPQ);
    events.push({ tick: onTick,  isMeta: false, data: [0x90 | ch, midiNum, vel] });
    events.push({ tick: offTick, isMeta: false, data: [0x80 | ch, midiNum, 0]   });
  }

  // End of track (placed after every other event)
  const lastTick = events.reduce((m, e) => Math.max(m, e.tick), 0);
  events.push({ tick: lastTick, isMeta: true, data: [0xFF, 0x2F, 0x00] });

  // Sort by tick; meta events sort before note events at the same tick
  events.sort((a, b) =>
    a.tick !== b.tick ? a.tick - b.tick : (a.isMeta ? -1 : b.isMeta ? 1 : 0),
  );

  // Encode events with variable-length delta times
  const trackBytes: number[] = [];
  let prevTick = 0;
  for (const ev of events) {
    trackBytes.push(...writeVarLen(ev.tick - prevTick));
    trackBytes.push(...ev.data);
    prevTick = ev.tick;
  }

  // MIDI header chunk: Format 0 (single track), 1 track, PPQ ticks/quarter
  const header = [
    0x4D, 0x54, 0x68, 0x64, // 'MThd'
    ...u32be(6),
    ...u16be(0),             // format 0
    ...u16be(1),             // 1 track
    ...u16be(PPQ),
  ];

  // MIDI track chunk
  const track = [
    0x4D, 0x54, 0x72, 0x6B, // 'MTrk'
    ...u32be(trackBytes.length),
    ...trackBytes,
  ];

  return new Uint8Array([...header, ...track]);
}

export function downloadMidi(composition: Composition, filename?: string): void {
  const data = compositionToMidi(composition);
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
