import type { Composition, CompositionMode, Note } from '@/engines/common/types';

const SHARE_VERSION = 1;

type SharePayload = {
  v: number;
  mode: CompositionMode;
  seed: number;
  bpm: number;
  tb: number;
  vce: number;
  /** [pc, octave, startBeat, durationBeats, velocity, voice][] */
  n: number[][];
};

function toPayload(c: Composition): SharePayload {
  return {
    v: SHARE_VERSION,
    mode: c.mode,
    seed: c.meta.seed,
    bpm: c.tempoChanges[0]?.bpm ?? 120,
    tb: c.totalBeats,
    vce: c.voices,
    n: c.notes.map((note) => [
      note.pc,
      note.octave,
      Math.round(note.startBeat * 10000) / 10000,
      Math.round(note.durationBeats * 10000) / 10000,
      Math.round(note.velocity * 1000) / 1000,
      note.voice,
    ]),
  };
}

function utf8ToBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUtf8(param: string): string {
  let b64 = param.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeCompositionToHashParam(c: Composition): string {
  return utf8ToBase64Url(JSON.stringify(toPayload(c)));
}

export function decodeCompositionFromHashParam(param: string): Composition | null {
  try {
    const json = base64UrlToUtf8(param);
    const p = JSON.parse(json) as SharePayload;
    if (p.v !== SHARE_VERSION || !Array.isArray(p.n)) return null;

    const notes: Note[] = p.n.map((row) => ({
      pc: row[0] as Note['pc'],
      octave: row[1],
      startBeat: row[2],
      durationBeats: row[3],
      velocity: row[4],
      voice: row[5],
    }));

    return {
      notes,
      tempoChanges: [{ beat: 0, bpm: p.bpm }],
      timeSigChanges: [{ beat: 0, numerator: 4, denominator: 4 }],
      voices: p.vce,
      mode: p.mode,
      totalBeats: p.tb,
      meta: { seed: p.seed, modeParams: {} },
    };
  } catch {
    return null;
  }
}

export async function copyShareUrl(composition: Composition): Promise<boolean> {
  const token = encodeCompositionToHashParam(composition);
  const url = `${window.location.origin}${window.location.pathname}#s=${token}`;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}
