/**
 * Diagnostic MIDI generator — testMidiSig.mjs
 * Generates minimal test MIDI files to check if Logic Pro
 * correctly reads each time signature from our Format 0 output.
 *
 * Run from the atonal/src directory:
 *   node scripts/testMidiSig.mjs
 *
 * Outputs test-3-4.mid, test-4-4.mid, test-5-4.mid, test-6-8.mid
 * into the current directory. Open each with File > Open in Logic Pro.
 */

import { writeFileSync } from 'fs';

const PPQ = 480;

function writeVarLen(v) {
  const bytes = [];
  bytes.push(v & 0x7F);
  v >>>= 7;
  while (v > 0) {
    bytes.unshift((v & 0x7F) | 0x80);
    v >>>= 7;
  }
  return bytes;
}

function u32be(v) {
  return [(v >>> 24) & 0xFF, (v >>> 16) & 0xFF, (v >>> 8) & 0xFF, v & 0xFF];
}

function u16be(v) {
  return [(v >>> 8) & 0xFF, v & 0xFF];
}

/**
 * Build a minimal Format 0 MIDI file for the given time signature.
 * Content: 2 bars of one quarter-note C4 per beat, all at velocity 100.
 * The bar-1 beat is accented (velocity 127) so Smart Tempo has a clear signal.
 */
function buildTestMidi(numerator, denominator, bpm = 120) {
  const dd = Math.round(Math.log2(denominator));           // 4→2, 8→3
  const beatsPerBar = numerator * (4 / denominator);       // quarter-note beats
  const noteInterval = PPQ;                                // one quarter note per beat
  const bars = 2;
  const events = [];

  // Time signature meta event
  events.push({ tick: 0, isMeta: true, data: [0xFF, 0x58, 0x04, numerator, dd, 24, 8] });

  // Tempo meta event
  const uspqn = Math.round(60_000_000 / bpm);
  events.push({ tick: 0, isMeta: true, data: [0xFF, 0x51, 0x03, (uspqn >>> 16) & 0xFF, (uspqn >>> 8) & 0xFF, uspqn & 0xFF] });

  // Notes: one per beat for 2 bars
  const totalBeats = bars * beatsPerBar;
  for (let b = 0; b < totalBeats; b++) {
    const tick = Math.round(b * noteInterval);
    const endTick = Math.round((b + 0.9) * noteInterval);
    const isBarDown = (b % beatsPerBar === 0);
    const vel = isBarDown ? 127 : 80;     // accent downbeat
    events.push({ tick, isMeta: false, data: [0x90, 60, vel] });          // note on C4
    events.push({ tick: endTick, isMeta: false, data: [0x80, 60, 0] });  // note off
  }

  const lastTick = events.reduce((m, e) => Math.max(m, e.tick), 0);
  events.push({ tick: lastTick, isMeta: true, data: [0xFF, 0x2F, 0x00] });

  // Sort
  events.sort((a, b) =>
    a.tick !== b.tick ? a.tick - b.tick : (a.isMeta ? -1 : b.isMeta ? 1 : 0),
  );

  // Encode with delta times
  const trackBytes = [];
  let prev = 0;
  for (const ev of events) {
    trackBytes.push(...writeVarLen(ev.tick - prev));
    trackBytes.push(...ev.data);
    prev = ev.tick;
  }

  const header = [0x4D, 0x54, 0x68, 0x64, ...u32be(6), ...u16be(0), ...u16be(1), ...u16be(PPQ)];
  const track  = [0x4D, 0x54, 0x72, 0x6B, ...u32be(trackBytes.length), ...trackBytes];
  return new Uint8Array([...header, ...track]);
}

const cases = [
  { num: 3, den: 4,  label: '3-4' },
  { num: 4, den: 4,  label: '4-4' },
  { num: 5, den: 4,  label: '5-4' },
  { num: 6, den: 8,  label: '6-8' },
];

for (const { num, den, label } of cases) {
  const bytes = buildTestMidi(num, den);
  const filename = `test-${label}.mid`;
  writeFileSync(filename, bytes);
  console.log(`Written: ${filename}  (${num}/${den})`);
}

console.log('\nOpen each file in Logic Pro via File > Open (not drag-and-drop).');
console.log('Logic Pro will show the time signature in the transport bar.');
