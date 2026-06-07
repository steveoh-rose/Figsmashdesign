/** Synthesized SFX via Web Audio. No assets — every sound is generated on demand. */

let actx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

export function ensureAudio(): void {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    actx = new Ctor();
    master = actx.createGain();
    master.gain.value = 0.5;
    master.connect(actx.destination);
  } catch { /* audio unavailable — fall through silent */ }
}

export function isMuted(): boolean { return muted; }
export function toggleMute(): boolean {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

export function blip(freq: number, dur: number, type?: OscillatorType, gain?: number, slideTo?: number): void {
  if (!actx || !master || muted) return;
  const t = actx.currentTime;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain || 0.25, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}

export function noise(dur: number, gain?: number, filt?: number): void {
  if (!actx || !master || muted) return;
  const t = actx.currentTime;
  const len = Math.floor(actx.sampleRate * dur);
  const b = actx.createBuffer(1, len, actx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const s = actx.createBufferSource();
  s.buffer = b;
  const f = actx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = filt || 1400;
  const g = actx.createGain();
  g.gain.value = gain || 0.25;
  s.connect(f); f.connect(g); g.connect(master);
  s.start(t);
}

export const sndPunch  = () => { noise(0.08, 0.22, 900); blip(150, 0.1, 'square', 0.16, 70); };
export const sndHit    = (d: number) => { noise(0.1, 0.28, 1700); blip(190 + d * 4, 0.12, 'square', 0.18, 90); };
export const sndThrow  = () => { noise(0.16, 0.16, 2600); };
export const sndGrab   = () => blip(440, 0.05, 'sine', 0.1);
export const sndScale  = () => blip(300, 0.2, 'sawtooth', 0.13, 920);
export const sndTaunt  = () => blip(680, 0.06, 'square', 0.1, 560);
export const sndTool   = () => blip(520, 0.04, 'sine', 0.08);
export const sndSlice  = () => { noise(0.07, 0.16, 5200); blip(1600, 0.13, 'sawtooth', 0.10, 260); };
export const sndShape  = () => blip(560, 0.1, 'triangle', 0.11, 880);
export const sndFire   = () => { noise(0.1, 0.14, 1700); blip(420, 0.18, 'sawtooth', 0.12, 150); };
export const sndZap    = () => { noise(0.06, 0.13, 5200); blip(1500, 0.13, 'square', 0.13, 420); };
export const sndCharge = () => { blip(300, 0.26, 'sawtooth', 0.14, 1500); noise(0.08, 0.1, 2600); };
export const sndPickup = () => { blip(523, 0.09, 'square', 0.12, 784); setTimeout(() => blip(880, 0.13, 'square', 0.12, 1320), 80); };
export const sndLaser  = () => { blip(900, 0.12, 'sawtooth', 0.13, 180); noise(0.05, 0.08, 3200); };
export const sndKO     = () => { blip(180, 0.6, 'sawtooth', 0.32, 40); noise(0.4, 0.22, 520); blip(880, 0.32, 'triangle', 0.18, 1760); };
export const sndFQ     = () => { blip(220, 0.3, 'square', 0.2, 180); setTimeout(() => blip(160, 0.5, 'sawtooth', 0.28, 70), 260); };
export const sndWin    = () => {
  blip(523, 0.12, 'square', 0.14);
  setTimeout(() => blip(659, 0.12, 'square', 0.14), 120);
  setTimeout(() => blip(784, 0.12, 'square', 0.14), 240);
  setTimeout(() => blip(1047, 0.34, 'square', 0.16), 360);
};
