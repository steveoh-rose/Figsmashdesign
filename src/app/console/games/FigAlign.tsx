/**
 * Cartridge 4 — FigAlign: a shape-memory calibration game in the same family as
 * FigContrast. A target polygon is shown while a millisecond timer ticks down
 * (clicking); it then hides and you recreate it from memory with Sides /
 * Rotation / Size sliders. Score /100 each round, five rounds make a total /500.
 * Original implementation — no external assets, code, or branding.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const ROUNDS = 5;
const PEEK_MS = 2600;
const SIDES_MIN = 3, SIDES_MAX = 8;
const SIZE_MIN = 0.45, SIZE_MAX = 1.0;

type Phase = 'peek' | 'dial' | 'result' | 'done';
interface Shape { sides: number; rot: number; size: number; } // rot 0-360, size 0.45-1

function rand() { return Math.random(); }
function newTarget(): Shape {
  return {
    sides: Math.round(SIDES_MIN + rand() * (SIDES_MAX - SIDES_MIN)),
    rot: Math.round(rand() * 360),
    size: SIZE_MIN + rand() * (SIZE_MAX - SIZE_MIN),
  };
}
function polyPoints(s: Shape, cx = 100, cy = 100, maxR = 78): string {
  const n = Math.max(3, Math.round(s.sides));
  const R = s.size * maxR;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((s.rot - 90 + (i * 360) / n) * Math.PI) / 180;
    pts.push(`${(cx + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}
// marker line from centre to first vertex, so rotation is unambiguous.
function markerEnd(s: Shape, cx = 100, cy = 100, maxR = 78) {
  const a = ((s.rot - 90) * Math.PI) / 180, R = s.size * maxR;
  return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
}
function scoreOf(t: Shape, g: Shape) {
  const ds = Math.abs(Math.round(t.sides) - Math.round(g.sides));
  const sidesScore = Math.max(0, 1 - ds / 2);
  let dr = Math.abs(t.rot - g.rot) % 360; if (dr > 180) dr = 360 - dr;
  const rotScore = 1 - dr / 180;
  const sizeScore = 1 - Math.abs(t.size - g.size) / (SIZE_MAX - SIZE_MIN);
  return Math.round(100 * Math.max(0, 0.4 * sidesScore + 0.3 * rotScore + 0.3 * sizeScore));
}

// --- audio: chiptune + countdown click ---
let actx: AudioContext | null = null;
function audio() { if (!actx) { try { actx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { /* */ } } return actx; }
function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.16) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq; o.connect(g); g.connect(a.destination);
  g.gain.setValueAtTime(vol, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.start(); o.stop(a.currentTime + dur);
}
function click() { tone(1500, 0.018, 'square', 0.09); }
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const MEL = [69, 74, 78, 74, 71, 76, 81, 76, 67, 72, 76, 72, 69, 65, 62, 0];
const BASS = [45, 45, 41, 41, 38, 38, 43, 43, 45, 45, 41, 41, 40, 40, 36, 36];
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
      const m = MEL[step % MEL.length]; if (m) t2(midi(m), next, stepDur * 0.85, 'square', 0.045);
      if (step % 2 === 0) { const b = BASS[step % BASS.length]; if (b) t2(midi(b), next, stepDur * 1.7, 'triangle', 0.07); }
      next += stepDur; step++;
    }
  }, 45);
  return { stop: () => window.clearInterval(timer) };
}

function VSlider({ value, min, max, label, valueLabel, onChange, disabled }: { value: number; min: number; max: number; label: string; valueLabel: string; onChange: (v: number) => void; disabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const set = (clientY: number) => {
    const r = ref.current!.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, 1 - (clientY - r.top) / r.height));
    onChange(min + t * (max - min));
  };
  const down = (e: React.PointerEvent) => {
    if (disabled) return; e.preventDefault(); set(e.clientY);
    const mv = (ev: PointerEvent) => set(ev.clientY);
    const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); };
    document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
  };
  return (
    <div className="fc-vs">
      <span className="fc-vs-val">{valueLabel}</span>
      <div className="fc-vs-track fc-vs-track-align" ref={ref} onPointerDown={down} style={{ opacity: disabled ? 0.5 : 1 }}>
        <div className="fc-vs-knob" style={{ bottom: `${((value - min) / (max - min)) * 100}%` }} />
      </div>
      <span className="fc-vs-label">{label}</span>
    </div>
  );
}

