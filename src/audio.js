/** Procedural Web Audio graph: master, music, SFX, convolution reverb. */
import { CONFIG } from './config.js';
import { state } from './state.js';

export const AudioCtx = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
export let audioCtx = /** @type {AudioContext | null} */ (null);
export let masterGain = /** @type {GainNode | null} */ (null);
export let musicGain = /** @type {GainNode | null} */ (null);
export let masterLowpass = /** @type {BiquadFilterNode | null} */ (null);
export let reverbConvolver = /** @type {ConvolverNode | null} */ (null);
export let reverbWetGain = /** @type {GainNode | null} */ (null);

export function buildReverbBuffer(ctx, durationSec, decay) {
  const sr = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sr * durationSec));
  const impulse = ctx.createBuffer(2, length, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

export function buildAudioGraph() {
  if (!audioCtx) return;
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 1.0;

  masterLowpass = audioCtx.createBiquadFilter();
  masterLowpass.type = 'lowpass';
  masterLowpass.frequency.value = 6000;
  masterLowpass.Q.value = 0.5;

  reverbConvolver = audioCtx.createConvolver();
  reverbConvolver.buffer = buildReverbBuffer(audioCtx, CONFIG.REVERB_SECONDS, CONFIG.REVERB_DECAY);
  reverbWetGain = audioCtx.createGain();
  reverbWetGain.gain.value = CONFIG.REVERB_MIX;

  // Dedicated music bus: music routes through musicGain → masterGain, so fading
  // music in/out (startMusic/stopMusic) never touches the SFX path, which stays
  // at unity gain. Fixes SFX being muted through the shared bus after stopMusic.
  musicGain = audioCtx.createGain();
  musicGain.gain.value = 1.0;
  musicGain.connect(masterGain);

  // chain: source → masterGain → [masterLowpass → destination] + [reverbConvolver → reverbWet → destination]
  masterGain.connect(masterLowpass);
  masterLowpass.connect(audioCtx.destination);
  masterGain.connect(reverbConvolver);
  reverbConvolver.connect(reverbWetGain);
  reverbWetGain.connect(audioCtx.destination);
}

export function ensureAudio() {
  try {
    if (!audioCtx) {
      audioCtx = new AudioCtx();
      buildAudioGraph();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {
        /* swallow */
      });
    }
  } catch {
    /* AudioContext unavailable */
  }
}

export function audioDestination() {
  return masterGain || audioCtx?.destination || null;
}

/** Schedule a tone at a specific AudioContext time. `volume` already scaled by channel. */
export function playToneAt(freq, duration, type, volume, startTime, destNode) {
  if (!state.audioEnabled || !audioCtx) return;
  const dest = destNode || audioDestination();
  if (!dest) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + duration);
  } catch {
    /* swallow */
  }
}

export function playTone(freq, duration, type = 'square', volume = 0.12) {
  if (!state.audioEnabled) return;
  ensureAudio();
  if (!audioCtx) return;
  playToneAt(freq, duration, type, volume * state.sfxVolume, audioCtx.currentTime);
}

/** Schedule a tone sequence on the audio clock (drift-free). `notes` = [[freq,dur,type,vol,delay], ...] */
export function playSequence(notes) {
  if (!state.audioEnabled) return;
  ensureAudio();
  if (!audioCtx) return;
  const base = audioCtx.currentTime + 0.005;
  for (const n of notes) {
    const [freq, dur, type, vol, delay] = n;
    playToneAt(freq, dur, type, vol * state.sfxVolume, base + delay);
  }
}

export function sfxFlap() {
  playTone(420, 0.1, 'triangle', 0.15);
  playTone(560, 0.08, 'sine', 0.1);
}
export function sfxScore() {
  playSequence([
    [660, 0.08, 'sine', 0.1, 0.0],
    [880, 0.1, 'sine', 0.12, 0.08],
    [1100, 0.12, 'sine', 0.1, 0.18],
  ]);
}
export function sfxNewBest() {
  playSequence([
    [523, 0.1, 'sine', 0.12, 0.0],
    [659, 0.1, 'sine', 0.12, 0.1],
    [784, 0.12, 'sine', 0.13, 0.2],
    [1047, 0.18, 'sine', 0.14, 0.32],
  ]);
}
export function sfxDie() {
  playTone(220, 0.25, 'sawtooth', 0.14);
  playTone(140, 0.35, 'sawtooth', 0.1);
}
export function sfxDive() {
  playTone(300, 0.06, 'triangle', 0.08);
}
export function sfxBrake() {
  playTone(380, 0.05, 'sine', 0.08);
}
export function sfxNearMiss() {
  playTone(820, 0.05, 'sine', 0.06);
}
export function sfxAchievement() {
  playSequence([
    [880, 0.15, 'sine', 0.1, 0.0],
    [1320, 0.25, 'sine', 0.09, 0.12],
  ]);
}
export function sfxShieldCollect() {
  playSequence([
    [523, 0.1, 'sine', 0.12, 0.0],
    [659, 0.12, 'sine', 0.1, 0.07],
    [784, 0.15, 'sine', 0.12, 0.14],
    [1047, 0.2, 'sine', 0.15, 0.21],
    [392, 0.55, 'sine', 0.07, 0.38], // warm settling tail — "you are held"
  ]);
}
export function sfxShieldPop() {
  playTone(880, 0.08, 'triangle', 0.15);
  playTone(1200, 0.12, 'sine', 0.1);
}

