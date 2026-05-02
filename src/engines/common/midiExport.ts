import { Midi } from '@tonejs/midi';
import type { Composition } from './types';
import { midiNote } from './types';

export function compositionToMidi(composition: Composition): Uint8Array {
  const midi = new Midi();
  const bpm = composition.tempoChanges[0]?.bpm ?? 120;
  
  midi.header.setTempo(bpm);
  
  composition.tempoChanges.forEach(tc => {
    midi.header.tempos.push({ bpm: tc.bpm, ticks: tc.beat * midi.header.ppq });
  });
  
  composition.timeSigChanges.forEach(ts => {
    midi.header.timeSignatures.push({
      ticks: ts.beat * midi.header.ppq,
      timeSignature: [ts.numerator, ts.denominator],
    });
  });
  
  const voiceCount = composition.voices || 1;
  for (let v = 0; v < voiceCount; v++) {
    const track = midi.addTrack();
    track.name = `Voice ${v + 1}`;
    track.channel = v;
    
    const voiceNotes = composition.notes.filter(n => n.voice === v);
    voiceNotes.forEach(note => {
      const midiNum = midiNote(note.pc, note.octave);
      const ticks = note.startBeat * midi.header.ppq;
      const durationTicks = note.durationBeats * midi.header.ppq;
      track.addNote({
        midi: midiNum,
        ticks,
        durationTicks,
        velocity: note.velocity,
      });
    });
  }
  
  return midi.toArray();
}

export function downloadMidi(composition: Composition, filename?: string) {
  const data = compositionToMidi(composition);
  const blob = new Blob([new Uint8Array(data)], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `atonal-${composition.mode}-${composition.meta.seed}.mid`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