export function FigAlign({ highScore, onExit }: { highScore: number; onExit: (score: number, secondsPlayed: number) => void }) {
  const [round, setRound] = useState(1);
  const [target, setTarget] = useState<Shape>(newTarget);
  const [sides, setSides] = useState(5);
  const [rot, setRot] = useState(0);
  const [size, setSize] = useState(0.7);
  const [phase, setPhase] = useState<Phase>('peek');
  const [ms, setMs] = useState(PEEK_MS);
  const [scores, setScores] = useState<number[]>([]);
  const [lastScore, setLastScore] = useState(0);

  const refs = useRef({ phase, target, sides, rot, size, round });
  refs.current = { phase, target, sides, rot, size, round };
  const startRef = useRef(performance.now() / 1000);

  useEffect(() => { const m = startMusic(); return () => m?.stop(); }, []);

  useEffect(() => {
    if (phase !== 'peek') return;
    setMs(PEEK_MS); let left = PEEK_MS; click();
    const iv = window.setInterval(() => {
      left -= 100; setMs(left); click();
      if (left <= 0) { window.clearInterval(iv); setPhase('dial'); tone(760, 0.16, 'square', 0.16); }
    }, 100);
    return () => window.clearInterval(iv);
  }, [phase, round]);

  const submit = useCallback(() => {
    const r = refs.current;
    if (r.phase !== 'dial') return;
    const sc = scoreOf(r.target, { sides: r.sides, rot: r.rot, size: r.size });
    setLastScore(sc); setScores((arr) => [...arr, sc]); setPhase('result');
    tone(sc >= 80 ? 1100 : sc >= 50 ? 760 : 480, 0.16, 'square', 0.16);
    window.setTimeout(() => {
      if (r.round >= ROUNDS) { setPhase('done'); return; }
      setRound((x) => x + 1); setTarget(newTarget()); setSides(5); setRot(0); setSize(0.7); setPhase('peek');
    }, 1700);
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

  const showTarget = phase === 'peek';
  const guess: Shape = { sides, rot, size };
  const shown = showTarget ? target : guess;
  const accent = '#ff9f43';
  const scoreCol = (n: number) => (n >= 80 ? '#6cc36a' : n >= 50 ? '#ffce3a' : '#ef5d52');
  const mEnd = markerEnd(shown);

  if (phase === 'done') {
    return (
      <div className="fc-contrast fc-ct-done">
        <div className="fc-ct-donetitle">ALIGNMENT COMPLETE</div>
        <div className="fc-ct-dotrow">{scores.map((n, i) => <span key={i} className="fc-ct-dot" style={{ color: scoreCol(n) }}>{n}</span>)}</div>
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
          <VSlider label="SIDES" valueLabel={String(Math.round(sides))} value={sides} min={SIDES_MIN} max={SIDES_MAX} onChange={(x) => setSides(Math.round(x))} disabled={showTarget} />
          <VSlider label="ROT" valueLabel={`${Math.round(rot)}°`} value={rot} min={0} max={360} onChange={setRot} disabled={showTarget} />
          <VSlider label="SIZE" valueLabel={`${Math.round(size * 100)}`} value={size} min={SIZE_MIN} max={SIZE_MAX} onChange={setSize} disabled={showTarget} />
        </div>
        <div className="fc-ct-big fc-align-big">
          <svg viewBox="0 0 200 200" width="100%" height="100%" style={{ display: 'block' }}>
            {phase === 'result' && <polygon points={polyPoints(target)} fill="none" stroke="#ffffff" strokeWidth={2} strokeDasharray="5 5" opacity={0.85} />}
            <polygon points={polyPoints(shown)} fill={accent} stroke="#1c1c1c" strokeWidth={3} />
            <line x1={100} y1={100} x2={mEnd.x} y2={mEnd.y} stroke="#1c1c1c" strokeWidth={3} />
            <circle cx={mEnd.x} cy={mEnd.y} r={5} fill="#1c1c1c" />
          </svg>
          {phase === 'peek' && <div className="fc-ct-ms fc-align-ms">{Math.max(0, ms)}<small>ms</small></div>}
          {phase === 'result' && <div className="fc-ct-roundscore fc-align-score" style={{ color: scoreCol(lastScore) }}>{lastScore}<small>/100</small></div>}
        </div>
      </div>

      <div className="fc-ct-bottom">
        <span className="fc-ct-instr">{showTarget ? 'MEMORISE THE SHAPE…' : 'dial SIDES · ROT · SIZE'}</span>
        <button className="fc-ct-submit" onClick={() => submitRef.current()} disabled={phase !== 'dial'} title="Lock in (Enter)">◎</button>
      </div>
      <div className="fc-fh-foot">memorise, then rebuild the shape · ⏎ lock in · ⎋ eject</div>
    </div>
  );
}