// Music (per-theme arpeggios, scheduled on audio clock)
export const musicThemes = {
  sunset: {
    notes: [262, 330, 392, 523, 392, 330],
    wave: 'sine',
    subWave: 'triangle',
    interval: 0.5,
  },
  midnight: {
    notes: [293, 370, 440, 587, 440, 370],
    wave: 'square',
    subWave: 'sine',
    interval: 0.44,
  },
  rain: {
    notes: [220, 262, 330, 440, 330, 262],
    wave: 'sine',
    subWave: 'triangle',
    interval: 0.52,
  },
  aurora: { notes: [277, 311, 349, 415, 349, 311], wave: 'sine', subWave: 'sine', interval: 0.5 },
  meadow: {
    notes: [262, 294, 349, 440, 392, 349],
    wave: 'sine',
    subWave: 'triangle',
    interval: 0.48,
  },
};

export let musicSchedulerHandle = /** @type {number | null} */ (null);
export let musicIdx = 0;
export let musicNextNoteTime = 0;

export function scheduleMusicAhead() {
  if (!audioCtx) return;
  const theme = musicThemes[state.theme] || musicThemes.sunset;
  if (musicNextNoteTime < audioCtx.currentTime - 0.5) {
    musicNextNoteTime = audioCtx.currentTime + 0.05;
  }
  while (musicNextNoteTime < audioCtx.currentTime + CONFIG.MUSIC_LOOKAHEAD) {
    const notes = theme.notes;
    // Alternate between A and B sections every 12 notes for variation
    const section = Math.floor(musicIdx / 12) % 2;
    const noteIdx = musicIdx % notes.length;
    const transpose = section === 1 ? 1.05 : 1.0; // gentle pitch lift in B
    const baseFreq = notes[noteIdx] * transpose;

    playToneAt(baseFreq, 0.22, theme.wave, 0.045 * state.musicVolume, musicNextNoteTime, musicGain);
    playToneAt(baseFreq / 2, 0.28, theme.subWave, 0.022 * state.musicVolume, musicNextNoteTime, musicGain);

    // Ambient pad: slow drone on the tonic, scheduled every 4 notes
    if (musicIdx % 4 === 0) {
      const tonic = notes[0] / 2;
      playToneAt(tonic, theme.interval * 4, 'sine', 0.012 * state.musicVolume, musicNextNoteTime, musicGain);
    }

    if (state.theme === 'rain' && Math.random() < 0.35) {
      playToneAt(
        Math.random() * 400 + 700,
        0.005,
        'sine',
        0.007 * state.musicVolume,
        musicNextNoteTime,
        musicGain,
      );
    }

    musicNextNoteTime += theme.interval;
    musicIdx++;
  }
}

export function fadeMusic(target, durationSec) {
  if (!audioCtx || !musicGain) return;
  const t = audioCtx.currentTime;
  musicGain.gain.cancelScheduledValues(t);
  musicGain.gain.setValueAtTime(musicGain.gain.value, t);
  musicGain.gain.linearRampToValueAtTime(
    Math.max(0.0001, target),
    t + Math.max(0.01, durationSec),
  );
}

export function startMusic() {
  if (!state.audioEnabled) return;
  ensureAudio();
  if (!audioCtx) return;
  stopMusic(false);
  musicIdx = 0;
  musicNextNoteTime = audioCtx.currentTime + 0.05;
  scheduleMusicAhead();
  musicSchedulerHandle = setInterval(scheduleMusicAhead, CONFIG.MUSIC_TICK_MS);
  fadeMusic(1.0, CONFIG.MUSIC_FADE_SEC);
}

export function stopMusic(fade = true) {
  if (musicSchedulerHandle != null) {
    clearInterval(musicSchedulerHandle);
    musicSchedulerHandle = null;
  }
  if (fade) fadeMusic(0.0001, CONFIG.MUSIC_FADE_SEC * 0.5);
}

// ─── 6. STATE ─────────────────────────────────────────────────────
