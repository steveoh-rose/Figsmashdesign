/**
 * Cartridge 3 — FigContrast: a timed "dial in the colour" game. A target colour
 * fills the swatch; your live mix is the thick frame around it. Beat the
 * per-round countdown to make the frame vanish into the fill. Music + 3-2-1
 * start. Scored on accuracy + time left, five rounds.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const ROUNDS = 5;
const ROUND_TIME = 15; // seconds per colour

interface RGB { r: number; g: number; b: number; }
type Phase = 'ready' | 'play' | 'reveal' | 'done';

function rint(max: number) { return Math.floor(Math.random() * max); }
function hsl2rgb(h: number, s: number, l: number): RGB {
  h /= 360;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => { const k = (n + h * 12) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return { r: f(0), g: f(8), b: f(4) };
}
function newTarget(): RGB { return hsl2rgb(rint(360), 0.45 + Math.random() * 0.45, 0.36 + Math.random() * 0.34); }
const css = (c: RGB) => `rgb(${c.r},${c.g},${c.b})`;

// --- tiny chiptune ---
let actx: AudioContext | null = null;
function audio() { if (!actx) { try { actx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { /* */ } } return actx; }
function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.16) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq; o.connect(g); g.connect(a.destination);
  g.gain.setValueAtTime(vol, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.start(); o.stop(a.currentTime + dur);
}
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const MEL = [64, 67, 71, 67, 69, 72, 76, 72, 62, 65, 69, 65, 67, 64, 60, 0];
const BASS = [40, 40, 43, 43, 36, 36, 41, 41, 40, 40, 43, 43, 38, 38, 41, 41];
function startMusic() {
  const a = audio(); if (!a) return null;
  try { a.resume(); } catch { /* */ }
  const stepDur = 0.22; let step = 0, next = a.currentTime + 0.1;
  const t2 = (f: number, t: number, d: number, ty: OscillatorType, v: number) => {
    const o = a.createOscillator(), g = a.createGain();
    o.type = ty; o.frequency.value = f; o.connect(g); g.connect(a.destination);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.start(t); o.stop(t + d);
  };
  const timer = window.setInterval(() => {
    while (next < a.currentTime + 0.25) {
      const m = MEL[step % MEL.length]; if (m) t2(midi(m), next, stepDur * 0.85, 'square', 0.05);
      if (step % 2 === 0) { const b = BASS[step % BASS.length]; if (b) t2(midi(b), next, stepDur * 1.7, 'triangle', 0.08); }
      next += stepDur; step++;
    }
  }, 45);
  return { stop: () => window.clearInterval(timer) };
}

