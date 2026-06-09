/**
 * Cartridge 3 — FigContrast: colour-memory calibration game.
 * Ported from rip-designs-catharsis-garden branch.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const ROUNDS = 5;
const PEEK_MS = 2600;

type Phase = 'peek' | 'dial' | 'result' | 'done';
interface HSV { h: number; s: number; v: number; }

function rand() { return Math.random(); }
function newTarget(): HSV { return { h: rand() * 360, s: 0.4 + rand() * 0.6, v: 0.35 + rand() * 0.6 }; }
function hsv2rgb({ h, s, v }: HSV) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}
const css = (hsv: HSV) => { const c = hsv2rgb(hsv); return `rgb(${c.r},${c.g},${c.b})`; };
function scoreOf(target: HSV, guess: HSV) {
  const a = hsv2rgb(target), b = hsv2rgb(guess);
  const d = Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
  return Math.round(100 * Math.max(0, 1 - d / 255));
}

let actx: AudioContext | null = null;
function audio() { if (!actx) { try { actx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { /**/ } } return actx; }
function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.16) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq; o.connect(g); g.connect(a.destination);
  g.gain.setValueAtTime(vol, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.start(); o.stop(a.currentTime + dur);
}
function click() { tone(1500, 0.018, 'square', 0.09); }
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const MEL = [64, 67, 71, 67, 69, 72, 76, 72, 62, 65, 69, 65, 67, 64, 60, 0];
const BASS = [40, 40, 43, 43, 36, 36, 41, 41, 40, 40, 43, 43, 38, 38, 41, 41];
function startMusic() {
  const a = audio(); if (!a) return null;
  try { a.resume(); } catch { /**/ }
  const stepDur = 0.22; let step = 0, next = a.currentTime + 0.1;
  const t2 = (f: number, t: number, d: number, ty: OscillatorType, v: number) => {
    const o = a.createOscillator(), g = a.createGain();
    o.type = ty; o.frequency.value = f; o.connect(g); g.connect(a.destination);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.start(t); o.stop(t + d);
  };
  const timer = window.setInterval(() => {
    while (next < a.currentTime + 0.25) {
      const m = MEL[step % MEL.length]; if (m) t2(midi(m), next, stepDur * 0.85, 'square', 0.045);
      if (step % 2 === 0) { const b = BASS[step % BASS.length]; if (b) t2(midi(b), next, stepDur * 1.7, 'triangle', 0.07); }
      next += stepDur; step++;
    }
  }, 45);
  return { stop: () => window.clearInterval(timer) };
}

function VSlider({ value, max, gradient, label, onChange, disabled }: {
  value: number; max: number; gradient: string; label: string; onChange: (v: number) => void; disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const set = (clientY: number) => {
    const r = ref.current!.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, 1 - (clientY - r.top) / r.height));
    onChange(t * max);
  };
  const down = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault(); set(e.clientY);
    const mv = (ev: PointerEvent) => set(ev.clientY);
    const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); };
    document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
  };
  return (
    <div className="fc-vs">
      <div className="fc-vs-track" ref={ref} onPointerDown={down} style={{ backgroundImage: gradient, opacity: disabled ? 0.5 : 1 }}>
        <div className="fc-vs-knob" style={{ bottom: `${(value / max) * 100}%` }} />
      </div>
      <span className="fc-vs-label">{label}</span>
    </div>
  );
}

const HUE_GRAD = 'linear-gradient(to top,#ff0040,#ff00d4,#7b00ff,#0062ff,#00e0ff,#00ff66,#d4ff00,#ff7b00,#ff0040)';

