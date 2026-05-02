import type { Composition } from './types';
import { midiNote } from './types';
import { useAudioStore } from '@/state/useAudioStore';

let synth: any = null;
let filterNode: any = null;
let reverbNode: any = null;
let isInitialized = false;
/** True when `synth` is a Sampler (expects note names); false for PolySynth (Hz). */
let isSamplerInstrument = false;
let ToneModule: any = null;
let drawRepeatId: number | null = null;

async function getTone() {
  if (!ToneModule) {
    ToneModule = await import('tone');
  }
  return ToneModule;
}

function disposeAudioGraph() {
  try {
    if (synth) {
      synth.releaseAll?.();
      synth.disconnect();
      synth.dispose();
    }
  } catch {
    /* ignore */
  }
  synth = null;
  try {
    filterNode?.dispose();
  } catch {
    /* ignore */
  }
  filterNode = null;
  try {
    reverbNode?.dispose();
  } catch {
    /* ignore */
  }
  reverbNode = null;
  isInitialized = false;
}

async function ensureAudioChain(Tone: any) {
  const { masterDb, reverbWet, preset, adsr, soundEngine } = useAudioStore.getState();

  disposeAudioGraph();
  isSamplerInstrument = false;

  reverbNode = new Tone.Reverb({
    decay: 1.8,
    wet: Math.min(0.9, Math.max(0, reverbWet)),
  }).toDestination();
  await reverbNode.generate();

  if (soundEngine === 'piano') {
    synth = new Tone.Sampler({
      urls: {
        A0: 'A0.mp3',
        C1: 'C1.mp3',
        'D#1': 'Ds1.mp3',
        'F#1': 'Fs1.mp3',
        A1: 'A1.mp3',
        C2: 'C2.mp3',
        'D#2': 'Ds2.mp3',
        'F#2': 'Fs2.mp3',
        A2: 'A2.mp3',
        C3: 'C3.mp3',
        'D#3': 'Ds3.mp3',
        'F#3': 'Fs3.mp3',
        A3: 'A3.mp3',
        C4: 'C4.mp3',
        'D#4': 'Ds4.mp3',
        'F#4': 'Fs4.mp3',
        A4: 'A4.mp3',
        C5: 'C5.mp3',
        'D#5': 'Ds5.mp3',
        'F#5': 'Fs5.mp3',
        A5: 'A5.mp3',
        C6: 'C6.mp3',
        'D#6': 'Ds6.mp3',
        'F#6': 'Fs6.mp3',
        A6: 'A6.mp3',
        C7: 'C7.mp3',
        'D#7': 'Ds7.mp3',
        A7: 'A7.mp3',
        C8: 'C8.mp3',
      },
      baseUrl: 'https://tonejs.github.io/audio/salamander/',
    });
    synth.volume.value = masterDb;
    synth.connect(reverbNode);
    await Tone.loaded();
    isSamplerInstrument = true;
  } else {
    const common = {
      envelope: {
        attack: adsr.attack,
        decay: adsr.decay,
        sustain: adsr.sustain,
        release: adsr.release,
      },
      volume: masterDb,
    };

    if (preset === 'stage') {
      synth = new Tone.PolySynth(Tone.Synth, {
        ...common,
        oscillator: { type: 'sawtooth' },
      });
      filterNode = new Tone.Filter(2400, 'lowpass', -12);
      synth.connect(filterNode);
      filterNode.connect(reverbNode);
    } else {
      synth = new Tone.PolySynth(Tone.Synth, {
        ...common,
        oscillator: { type: 'triangle', partialCount: 7 },
      });
      synth.connect(reverbNode);
    }
  }

  isInitialized = true;
}

function triggerAtTime(Tone: any, midi: number, durationSec: number, time: number, velocity: number) {
  if (!synth) return;
  if (isSamplerInstrument) {
    const n = Tone.Frequency(midi, 'midi').toNote();
    synth.triggerAttackRelease(n, durationSec, time, velocity);
  } else {
    const freq = Tone.Frequency(midi, 'midi').toFrequency();
    synth.triggerAttackRelease(freq, durationSec, time, velocity);
  }
}

let scheduledEvents: number[] = [];
let onTickCallback: ((beat: number) => void) | null = null;

export function setOnTick(cb: (beat: number) => void) {
  onTickCallback = cb;
}

export async function play(composition: Composition, loop = false) {
  const Tone = await getTone();
  await Tone.start();
  await ensureAudioChain(Tone);

  await stopInternal(Tone);

  const bpm = composition.tempoChanges[0]?.bpm ?? 120;
  const secPerBeat = 60 / bpm;
  Tone.getTransport().bpm.value = bpm;

  // Calculate total composition duration for loop boundary
  let totalBeats = 0;
  composition.notes.forEach((note) => {
    const end = note.startBeat + note.durationBeats;
    if (end > totalBeats) totalBeats = end;
  });

  composition.notes.forEach((note) => {
    const midi = midiNote(note.pc, note.octave);
    const startSec = note.startBeat * secPerBeat;
    const duration = note.durationBeats * secPerBeat;

    const id = Tone.getTransport().schedule((time: number) => {
      triggerAtTime(Tone, midi, duration, time, note.velocity);
    }, startSec);
    scheduledEvents.push(id);
  });

  if (loop && totalBeats > 0) {
    Tone.getTransport().loop = true;
    Tone.getTransport().loopStart = 0;
    Tone.getTransport().loopEnd = totalBeats * secPerBeat;
  } else {
    Tone.getTransport().loop = false;
  }

  if (drawRepeatId !== null) {
    Tone.getTransport().clear(drawRepeatId);
    drawRepeatId = null;
  }

  drawRepeatId = Tone.getTransport().scheduleRepeat(
    (time: number) => {
      Tone.Draw.schedule(() => {
        if (onTickCallback && Tone.getTransport().state === 'started') {
          const seconds = Tone.getTransport().seconds;
          const beat = seconds / secPerBeat;
          onTickCallback(beat);
        }
      }, time);
    },
    0.032,
    0,
  );

  Tone.getTransport().start();
}

async function stopInternal(Tone: any) {
  Tone.getTransport().stop();
  Tone.getTransport().cancel();
  scheduledEvents = [];
  if (drawRepeatId !== null) {
    try {
      Tone.getTransport().clear(drawRepeatId);
    } catch {
      /* ignore */
    }
    drawRepeatId = null;
  }
  synth?.releaseAll?.();
}

export async function stop() {
  const Tone = await getTone();
  await stopInternal(Tone);
  if (onTickCallback) onTickCallback(0);
}

export async function isPlaying(): Promise<boolean> {
  const Tone = await getTone();
  return Tone.getTransport().state === 'started';
}

/** Short audtion when clicking a note in the piano roll (does not start transport). */
export async function previewMidiNote(midi: number, velocity = 0.8) {
  const Tone = await getTone();
  await Tone.start();
  await ensureAudioChain(Tone);
  const dur = 0.14;
  triggerAtTime(Tone, midi, dur, Tone.now(), velocity);
}

/** Call after changing ADSR / preset in the UI so the next play() picks it up. */
export function disposeSynthForRegen() {
  disposeAudioGraph();
}