export function FigContrast({ highScore, onExit }: { highScore: number; onExit: (score: number, secondsPlayed: number) => void }) {
  const [round, setRound] = useState(1);
  const [target, setTarget] = useState<RGB>(newTarget);
  const [r, setR] = useState(128);
  const [g, setG] = useState(128);
  const [b, setB] = useState(128);
  const [score, setScore] = useState(0);
  const [reveal, setReveal] = useState<{ acc: number; pts: number } | null>(null);
  const [phase, setPhase] = useState<Phase>('ready');
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [count, setCount] = useState(3);

  const refs = useRef({ r, g, b, target, round, phase, timeLeft });
  refs.current = { r, g, b, target, round, phase, timeLeft };
  const startRef = useRef(performance.now() / 1000);

  const lockIn = useCallback(() => {
    const s = refs.current;
    if (s.phase !== 'play') return;
    setPhase('reveal');
    const avg = (Math.abs(s.r - s.target.r) + Math.abs(s.g - s.target.g) + Math.abs(s.b - s.target.b)) / 3;
    const acc = Math.max(0, 1 - avg / 64);
    const bonus = Math.round(Math.max(0, s.timeLeft) * 22);
    const pts = Math.round(acc * 1000) + bonus;
    setScore((v) => v + pts);
    setReveal({ acc, pts });
    tone(acc > 0.85 ? 1100 : 560, 0.14, 'square', 0.16);
    window.setTimeout(() => {
      if (s.round >= ROUNDS) { setPhase('done'); return; }
      setRound((v) => v + 1);
      setTarget(newTarget());
      setR(128); setG(128); setB(128);
      setReveal(null);
      setTimeLeft(ROUND_TIME);
      setPhase('play');
    }, 1500);
  }, []);
  const lockRef = useRef(lockIn);
  lockRef.current = lockIn;

  // 3-2-1 start + music.
  useEffect(() => {
    const music = startMusic();
    let n = 3;
    setCount(3); tone(520, 0.1);
    const ticker = window.setInterval(() => {
      n -= 1;
      if (n <= 0) { window.clearInterval(ticker); setCount(0); tone(840, 0.2, 'square', 0.18); setPhase('play'); setTimeLeft(ROUND_TIME); }
      else { setCount(n); tone(520, 0.1); }
    }, 800);
    return () => { window.clearInterval(ticker); music?.stop(); };
  }, []);

  // per-round countdown
  useEffect(() => {
    const iv = window.setInterval(() => {
      if (refs.current.phase !== 'play') return;
      setTimeLeft((tl) => {
        const next = tl - 0.1;
        if (next <= 0) { lockRef.current(); return 0; }
        if (next <= 3 && Math.ceil(next) !== Math.ceil(tl)) tone(440, 0.06, 'square', 0.12);
        return next;
      });
    }, 100);
    return () => window.clearInterval(iv);
  }, []);

  // keyboard: Enter locks in
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); lockRef.current(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (phase !== 'done') return;
    const secs = Math.round(performance.now() / 1000 - startRef.current);
    const id = window.setTimeout(() => onExit(score, secs), 60);
    return () => window.clearTimeout(id);
  }, [phase, score, onExit]);

  const guess: RGB = { r, g, b };
  const revColor = reveal ? (reveal.acc > 0.9 ? '#6cc36a' : reveal.acc > 0.7 ? '#ffce3a' : '#ef5d52') : '#fff';
  const revLabel = reveal ? (reveal.acc > 0.96 ? 'DIALED!' : reveal.acc > 0.85 ? 'SHARP' : reveal.acc > 0.6 ? 'CLOSE' : 'OFF') : '';
  const pct = Math.max(0, Math.min(100, (timeLeft / ROUND_TIME) * 100));
  const low = timeLeft <= 4;

  return (
    <div className="fc-contrast">
      <div className="fc-fh-hud">
        <span>ROUND <b>{Math.min(round, ROUNDS)}/{ROUNDS}</b></span>
        <span>SCORE <b>{score.toString().padStart(6, '0')}</b></span>
        <span>HI <b>{Math.max(highScore, score).toString().padStart(6, '0')}</b></span>
      </div>

      <div className="fc-ct-timer">
        <div className="fc-ct-timebar"><div className="fc-ct-timefill" style={{ width: `${pct}%`, background: low ? '#ef5d52' : '#ffce3a' }} /></div>
        <span className="fc-ct-timenum" style={{ color: low ? '#ef5d52' : '#fff' }}>{Math.ceil(timeLeft)}s</span>
      </div>

      <div className="fc-ct-stage">
        <div className="fc-ct-swatch" style={{ background: css(target), borderColor: css(guess) }}>
          {phase === 'ready' && <div className="fc-ct-count">{count > 0 ? count : 'GO!'}</div>}
          {reveal && <div className="fc-ct-readout" style={{ color: revColor }}>{revLabel} {Math.round(reveal.acc * 100)}% &nbsp;+{reveal.pts}</div>}
        </div>
        <div className="fc-ct-hint">make the frame vanish into the fill before time runs out</div>
      </div>

      <div className="fc-ct-sliders">
        <label style={{ ['--chc' as string]: '#ef5d52' }}><span className="ch">R</span><input type="range" min={0} max={255} value={r} onChange={(e) => setR(+e.target.value)} /><span className="val">{r}</span></label>
        <label style={{ ['--chc' as string]: '#6cc36a' }}><span className="ch">G</span><input type="range" min={0} max={255} value={g} onChange={(e) => setG(+e.target.value)} /><span className="val">{g}</span></label>
        <label style={{ ['--chc' as string]: '#4d7cff' }}><span className="ch">B</span><input type="range" min={0} max={255} value={b} onChange={(e) => setB(+e.target.value)} /><span className="val">{b}</span></label>
      </div>

      <button className="fc-btn fc-btn-gold fc-ct-lock" onClick={() => lockRef.current()} disabled={phase !== 'play'}>LOCK IN ▶</button>
      <div className="fc-fh-foot">drag <b>R G B</b> · ⏎ lock in · ⎋ eject</div>
    </div>
  );
}