export function FigContrast({ highScore, onExit }: { highScore: number; onExit: (score: number, secondsPlayed: number) => void }) {
  const [round, setRound] = useState(1);
  const [target, setTarget] = useState<HSV>(newTarget);
  const [h, setH] = useState(200);
  const [s, setS] = useState(0.5);
  const [v, setV] = useState(0.5);
  const [phase, setPhase] = useState<Phase>('peek');
  const [ms, setMs] = useState(PEEK_MS);
  const [scores, setScores] = useState<number[]>([]);
  const [lastScore, setLastScore] = useState(0);

  const refs = useRef({ phase, target, h, s, v, round });
  refs.current = { phase, target, h, s, v, round };
  const startRef = useRef(performance.now() / 1000);

  useEffect(() => { const m = startMusic(); return () => m?.stop(); }, []);

  useEffect(() => {
    if (phase !== 'peek') return;
    setMs(PEEK_MS);
    let left = PEEK_MS;
    click();
    const iv = window.setInterval(() => {
      left -= 100; setMs(left); click();
      if (left <= 0) { window.clearInterval(iv); setPhase('dial'); tone(760, 0.16, 'square', 0.16); }
    }, 100);
    return () => window.clearInterval(iv);
  }, [phase, round]);

  const submit = useCallback(() => {
    const r = refs.current;
    if (r.phase !== 'dial') return;
    const sc = scoreOf(r.target, { h: r.h, s: r.s, v: r.v });
    setLastScore(sc); setScores((arr) => [...arr, sc]); setPhase('result');
    tone(sc >= 80 ? 1100 : sc >= 50 ? 760 : 480, 0.16, 'square', 0.16);
    window.setTimeout(() => {
      if (r.round >= ROUNDS) { setPhase('done'); return; }
      setRound((x) => x + 1); setTarget(newTarget()); setH(200); setS(0.5); setV(0.5); setPhase('peek');
    }, 1600);
  }, []);
  const submitRef = useRef(submit); submitRef.current = submit;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); submitRef.current(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const total = scores.reduce((a, b) => a + b, 0);
  useEffect(() => {
    if (phase !== 'done') return;
    const secs = Math.round(performance.now() / 1000 - startRef.current);
    const id = window.setTimeout(() => onExit(total, secs), 1800);
    return () => window.clearTimeout(id);
  }, [phase, total, onExit]);

  const guess: HSV = { h, s, v };
  const showTarget = phase === 'peek';
  const bigColor = showTarget ? css(target) : css(guess);
  const satGrad = `linear-gradient(to top, ${css({ h, s: 0, v })}, ${css({ h, s: 1, v })})`;
  const valGrad = `linear-gradient(to top, #000, ${css({ h, s, v: 1 })})`;
  const scoreCol = (n: number) => (n >= 80 ? '#6cc36a' : n >= 50 ? '#ffce3a' : '#ef5d52');

  if (phase === 'done') {
    return (
      <div className="fc-contrast fc-ct-done">
        <div className="fc-ct-donetitle">CALIBRATION COMPLETE</div>
        <div className="fc-ct-dotrow">
          {scores.map((n, i) => <span key={i} className="fc-ct-dot" style={{ color: scoreCol(n) }}>{n}</span>)}
        </div>
        <div className="fc-ct-total" style={{ color: scoreCol(total / ROUNDS) }}>{total}<small> / {ROUNDS * 100}</small></div>
        {total > highScore && <div className="fc-ct-best">★ NEW BEST ★</div>}
      </div>
    );
  }

  return (
    <div className="fc-contrast">
      <div className="fc-fh-hud">
        <span>ROUND <b>{Math.min(round, ROUNDS)}/{ROUNDS}</b></span>
        <span>TOTAL <b>{total.toString().padStart(3, '0')}</b></span>
        <span>HI <b>{Math.max(highScore, total).toString().padStart(3, '0')}</b></span>
      </div>
      <div className="fc-ct-main">
        <div className="fc-ct-sliders-v">
          <VSlider label="H" value={h} max={360} gradient={HUE_GRAD} onChange={setH} disabled={showTarget} />
          <VSlider label="S" value={s} max={1} gradient={satGrad} onChange={setS} disabled={showTarget} />
          <VSlider label="V" value={v} max={1} gradient={valGrad} onChange={setV} disabled={showTarget} />
        </div>
        <div className="fc-ct-big" style={{ background: bigColor }}>
          {phase === 'peek' && <div className="fc-ct-ms">{Math.max(0, ms)}<small>ms</small></div>}
          {phase === 'result' && <div className="fc-ct-roundscore" style={{ color: scoreCol(lastScore) }}>{lastScore}<small>/100</small></div>}
        </div>
      </div>
      <div className="fc-ct-bottom">
        <span className="fc-ct-instr">{showTarget ? 'MEMORISE THE COLOUR…' : 'dial H · S · V to match'}</span>
        <button className="fc-ct-submit" onClick={() => submitRef.current()} disabled={phase !== 'dial'} title="Lock in (Enter)">◎</button>
      </div>
      <div className="fc-fh-foot">memorise, then dial to match · ⏎ lock in · ⎋ eject</div>
    </div>
  );
}
