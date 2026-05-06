'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTransportStore } from '@/state/useTransportStore';
import { useCompositionStore } from '@/state/useCompositionStore';
import { useAudioStore } from '@/state/useAudioStore';
import { play, stop, setOnTick, disposeSynthForRegen } from '@/engines/common/scheduler';
import { downloadMidiToneJs as downloadMidi } from '@/engines/common/midiExportToneJs';
import { copyShareUrl } from '@/lib/shareComposition';
import { LinearFader } from '@/components/composer/LinearFader';
import { ParamDial } from '@/components/composer/ParamDial';

export function TransportBar({ children, hideChainOnTouch }: { children?: ReactNode; hideChainOnTouch?: boolean }) {
  const {
    isPlaying,
    setPlaying,
    setPlayheadBeat,
    bpm,
    timeSigNumerator,
    timeSigDenominator,
    setTimeSig,
    loop,
    setLoop,
  } = useTransportStore();
  const composition = useCompositionStore((s) => s.composition);
  const chain = useCompositionStore((s) => s.chain);
  const setChain = useCompositionStore((s) => s.setChain);
  const noteCount = composition?.notes.length ?? 0;
  const [loading, setLoading] = useState(false);
  const [shareFlash, setShareFlash] = useState(false);

  const masterDb = useAudioStore((s) => s.masterDb);
  const setMasterDb = useAudioStore((s) => s.setMasterDb);
  const soundEngine = useAudioStore((s) => s.soundEngine);
  const setSoundEngine = useAudioStore((s) => s.setSoundEngine);
  const preset = useAudioStore((s) => s.preset);
  const setPreset = useAudioStore((s) => s.setPreset);
  const reverbWet = useAudioStore((s) => s.reverbWet);
  const setReverbWet = useAudioStore((s) => s.setReverbWet);
  const adsr = useAudioStore((s) => s.adsr);
  const setAdsr = useAudioStore((s) => s.setAdsr);

  const handlePlay = async () => {
    if (!composition) return;
    setLoading(true);
    setOnTick((beat) => setPlayheadBeat(beat));
    await play(composition, loop);
    setPlaying(true);
    setLoading(false);
  };

  const handleStop = async () => {
    await stop();
    setPlaying(false);
    setPlayheadBeat(0);
  };

  const handleExport = () => {
    if (!composition) return;
    downloadMidi(composition);
  };

  const handleShare = async () => {
    if (!composition) return;
    const ok = await copyShareUrl(composition);
    setShareFlash(ok);
    window.setTimeout(() => setShareFlash(false), 2200);
  };

  return (
    <div className="border-t border-[var(--outline-variant)] bg-[var(--surface-container-high)] touch:bg-[var(--surface-container-high)]/80 mb-0 touch:bg-black touch:bg-opacity-10 touch:backdrop-blur-lg shrink-0 touch:fixed touch:bottom-16 touch:left-0 touch:right-0 touch:z-40 flex flex-col gap-0 py-2 px-4 mb-4 touch:py-0 touch:mb-0 deboss-panel">

      {/* ── ROW 1: transport controls + compose action ── */}
      <div className="flex items-center ml-5 mr-5 touch:mx-2 py-3 gap-10 touch:gap-3 flex-wrap touch:justify-center min-h-[48px]">

        {/* Play / Stop / Loop */}
        <div className="flex items-center gap-1.5 p-1.5 bg-[var(--surface-container)] rounded-sm border border-[var(--outline-variant)]/50 emboss-control shrink-0 max-sm:w-full max-sm:justify-center">
          <button
            onClick={handleStop}
            disabled={!isPlaying}
            className="w-10 h-8 bg-[var(--surface)] flex items-center justify-center rounded-[2px] border border-[var(--outline-variant)] hover:bg-[var(--surface-variant)] active:bg-[var(--surface-dim)] disabled:opacity-40 transition-colors text-[var(--on-surface)] shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">stop</span>
          </button>
          <button
            onClick={handlePlay}
            disabled={!composition || loading}
            className="w-10 h-8 bg-[var(--on-surface)] flex items-center justify-center rounded-[2px] border border-[var(--on-surface)] hover:opacity-90 disabled:opacity-40 transition-colors text-[var(--surface)] shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <button
            onClick={() => setLoop(!loop)}
            title={loop ? 'Loop on' : 'Loop off'}
            className={`w-10 h-8 flex items-center justify-center rounded-[2px] border transition-colors shadow-sm ${
              loop
                ? 'bg-[var(--on-surface)] text-[var(--surface)] border-[var(--on-surface)]'
                : 'bg-[var(--surface)] text-[var(--on-surface)] border-[var(--outline-variant)] hover:bg-[var(--surface-variant)]'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">repeat</span>
          </button>
        </div>

        {/* Spacer + keyboard hint */}
        <span className="font-[family-name:var(--font-space-grotesk)] text-[9px] text-[var(--outline)] hidden sm:block touch:hidden">
          Space play/stop · Esc stop
        </span>

        <div className="w-px h-8 bg-[var(--outline-variant)]/50 shrink-0 touch:hidden" />

        {/* BPM */}
        <div className="flex flex-col items-center gap-0.5 shrink-0 touch:hidden">
          <span className="font-[family-name:var(--font-inter)] text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">BPM</span>
          <div className="px-2 py-[2px] bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-[1px] font-[family-name:var(--font-space-grotesk)] text-[11px] text-[var(--on-surface)] min-w-[48px] text-center">
            {typeof bpm === 'number' && !Number.isInteger(bpm) ? bpm.toFixed(1) : `${bpm}`}
          </div>
        </div>

        {/* SIG */}
        <div className="flex flex-col items-center gap-0.5 shrink-0 touch:hidden">
          <span className="font-[family-name:var(--font-inter)] text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">SIG</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={16}
              value={timeSigNumerator}
              onChange={(e) => {
                const v = Math.max(1, Math.min(16, Number(e.target.value) || 4));
                setTimeSig(v, timeSigDenominator);
              }}
              className="w-11 px-1 py-[2px] bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-[1px] font-[family-name:var(--font-space-grotesk)] text-[11px] text-[var(--on-surface)] text-center"
              aria-label="Time signature beats per bar"
            />
            <span className="text-[var(--on-surface-variant)] text-[10px]">/</span>
            <select
              value={timeSigDenominator}
              onChange={(e) => setTimeSig(timeSigNumerator, Number(e.target.value))}
              className="w-[46px] px-1 py-[2px] bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-[1px] font-[family-name:var(--font-space-grotesk)] text-[10px] text-[var(--on-surface)]"
              aria-label="Beat unit"
            >
              {[4, 8, 16].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div className="flex flex-col items-center gap-0.5 shrink-0 touch:hidden">
          <span className="font-[family-name:var(--font-inter)] text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--on-surface-variant)]">Notes</span>
          <div className="px-2 py-[2px] bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-[1px] font-[family-name:var(--font-space-grotesk)] text-[11px] text-[var(--on-surface)] min-w-[36px] text-center">
            {noteCount}
          </div>
        </div>

        {/* Separator before compose section (hidden on touch for compactness) */}
        <div className="w-px h-8 bg-[var(--outline-variant)]/50 shrink-0 touch:hidden" />

        {/* Compose button passed from each view */}
        {children}

        {/* Chain toggle — now next to Compose */}
        <button
          onClick={() => setChain(!chain)}
          title={chain ? 'Chain on — compose appends' : 'Chain off — compose replaces'}
          className={`flex items-center gap-1 px-2 h-8 rounded-[2px] border transition-colors shadow-sm shrink-0 ${hideChainOnTouch ? 'touch:hidden' : ''} ${
            chain
              ? 'bg-[var(--on-surface)] text-[var(--surface)] border-[var(--on-surface)]'
              : 'bg-[var(--surface)] text-[var(--on-surface)] border-[var(--outline-variant)] hover:bg-[var(--surface-variant)]'
          }`}
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">{chain ? 'add_link' : 'link_off'}</span>
          <span className="font-[family-name:var(--font-inter)] text-[9px] font-bold uppercase tracking-[0.1em]">Chain</span>
        </button>

        {/* MIDI export — visible on touch only (desktop has it in Share/Export) */}
        <button
          onClick={handleExport}
          disabled={!composition}
          className="hidden touch:flex items-center gap-1 px-2 h-8 bg-[var(--on-surface)] border border-[var(--on-surface)] text-[var(--surface)] rounded-[2px] hover:opacity-90 disabled:opacity-40 transition-opacity shadow-sm active:translate-y-[1px] shrink-0"
          type="button"
        >
          <span className="material-symbols-outlined text-[14px]">save</span>
          <span className="font-[family-name:var(--font-inter)] text-[9px] font-bold uppercase tracking-[0.1em]">MIDI</span>
        </button>

        {/* Share and Export */}
        <div className="flex items-center gap-2 ml-auto shrink-0 touch:hidden">
          <button
            onClick={handleShare}
            disabled={!composition}
            className="px-3 py-1.5 border border-[var(--outline-variant)] text-[var(--on-surface)] rounded flex items-center gap-1.5 hover:bg-[var(--surface-variant)] disabled:opacity-40 transition-colors text-[9px] font-bold uppercase tracking-wider"
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">link</span>
            {shareFlash ? 'Copied' : 'Share'}
          </button>
          <button
            onClick={handleExport}
            disabled={!composition}
            className="px-3 py-1.5 bg-[var(--on-surface)] border border-[var(--on-surface)] text-[var(--surface)] rounded flex items-center gap-1.5 hover:opacity-90 disabled:opacity-40 transition-opacity shadow-sm active:translate-y-[1px]"
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">save</span>
            <span className="font-[family-name:var(--font-inter)] text-[9px] font-bold uppercase tracking-[0.1em]">MIDI</span>
          </button>
        </div>
      </div>

      {/* ── ROW 2: sound engine + ADSR + faders + share/export ── */}
      <div className="flex items-center ml-5 gap-10 flex-wrap border-t border-[var(--outline-variant)]/40 pt-2 min-h-[44px] touch:hidden">

        {/* Sound engine buttons */}
        <div className="flex gap-1 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => { setSoundEngine('piano'); disposeSynthForRegen(); }}
            className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded border ${
              soundEngine === 'piano'
                ? 'bg-[var(--on-surface)] text-[var(--surface)] border-transparent'
                : 'border-[var(--outline-variant)] text-[var(--on-surface-variant)] hover:border-[var(--on-surface)]'
            }`}
          >
            Piano
          </button>
          <button
            type="button"
            onClick={() => { setSoundEngine('synth'); disposeSynthForRegen(); }}
            className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded border ${
              soundEngine === 'synth'
                ? 'bg-[var(--on-surface)] text-[var(--surface)] border-transparent'
                : 'border-[var(--outline-variant)] text-[var(--on-surface-variant)] hover:border-[var(--on-surface)]'
            }`}
          >
            Synth
          </button>
          <button
            type="button"
            disabled={soundEngine !== 'synth'}
            onClick={() => { setPreset('warm'); disposeSynthForRegen(); }}
            className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded border disabled:opacity-35 ${
              soundEngine === 'synth' && preset === 'warm'
                ? 'bg-[var(--on-surface)] text-[var(--surface)] border-transparent'
                : 'border-[var(--outline-variant)] text-[var(--on-surface-variant)] hover:border-[var(--on-surface)]'
            }`}
          >
            Warm
          </button>
          <button
            type="button"
            disabled={soundEngine !== 'synth'}
            onClick={() => { setPreset('stage'); disposeSynthForRegen(); }}
            className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded border disabled:opacity-35 ${
              soundEngine === 'synth' && preset === 'stage'
                ? 'bg-[var(--on-surface)] text-[var(--surface)] border-transparent'
                : 'border-[var(--outline-variant)] text-[var(--on-surface-variant)] hover:border-[var(--on-surface)]'
            }`}
          >
            Stage
          </button>
        </div>

        <div className="w-px h-7 bg-[var(--outline-variant)]/50 shrink-0" />

        {/* ADSR */}
        <div className={`flex items-center gap-2 ${soundEngine !== 'synth' ? 'opacity-40 pointer-events-none' : ''}`}>
          <span className="font-[family-name:var(--font-inter)] text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--outline)]">ADSR</span>
          <div className="scale-90 origin-center">
            <ParamDial label="A" value={adsr.attack} min={0.002} max={0.25} step={0.002} onChange={(v) => setAdsr({ attack: v })} formatValue={(v) => v.toFixed(3)} />
          </div>
          <div className="scale-90 origin-center">
            <ParamDial label="D" value={adsr.decay} min={0.02} max={0.9} step={0.02} onChange={(v) => setAdsr({ decay: v })} formatValue={(v) => v.toFixed(2)} />
          </div>
          <div className="scale-90 origin-center">
            <ParamDial label="S" value={adsr.sustain} min={0.05} max={1} step={0.02} onChange={(v) => setAdsr({ sustain: v })} formatValue={(v) => `${Math.round(v * 100)}%`} />
          </div>
          <div className="scale-90 origin-center">
            <ParamDial label="R" value={adsr.release} min={0.05} max={2.5} step={0.02} onChange={(v) => setAdsr({ release: v })} formatValue={(v) => v.toFixed(2)} />
          </div>
        </div>

        <div className="w-px h-7 bg-[var(--outline-variant)]/50 shrink-0" />

        {/* Master + Room faders */}
        <div className="w-[140px] shrink-0">
          <LinearFader label="Master" value={masterDb} min={-32} max={6} step={0.5} onChange={setMasterDb} formatValue={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)} dB`} />
        </div>
        <div className="w-[120px] shrink-0">
          <LinearFader label="Room" value={reverbWet} min={0} max={0.55} step={0.02} onChange={setReverbWet} formatValue={(v) => `${Math.round(v * 100)}%`} />
        </div>

        
      </div>
    </div>
  );
}
