/**
 * Cartridge 4 — FigAlign: a transform-memory game. A target box animates out
 * from the centre showing its position / size / rotation, then a millisecond
 * timer ticks down (clicking) and it hides. You rebuild it by direct
 * manipulation — drag the body to move, drag a corner to resize, drag just
 * outside a corner to rotate. Score /100 each round, five rounds → total /500.
 * Original implementation; no external assets, code, or branding.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const ROUNDS = 5;
const PEEK_MS = 2600;
const VB = 240;            // square viewBox
const C = VB / 2;          // centre
const MIN_H = 12, MAX_H = 95;

type Phase = 'peek' | 'dial' | 'result' | 'done';
interface Box { cx: number; cy: number; hw: number; hh: number; rot: number; } // rot deg

function rand() { return Math.random(); }
function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
function newTarget(): Box {
  return { cx: 55 + rand() * 130, cy: 55 + rand() * 130, hw: 22 + rand() * 30, hh: 22 + rand() * 30, rot: rand() * 180 };
}
function rotPt(x: number, y: number, deg: number) { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return { x: x * c - y * s, y: x * s + y * c }; }
function corners(b: Box) {
  return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([sx, sy]) => { const r = rotPt(sx * b.hw, sy * b.hh, b.rot); return { x: b.cx + r.x, y: b.cy + r.y }; });
}
function inside(b: Box, px: number, py: number) { const d = rotPt(px - b.cx, py - b.cy, -b.rot); return Math.abs(d.x) <= b.hw && Math.abs(d.y) <= b.hh; }
function scoreOf(t: Box, g: Box) {
  const posDist = Math.hypot(t.cx - g.cx, t.cy - g.cy);
  const posScore = Math.max(0, 1 - posDist / 110);
  const sizeScore = Math.max(0, 1 - (Math.abs(t.hw - g.hw) + Math.abs(t.hh - g.hh)) / 95);
  let dr = (((t.rot - g.rot) % 180) + 180) % 180; if (dr > 90) dr = 180 - dr;
  const rotScore = 1 - dr / 90;
  return Math.round(100 * Math.max(0, 0.4 * posScore + 0.3 * sizeScore + 0.3 * rotScore));
}

// --- audio ---
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

const ACCENT = '#ff9f43';

function BoxShape({ b, fill, dashed, handles }: { b: Box; fill?: string; dashed?: boolean; handles?: boolean }) {
  return (
    <g transform={`translate(${b.cx} ${b.cy}) rotate(${b.rot})`}>
      <rect x={-b.hw} y={-b.hh} width={b.hw * 2} height={b.hh * 2}
        fill={fill || 'none'} stroke={dashed ? '#fff' : '#1c1c1c'} strokeWidth={dashed ? 2 : 3}
        strokeDasharray={dashed ? '5 5' : undefined} opacity={dashed ? 0.85 : 1} />
      {!dashed && <circle cx={0} cy={-b.hh} r={4} fill="#1c1c1c" />}
      {handles && ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([sx, sy], i) => (
        <rect key={i} x={sx * b.hw - 4} y={sy * b.hh - 4} width={8} height={8} fill="#fff" stroke="#1c1c1c" strokeWidth={1.5} />
      ))}
    </g>
  );
}

export function FigAlign({ highScore, onExit }: { highScore: number; onExit: (score: number, secondsPlayed: number) => void }) {
  const [round, setRound] = useState(1);
  const [target, setTarget] = useState<Box>(newTarget);
  const [guess, setGuess] = useState<Box>({ cx: C, cy: C, hw: 38, hh: 38, rot: 0 });
  const [phase, setPhase] = useState<Phase>('peek');
  const [ms, setMs] = useState(PEEK_MS);
  const [grow, setGrow] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [lastScore, setLastScore] = useState(0);

  const svgRef = useRef<SVGSVGElement>(null);
  const guessRef = useRef(guess); guessRef.current = guess;
  const refs = useRef({ phase, target, round }); refs.current = { phase, target, round };
  const dragRef = useRef<any>(null);
  const startRef = useRef(performance.now() / 1000);

  useEffect(() => { const m = startMusic(); return () => m?.stop(); }, []);

  // peek: animate target out from centre, tick ms, click
  useEffect(() => {
    if (phase !== 'peek') return;
    let raf = 0; const t0 = performance.now(); let lastClick = -1; click();
    const tick = () => {
      const el = performance.now() - t0; const left = PEEK_MS - el;
      setMs(Math.max(0, Math.round(left)));
      setGrow(Math.min(1, el / 450));
      const ci = Math.floor(el / 110); if (ci !== lastClick) { lastClick = ci; if (left > 0) click(); }
      if (left <= 0) { setPhase('dial'); tone(760, 0.16, 'square', 0.16); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, round]);

  const toVB = (clientX: number, clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * VB, y: ((clientY - r.top) / r.height) * VB };
  };

  const onMove = useCallback((ev: PointerEvent) => {
    const drag = dragRef.current; if (!drag) return;
    const p = toVB(ev.clientX, ev.clientY);
    const sh = { ...guessRef.current };
    if (drag.mode === 'move') { sh.cx = clamp(p.x - drag.offx, 8, VB - 8); sh.cy = clamp(p.y - drag.offy, 8, VB - 8); }
    else if (drag.mode === 'rotate') { const ang = (Math.atan2(p.y - sh.cy, p.x - sh.cx) * 180) / Math.PI; sh.rot = drag.startRot + (ang - drag.startAng); }
    else if (drag.mode === 'resize') {
      const a = drag.anchor, u = rotPt(1, 0, sh.rot), v = rotPt(0, 1, sh.rot);
      const dx = p.x - a.x, dy = p.y - a.y, du = dx * u.x + dy * u.y, dv = dx * v.x + dy * v.y;
      const su = du >= 0 ? 1 : -1, sv = dv >= 0 ? 1 : -1;
      sh.hw = clamp(Math.abs(du) / 2, MIN_H, MAX_H); sh.hh = clamp(Math.abs(dv) / 2, MIN_H, MAX_H);
      sh.cx = a.x + u.x * su * sh.hw + v.x * sv * sh.hh; sh.cy = a.y + u.y * su * sh.hw + v.y * sv * sh.hh;
    }
    setGuess(sh);
  }, []);

  const onDown = (e: React.PointerEvent) => {
    if (refs.current.phase !== 'dial') return;
    e.preventDefault();
    const p = toVB(e.clientX, e.clientY);
    const sh = guessRef.current;
    const cs = corners(sh);
    let best = 0, bd = 1e9; cs.forEach((c, i) => { const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; best = i; } });
    let drag: any = null;
    if (bd <= 14) { const opp = cs[(best + 2) % 4]; drag = { mode: 'resize', anchor: { x: opp.x, y: opp.y } }; }
    else if (bd <= 32 && !inside(sh, p.x, p.y)) { drag = { mode: 'rotate', startRot: sh.rot, startAng: (Math.atan2(p.y - sh.cy, p.x - sh.cx) * 180) / Math.PI }; }
    else if (inside(sh, p.x, p.y)) { drag = { mode: 'move', offx: p.x - sh.cx, offy: p.y - sh.cy }; }
    if (!drag) return;
    dragRef.current = drag;
    const up = () => { dragRef.current = null; window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', up);
  };

  const submit = useCallback(() => {
    const r = refs.current;
    if (r.phase !== 'dial') return;
    const sc = scoreOf(r.target, guessRef.current);
    setLastScore(sc); setScores((arr) => [...arr, sc]); setPhase('result');
    tone(sc >= 80 ? 1100 : sc >= 50 ? 760 : 480, 0.16, 'square', 0.16);
    window.setTimeout(() => {
      if (r.round >= ROUNDS) { setPhase('done'); return; }
      setRound((x) => x + 1); setTarget(newTarget());
      setGuess({ cx: C, cy: C, hw: 38, hh: 38, rot: 0 }); setGrow(0); setPhase('peek');
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

  const scoreCol = (n: number) => (n >= 80 ? '#6cc36a' : n >= 50 ? '#ffce3a' : '#ef5d52');

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

  // target shown during peek, growing out of the centre
  const grown: Box = { cx: C + (target.cx - C) * grow, cy: C + (target.cy - C) * grow, hw: target.hw * grow, hh: target.hh * grow, rot: target.rot };

  return (
    <div className="fc-contrast">
      <div className="fc-fh-hud">
        <span>ROUND <b>{Math.min(round, ROUNDS)}/{ROUNDS}</b></span>
        <span>TOTAL <b>{total.toString().padStart(3, '0')}</b></span>
        <span>HI <b>{Math.max(highScore, total).toString().padStart(3, '0')}</b></span>
      </div>

      <div className="fc-align-stage">
        <div className="fc-align-canvas">
          <svg ref={svgRef} viewBox={`0 0 ${VB} ${VB}`} onPointerDown={onDown} style={{ touchAction: 'none', cursor: phase === 'dial' ? 'move' : 'default' }}>
            {phase === 'peek' && <BoxShape b={grown} fill={ACCENT} />}
            {phase !== 'peek' && <BoxShape b={guess} fill={ACCENT} handles={phase === 'dial'} />}
            {phase === 'result' && <BoxShape b={target} dashed />}
          </svg>
          {phase === 'peek' && <div className="fc-ct-ms fc-align-ms">{Math.max(0, ms)}<small>ms</small></div>}
          {phase === 'result' && <div className="fc-ct-roundscore fc-align-score" style={{ color: scoreCol(lastScore) }}>{lastScore}<small>/100</small></div>}
        </div>
      </div>

      <div className="fc-ct-bottom">
        <span className="fc-ct-instr">{phase === 'peek' ? 'MEMORISE THE BOX…' : 'drag · corner = resize · outside corner = rotate'}</span>
        <button className="fc-ct-submit" onClick={() => submitRef.current()} disabled={phase !== 'dial'} title="Lock in (Enter)">◎</button>
      </div>
      <div className="fc-fh-foot">memorise, then rebuild the box · ⏎ lock in · ⎋ eject</div>
    </div>
  );
}
